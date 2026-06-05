"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { serverTimestamp, collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";

const applicationSchema = z.object({
  displayName: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  portfolioUrl: z.string().url("Please enter a valid URL (e.g. https://...)."),
  note: z.string().optional(),
});

type ApplicationFormValues = z.infer<typeof applicationSchema>;

export default function ApplyPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      displayName: "",
      email: "",
      portfolioUrl: "",
      note: "",
    },
  });

  const onSubmit = async (data: ApplicationFormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await addDoc(collection(db, "applications"), {
        displayName: data.displayName,
        email: data.email,
        portfolioUrl: data.portfolioUrl,
        note: data.note || "",
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setIsSuccess(true);
    } catch (error) {
      console.error("Error submitting application:", error);
      setSubmitError("Something went wrong submitting your application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-6 text-center">
          <h1 className="text-2xl font-medium tracking-tight">Application Received</h1>
          <p className="text-muted-foreground leading-relaxed">
            Thank you for sharing your work with us. We take the time to review each submission carefully, and we will be in touch via email soon.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="max-w-xl w-full py-12 space-y-10">
        <header className="space-y-4">
          <h1 className="text-3xl font-medium tracking-tight">Apply for Tape Garden</h1>
          <p className="text-muted-foreground leading-relaxed">
            We are currently reviewing producers for the next intake. Please share your details and a link to your best work.
          </p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {submitError && (
            <div className="p-4 bg-red-50 text-red-900 border border-red-200 rounded-md">
              <p className="text-sm">{submitError}</p>
            </div>
          )}

          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="displayName" className="block text-sm font-medium text-foreground">
                Display Name
              </label>
              <input
                id="displayName"
                {...register("displayName")}
                disabled={isSubmitting}
                className="w-full px-4 py-3 bg-background text-foreground border border-input rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring disabled:opacity-50 transition-colors"
                placeholder="How should we call you?"
              />
              {errors.displayName && (
                <p className="text-sm text-destructive">{errors.displayName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                {...register("email")}
                disabled={isSubmitting}
                className="w-full px-4 py-3 bg-background text-foreground border border-input rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring disabled:opacity-50 transition-colors"
                placeholder="For our decision email"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="portfolioUrl" className="block text-sm font-medium text-foreground">
                Portfolio URL
              </label>
              <input
                id="portfolioUrl"
                type="url"
                {...register("portfolioUrl")}
                disabled={isSubmitting}
                className="w-full px-4 py-3 bg-background text-foreground border border-input rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring disabled:opacity-50 transition-colors"
                placeholder="https://  ..."
              />
              {errors.portfolioUrl && (
                <p className="text-sm text-destructive">{errors.portfolioUrl.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="note" className="block text-sm font-medium text-foreground">
                Note <span className="text-muted-foreground font-normal">(Optional)</span>
              </label>
              <textarea
                id="note"
                {...register("note")}
                disabled={isSubmitting}
                rows={4}
                className="w-full px-4 py-3 bg-background text-foreground border border-input rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring disabled:opacity-50 transition-colors resize-y"
                placeholder="Anything else you'd like us to know?"
              />
              {errors.note && (
                <p className="text-sm text-destructive">{errors.note.message}</p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-6 text-base font-medium rounded-md shadow-sm transition-colors"
          >
            {isSubmitting ? "Submitting..." : "Submit Application"}
          </Button>
        </form>
      </div>
    </main>
  );
}
