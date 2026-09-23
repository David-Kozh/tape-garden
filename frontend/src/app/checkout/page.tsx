"use client";

import { useCart } from "@/context/CartContext";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Trash2, ArrowRight, ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";

export default function CheckoutPage() {
  const { items, removeItem, cartTotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 max-w-3xl flex flex-col items-center justify-center text-center min-h-[60vh]">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
          <Trash2 className="w-8 h-8 text-muted-foreground opacity-50" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-4">Your cart is empty</h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          Looks like you haven't added anything to your cart yet. Discover exclusive beats and sample packs in the gallery.
        </p>
        <Link href="/#explore" className={cn(buttonVariants({ size: "lg" }), "gap-2")}>
          <ArrowLeft className="w-4 h-4" /> Back to Gallery
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <h1 className="text-4xl font-black tracking-tight mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Cart Items List */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {items.map((item, index) => (
            <div key={`${item.itemId}-${item.licenseType}-${index}`} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
              <div className="w-20 h-20 relative rounded-md overflow-hidden bg-muted flex-shrink-0">
                {item.coverArtUrl ? (
                  <Image src={item.coverArtUrl} alt={item.title} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground font-bold text-xl bg-primary/10">
                    {item.title.substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <Link href={`/beats/${item.itemId}`} className="font-bold text-lg hover:underline truncate">
                  {item.title}
                </Link>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <span className="capitalize">{item.itemType}</span>
                  {item.licenseType && (
                    <>
                      <span>•</span>
                      <span className="capitalize">{item.licenseType} License</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end justify-center gap-2">
                <span className="font-bold text-xl">${item.price.toFixed(2)}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-muted-foreground hover:text-destructive h-8 w-8"
                  onClick={() => removeItem(item.itemId, item.licenseType)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-6">Order Summary</h2>
            
            <div className="flex flex-col gap-4 mb-6 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Items ({items.length})</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              <div className="h-px bg-border w-full my-1" />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
            </div>

            <Button size="lg" className="w-full gap-2" onClick={() => console.log('Proceeding to payment...')}>
              Proceed to Payment <ArrowRight className="w-4 h-4" />
            </Button>
            
            <p className="text-xs text-center text-muted-foreground mt-4">
              By proceeding, you agree to Tape Garden's Terms of Service and licensing agreements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
