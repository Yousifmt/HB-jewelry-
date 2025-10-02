// src/app/api/upload/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getApps, getApp, initializeApp, cert, type AppOptions } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";

/** Ensure this runs on the Node runtime (NOT Edge) and is never cached. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ------------ Tunables ------------ */
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB max
const FOLDER = "products"; // destination folder inside the bucket
const ALLOWED_MIME = /^image\/(jpeg|jpg|png|webp|gif)$/i;

/* ------------ Small helpers ------------ */
function fail(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

function getEnv(name: string) {
  return (process.env[name] || "").trim();
}

/** Decide on the bucket name from env. Must be a *name*, not a URL. */
function resolveBucketName(): string {
  const fromAdmin = getEnv("FIREBASE_STORAGE_BUCKET");
  const fromPublic = getEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET");
  const picked = fromAdmin || fromPublic;

  if (!picked) {
    const pid = getEnv("FIREBASE_ADMIN_PROJECT_ID");
    if (!pid) throw new Error("FIREBASE_STORAGE_BUCKET is empty and project id is unknown.");
    return `${pid}.appspot.com`;
  }

  if (picked.startsWith("gs://") || picked.includes("firebasestorage.app")) {
    throw new Error(
      `Invalid FIREBASE_STORAGE_BUCKET value: "${picked}". Use just "project-id.appspot.com" (no gs://, no URL).`
    );
  }

  return picked;
}

/** Initialize Firebase Admin once (supports PEM or base64 envs). */
function initAdminApp() {
  if (!getApps().length) {
    const projectId = getEnv("FIREBASE_ADMIN_PROJECT_ID");
    const clientEmail = getEnv("FIREBASE_ADMIN_CLIENT_EMAIL");
    let privateKey = getEnv("FIREBASE_ADMIN_PRIVATE_KEY");
    const pkBase64 = getEnv("FIREBASE_ADMIN_PRIVATE_KEY_BASE64");

    if (pkBase64) {
      // Base64 may contain either full JSON or just the PEM
      const decoded = Buffer.from(pkBase64, "base64").toString("utf8");
      try {
        const json = JSON.parse(decoded);
        privateKey = (json.private_key || "").trim();
      } catch {
        privateKey = decoded.trim();
      }
    } else {
      // Convert escaped \n to real newlines (Windows-friendly)
      privateKey = privateKey.replace(/\\n/g, "\n");
    }

    if (!projectId || !clientEmail || !privateKey.startsWith("-----BEGIN")) {
      throw new Error(
        "Service account envs missing/malformed. Check FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY(_BASE64)."
      );
    }

    const appOpts: AppOptions = {
      credential: cert({ projectId, clientEmail, privateKey }),
      storageBucket: resolveBucketName(),
    };

    initializeApp(appOpts);
  }

  return getApp();
}

/* ------------ Method guards & CORS (optional) ------------ */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

/* ------------ Route ------------ */
export async function POST(req: NextRequest) {
  try {
    // Enforce content-type
    const contentTypeHeader = req.headers.get("content-type") || "";
    if (!contentTypeHeader.toLowerCase().includes("multipart/form-data")) {
      return fail(400, "Content-Type must be multipart/form-data.");
    }

    // 1) Parse multipart/form-data (expects a field named "file")
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return fail(400, "No file provided (multipart field name must be 'file').");

    // 2) Size + type guards
    if (typeof file.size === "number" && file.size > MAX_BYTES) {
      return fail(413, `File too large. Max ${Math.round(MAX_BYTES / (1024 * 1024))}MB.`);
    }
    const inferredType = file.type || "application/octet-stream";
    if (!ALLOWED_MIME.test(inferredType)) {
      return fail(415, "Only JPEG/PNG/WEBP/GIF images are allowed.");
    }

    // 3) Admin + bucket
    const app = initAdminApp();
    const storage = getStorage(app);
    const bucketName = resolveBucketName();
    const bucket = storage.bucket(bucketName);

    // 4) Object path + metadata
    const ext = (inferredType.split("/")[1] || "bin").toLowerCase();
    const objectPath = `${FOLDER}/${randomUUID()}.${ext}`;
    const token = randomUUID(); // for anonymous download via ?token=

    const gcsFile = bucket.file(objectPath);

    // 5) Pipe the file stream directly into GCS (resumable=false keeps it simple)
    const nodeReadable = Readable.fromWeb(file.stream() as any);
    const gcsWritable = gcsFile.createWriteStream({
      resumable: false,
      metadata: {
        contentType: inferredType,
        metadata: { firebaseStorageDownloadTokens: token },
      },
      // validation: false, // uncomment if you see CRC mismatches in dev
    });

    // Abort-safe: if client disconnects, stop writing to GCS
    // @ts-ignore – Request.signal exists in the Next.js node runtime
    req.signal?.addEventListener?.("abort", () => {
      try {
        gcsWritable.destroy(new Error("client aborted"));
      } catch {}
    });

    await pipeline(nodeReadable, gcsWritable);

    // 6) Public download URL (no SDK needed on the client)
    const url =
      `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucketName)}/o/` +
      `${encodeURIComponent(objectPath)}?alt=media&token=${encodeURIComponent(token)}`;

    return NextResponse.json(
      {
        url,
        path: objectPath,         // useful for later deletion
        bucket: bucketName,       // returned for debugging or admin deletes
        contentType: inferredType,
        size: file.size ?? null,
      },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err: any) {
    // Helpful diagnostics in server logs
    console.error("[api/upload] error:", err?.stack || err);
    // Try to map common errors to clearer messages
    const msg = String(err?.message || "Upload failed");
    if (/The specified bucket does not exist/i.test(msg)) {
      return fail(500, "Storage bucket not found. Make sure Firebase Storage is enabled and bucket name is correct.");
    }
    if (/permission/i.test(msg)) {
      return fail(403, "Permission error. Check your service account roles and Firebase Storage rules.");
    }
    return fail(500, msg);
  }
}
