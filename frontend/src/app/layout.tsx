import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter, Outfit, Lexend } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { AudioProvider } from "@/context/AudioContext";
import { CartProvider } from "@/context/CartContext";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Navbar } from "@/components/layout/Navbar";
import { Toaster } from "@/components/ui/sonner";
import { TexturedBackground } from "@/components/layout/TexturedBackground";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Tape Garden",
  description: "Curated Beats & Sample Packs",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${outfit.variable} ${lexend.variable} antialiased`}
    >
      <body className="min-h-screen flex flex-col relative">
        <TexturedBackground />
        <AuthProvider>
          <CartProvider>
            <AudioProvider>
              <Navbar />
              {children}
              <AudioPlayer />
            </AudioProvider>
          </CartProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
