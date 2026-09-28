"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, orderBy, limit, getDocs, Timestamp } from "firebase/firestore";
import { Purchase, User, AdminSalesSummary } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Activity, CreditCard, ArrowRightLeft } from "lucide-react";

export default function AdminSalesDashboard() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [summary, setSummary] = useState<AdminSalesSummary | null>(null);
  const [recentSummary, setRecentSummary] = useState<AdminSalesSummary | null>(null);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSalesData() {
      try {
        // 1. Fetch Admin Sales Summary (all-time)
        const allTimeRef = doc(db, "adminSalesSummary", "all-time");
        const allTimeSnap = await getDoc(allTimeRef);
        if (allTimeSnap.exists()) {
          setSummary(allTimeSnap.data() as AdminSalesSummary);
        }

        // 2. Fetch Admin Sales Summary (current month)
        const now = new Date();
        const currentMonthId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const recentRef = doc(db, "adminSalesSummary", currentMonthId);
        const recentSnap = await getDoc(recentRef);
        if (recentSnap.exists()) {
          setRecentSummary(recentSnap.data() as AdminSalesSummary);
        }

        // 3. Fetch recent purchases for the table
        const q = query(collection(db, "purchases"), orderBy("createdAt", "desc"), limit(20));
        const snapshot = await getDocs(q);
        const purchasesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Purchase));
        
        // 4. Fetch exactly the users involved in these recent transactions
        const userIds = new Set<string>();
        purchasesData.forEach(p => {
          userIds.add(p.buyerId);
          userIds.add(p.producerId);
        });

        const usersMap: Record<string, User> = {};
        await Promise.all(
          Array.from(userIds).map(async (uid) => {
            const userDoc = await getDoc(doc(db, "users", uid));
            if (userDoc.exists()) {
              usersMap[uid] = userDoc.data() as User;
            }
          })
        );

        setPurchases(purchasesData);
        setUsers(usersMap);
      } catch (error) {
        console.error("Error fetching sales data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSalesData();
  }, []);

  const totalRevenue = summary?.totalRevenue || 0;
  const totalTransactions = summary?.totalTransactions || 0;
  const totalPlatformFees = summary?.totalPlatformFees || 0;
  const recentPlatformFees = recentSummary?.totalPlatformFees || 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Sales Dashboard</h1>
        <p className="text-muted-foreground mt-1">Platform transactions and revenue overview.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">All-time gross volume</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Fees</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPlatformFees.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">All-time collected</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Fees</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${recentPlatformFees.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Current month</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
            <p className="text-xs text-muted-foreground mt-1">All-time count</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="font-semibold text-lg">Recent Transactions</h2>
        </div>
        <div className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Producer</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                purchases.map((purchase) => {
                  const date = purchase.createdAt instanceof Date 
                    ? purchase.createdAt 
                    : typeof purchase.createdAt === 'string'
                      ? new Date(purchase.createdAt)
                      : (purchase.createdAt as Timestamp).toDate();
                  
                  const buyer = users[purchase.buyerId]?.displayName || "Unknown";
                  const producer = users[purchase.producerId]?.displayName || "Unknown";
                  
                  return (
                    <TableRow key={purchase.id}>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {date.toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">{buyer}</TableCell>
                      <TableCell>{producer}</TableCell>
                      <TableCell className="capitalize text-muted-foreground">
                        {purchase.itemType}
                        {purchase.licenseType && <span className="text-xs ml-1.5 bg-secondary/20 text-secondary px-1.5 py-0.5 rounded">
                          {purchase.licenseType}
                        </span>}
                      </TableCell>
                      <TableCell className="text-right font-medium">${purchase.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">${purchase.platformFee.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          purchase.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          purchase.status === 'refunded' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {purchase.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
