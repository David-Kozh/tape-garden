"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { db, storage, functions } from "@/lib/firebase";
import { collection, query, where, getCountFromServer, doc, getDoc } from "firebase/firestore";
import { ref, uploadBytesResumable } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, UploadCloud, CheckCircle2, Music, Loader2, ArrowLeft } from "lucide-react";
import type { User } from "@/types";

export function SamplePackUploadForm({ onCancel }: { onCancel: () => void }) {
  const { user } = useAuth();
  const router = useRouter();

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [canUpload, setCanUpload] = useState(false);
  const [slotInfo, setSlotInfo] = useState({ used: 0, total: 0 });

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [price, setPrice] = useState("49.99");

  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [archiveFile, setArchiveFile] = useState<File | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [error, setError] = useState("");

  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function checkSlots() {
      if (!user) return;
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          setLoadingInitial(false);
          return;
        }

        const userData = userDoc.data() as User;
        const profile = userData.producerProfile;
        if (!profile || profile.status !== "approved") {
          setError("You must be an approved producer to upload sample packs.");
          setLoadingInitial(false);
          return;
        }

        const totalSlots = profile.allocatedSamplePackSlots || 0;

        const packsQuery = query(
          collection(db, "samplePacks"),
          where("producerId", "==", user.uid),
          where("status", "in", ["published", "draft"])
        );
        const packsSnapshot = await getCountFromServer(packsQuery);
        const usedSlots = packsSnapshot.data().count;

        setSlotInfo({ used: usedSlots, total: totalSlots });
        if (usedSlots < totalSlots) {
          setCanUpload(true);
        }
      } catch (err) {
        console.error("Error checking slots:", err);
        setError("Could not verify your upload slots. Please try again.");
      } finally {
        setLoadingInitial(false);
      }
    }

    checkSlots();
  }, [user]);

  const handlePreviewChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        setError("Preview file exceeds 100MB limit.");
        return;
      }
      setPreviewFile(file);
      setError("");
    }
  };

  const handleArchiveChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024 * 1024) {
        setError("Archive file exceeds 500MB limit.");
        return;
      }
      setArchiveFile(file);
      setError("");
    }
  };

  const uploadFile = async (file: File, path: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(prev => Math.min(prev + progress * 0.01, 100));
        },
        (error) => {
          console.error("Upload error:", error);
          reject(error);
        },
        () => {
          resolve();
        }
      );
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title || !description || !previewFile || !archiveFile || !price) {
      setError("Please fill in all required fields and select files.");
      return;
    }

    setIsUploading(true);
    setError("");
    setUploadProgress(0);

    try {
      const uploadId = Math.random().toString(36).substring(2, 15);
      const previewFileName = `preview_${Date.now()}_${previewFile.name.replace(/[^a-zA-Z0-9.]/g, "")}`;
      const archiveFileName = `archive_${Date.now()}_${archiveFile.name.replace(/[^a-zA-Z0-9.]/g, "")}`;

      // Upload Preview
      setUploadStatus("Uploading preview audio...");
      await uploadFile(previewFile, `uploads-staging/${user.uid}/sample-packs/${uploadId}/${previewFileName}`);
      setUploadProgress(35); // Hardcoded mid-point for UX

      // Upload Archive
      setUploadStatus("Uploading archive ZIP...");
      await uploadFile(archiveFile, `uploads-staging/${user.uid}/sample-packs/${uploadId}/${archiveFileName}`);
      setUploadProgress(90);

      setUploadStatus("Finalizing sample pack publication...");

      // Call Cloud Function
      const publishSamplePack = httpsCallable(functions, "publishSamplePack");
      await publishSamplePack({
        uploadId,
        metadata: {
          title,
          description,
          tags: tags.split(",").map(t => t.trim()).filter(Boolean),
          price: parseFloat(price),
          audioPreviewFile: previewFileName,
          archiveFile: archiveFileName
        }
      });
      setUploadProgress(100);
      setUploadStatus("Success! Redirecting...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);

    } catch (err) {
      console.error("Publish error:", err);
      const errorMessage = err instanceof Error ? err.message : "An error occurred during upload. Please try again.";
      setError(errorMessage);
      setIsUploading(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!canUpload) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              Upload Limit Reached
            </CardTitle>
            <CardDescription className="text-foreground/80">
              You have reached your maximum allocated sample pack slots.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              You are currently using <strong>{slotInfo.used}</strong> out of <strong>{slotInfo.total}</strong> slots.
              To upload more packs, you must either remove an existing published pack or request a slot increase.
            </p>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      <div>
        <Button variant="ghost" size="sm" onClick={onCancel} className="mb-4 -ml-3 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Selection
        </Button>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <UploadCloud className="w-8 h-8 text-primary" />
          Upload New Sample Pack
        </h1>
        <p className="text-muted-foreground mt-1">
          Publish a new sample pack to the Tape Garden catalog. You have {slotInfo.total - slotInfo.used} slot(s) remaining.
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
            <CardTitle>Pack Details</CardTitle>
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
                placeholder="e.g. Essential Lo-Fi Drums Vol. 1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isUploading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">Description *</label>
              <textarea
                id="description"
                required
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Describe your sample pack and outline its contents (e.g. 20 kicks, 15 snares, 40 synth loops)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isUploading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="tags" className="text-sm font-medium">Tags</label>
              <input
                id="tags"
                type="text"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="drums, lo-fi, chill (comma separated)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                disabled={isUploading}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Files</CardTitle>
            <CardDescription>Upload your audio preview medley and the full contents archive.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Music className="w-4 h-4 text-primary" />
                Audio Preview Medley * <span className="text-xs text-muted-foreground font-normal">(Max 100MB)</span>
              </label>
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef1.current?.click()}
                  disabled={isUploading}
                >
                  Select File
                </Button>
                <span className="text-sm text-muted-foreground truncate max-w-xs">
                  {previewFile ? previewFile.name : "No file selected"}
                </span>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  ref={fileInputRef1}
                  onChange={handlePreviewChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-secondary" />
                Contents Archive (.zip) * <span className="text-xs text-muted-foreground font-normal">(Max 500MB)</span>
              </label>
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef2.current?.click()}
                  disabled={isUploading}
                >
                  Select File
                </Button>
                <span className="text-sm text-muted-foreground truncate max-w-xs">
                  {archiveFile ? archiveFile.name : "No file selected"}
                </span>
                <input
                  type="file"
                  accept=".zip,.rar,.tar"
                  className="hidden"
                  ref={fileInputRef2}
                  onChange={handleArchiveChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
            <CardDescription>Set the flat price for this sample pack.</CardDescription>
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
                  placeholder="49.99"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={isUploading}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="bg-card border border-border p-6 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            {isUploading ? (
              <div className="flex flex-col gap-2 w-64">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> {uploadStatus}
                  </span>
                  <span className="font-medium">{Math.round(uploadProgress)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ensure all files are correct before publishing.
              </p>
            )}
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={isUploading || !title || !description || !previewFile || !archiveFile || !price}
            className="gap-2"
          >
            {isUploading ? (
              <>Publishing...</>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" /> Publish Pack
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
