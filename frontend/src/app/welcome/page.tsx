"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ProducerIntake } from "@/components/ProducerIntake";

function WelcomeIntakeContent() {
  const searchParams = useSearchParams();
  const oobCode = searchParams.get("oobCode") || undefined;

  return <ProducerIntake mode="application" oobCode={oobCode} />;
}

export default function WelcomeIntakePage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 w-full flex items-center justify-center text-muted-foreground py-24">
          <Loader2 className="w-8 h-8 text-leaf-600 animate-spin" />
        </div>
      }
    >
      <WelcomeIntakeContent />
    </Suspense>
  );
}

