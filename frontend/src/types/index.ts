/**
 * Unified TypeScript Type Definitions for Tape Garden v1.
 * Matches the Firestore database collection configurations defined in the Database Schema.
 */

export type UserRole = "buyer" | "producer" | "admin";

export type ProducerStatus = "pending" | "approved" | "suspended";

export type ItemType = "beat" | "samplePack";

export type LicenseType = "non-exclusive" | "exclusive" | "unlimited";

export type PurchaseStatus = "pending" | "completed" | "refunded";

export type ApplicationStatus = "pending" | "approved" | "declined";

/**
 * 1. Users Collection Definition
 * Matches collection `/users`
 */
export interface User {
  uid: string; // Firebase Auth UID
  role: UserRole;
  email: string;
  displayName: string;
  createdAt: Date | string; // ISO 8601 string or Date object
  
  // Payment Integrations
  stripeCustomerId?: string; // For users who make purchases
  stripeAccountId?: string; // Stripe Connect ID (Producers only)

  // Producer-specific fields (Null or omitted for buyers/admins)
  producerProfile?: {
    status: ProducerStatus;
    allocatedBeatSlots: number; // Limit for beats (grows over time, e.g. +2/month)
    allocatedSamplePackSlots: number; // Limit for sample packs
    lastSlotIncrementDate: Date | string;
    bio: string;
    socialLinks: string[];
    avatarUrl: string;
  } | null;
}

/**
 * Beat License Sub-item Interface
 */
export interface BeatLicense {
  type: LicenseType;
  price: number;
  fileUrl: string; // GCS path to high-quality file / stems (Private bucket)
}

/**
 * 2. Beats Collection Definition
 * Matches collection `/beats`
 */
export interface Beat {
  id: string;
  producerId: string; // Reference to users.uid
  title: string;
  bpm: number;
  key: string;
  tags: string[];
  coverArtUrl?: string;
  status: "draft" | "published" | "hidden" | "suspended";
  createdAt: Date | string;
  updatedAt: Date | string;
  
  // Audio file stored in GCS (Public-readable/cached preview)
  audioPreviewUrl: string;

  // Available licenses
  licenses: BeatLicense[];
}

/**
 * 3. SamplePacks Collection Definition
 * Matches collection `/samplePacks`
 */
export interface SamplePack {
  id: string;
  producerId: string; // Reference to users.uid
  title: string;
  description: string;
  tags: string[];
  price: number;
  status: "draft" | "published" | "hidden" | "suspended";
  createdAt: Date | string;
  updatedAt: Date | string;
  
  // Audio preview medley (Public-readable/cached GCS)
  audioPreviewUrl: string;
  
  // GCS path to downloadable archive ZIP (Private GCS)
  fileUrl: string;
}

/**
 * 4. Purchases Collection Definition
 * Matches collection `/purchases`
 */
export interface Purchase {
  id: string;
  buyerId: string; // Reference to users.uid
  producerId: string; // Reference to users.uid
  itemType: ItemType;
  itemId: string; // Reference to beats.id or samplePacks.id
  licenseType?: LicenseType; // Present only if itemType == 'beat'
  price: number; // Total amount paid by buyer
  platformFee: number; // Platform fee percentage / cut
  producerPayout: number; // Net amount transferred to producer via Stripe Connect
  stripeSessionId: string; // Stripe transaction session reference
  status: PurchaseStatus;
  createdAt: Date | string;
}

/**
 * 5. Applications Collection Definition
 * Matches collection `/applications`
 */
export interface Application {
  id: string;
  email: string;
  displayName: string;
  portfolioUrl: string;
  note?: string; // Optional cover note
  status: ApplicationStatus;
  reviewedBy?: string; // Admin users.uid reference
  reviewedAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}
