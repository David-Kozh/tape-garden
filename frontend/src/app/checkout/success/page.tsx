"use client";

import { useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { CheckCircle2, ShoppingBag, Music } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CheckoutSuccessPage() {
  const { clearCart } = useCart();

  useEffect(() => {
    // Clear the cart when the user successfully completes checkout
    clearCart();
  }, [clearCart]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md p-8 bg-card border border-border rounded-2xl shadow-sm text-center relative overflow-hidden">
        {/* Subtle background glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-gradient-to-b from-green-500/20 to-transparent opacity-50 blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="h-20 w-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">
            Payment Successful!
          </h1>
          <p className="text-muted-foreground mb-8">
            Thank you for your purchase. The payment has been processed and your new beats are waiting for you in your collection.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Link href="/dashboard/collection" className="w-full">
              <Button className="w-full gap-2 text-md h-12" size="lg">
                <Music className="w-4 h-4" />
                View My Collection
              </Button>
            </Link>
            <Link href="/beats" className="w-full">
              <Button variant="outline" className="w-full gap-2 text-md h-12" size="lg">
                <ShoppingBag className="w-4 h-4" />
                Keep Browsing
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
