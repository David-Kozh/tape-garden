import React from "react";
import type {
  DocumentProps,
} from "@react-pdf/renderer";
import Stripe from "stripe";
import {
  CompiledLicenseDocument,
  compileBeatLicenseTemplate,
  compileSamplePackLicenseTemplate,
} from "./templates.js";

/**
 * Resolves a producer's legal name from their Stripe Connect Express account,
 * falling back to their displayName if unavailable.
 */
export async function resolveSellerLegalNameFromStripe(
  stripe: Stripe,
  producerStripeAccountId: string | null | undefined,
  fallbackDisplayName: string
): Promise<string> {
  if (!producerStripeAccountId) {
    return fallbackDisplayName;
  }

  try {
    const account = await stripe.accounts.retrieve(producerStripeAccountId);
    const firstName = account.individual?.first_name?.trim() || "";
    const lastName = account.individual?.last_name?.trim() || "";
    const fullName = `${firstName} ${lastName}`.trim();

    if (fullName) {
      return fullName;
    }
    if (account.company?.name?.trim()) {
      return account.company.name.trim();
    }
    if (account.business_profile?.name?.trim()) {
      return account.business_profile.name.trim();
    }
  } catch (err) {
    console.warn(
      `[resolveSellerLegalNameFromStripe] Could not retrieve Stripe account ${producerStripeAccountId}:`,
      err
    );
  }

  return fallbackDisplayName;
}

export interface GeneratePurchaseLicenseInput {
  purchaseId: string;
  effectiveDate: string;
  itemType: "beat" | "samplePack" | string;
  itemName: string;
  licenseType?: string | null;
  price: number;
  streamCap?: number | null;
  buyerLegalName: string;
  sellerLegalName: string;
  producerName: string;
}

/**
 * Compiles the appropriate Beat or Sample Pack license template and renders
 * an immutable PDF Buffer using @react-pdf/renderer.
 */
export async function renderLicensePdfBuffer(
  input: GeneratePurchaseLicenseInput
): Promise<Buffer> {
  const {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    renderToBuffer,
  } = await import("@react-pdf/renderer");

  const styles = StyleSheet.create({
    page: {
      paddingTop: 42,
      paddingBottom: 48,
      paddingHorizontal: 46,
      fontFamily: "Helvetica",
      fontSize: 9.5,
      lineHeight: 1.45,
      color: "#18181b",
      backgroundColor: "#ffffff",
    },
    headerContainer: {
      borderBottomWidth: 1.5,
      borderBottomColor: "#18181b",
      paddingBottom: 10,
      marginBottom: 14,
    },
    brandLabel: {
      fontSize: 8,
      fontFamily: "Helvetica-Bold",
      letterSpacing: 1.5,
      color: "#52525b",
      marginBottom: 4,
      textTransform: "uppercase",
    },
    title: {
      fontSize: 15,
      fontFamily: "Helvetica-Bold",
      color: "#09090b",
      marginBottom: 3,
    },
    subtitle: {
      fontSize: 9.5,
      color: "#3f3f46",
    },
    summaryBox: {
      backgroundColor: "#f8fafc",
      borderWidth: 1,
      borderColor: "#e2e8f0",
      borderRadius: 4,
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginBottom: 14,
    },
    summaryRow: {
      flexDirection: "row",
      paddingVertical: 2.5,
      borderBottomWidth: 0.5,
      borderBottomColor: "#e2e8f0",
    },
    summaryRowLast: {
      flexDirection: "row",
      paddingVertical: 2.5,
    },
    summaryLabel: {
      width: "36%",
      fontFamily: "Helvetica-Bold",
      fontSize: 8.5,
      color: "#334155",
    },
    summaryValue: {
      width: "64%",
      fontSize: 8.5,
      color: "#0f172a",
    },
    preamble: {
      fontSize: 9.2,
      color: "#27272a",
      marginBottom: 12,
      textAlign: "justify",
    },
    section: {
      marginBottom: 10,
    },
    sectionHeading: {
      fontSize: 9.5,
      fontFamily: "Helvetica-Bold",
      color: "#09090b",
      marginBottom: 3,
    },
    paragraph: {
      fontSize: 9,
      color: "#27272a",
      marginBottom: 4,
      textAlign: "justify",
    },
    footerSignoffBox: {
      marginTop: 14,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: "#cbd5e1",
    },
    acknowledgmentText: {
      fontSize: 8,
      fontFamily: "Helvetica-Bold",
      color: "#334155",
      marginBottom: 8,
    },
    signoffRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 16,
    },
    signoffColumn: {
      width: "48%",
      backgroundColor: "#f8fafc",
      borderWidth: 0.75,
      borderColor: "#cbd5e1",
      borderRadius: 3,
      padding: 8,
    },
    signoffTitle: {
      fontSize: 7.5,
      fontFamily: "Helvetica-Bold",
      color: "#64748b",
      marginBottom: 3,
      textTransform: "uppercase",
    },
    signoffValue: {
      fontSize: 8.5,
      fontFamily: "Helvetica-Bold",
      color: "#0f172a",
    },
  });

  const compiledDoc: CompiledLicenseDocument =
    input.itemType === "samplePack"
      ? compileSamplePackLicenseTemplate({
          purchaseId: input.purchaseId,
          effectiveDate: input.effectiveDate,
          buyerLegalName: input.buyerLegalName,
          sellerLegalName: input.sellerLegalName,
          producerName: input.producerName,
          packTitle: input.itemName,
          price: input.price,
        })
      : compileBeatLicenseTemplate({
          purchaseId: input.purchaseId,
          effectiveDate: input.effectiveDate,
          buyerLegalName: input.buyerLegalName,
          sellerLegalName: input.sellerLegalName,
          producerName: input.producerName,
          beatTitle: input.itemName,
          licenseType: input.licenseType || "limited",
          price: input.price,
          streamCap: input.streamCap,
        });

  const element: React.ReactElement<DocumentProps> = (
    <Document
      title={`${compiledDoc.title} (${compiledDoc.purchaseId})`}
      author="Tape Garden"
      subject={compiledDoc.subtitle}
    >
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerContainer}>
          <Text style={styles.brandLabel}>
            TAPE GARDEN — OFFICIAL LICENSE RECORD
          </Text>
          <Text style={styles.title}>{compiledDoc.title}</Text>
          <Text style={styles.subtitle}>{compiledDoc.subtitle}</Text>
        </View>

        <View style={styles.summaryBox}>
          {compiledDoc.metadataRows.map((row, idx) => {
            const isLast = idx === compiledDoc.metadataRows.length - 1;
            return (
              <View
                key={row.label}
                style={isLast ? styles.summaryRowLast : styles.summaryRow}
              >
                <Text style={styles.summaryLabel}>{row.label}</Text>
                <Text style={styles.summaryValue}>{row.value}</Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.preamble}>{compiledDoc.preamble}</Text>

        {compiledDoc.sections.map((sec) => (
          <View key={sec.heading} style={styles.section} wrap={false}>
            <Text style={styles.sectionHeading}>{sec.heading}</Text>
            {sec.paragraphs.map((p, i) => (
              <Text key={i} style={styles.paragraph}>
                {p}
              </Text>
            ))}
          </View>
        ))}

        <View style={styles.footerSignoffBox} wrap={false}>
          <Text style={styles.acknowledgmentText}>
            {compiledDoc.acknowledgment}
          </Text>
          <View style={styles.signoffRow}>
            <View style={styles.signoffColumn}>
              <Text style={styles.signoffTitle}>Agreed & Granted By</Text>
              <Text style={styles.signoffValue}>
                {compiledDoc.sellerSignoff}
              </Text>
            </View>
            <View style={styles.signoffColumn}>
              <Text style={styles.signoffTitle}>Accepted By</Text>
              <Text style={styles.signoffValue}>
                {compiledDoc.buyerSignoff}
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(element);
  return Buffer.from(buffer);
}
