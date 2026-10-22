import { redirect } from "next/navigation";

export default async function SamplePacksGalleryPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const params = new URLSearchParams();
  params.set("view", "packs");
  if (resolvedParams) {
    for (const [key, value] of Object.entries(resolvedParams)) {
      if (key !== "view" && typeof value === "string") {
        params.set(key, value);
      }
    }
  }
  redirect(`/gallery?${params.toString()}`);
}
