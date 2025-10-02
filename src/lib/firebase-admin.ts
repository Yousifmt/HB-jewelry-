import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

const projectId   = process.env.FIREBASE_ADMIN_PROJECT_ID!;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL!;
const privateKey  = process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, "\n");

// 👇 استخدم متغير السيرفر وليس الـ public
const storageBucket =
  (process.env.FIREBASE_STORAGE_BUCKET || "").trim(); // e.g. studio-1653374355-1a844.appspot.com

if (!projectId || !clientEmail || !privateKey || !storageBucket) {
  throw new Error("[admin] Missing Firebase Admin envs. Check .env / Vercel vars");
}

// حارس صغير ضد القيم الخاطئة (gs:// أو رابط)
if (storageBucket.startsWith("gs://") || storageBucket.includes("firebasestorage.app")) {
  throw new Error(
    `[admin] Invalid FIREBASE_STORAGE_BUCKET="${storageBucket}". Use only "project-id.appspot.com".`
  );
}

export const adminApp =
  getApps()[0] ||
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket, // ← اسم فقط
  });

export const adminBucket = getStorage(adminApp).bucket();
