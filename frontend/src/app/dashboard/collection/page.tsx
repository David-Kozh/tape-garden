"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";
import { Download, Library, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Purchase {
  id: string;
  itemId: string;
  itemName: string;
  itemType: "beat" | "samplePack";
  producerId: string;
  producerName: string;
  buyerId: string;
  licenseType: string;
  price: number;
  createdAt: Date;
}

export default function CollectionPage() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPurchases() {
      if (!user) return;
      try {
        const q = query(
          collection(db, "purchases"),
          where("buyerId", "==", user.uid)
        );
        const snapshot = await getDocs(q);
        const fetchedPurchases = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
          } as Purchase;
        });
        
        // Sort in memory to avoid needing an immediate composite index
        fetchedPurchases.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        setPurchases(fetchedPurchases);
      } catch (error) {
        console.error("Error fetching purchases:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPurchases();
  }, [user]);

  const handleDownload = async (purchaseId: string) => {
    // TODO: Call cloud function to get signed URL
    console.log("Download", purchaseId);
    alert("Secure download via signed URL will be implemented alongside backend storage rules.");
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
        <p className="text-muted-foreground mt-1">Your purchased beats and sample packs.</p>
      </div>

      {purchases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border rounded-xl bg-card/50">
          <Library className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No purchases yet</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            When you purchase beats or sample packs, they will appear here for easy access and downloading.
          </p>
          <Link href="/beats">
            <Button>Browse Beats</Button>
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
                {purchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground flex items-center gap-2">
                        {purchase.itemName}
                        <Link 
                          href={purchase.itemType === 'beat' ? `/beats/${purchase.itemId}` : `/sample-packs/${purchase.itemId}`}
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
                      <span className="inline-flex items-center rounded-md bg-secondary/50 px-2 py-1 text-xs font-medium text-secondary-foreground ring-1 ring-inset ring-secondary capitalize">
                        {purchase.licenseType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {purchase.createdAt.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="gap-2"
                        onClick={() => handleDownload(purchase.id)}
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
