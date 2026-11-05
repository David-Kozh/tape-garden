"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ProducerIntake } from "@/components/ProducerIntake";

function InviteIntakeContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;
  const oobCode = searchParams.get("oobCode") || undefined;

  if (oobCode || token === "welcome") {
    return <ProducerIntake mode="application" oobCode={oobCode} />;
  }

  return <ProducerIntake mode="invite" token={token} />;
}

export default function InviteIntakePage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 w-full flex items-center justify-center text-muted-foreground py-24">
          <Loader2 className="w-8 h-8 text-leaf-600 animate-spin" />
        </div>
      }
    >
      <InviteIntakeContent />
    </Suspense>
  );
}
