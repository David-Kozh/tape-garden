"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Flag, Loader2, ArrowLeft } from "lucide-react";
import type {
  ItemIssueCase,
  ItemType,
  ProducerReportCase,
  ReportCaseType,
} from "@/types";

const VALID_TYPES: ReportCaseType[] = [
  "item_issue",
  "copyright_infringement",
  "producer_report",
];

const TYPE_META: Record<
  ReportCaseType,
  { title: string; subtitle: string; badge: string }
> = {
  item_issue: {
    title: "Report an Item Issue",
    subtitle:
      "Let us know if a beat or sample pack has corrupted files, misleading metadata, or inappropriate content.",
    badge: "Item Issue",
  },
  copyright_infringement: {
    title: "Report Copyright Infringement",
    subtitle:
      "Submit a copyright or DMCA takedown claim for unauthorized use of your original work.",
    badge: "Copyright Infringement",
  },
  producer_report: {
    title: "Report a Producer",
    subtitle:
      "Report producer impersonation, fraudulent behavior, or harassment.",
    badge: "Producer Report",
  },
};

function ReportFormContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const rawType = searchParams.get("type") as ReportCaseType | null;
  const caseType: ReportCaseType =
    rawType && VALID_TYPES.includes(rawType) ? rawType : "item_issue";

  const paramItemType = searchParams.get("itemType") as ItemType | null;
  const paramItemId = searchParams.get("itemId") || "";
  const paramItemTitle = searchParams.get("itemTitle") || "";
  const paramProducerId = searchParams.get("producerId") || "";
  const paramProducerName = searchParams.get("producerName") || "";

  const [reporterNameOverride, setReporterNameOverride] = useState<string | null>(null);
  const [reporterEmailOverride, setReporterEmailOverride] = useState<string | null>(null);
  const reporterName = reporterNameOverride ?? user?.displayName ?? "";
  const reporterEmail = reporterEmailOverride ?? user?.email ?? "";

  // Target fields (pre-filled from URL or entered manually)
  const [itemType, setItemType] = useState<ItemType>(
    paramItemType === "samplePack" ? "samplePack" : "beat"
  );
  const [itemId, setItemId] = useState(paramItemId);
  const [itemTitle, setItemTitle] = useState(paramItemTitle);
  const [producerId, setProducerId] = useState(paramProducerId);
  const [producerName, setProducerName] = useState(paramProducerName);

  // Type-specific fields
  const [itemIssueReason, setItemIssueReason] =
    useState<ItemIssueCase["reason"]>("corrupted_file");
  const [producerReason, setProducerReason] =
    useState<ProducerReportCase["reason"]>("impersonation");
  const [originalWorkUrl, setOriginalWorkUrl] = useState("");
  const [rightsHolderAttestation, setRightsHolderAttestation] = useState(false);

  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const hasPrefilledItem = Boolean(paramItemId);
  const hasPrefilledProducer = Boolean(paramProducerId);
  const meta = TYPE_META[caseType];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reporterName.trim() || !reporterEmail.trim() || !description.trim()) {
      toast.error("Please fill in your name, email, and description.");
      return;
    }

    if (caseType === "copyright_infringement" && !rightsHolderAttestation) {
      toast.error(
        "Please confirm the rights-holder attestation before submitting."
      );
      return;
    }

    if (
      (caseType === "item_issue" || caseType === "copyright_infringement") &&
      !itemId.trim() &&
      !itemTitle.trim()
    ) {
      toast.error("Please specify the item you are reporting.");
      return;
    }

    if (
      caseType === "producer_report" &&
      !producerId.trim() &&
      !producerName.trim()
    ) {
      toast.error("Please specify the producer you are reporting.");
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const basePayload = {
        type: caseType,
        status: "open" as const,
        reporter: {
          ...(user?.uid ? { uid: user.uid } : {}),
          name: reporterName.trim(),
          email: reporterEmail.trim(),
        },
        description: description.trim(),
        caseNotes: [],
        createdAt: now,
        updatedAt: now,
      };

      let payload: Record<string, unknown>;

      if (caseType === "item_issue") {
        payload = {
          ...basePayload,
          target: {
            itemType,
            itemId: itemId.trim() || "unspecified",
            producerId: producerId.trim() || "unspecified",
            ...(itemTitle.trim() ? { itemTitle: itemTitle.trim() } : {}),
          },
          reason: itemIssueReason,
        };
      } else if (caseType === "copyright_infringement") {
        payload = {
          ...basePayload,
          target: {
            itemType,
            itemId: itemId.trim() || "unspecified",
            producerId: producerId.trim() || "unspecified",
            ...(itemTitle.trim() ? { itemTitle: itemTitle.trim() } : {}),
          },
          ...(originalWorkUrl.trim()
            ? { originalWorkUrl: originalWorkUrl.trim() }
            : {}),
          rightsHolderAttestation,
        };
      } else {
        payload = {
          ...basePayload,
          target: {
            producerId: producerId.trim() || "unspecified",
            ...(producerName.trim()
              ? { producerName: producerName.trim() }
              : {}),
          },
          reason: producerReason,
        };
      }

      const docRef = await addDoc(collection(db, "reportCases"), payload);
      setSubmittedId(docRef.id);
      toast.success("Report submitted. Our team will review it shortly.");
    } catch (error) {
      console.error("Error submitting report case:", error);
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <CardTitle>Report Submitted</CardTitle>
            <CardDescription>
              Thank you for letting us know. Your case reference ID is{" "}
              <span className="font-mono text-foreground">{submittedId}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center gap-3">
            {user && (
              <Button
                variant="outline"
                render={<Link href="/dashboard/collection" />}
              >
                Back to Collection
              </Button>
            )}
            <Button render={<Link href="/" />}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 -ml-2 text-muted-foreground"
            render={<Link href={user ? "/dashboard/collection" : "/"} />}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-destructive" />
                <CardTitle>{meta.title}</CardTitle>
              </div>
              <Badge variant="secondary">{meta.badge}</Badge>
            </div>
            <CardDescription>{meta.subtitle}</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Target Summary (when prefilled from URL) or Manual Target Inputs */}
              {(caseType === "item_issue" ||
                caseType === "copyright_infringement") &&
                (hasPrefilledItem ? (
                  <div className="rounded-lg border border-border bg-muted/40 p-3.5 text-sm space-y-1">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Reporting Item
                    </div>
                    <div className="font-medium text-foreground">
                      {itemTitle || itemId}{" "}
                      <span className="text-muted-foreground font-normal">
                        ({itemType === "samplePack" ? "Sample Pack" : "Beat"})
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="itemType">Item Type</Label>
                      <select
                        id="itemType"
                        value={itemType}
                        onChange={(e) =>
                          setItemType(e.target.value as ItemType)
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
                      >
                        <option value="beat">Beat</option>
                        <option value="samplePack">Sample Pack</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="itemTitle">Item Title or URL</Label>
                      <Input
                        id="itemTitle"
                        value={itemTitle}
                        onChange={(e) => setItemTitle(e.target.value)}
                        placeholder="e.g. Midnight Tape"
                        required
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="itemId">Item ID (optional)</Label>
                      <Input
                        id="itemId"
                        value={itemId}
                        onChange={(e) => setItemId(e.target.value)}
                        placeholder="Paste item ID if known"
                      />
                    </div>
                  </div>
                ))}

              {caseType === "producer_report" &&
                (hasPrefilledProducer ? (
                  <div className="rounded-lg border border-border bg-muted/40 p-3.5 text-sm space-y-1">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Reporting Producer
                    </div>
                    <div className="font-medium text-foreground">
                      {producerName || producerId}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="producerName">Producer Name</Label>
                      <Input
                        id="producerName"
                        value={producerName}
                        onChange={(e) => setProducerName(e.target.value)}
                        placeholder="Producer display name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="producerId">Producer ID (optional)</Label>
                      <Input
                        id="producerId"
                        value={producerId}
                        onChange={(e) => setProducerId(e.target.value)}
                        placeholder="Paste producer ID if known"
                      />
                    </div>
                  </div>
                ))}

              {/* Type-specific fields */}
              {caseType === "item_issue" && (
                <div className="space-y-2">
                  <Label htmlFor="itemIssueReason">Issue Category</Label>
                  <select
                    id="itemIssueReason"
                    value={itemIssueReason}
                    onChange={(e) =>
                      setItemIssueReason(
                        e.target.value as ItemIssueCase["reason"]
                      )
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
                  >
                    <option value="corrupted_file">
                      Corrupted or Missing File
                    </option>
                    <option value="misleading_metadata">
                      Misleading Metadata / License Info
                    </option>
                    <option value="inappropriate_content">
                      Inappropriate Content
                    </option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}

              {caseType === "producer_report" && (
                <div className="space-y-2">
                  <Label htmlFor="producerReason">Reason</Label>
                  <select
                    id="producerReason"
                    value={producerReason}
                    onChange={(e) =>
                      setProducerReason(
                        e.target.value as ProducerReportCase["reason"]
                      )
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
                  >
                    <option value="impersonation">Impersonation</option>
                    <option value="fraud">Fraud / Scam</option>
                    <option value="harassment">Harassment</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}

              {caseType === "copyright_infringement" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="originalWorkUrl">
                      Link to Original Work (optional)
                    </Label>
                    <Input
                      id="originalWorkUrl"
                      type="url"
                      value={originalWorkUrl}
                      onChange={(e) => setOriginalWorkUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="flex items-start gap-2.5 rounded-md border border-border p-3 bg-muted/20">
                    <input
                      id="attestation"
                      type="checkbox"
                      checked={rightsHolderAttestation}
                      onChange={(e) =>
                        setRightsHolderAttestation(e.target.checked)
                      }
                      className="mt-1 h-4 w-4 rounded border-border"
                      required
                    />
                    <Label
                      htmlFor="attestation"
                      className="text-xs leading-relaxed font-normal text-muted-foreground cursor-pointer"
                    >
                      I state under good faith that I am the copyright owner (or
                      authorized to act on their behalf) and that the reported
                      use is not authorized by the rights holder or the law.
                    </Label>
                  </div>
                </>
              )}

              {/* Reporter Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reporterName">Your Name</Label>
                  <Input
                    id="reporterName"
                    value={reporterName}
                    onChange={(e) => setReporterNameOverride(e.target.value)}
                    placeholder="Full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reporterEmail">Your Email</Label>
                  <Input
                    id="reporterEmail"
                    type="email"
                    value={reporterEmail}
                    onChange={(e) => setReporterEmailOverride(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Details</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue in detail..."
                  rows={4}
                  required
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Report"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
          Loading report form...
        </div>
      }
    >
      <ReportFormContent />
    </Suspense>
  );
}
