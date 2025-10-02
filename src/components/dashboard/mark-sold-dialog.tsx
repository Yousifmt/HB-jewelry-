"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import type { Product } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";

const soldSchema = z.object({
  soldPriceBHD: z.coerce.number().min(0, "Sold price must be non-negative"),
});

interface MarkSoldDialogProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MarkSoldDialog({ product, open, onOpenChange }: MarkSoldDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof soldSchema>>({
    resolver: zodResolver(soldSchema),
    defaultValues: { soldPriceBHD: product.buyPriceBHD ?? 0 },
  });

  useEffect(() => {
    if (open && product) {
      form.reset({ soldPriceBHD: product.buyPriceBHD ?? 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id]);

  const handleOpenChange = (next: boolean) => {
    if (!next) form.reset({ soldPriceBHD: product.buyPriceBHD ?? 0 });
    onOpenChange(next);
  };

  const onSubmit = async (values: z.infer<typeof soldSchema>) => {
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      const productRef = doc(db, "products", product.id);

      batch.update(productRef, {
        sold: true,
        soldPriceBHD: values.soldPriceBHD,
        soldAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const saleRef = doc(collection(db, "sales"));
      const profitBHD = values.soldPriceBHD - (product.buyPriceBHD ?? 0);

      batch.set(saleRef, {
        productId: product.id,
        productName: product.name,
        buyPriceBHD: product.buyPriceBHD ?? 0,
        soldPriceBHD: values.soldPriceBHD,
        profitBHD,
        soldAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      await batch.commit();

      toast({ title: "Success", description: `${product.name} marked as sold.` });
      form.reset();
      onOpenChange(false);
    } catch (err) {
      console.error("Error marking as sold:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to mark as sold. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={false}>
      <DialogContent
        className="sm:max-w-[425px]"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => isSubmitting && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Mark as Sold</DialogTitle>
          <DialogDescription>Enter the final selling price for "{product.name}".</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="soldPriceBHD"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sold Price (BHD)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.001" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Confirm Sale"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
