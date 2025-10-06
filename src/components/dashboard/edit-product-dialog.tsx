// HB/src/components/dashboard/edit-product-dialog.tsx
"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import type { Product } from "@/types";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  buyPriceBHD: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number({ invalid_type_error: "Buy price is required" }).min(0, "Must be ≥ 0")
  ),
  soldPriceBHD: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().min(0, "Must be ≥ 0").optional()
  ).optional(),
  productLink: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().url("Enter a valid URL").optional()
  ),
  description: z.string().max(2000, "Description is too long").optional(),
  sold: z.boolean().optional(),
});
type EditForm = z.infer<typeof schema>;

const MAX_IMAGE_MB = 10;
const ALLOWED_MIME = /^image\/(jpeg|jpg|png|webp|gif)$/i;
const fmtBytes = (n: number) => {
  const k = 1024, sizes = ["B","KB","MB","GB"];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(Math.max(n,1))/Math.log(k)));
  return `${(n/Math.pow(k,i)).toFixed(2)} ${sizes[i]}`;
};

type UploadResp = { url: string };

async function uploadViaApi(file: File, setPct: (n:number)=>void): Promise<UploadResp> {
  return await new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file, `${crypto.randomUUID()}.${file.type.split("/")[1] || "bin"}`);
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) setPct(Math.round((e.loaded/e.total)*100)); };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300 && data?.url) resolve(data as UploadResp);
        else reject(new Error(data?.error || `Upload failed (${xhr.status})`));
      } catch { reject(new Error("Invalid server response")); }
    };
    xhr.open("POST", "/api/upload", true);
    xhr.send(formData);
    setPct(0);
  });
}

export function EditProductDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadDone, setUploadDone] = useState(false);
  const xhrRef = useRef<XMLHttpRequest | null>(null); // optional if you want manual aborts

  const form = useForm<EditForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      buyPriceBHD: undefined,
      soldPriceBHD: undefined,
      productLink: "",
      description: "",
      sold: false,
    },
  });

  // mirror your MarkSoldDialog: reset when opening/when product changes
  useEffect(() => {
    if (open && product) {
      form.reset({
        name: product.name ?? "",
        buyPriceBHD: product.buyPriceBHD ?? undefined,
        soldPriceBHD: product.soldPriceBHD ?? undefined,
        productLink: (product as any).productLink ?? "",
        description: (product as any).description ?? "",
        sold: Boolean(product.sold),
      });
      // clear upload state
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      setSelectedFile(null);
      setPct(null);
      setUploadError(null);
      setUploadDone(false);
      setIsSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      // identical to your Add/MarkSold cleanup style
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      setSelectedFile(null);
      setPct(null);
      setUploadError(null);
      setUploadDone(false);
      setIsSubmitting(false);
    }
    onOpenChange(next);
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_MIME.test(file.type)) {
      setUploadError("Only JPEG/PNG/WEBP/GIF images are allowed.");
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setUploadError(`Image too large (${fmtBytes(file.size)}). Max ${MAX_IMAGE_MB} MB.`);
      return;
    }
    setUploadError(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setSelectedFile(file);
    setPct(null);
    setUploadDone(false);
  };

  const onSubmit = async (values: EditForm) => {
    if (!product) return;
    setIsSubmitting(true);
    setUploadError(null);

    try {
      let imageUrl = product.imageUrl;
      if (selectedFile) {
        const { url } = await uploadViaApi(selectedFile, (v) => setPct(v));
        setPct(100);
        setUploadDone(true);
        imageUrl = url;
      }

      await updateDoc(doc(db, "products", product.id), {
        name: values.name.trim(),
        buyPriceBHD: Number(values.buyPriceBHD),
        soldPriceBHD: typeof values.soldPriceBHD === "number" ? Number(values.soldPriceBHD) : null,
        productLink: values.productLink || null,
        description: values.description?.trim() || "",
        imageUrl,
        sold: Boolean(values.sold),
        updatedAt: serverTimestamp(),
      });

      toast({ title: "Updated", description: "Product updated successfully." });
      // close like MarkSoldDialog
      form.reset();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error updating product:", err);
      if (typeof err?.message === "string") setUploadError(err.message);
      toast({ variant: "destructive", title: "Error", description: err?.message || "Failed to update product." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadInFlight = Boolean(isSubmitting && selectedFile) && pct !== null && pct < 100 && !uploadError;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={false}>
      <DialogContent
        className="sm:max-w-[520px]"
        // same protections you used in MarkSoldDialog
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => isSubmitting && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update details. Leave image empty to keep the current one.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="buyPriceBHD"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Buy Price (BHD)</FormLabel>
                    <FormControl>
                      <Input
                        type="number" step="0.001"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="soldPriceBHD"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sold Price (BHD)</FormLabel>
                    <FormControl>
                      <Input
                        type="number" step="0.001"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="productLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Link (optional)</FormLabel>
                  <FormControl><Input type="url" {...field} disabled={isSubmitting} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl><Textarea className="min-h-[100px]" {...field} disabled={isSubmitting} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sold"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl><Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(Boolean(v))} /></FormControl>
                  <FormLabel className="text-sm">Mark as Sold</FormLabel>
                </FormItem>
              )}
            />

            {/* Image replace */}
            <FormItem>
              <FormLabel>Replace Image (optional)</FormLabel>
              <FormControl>
                <Input type="file" accept="image/*" onChange={handleImageChange} disabled={isSubmitting} />
              </FormControl>

              {(preview || uploadError || uploadDone || (isSubmitting && pct !== null)) && (
                <div className="mt-2 space-y-2">
                  {preview && (
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preview} alt="preview" className="h-14 w-14 rounded-md border object-cover" />
                      {selectedFile && (
                        <div className="text-xs text-muted-foreground">
                          <div className="truncate max-w-[200px]">{selectedFile.name}</div>
                          <div>{fmtBytes(selectedFile.size)} · {selectedFile.type || "image"}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {uploadInFlight && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Progress value={pct ?? 0} className="w-full" />
                        <span className="w-10 text-right tabular-nums text-xs text-muted-foreground">{pct}%</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Uploading image…</div>
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

              <FormMessage />
            </FormItem>

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>) : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
