"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { User } from "@/types";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, Plus, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

const notify = (title: string, description: string, type: "success" | "error" = "success") => {
  if (type === "error") {
    toast.error(title, { description });
  } else {
    toast.success(title, { description });
  }
};

const socialPlatforms = ["SoundCloud", "Instagram", "Twitter", "YouTube", "Spotify", "Other"] as const;

const socialLinkSchema = z.object({
  platform: z.enum(socialPlatforms),
  url: z.string().url({ message: "Please enter a valid URL." }).or(z.literal("")),
});

const profileSchema = z.object({
  displayName: z.string().min(2, { message: "Display name must be at least 2 characters." }).max(50),
  bio: z.string().max(500, { message: "Bio cannot exceed 500 characters." }).optional(),
  socialLinks: z.array(socialLinkSchema).max(5, { message: "You can add up to 5 social links." }),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      bio: "",
      socialLinks: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    name: "socialLinks",
    control: form.control,
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as User;
          
          // Set form values
          form.reset({
            displayName: data.displayName || "",
            bio: data.producerProfile?.bio || "",
            socialLinks: data.producerProfile?.socialLinks ? 
              data.producerProfile.socialLinks.map(link => {
                // If it's stored as a string array, try to parse it or convert to our object format
                try {
                  const parsed = JSON.parse(link as unknown as string);
                  if (parsed.platform && parsed.url) return parsed;
                  return { platform: "Other", url: link };
                } catch {
                  return { platform: "Other", url: link };
                }
              }) : [],
          });
          
          if (data.producerProfile?.avatarUrl) {
            setAvatarUrl(data.producerProfile.avatarUrl);
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        notify("Error", "Failed to load profile data.", "error");
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchProfile();
    }
  }, [user, authLoading, form]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      notify("Invalid file", "Please select an image file.", "error");
      return;
    }

    // Max size 5MB
    if (file.size > 5 * 1024 * 1024) {
      notify("File too large", "Avatar image must be less than 5MB.", "error");
      return;
    }

    setUploadingAvatar(true);
    try {
      const extension = file.name.split('.').pop();
      const storageRef = ref(storage, `avatars/${user.uid}/avatar.${extension}`);
      
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on(
        "state_changed",
        null,
        (error) => {
          console.error("Upload error:", error);
          notify("Upload Failed", error.message, "error");
          setUploadingAvatar(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setAvatarUrl(downloadURL);
          setUploadingAvatar(false);
          notify("Avatar Uploaded", "Your new avatar has been uploaded. Don't forget to save your settings.");
        }
      );
    } catch (error: unknown) {
      console.error("Upload error:", error);
      notify("Upload Failed", (error as Error).message, "error");
      setUploadingAvatar(false);
    }
  };

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;
    
    setSaving(true);
    try {
      const docRef = doc(db, "users", user.uid);
      
      // Convert social links back to string array for storage (or store as json strings)
      // Since type is string[] in index.ts, we'll store JSON strings to keep structure
      const socialLinksStrings = data.socialLinks
        .filter(link => link.url && link.url.trim() !== "")
        .map(link => JSON.stringify(link));

      const updateData: Record<string, unknown> = {
        displayName: data.displayName,
      };

      // Merge producer profile fields individually to respect security rules
      if (data.bio !== undefined) updateData["producerProfile.bio"] = data.bio;
      if (socialLinksStrings !== undefined) updateData["producerProfile.socialLinks"] = socialLinksStrings;
      if (avatarUrl) updateData["producerProfile.avatarUrl"] = avatarUrl;

      await updateDoc(docRef, updateData);
      notify("Success", "Profile updated successfully!");
    } catch (error: unknown) {
      console.error("Error updating profile:", error);
      notify("Error", (error as Error).message || "Failed to update profile.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your public producer profile.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Info</CardTitle>
          <CardDescription>
            This information will be displayed on your public gallery page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Avatar Section */}
            <div className="flex items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl || ""} alt="Avatar" />
                <AvatarFallback className="text-xl">
                  {form.getValues("displayName")?.substring(0, 2).toUpperCase() || "ME"}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-3">
                <div>
                  <Label>Avatar Image</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Recommended size: 500x500px. Max size: 5MB.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Upload Image
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                  />
                </div>
              </div>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input 
                id="displayName" 
                placeholder="Your producer name" 
                {...form.register("displayName")} 
              />
              {form.formState.errors.displayName && (
                <p className="text-sm text-destructive font-medium">
                  {form.formState.errors.displayName.message}
                </p>
              )}
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea 
                id="bio" 
                placeholder="Tell us about yourself and your sound..." 
                className="h-32 resize-none"
                {...form.register("bio")} 
              />
              {form.formState.errors.bio && (
                <p className="text-sm text-destructive font-medium">
                  {form.formState.errors.bio.message}
                </p>
              )}
            </div>

            {/* Social Links */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Social Links</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => append({ platform: "SoundCloud", url: "" })}
                  disabled={fields.length >= 5}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Link
                </Button>
              </div>
              
              <div className="space-y-3">
                {fields.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No social links added yet.</p>
                )}
                
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-start gap-2">
                    <div className="w-1/3">
                      <select
                        className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        {...form.register(`socialLinks.${index}.platform`)}
                      >
                        {socialPlatforms.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 space-y-1">
                      <Input 
                        placeholder="https://..." 
                        {...form.register(`socialLinks.${index}.url`)} 
                      />
                      {form.formState.errors.socialLinks?.[index]?.url && (
                        <p className="text-xs text-destructive font-medium">
                          {form.formState.errors.socialLinks[index]?.url?.message}
                        </p>
                      )}
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => remove(index)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {form.formState.errors.socialLinks?.root && (
                  <p className="text-sm text-destructive font-medium">
                    {form.formState.errors.socialLinks.root.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={saving || uploadingAvatar}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
