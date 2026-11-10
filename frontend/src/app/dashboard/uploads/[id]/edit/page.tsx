"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Edit3, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import type { Beat, BeatLicense } from "@/types";
import { toast } from "sonner";
import {
  LicenseSelector,
  createDefaultLicenseItems,
  validateLicenseItems,
  DEFAULT_STREAM_CAP,
  type LicenseFormItem,
  type CustomizableLicenseType,
} from "@/components/dashboard/LicenseSelector";

export default function EditBeatPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { id } = useParams() as { id: string };

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [bpm, setBpm] = useState("");
  const [key, setKey] = useState("");
  const [tags, setTags] = useState("");
  const [licenses, setLicenses] = useState<LicenseFormItem[]>(() =>
    createDefaultLicenseItems()
  );
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const isTypingBpmRef = useRef(false);

  const handleBpmKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (bpm === "" && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      setBpm(e.key === "ArrowUp" ? "121" : "119");
      return;
    }
    isTypingBpmRef.current = true;
  };

  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const wasTyping = isTypingBpmRef.current;
    isTypingBpmRef.current = false;

    if (bpm === "" && !wasTyping && (val === "1" || val === "-1")) {
      setBpm(val === "1" ? "121" : "119");
      return;
    }

    setBpm(val);
  };

  useEffect(() => {
    async function fetchBeat() {
      if (!user || !id) return;
      try {
        const beatRef = doc(db, "beats", id);
        const beatDoc = await getDoc(beatRef);
        
        if (!beatDoc.exists()) {
          setError("Beat not found.");
          setLoadingInitial(false);
          return;
        }

        const data = beatDoc.data() as Beat;
        if (data.producerId !== user.uid) {
          setError("You do not have permission to edit this beat.");
          setLoadingInitial(false);
          return;
        }

        setTitle(data.title || "");
        setBpm(data.bpm ? data.bpm.toString() : "");
        setKey(data.key || "");
        setTags((data.tags || []).join(", "));
        
        if (data.licenses && data.licenses.length > 0) {
          const seen = new Set<CustomizableLicenseType>();
          const mapped: LicenseFormItem[] = [];
          for (const [idx, l] of data.licenses.entries()) {
            const normalizedType: CustomizableLicenseType =
              l.type === "premium-unlimited" ||
              l.type === "unlimited" ||
              l.type === "exclusive"
                ? "premium-unlimited"
                : "limited";
            if (seen.has(normalizedType)) continue;
            seen.add(normalizedType);
            mapped.push({
              id: `license-${normalizedType}-${idx}`,
              type: normalizedType,
              price: typeof l.price === "number" ? l.price.toString() : "",
              streamCap:
                typeof l.streamCap === "number"
                  ? l.streamCap.toString()
                  : String(DEFAULT_STREAM_CAP),
            });
          }
          mapped.sort((a, b) => (a.type === "limited" ? -1 : b.type === "limited" ? 1 : 0));
          if (mapped.length > 0) {
            setLicenses(mapped.slice(0, 2));
          }
        }

      } catch (err) {
        console.error("Error fetching beat:", err);
        setError("Could not load beat data.");
      } finally {
        setLoadingInitial(false);
      }
    }

    fetchBeat();
  }, [user, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    setAttemptedSubmit(true);

    const licenseValidation = validateLicenseItems(licenses);
    if (!title.trim() || !bpm || !key.trim()) {
      setError("Title, BPM, and key are required.");
      return;
    }
    if (!licenseValidation.valid) {
      setError(
        licenseValidation.globalError ||
          "Please fix the license pricing or stream cap errors before saving."
      );
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const beatRef = doc(db, "beats", id);
      
      const parsedBpm = bpm ? parseInt(bpm, 10) : null;
      const parsedTags = tags.split(",").map(t => t.trim()).filter(Boolean);

      // Fetch existing licenses to preserve fileUrl paths
      const beatDoc = await getDoc(beatRef);
      const data = beatDoc.data() as Beat;
      const existingLicenses = data.licenses || [];
      const fallbackFileUrl = existingLicenses[0]?.fileUrl || "";

      const updatedLicenses: BeatLicense[] = licenseValidation.sortedLicenses.map(
        (license) => {
          const existingMatch = existingLicenses.find(
            (el) =>
              el.type === license.type ||
              (license.type === "limited" && el.type === "non-exclusive") ||
              (license.type === "premium-unlimited" &&
                (el.type === "unlimited" || el.type === "exclusive"))
          );
          return {
            type: license.type,
            price: license.price,
            ...(license.type === "limited" && typeof license.streamCap === "number"
              ? { streamCap: license.streamCap }
              : {}),
            fileUrl: existingMatch?.fileUrl || fallbackFileUrl,
          };
        }
      );

      await updateDoc(beatRef, {
        title,
        bpm: parsedBpm,
        key,
        tags: parsedTags,
        licenses: updatedLicenses,
        updatedAt: new Date()
      });

      toast.success("Beat successfully updated!");
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

  if (error && (error === "Beat not found." || error === "You do not have permission to edit this beat." || error === "Could not load beat data.")) {
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
          Edit Beat Metadata
        </h1>
        <p className="text-muted-foreground mt-1">
          Update the details and pricing for your beat.
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
            <CardTitle>Beat Details</CardTitle>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="bpm" className="text-sm font-medium">BPM *</label>
                <input
                  id="bpm"
                  type="number"
                  required
                  min={bpm ? 1 : undefined}
                  placeholder="120"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={bpm}
                  onKeyDown={handleBpmKeyDown}
                  onChange={handleBpmChange}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="key" className="text-sm font-medium">Key *</label>
                <input
                  id="key"
                  type="text"
                  required
                  placeholder="C minor"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="tags" className="text-sm font-medium">Tags</label>
              <input
                id="tags"
                type="text"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="trap, dark, lo-fi (comma separated)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                disabled={isSaving}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Licensing &amp; Pricing</CardTitle>
            <CardDescription>
              Update the license tiers and pricing for your beat. Limited licenses must be priced lower than Premium-Unlimited.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LicenseSelector
              licenses={licenses}
              onChange={setLicenses}
              disabled={isSaving}
              showAllErrors={attemptedSubmit}
            />
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
              disabled={
                isSaving ||
                !title.trim() ||
                !bpm ||
                !key.trim() ||
                !validateLicenseItems(licenses).valid
              }
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
