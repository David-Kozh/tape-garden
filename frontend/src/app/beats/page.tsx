import { redirect } from "next/navigation";

export default async function BeatsPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const params = new URLSearchParams();
  if (resolvedParams) {
    for (const [key, value] of Object.entries(resolvedParams)) {
      if (typeof value === "string") {
        params.set(key, value);
      }
    }
  }
  const queryString = params.toString();
  redirect(queryString ? `/gallery?${queryString}` : "/gallery");
}
