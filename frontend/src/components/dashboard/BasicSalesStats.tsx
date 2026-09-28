"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { ProducerSalesSummary } from "@/types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart as LineChartIcon } from "lucide-react";

export function BasicSalesStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ProducerSalesSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!user) return;
      try {
        const q = query(
          collection(db, "producerSalesSummary"),
          where("producerId", "==", user.uid)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProducerSalesSummary));
        setStats(data);
      } catch (error) {
        console.error("Error fetching sales stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [user]);

  const chartData = useMemo(() => {
    // Generate the last 6 months list as default empty stats to ensure the chart is always 6 months
    const now = new Date();
    const months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return {
        period,
        month: d.toLocaleString('default', { month: 'short' }),
        transactions: 0
      };
    }).reverse();

    // Fill in actual data
    stats.forEach(stat => {
      const m = months.find(m => m.period === stat.period);
      if (m) {
        m.transactions += stat.totalTransactions;
      }
    });

    return months;
  }, [stats]);

  const hasAnySales = stats.some(s => s.totalTransactions > 0);

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm relative overflow-hidden group">
      {!hasAnySales && !loading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
          <p className="bg-card border border-border px-4 py-2 rounded-full text-sm font-medium shadow-sm flex items-center gap-2">
            <LineChartIcon className="w-4 h-4 text-muted-foreground" />
            No sales data yet
          </p>
        </div>
      )}

      <h3 className="font-semibold text-lg mb-6 flex items-center gap-2 relative z-0">
        <span className="bg-accent/10 p-2 rounded-md text-accent">
          <LineChartIcon className="w-5 h-5" />
        </span>
        Basic Sales Stats
      </h3>

      <div className="h-48 relative z-0">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <ChartContainer config={{
            transactions: {
              label: "Transactions",
              color: "hsl(var(--primary))",
            }
          }} className="h-full w-full">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis 
                dataKey="month" 
                tickLine={false} 
                axisLine={false} 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                dy={10} 
              />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                allowDecimals={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line 
                type="monotone" 
                dataKey="transactions" 
                stroke="var(--color-transactions)" 
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: "hsl(var(--card))" }} 
                activeDot={{ r: 6, strokeWidth: 0 }} 
              />
            </LineChart>
          </ChartContainer>
        )}
      </div>
    </div>
  );
}
