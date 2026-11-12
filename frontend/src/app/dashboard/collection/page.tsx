"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useSaved } from "@/context/SavedContext";
import { useAudio } from "@/context/AudioContext";
import { db, functions } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import Link from "next/link";
import Image from "next/image";
import {
  Download,
  FileText,
  Library,
  ExternalLink,
  Loader2,
  ArrowUpRight,
  Bookmark,
  Play,
  Pause,
  Trash2,
  Music2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import type { SavedItem } from "@/types";

interface Purchase {
  id: string;
  itemId: string;
  itemName: string;
  itemType: "beat" | "samplePack";
  producerId: string;
  producerName: string;
  buyerId: string;
  licenseType?: string | null;
  licenseFileUrl?: string;
  upgradedFromPurchaseId?: string | null;
  upgradedToPurchaseId?: string | null;
  priorPricePaid?: number | null;
  status?: string;
  price: number;
  createdAt: Date;
}

interface UpgradeOption {
  unlimitedPrice: number;
  upgradePrice: number;
  coverArtUrl?: string;
  title: string;
}

export default function CollectionPage() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const { savedItems, unsaveItem, loading: savedLoading } = useSaved();
  const { currentTrack, isPlaying, play, togglePlayPause } = useAudio();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"purchases" | "saved">("purchases");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [upgradeOptions, setUpgradeOptions] = useState<Record<string, UpgradeOption>>({});
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingLicenseId, setDownloadingLicenseId] = useState<string | null>(null);

  const handlePlaySavedItem = (item: SavedItem) => {
    const isCurrent = currentTrack?.id === item.itemId;
    if (isCurrent) {
      togglePlayPause();
    } else {
      play({
        id: item.itemId,
        title: item.title,
        producerId: item.producerId,
        producer: { uid: item.producerId, displayName: item.producerName || "Producer" },
        audioPreviewUrl: item.audioPreviewUrl || "",
        coverArtUrl: item.coverArtUrl,
        itemType: item.itemType,
      });
    }
  };

  useEffect(() => {
    async function fetchPurchases() {
      if (!user) return;
      try {
        const q = query(
          collection(db, "purchases"),
          where("buyerId", "==", user.uid)
        );
        const snapshot = await getDocs(q);
        const allFetchedPurchases = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
          } as Purchase;
        });

        // Sort newest first
        allFetchedPurchases.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        // Identify beats where the user already has a completed unlimited/upgraded purchase
        const unlimitedBeatIds = new Set(
          allFetchedPurchases
            .filter(
              (p) =>
                p.itemType === "beat" &&
                (p.licenseType === "premium-unlimited" ||
                  p.licenseType === "unlimited" ||
                  p.licenseType === "exclusive")
            )
            .map((p) => p.itemId)
        );

        // Deduplicate so upgraded 2nd purchase record replaces the old limited purchase record in the collection
        const seenBeatIds = new Set<string>();
        const activePurchases = allFetchedPurchases.filter((p) => {
          if (p.itemType !== "beat") return true;
          if (p.upgradedToPurchaseId) return false;
          if (p.licenseType === "limited" && unlimitedBeatIds.has(p.itemId)) {
            return false;
          }
          if (seenBeatIds.has(p.itemId)) {
            return false;
          }
          seenBeatIds.add(p.itemId);
          return true;
        });

        setPurchases(activePurchases);

        // Check upgrade eligibility for remaining "limited" beat purchases
        const limitedBeatPurchases = activePurchases.filter(
          (p) => p.itemType === "beat" && p.licenseType === "limited"
        );

        if (limitedBeatPurchases.length > 0) {
          const optionsMap: Record<string, UpgradeOption> = {};
          await Promise.all(
            limitedBeatPurchases.map(async (purchase) => {
              try {
                const beatSnap = await getDoc(doc(db, "beats", purchase.itemId));
                if (!beatSnap.exists()) return;
                const beatData = beatSnap.data();
                if (beatData.status !== "published" || !Array.isArray(beatData.licenses)) {
                  return;
                }
                const unlimitedLicense = beatData.licenses.find(
                  (l: { type: string; price: number }) => l.type === "premium-unlimited"
                );
                if (!unlimitedLicense || typeof unlimitedLicense.price !== "number") {
                  return;
                }

                const upgradePrice =
                  Math.round((unlimitedLicense.price - Number(purchase.price || 0)) * 100) / 100;

                // Strictly require at least $0.50 positive difference to prevent accidental downgrades or refunds
                if (upgradePrice >= 0.5) {
                  optionsMap[purchase.id] = {
                    unlimitedPrice: unlimitedLicense.price,
                    upgradePrice,
                    coverArtUrl: beatData.coverArtUrl,
                    title: beatData.title || purchase.itemName || "Beat",
                  };
                }
              } catch (err) {
                console.warn(`Could not check upgrade eligibility for beat ${purchase.itemId}:`, err);
              }
            })
          );
          setUpgradeOptions(optionsMap);
        }
      } catch (error) {
        console.error("Error fetching purchases:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPurchases();
  }, [user]);

  const handleDownload = async (purchaseId: string) => {
    try {
      setDownloadingId(purchaseId);
      const generateDownloadUrl = httpsCallable(functions, "generateDownloadUrl");
      const result = await generateDownloadUrl({ purchaseId, downloadType: "files" });
      const { downloadUrl } = result.data as { downloadUrl: string; expiresAt: number };
      
      // Open the URL in a new tab to trigger download
      window.open(downloadUrl, "_blank");
    } catch (error: unknown) {
      console.error("Error generating download URL:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate download link.";
      toast.error(errorMessage);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadLicense = async (purchaseId: string) => {
    try {
      setDownloadingLicenseId(purchaseId);
      const generateDownloadUrl = httpsCallable(functions, "generateDownloadUrl");
      const result = await generateDownloadUrl({ purchaseId, downloadType: "license" });
      const { downloadUrl } = result.data as { downloadUrl: string; expiresAt: number };

      window.open(downloadUrl, "_blank");
    } catch (error: unknown) {
      console.error("Error generating license download URL:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to open license PDF.";
      toast.error(errorMessage);
    } finally {
      setDownloadingLicenseId(null);
    }
  };

  const handleUpgrade = (purchase: Purchase, option: UpgradeOption) => {
    addItem({
      itemId: purchase.itemId,
      itemType: "beat",
      licenseType: "premium-unlimited",
      price: option.upgradePrice,
      title: option.title,
      producerId: purchase.producerId,
      coverArtUrl: option.coverArtUrl,
      isUpgrade: true,
      upgradeFromPurchaseId: purchase.id,
      originalLicensePrice: option.unlimitedPrice,
      creditApplied: purchase.price,
    });
    toast.success(`Added upgrade to Premium-Unlimited ($${option.upgradePrice.toFixed(2)}) to cart`);
    router.push("/checkout");
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Collection</h1>
        <p className="text-muted-foreground mt-1">Your library of purchased beats and saved bookmarks.</p>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "purchases" | "saved")}>
        <TabsList className="h-10 p-1 rounded-lg border border-border bg-muted/60">
          <TabsTrigger value="purchases" className="gap-2 px-4 cursor-pointer">
            <Library className="w-4 h-4" />
            <span>Purchases</span>
            {purchases.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 rounded-full font-mono">
                {purchases.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="saved" className="gap-2 px-4 cursor-pointer">
            <Bookmark className="w-4 h-4" />
            <span>Saved for Later</span>
            {savedItems.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 rounded-full font-mono">
                {savedItems.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="purchases" className="mt-6 space-y-6">
          {purchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center border rounded-xl bg-card/50">
              <Library className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No purchases yet</h3>
              <p className="text-muted-foreground max-w-sm mb-6">
                When you purchase beats or sample packs, they will appear here for easy access and downloading.
              </p>
              <Link href="/gallery">
                <Button>Browse Gallery</Button>
              </Link>
            </div>
          ) : (
            <div className="border rounded-xl bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                    <tr>
                      <th className="px-6 py-4 font-medium">Item</th>
                      <th className="px-6 py-4 font-medium">Producer</th>
                      <th className="px-6 py-4 font-medium">License / Type</th>
                      <th className="px-6 py-4 font-medium">Date</th>
                      <th className="px-6 py-4 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {purchases.map((purchase) => {
                      const upgradeOption = upgradeOptions[purchase.id];
                      return (
                        <tr key={purchase.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-foreground flex items-center gap-2">
                              {purchase.itemName}
                              <Link
                                href={purchase.itemType === "beat" ? `/beats/${purchase.itemId}` : `/sample-packs/${purchase.itemId}`}
                                className="text-muted-foreground hover:text-primary transition-colors"
                                title="View item"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            </div>
                            <div className="text-muted-foreground text-xs capitalize mt-0.5">{purchase.itemType}</div>
                          </td>
                          <td className="px-6 py-4">
                            <Link href={`/producers/${purchase.producerId}`} className="hover:underline">
                              {purchase.producerName}
                            </Link>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center rounded-md bg-secondary/50 px-2 py-1 text-xs font-medium text-secondary-foreground ring-1 ring-inset ring-secondary capitalize">
                                {purchase.itemType === "samplePack"
                                  ? "Royalty-Free"
                                  : (purchase.licenseType || "Standard").replace("-", " ")}
                              </span>
                              {upgradeOption && (
                                <Button
                                  variant="outline"
                                  size="xs"
                                  className="gap-1 text-xs border-primary/40 text-primary hover:bg-primary/10"
                                  onClick={() => handleUpgrade(purchase, upgradeOption)}
                                  title={`Upgrade to Premium-Unlimited ($${upgradeOption.unlimitedPrice.toFixed(2)} minus $${purchase.price.toFixed(2)} paid)`}
                                >
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                  Upgrade (${upgradeOption.upgradePrice.toFixed(2)})
                                </Button>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {purchase.createdAt.toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                onClick={() => handleDownloadLicense(purchase.id)}
                                disabled={downloadingLicenseId === purchase.id}
                                title="View Official License PDF"
                              >
                                {downloadingLicenseId === purchase.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <FileText className="w-4 h-4" />
                                )}
                                {downloadingLicenseId === purchase.id ? "Opening..." : "License PDF"}
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                className="gap-2"
                                onClick={() => handleDownload(purchase.id)}
                                disabled={downloadingId === purchase.id}
                              >
                                {downloadingId === purchase.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Download className="w-4 h-4" />
                                )}
                                {downloadingId === purchase.id ? "Preparing..." : "Download"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved" className="mt-6 space-y-6">
          {savedLoading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : savedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center border rounded-xl bg-card/50">
              <Bookmark className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No saved items yet</h3>
              <p className="text-muted-foreground max-w-sm mb-6">
                When you bookmark beats or sample packs while exploring, they will appear here so you can easily review, listen, and license them.
              </p>
              <Link href="/gallery">
                <Button>Explore Gallery</Button>
              </Link>
            </div>
          ) : (
            <div className="border rounded-xl bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                    <tr>
                      <th className="px-6 py-4 font-medium">Item</th>
                      <th className="px-6 py-4 font-medium">Producer</th>
                      <th className="px-6 py-4 font-medium">Details</th>
                      <th className="px-6 py-4 font-medium">Price</th>
                      <th className="px-6 py-4 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {savedItems.map((item) => {
                      const isTrackPlaying = currentTrack?.id === item.itemId && isPlaying;
                      const itemHref =
                        item.itemType === "beat" ? `/beats/${item.itemId}` : `/sample-packs/${item.itemId}`;
                      return (
                        <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="relative w-10 h-10 rounded-md overflow-hidden bg-secondary/30 shrink-0 border border-border">
                                {item.coverArtUrl ? (
                                  <Image
                                    src={item.coverArtUrl}
                                    alt={item.title}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                    <Music2 className="w-4 h-4" />
                                  </div>
                                )}
                                {item.audioPreviewUrl && (
                                  <button
                                    type="button"
                                    onClick={() => handlePlaySavedItem(item)}
                                    aria-label={isTrackPlaying ? "Pause preview" : "Play preview"}
                                    className={`absolute inset-0 flex items-center justify-center bg-black/40 text-white transition-opacity cursor-pointer ${
                                      isTrackPlaying ? "opacity-100" : "opacity-0 hover:opacity-100"
                                    }`}
                                  >
                                    {isTrackPlaying ? (
                                      <Pause className="w-4 h-4 fill-current" />
                                    ) : (
                                      <Play className="w-4 h-4 fill-current" />
                                    )}
                                  </button>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-foreground flex items-center gap-2">
                                  <Link
                                    href={itemHref}
                                    className="hover:underline truncate max-w-[200px] sm:max-w-xs"
                                  >
                                    {item.title}
                                  </Link>
                                  <Link
                                    href={itemHref}
                                    className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                                    title="View item"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </Link>
                                </div>
                                <div className="text-muted-foreground text-xs capitalize mt-0.5">
                                  {item.itemType === "beat" ? "Beat" : "Sample Pack"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Link href={`/producers/${item.producerId}`} className="hover:underline">
                              {item.producerName || "Producer"}
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {item.itemType === "beat" ? (
                              <div className="flex items-center gap-2">
                                {item.bpm && (
                                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded border border-border">
                                    {item.bpm} BPM
                                  </span>
                                )}
                                {item.key && (
                                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded border border-border">
                                    {item.key}
                                  </span>
                                )}
                                {!item.bpm && !item.key && "—"}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Sample Pack</span>
                            )}
                          </td>
                          <td className="px-6 py-4 font-mono font-medium text-foreground">
                            ${(item.price ?? 29.99).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex items-center justify-end gap-2">
                              {item.audioPreviewUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5 cursor-pointer"
                                  onClick={() => handlePlaySavedItem(item)}
                                >
                                  {isTrackPlaying ? (
                                    <>
                                      <Pause className="w-3.5 h-3.5 fill-current" />
                                      Pause
                                    </>
                                  ) : (
                                    <>
                                      <Play className="w-3.5 h-3.5 fill-current" />
                                      Listen
                                    </>
                                  )}
                                </Button>
                              )}
                              <Link href={itemHref}>
                                <Button size="sm" variant="secondary" className="cursor-pointer">
                                  View
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                                onClick={() => unsaveItem(item.itemId)}
                                title="Remove from saved"
                                aria-label="Remove from saved"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
