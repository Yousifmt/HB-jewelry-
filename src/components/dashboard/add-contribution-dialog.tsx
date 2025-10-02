"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { doc, increment, serverTimestamp, updateDoc } from "firebase/firestore"

import type { Owner } from "@/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"

const contributionSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
})

interface AddContributionDialogProps {
  owner: Owner
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddContributionDialog({ owner, open, onOpenChange }: AddContributionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof contributionSchema>>({
    resolver: zodResolver(contributionSchema),
    defaultValues: {
      amount: 0,
    },
  })

  const onSubmit = async (values: z.infer<typeof contributionSchema>) => {
    setIsSubmitting(true)
    try {
      const ownerRef = doc(db, "owners", owner.id);
      await updateDoc(ownerRef, {
        contributionBHD: increment(values.amount),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Success",
        description: `Contribution added to ${owner.name}.`,
      })
      form.reset()
      onOpenChange(false)
    } catch (error) {
      console.error("Error adding contribution: ", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add contribution. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Contribution for {owner.name}</DialogTitle>
          <DialogDescription>
            Enter the amount to add to their contribution total.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (BHD)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Contribution"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
