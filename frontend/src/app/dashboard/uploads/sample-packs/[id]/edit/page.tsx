"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Edit3, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import type { SamplePack } from "@/types";
import { toast } from "sonner";

export default function EditSamplePackPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { id } = useParams() as { id: string };

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [price, setPrice] = useState("");

  useEffect(() => {
    async function fetchSamplePack() {
      if (!user || !id) return;
      try {
        const packRef = doc(db, "samplePacks", id);
        const packDoc = await getDoc(packRef);
        
        if (!packDoc.exists()) {
          setError("Sample pack not found.");
          setLoadingInitial(false);
          return;
        }

        const data = packDoc.data() as SamplePack;
        if (data.producerId !== user.uid) {
          setError("You do not have permission to edit this sample pack.");
          setLoadingInitial(false);
          return;
        }

        setTitle(data.title || "");
        setDescription(data.description || "");
        setTags((data.tags || []).join(", "));
        setPrice(data.price ? data.price.toString() : "");

      } catch (err) {
        console.error("Error fetching sample pack:", err);
        setError("Could not load sample pack data.");
      } finally {
        setLoadingInitial(false);
      }
    }

    fetchSamplePack();
  }, [user, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    if (!title || !price) {
      setError("Title and price are required.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const packRef = doc(db, "samplePacks", id);
      
      const parsedTags = tags.split(",").map(t => t.trim()).filter(Boolean);
      const parsedPrice = parseFloat(price);

      await updateDoc(packRef, {
        title,
        description,
        tags: parsedTags,
        price: parsedPrice,
        updatedAt: new Date()
      });

      toast.success("Sample pack successfully updated!");
      router.push("/dashboard/uploads");

    } catch (err) {
      console.error("Update error:", err);
      setError("An error occurred while saving. Please try again.");
      setIsSaving(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error && error !== "Title and price are required.") {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{error}</p>
            <Button variant="outline" onClick={() => router.push("/dashboard/uploads")}>
              Return to Uploads
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Edit3 className="w-8 h-8 text-primary" />
          Edit Sample Pack Metadata
        </h1>
        <p className="text-muted-foreground mt-1">
          Update the details and pricing for your sample pack.
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md flex items-start gap-2">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Sample Pack Details</CardTitle>
            <CardDescription>Core metadata for discovery and display.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">Title *</label>
              <input
                id="title"
                type="text"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">Description</label>
              <textarea
                id="description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="tags" className="text-sm font-medium">Tags</label>
              <input
                id="tags"
                type="text"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="drums, analog, one-shots (comma separated)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                disabled={isSaving}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
            <CardDescription>Update the price for the sample pack.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-w-xs">
              <label htmlFor="price" className="text-sm font-medium">Price (USD) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <input
                  id="price"
                  type="number"
                  step="0.01"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="bg-card border border-border p-6 rounded-xl flex items-center justify-between shadow-sm">
          <p className="text-sm text-muted-foreground">
            Changes will be reflected immediately on the public gallery.
          </p>
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/uploads")}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={isSaving || !title || !price}
              className="gap-2"
            >
              {isSaving ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
              ) : (
                <><CheckCircle2 className="w-5 h-5" /> Save Changes</>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
