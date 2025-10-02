// src/components/dashboard/add-product-dialog.tsx
"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { Loader2, PlusCircle, CheckCircle, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/* ===================== Schema ===================== */
// نتعامل مع الفراغ كـ undefined، ونطلب رقماً >= 0
const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  buyPriceBHD: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z
      .number({ invalid_type_error: "Buy price is required" })
      .min(0, "Buy price must be non-negative")
  ),
  image: z.any().optional(),
});
type ProductForm = z.infer<typeof productSchema>;

/* ===================== Constants ===================== */
const MAX_IMAGE_MB = 10;
const ALLOWED_MIME = /^image\/(jpeg|jpg|png|webp|gif)$/i;
const PLACEHOLDER =
  "https://placehold.co/64x64/E2E8F0/AAAAAA/png?text=No+Image";

const fmtBytes = (n: number) => {
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    sizes.length - 1,
    Math.floor(Math.log(Math.max(n, 1)) / Math.log(k))
  );
  return `${(n / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};
const filePreviewURL = (file: File) => URL.createObjectURL(file);

type UploadResp = {
  url: string;
  path?: string;
  bucket?: string;
  contentType?: string;
  size?: number | null;
};

type AddProductDialogProps = {
  /** حجم زر الفتح (افتراضي sm للموبايل) */
  triggerSize?: "sm" | "default" | "lg";
  triggerClassName?: string;
  triggerLabel?: string;
};

/* ===================== Component ===================== */
export function AddProductDialog({
  triggerSize = "sm",
  triggerClassName,
  triggerLabel = "Add",
}: AddProductDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Progress / Errors
  const [pct, setPct] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadDone, setUploadDone] = useState(false);

  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const { toast } = useToast();

  // 1) form defaults
const form = useForm<ProductForm>({
  resolver: zodResolver(productSchema),
  defaultValues: { name: "", buyPriceBHD: undefined },
})


  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
      try {
        xhrRef.current?.abort();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetAll = () => {
    if (preview) URL.revokeObjectURL(preview);
    setSelectedFile(null);
    setPreview(null);
    setPct(null);
    setUploadError(null);
    setUploadDone(false);
    setIsSubmitting(false);
    // نعيد الحقول لقيم البداية (الحقل الرقمي يبقى undefined)
    form.reset({ name: "", buyPriceBHD: undefined });
  };

  // رفع الصورة عبر /api/upload
  const uploadViaApi = async (file: File) => {
    return await new Promise<UploadResp>((resolve, reject) => {
      const formData = new FormData();
      formData.append(
        "file",
        file,
        `${uuidv4()}.${file.type.split("/")[1] || "bin"}`
      );

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setPct(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.onabort = () => reject(new Error("Upload cancelled"));
      xhr.onload = () => {
        try {
          const status = xhr.status;
          const data = JSON.parse(xhr.responseText || "{}");
          if (status >= 200 && status < 300 && data?.url) {
            setPct(100);
            setUploadDone(true);
            resolve(data as UploadResp);
          } else {
            reject(new Error(data?.error || `Upload failed (${status})`));
          }
        } catch {
          reject(new Error("Invalid server response"));
        }
      };

      xhr.open("POST", "/api/upload", true);
      xhr.send(formData);
      setPct(0);
    });
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME.test(file.type)) {
      setUploadError("Only JPEG/PNG/WEBP/GIF images are allowed.");
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setUploadError(
        `Image too large (${fmtBytes(file.size)}). Max ${MAX_IMAGE_MB} MB.`
      );
      return;
    }

    setUploadError(null);
    if (preview) URL.revokeObjectURL(preview);
    const p = filePreviewURL(file);
    setPreview(p);
    setSelectedFile(file);
    setPct(null);
    setUploadDone(false);
  };

  const onSubmit = async (values: ProductForm) => {
    setIsSubmitting(true);
    setUploadError(null);
    try {
      let imageUrl = PLACEHOLDER;
      if (selectedFile) {
        const { url } = await uploadViaApi(selectedFile);
        imageUrl = url;
      }

      await addDoc(collection(db, "products"), {
        name: values.name.trim(),
        buyPriceBHD: Number(values.buyPriceBHD),
        imageUrl,
        sold: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Success",
        description: "Product added successfully.",
      });
      resetAll();
      setOpen(false);
    } catch (err: any) {
      console.error("Error adding product:", err);
      if (typeof err?.message === "string") setUploadError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: err?.message || "Failed to add product.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadInFlight =
    Boolean(isSubmitting && selectedFile) &&
    pct !== null &&
    pct < 100 &&
    !uploadError;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetAll();
        setOpen(v);
      }}
    >
      <DialogTrigger asChild>
        <Button size={triggerSize} className={cn("h-8 px-3 text-xs", triggerClassName)}>
          <PlusCircle className="mr-2 h-3.5 w-3.5" />
          {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[460px] px-4 sm:px-6">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Add New Product</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Enter the details of the new jewelry item.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs sm:text-sm">Name</FormLabel>
                  <FormControl>
                    <Input
                      className="h-9 text-sm"
                      placeholder="e.g., Pearl Necklace"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* Buy Price (controlled دائماً) */}
            <FormField
              control={form.control}
              name="buyPriceBHD"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs sm:text-sm">Buy Price (BHD)</FormLabel>
                  <FormControl>
<Input
  type="number"
  inputMode="decimal"
  step="0.001"
  value={field.value ?? ""}              // empty initially
  onChange={(e) => {
    const v = e.target.value
    field.onChange(v === "" ? undefined : v) // keep undefined when empty
  }}
  placeholder="e.g., 12.500"
/>

                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* Image */}
            <FormItem>
              <FormLabel className="text-xs sm:text-sm">Product Image (Optional)</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={isSubmitting}
                  className="h-9 text-xs file:text-xs"
                />
              </FormControl>

              {(preview || uploadError || uploadDone || (isSubmitting && pct !== null)) && (
                <div className="mt-2 space-y-2">
                  {preview && (
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preview}
                        alt="preview"
                        className="h-14 w-14 rounded-md object-cover border"
                      />
                      {selectedFile && (
                        <div className="text-[11px] text-muted-foreground">
                          <div className="truncate max-w-[200px] sm:max-w-none">
                            {selectedFile.name}
                          </div>
                          <div>
                            {fmtBytes(selectedFile.size)} · {selectedFile.type || "image"}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {uploadInFlight && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Progress value={pct ?? 0} className="w-full" />
                        <span className="w-10 text-right tabular-nums text-xs text-muted-foreground">
                          {pct}%
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">Uploading image…</div>
                    </div>
                  )}

                  {uploadDone && !uploadError && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-xs">Upload complete</span>
                    </div>
                  )}

                  {uploadError && (
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-xs">{uploadError}</span>
                    </div>
                  )}
                </div>
              )}

              <FormMessage className="text-xs" />
            </FormItem>

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting} className="h-9 px-3 text-sm">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding…
                  </>
                ) : (
                  "Add Product"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
