"use client";

import { useEffect, useMemo, useState } from "react";
import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { FileText, Loader2, RefreshCw } from "lucide-react";
import type {
  CaseNoteEntry,
  ReportCase,
  ReportCaseStatus,
  ReportCaseType,
} from "@/types";

const STATUS_OPTIONS: ReportCaseStatus[] = [
  "open",
  "under_review",
  "pending_counter_notice",
  "content_removed",
  "resolved",
  "dismissed",
];

const TYPE_LABELS: Record<ReportCaseType, string> = {
  copyright_infringement: "Copyright",
  producer_report: "Producer",
  item_issue: "Item Issue",
};

const STATUS_LABELS: Record<ReportCaseStatus, string> = {
  open: "Open",
  under_review: "Under Review",
  pending_counter_notice: "Pending Counter Notice",
  content_removed: "Content Removed",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

function formatTimestamp(value: Date | string | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

function getTargetLabel(report: ReportCase): string {
  if (report.type === "producer_report") {
    return report.target.producerName || report.target.producerId;
  }
  return (
    report.target.itemTitle ||
    `${report.target.itemType}: ${report.target.itemId}`
  );
}

export default function AdminReportsPage() {
  const { user } = useAuth();

  const [cases, setCases] = useState<ReportCase[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // View Notes modal state
  const [notesCase, setNotesCase] = useState<ReportCase | null>(null);

  // Update Case modal state
  const [editingCase, setEditingCase] = useState<ReportCase | null>(null);
  const [newStatus, setNewStatus] = useState<ReportCaseStatus>("under_review");
  const [actionTaken, setActionTaken] = useState("");
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);

  const loadCases = async () => {
    try {
      const q = query(
        collection(db, "reportCases"),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ReportCase, "id">),
        caseNotes: Array.isArray(d.data().caseNotes) ? d.data().caseNotes : [],
      })) as ReportCase[];
    } catch (err) {
      console.error("Error fetching report cases:", err);
      toast.error("Failed to load report cases.");
      return null;
    }
  };

  const fetchCases = async () => {
    setLoading(true);
    const list = await loadCases();
    if (list) setCases(list);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    loadCases().then((list) => {
      if (cancelled) return;
      if (list) setCases(list);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      return true;
    });
  }, [cases, statusFilter, typeFilter]);

  const openUpdateModal = (report: ReportCase) => {
    setEditingCase(report);
    setNewStatus(report.status);
    setActionTaken("");
    setNoteText("");
  };

  const handleUpdateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCase || !user) return;

    if (!actionTaken.trim() || !noteText.trim()) {
      toast.error("Please enter both an action taken and notes.");
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const entry: CaseNoteEntry = {
        fromStatus: editingCase.status,
        newStatus,
        action: actionTaken.trim(),
        note: noteText.trim(),
        actorId: user.uid,
        createdAt: now,
      };

      await updateDoc(doc(db, "reportCases", editingCase.id), {
        status: newStatus,
        updatedAt: now,
        caseNotes: arrayUnion(entry),
      });

      setCases((prev) =>
        prev.map((c) =>
          c.id === editingCase.id
            ? {
                ...c,
                status: newStatus,
                updatedAt: now,
                caseNotes: [...c.caseNotes, entry],
              }
            : c
        )
      );

      toast.success("Case updated.");
      setEditingCase(null);
    } catch (err) {
      console.error("Error updating report case:", err);
      toast.error("Failed to update case.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Report Cases</h1>
          <p className="text-sm text-muted-foreground">
            Review external copyright, producer, and item issue reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter by case type"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All Types</option>
            <option value="copyright_infringement">Copyright</option>
            <option value="producer_report">Producer</option>
            <option value="item_issue">Item Issue</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchCases}
            disabled={loading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Reporter</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  Loading report cases...
                </TableCell>
              </TableRow>
            ) : filteredCases.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No report cases match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredCases.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <Badge variant="outline">{TYPE_LABELS[report.type]}</Badge>
                  </TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {getTargetLabel(report)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{report.reporter.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {report.reporter.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        report.status === "open" ? "destructive" : "secondary"
                      }
                    >
                      {STATUS_LABELS[report.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatTimestamp(report.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={report.caseNotes.length === 0}
                        onClick={() => setNotesCase(report)}
                      >
                        <FileText className="w-3.5 h-3.5 mr-1.5" />
                        View Notes ({report.caseNotes.length})
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => openUpdateModal(report)}
                      >
                        Update Case
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* View Notes Timeline Modal */}
      <Dialog
        open={Boolean(notesCase)}
        onOpenChange={(open) => !open && setNotesCase(null)}
      >
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Case Notes Timeline</DialogTitle>
            <DialogDescription>
              {notesCase
                ? `${TYPE_LABELS[notesCase.type]} — ${getTargetLabel(notesCase)}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {notesCase?.caseNotes.map((entry, idx) => (
              <div
                key={`${entry.createdAt}-${idx}`}
                className="rounded-lg border border-border p-3 space-y-1.5 bg-muted/20"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 font-medium">
                    {entry.fromStatus && (
                      <>
                        <span className="text-muted-foreground">
                          {STATUS_LABELS[entry.fromStatus]}
                        </span>
                        <span className="text-muted-foreground">→</span>
                      </>
                    )}
                    <Badge variant="secondary">
                      {STATUS_LABELS[entry.newStatus]}
                    </Badge>
                  </div>
                  <span className="text-muted-foreground">
                    {formatTimestamp(entry.createdAt)}
                  </span>
                </div>
                <div className="text-xs font-medium text-foreground">
                  Action: <span className="font-mono">{entry.action}</span>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {entry.note}
                </p>
                <div className="text-[11px] text-muted-foreground">
                  Actor: <span className="font-mono">{entry.actorId}</span>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesCase(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Case Modal */}
      <Dialog
        open={Boolean(editingCase)}
        onOpenChange={(open) => !open && setEditingCase(null)}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Report Case</DialogTitle>
            <DialogDescription>
              {editingCase
                ? `${TYPE_LABELS[editingCase.type]} — ${getTargetLabel(editingCase)}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {editingCase && (
            <form onSubmit={handleUpdateCase} className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm space-y-1.5">
                <div>
                  <span className="font-medium">Reporter:</span>{" "}
                  {editingCase.reporter.name} ({editingCase.reporter.email})
                </div>
                {"reason" in editingCase && (
                  <div>
                    <span className="font-medium">Reason:</span>{" "}
                    {editingCase.reason}
                  </div>
                )}
                {editingCase.type === "copyright_infringement" &&
                  editingCase.originalWorkUrl && (
                    <div className="truncate">
                      <span className="font-medium">Original Work:</span>{" "}
                      <a
                        href={editingCase.originalWorkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-primary"
                      >
                        {editingCase.originalWorkUrl}
                      </a>
                    </div>
                  )}
                <div>
                  <span className="font-medium">Details:</span>
                  <p className="text-muted-foreground mt-0.5 whitespace-pre-wrap">
                    {editingCase.description}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newStatus">New Status</Label>
                <select
                  id="newStatus"
                  value={newStatus}
                  onChange={(e) =>
                    setNewStatus(e.target.value as ReportCaseStatus)
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="actionTaken">Action Taken</Label>
                <Input
                  id="actionTaken"
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  placeholder="e.g. takedown_executed, warning_issued, dismissed"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="caseNote">Notes</Label>
                <Textarea
                  id="caseNote"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Explain the decision and actions taken..."
                  rows={3}
                  required
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingCase(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Update"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
