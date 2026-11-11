export interface LicenseDocumentSection {
  heading: string;
  paragraphs: string[];
}

export interface CompiledLicenseDocument {
  title: string;
  subtitle: string;
  purchaseId: string;
  effectiveDate: string;
  metadataRows: { label: string; value: string }[];
  preamble: string;
  sections: LicenseDocumentSection[];
  acknowledgment: string;
  sellerSignoff: string;
  buyerSignoff: string;
}

export interface BeatLicenseTemplateInput {
  purchaseId: string;
  effectiveDate: string;
  buyerLegalName: string;
  sellerLegalName: string;
  producerName: string;
  beatTitle: string;
  licenseType: "limited" | "premium-unlimited" | string;
  price: number;
  priorPricePaid?: number | null;
  streamCap?: number | null;
}

export interface SamplePackLicenseTemplateInput {
  purchaseId: string;
  effectiveDate: string;
  buyerLegalName: string;
  sellerLegalName: string;
  producerName: string;
  packTitle: string;
  price: number;
}

export function compileBeatLicenseTemplate(
  input: BeatLicenseTemplateInput
): CompiledLicenseDocument {
  const isUnlimited =
    input.licenseType === "premium-unlimited" ||
    input.licenseType === "unlimited" ||
    input.licenseType === "exclusive";

  const tierDisplayName = isUnlimited
    ? "Premium-Unlimited Non-Exclusive License"
    : "Limited Non-Exclusive License";

  const resolvedStreamCap =
    typeof input.streamCap === "number" && input.streamCap >= 1
      ? input.streamCap
      : 50000;

  const streamCapDisplay = isUnlimited
    ? "Unlimited monetized audio streams"
    : `Up to ${resolvedStreamCap.toLocaleString("en-US")} monetized audio streams`;

  const videoAndPerformanceCapDisplay = isUnlimited
    ? "Unlimited commercial music videos and unlimited for-profit live performances"
    : "1 commercial music video and 1 for-profit live performance";

  const hasUpgradeCredit =
    typeof input.priorPricePaid === "number" && input.priorPricePaid > 0;
  const totalConsideration = hasUpgradeCredit
    ? Number(input.price || 0) + Number(input.priorPricePaid)
    : Number(input.price || 0);

  const formattedPrice = hasUpgradeCredit
    ? `$${totalConsideration.toFixed(2)} USD ($${Number(input.priorPricePaid).toFixed(2)} prior Limited credit + $${Number(input.price || 0).toFixed(2)} upgrade paid)`
    : `$${Number(input.price || 0).toFixed(2)} USD`;

  return {
    title: "NON-EXCLUSIVE BEAT LICENSE AGREEMENT",
    subtitle: `Tape Garden Official Licensing Record — ${tierDisplayName}`,
    purchaseId: input.purchaseId,
    effectiveDate: input.effectiveDate,
    metadataRows: [
      { label: "License ID", value: input.purchaseId },
      { label: "Effective Date", value: input.effectiveDate },
      {
        label: "Licensor (Producer)",
        value: `${input.sellerLegalName} (p/k/a ${input.producerName})`,
      },
      { label: "Licensee (Buyer)", value: input.buyerLegalName },
      { label: "Instrumental Title (Beat)", value: input.beatTitle },
      { label: "License Tier", value: tierDisplayName },
      { label: "License Fee Paid", value: formattedPrice },
      { label: "Deliverables Included", value: "Master WAV + Trackout Stems" },
      { label: "Monetized Stream Cap", value: streamCapDisplay },
      {
        label: "Video & Performance Cap",
        value: videoAndPerformanceCapDisplay,
      },
      {
        label: "Publishing Split",
        value: "50% Licensor / 50% Licensee",
      },
      { label: "Term / Duration", value: "Perpetual (No Expiration)" },
    ],
    preamble: `This Non-Exclusive Beat License Agreement (the "Agreement") is entered into as of ${input.effectiveDate} (the "Effective Date"), by and between ${input.sellerLegalName}, professionally known as "${input.producerName}" ("Licensor" or "Producer"), and ${input.buyerLegalName} ("Licensee"). By completing the transaction referenced by License ID ${input.purchaseId} on Tape Garden, Licensor and Licensee agree to the terms and conditions set forth below.`,
    sections: [
      {
        heading: "1. GRANT OF NON-EXCLUSIVE RIGHTS & PERMITTED PURPOSE",
        paragraphs: [
          `In consideration of the License Fee of ${formattedPrice} paid by Licensee, Licensor hereby grants to Licensee a non-exclusive, non-transferable, worldwide right and license to use the musical composition and master sound recording titled "${input.beatTitle}" (the "Beat") strictly for incorporating the Beat into a single new original vocal or musical recording created by Licensee (the "New Song").`,
          "This license is strictly limited to creating and exploiting the New Song in accordance with the terms of this Agreement. Licensee acknowledges that this grant is non-exclusive and that Licensor retains the unrestricted right to continue licensing, selling, or otherwise exploiting the Beat to other third parties.",
        ],
      },
      {
        heading: "2. DELIVERABLES",
        paragraphs: [
          `Under this ${tierDisplayName}, Licensor delivers to Licensee via Tape Garden: (a) one (1) high-resolution master audio file in WAV format, and (b) the separated multi-track audio files ("Trackout Stems") corresponding to the Beat.`,
        ],
      },
      {
        heading: "3. TERM & DURATION",
        paragraphs: [
          "The term of this Agreement is perpetual (no time duration or expiration date), subject only to the usage caps specified in Section 4 (if applicable) and Licensee's ongoing compliance with the terms of this Agreement.",
        ],
      },
      {
        heading: "4. DISTRIBUTION, STREAMING, VIDEO & PERFORMANCE CAPS",
        paragraphs: isUnlimited
          ? [
            "a) Audio Streaming & Downloads: Licensee is authorized to distribute and monetize the New Song across digital streaming platforms (including Spotify, Apple Music, YouTube Music, Tidal, and similar services) for UNLIMITED monetized audio streams and digital downloads.",
            "b) Commercial Music Videos: Licensee is authorized to synchronize the New Song in UNLIMITED commercial music videos for distribution and monetization on video platforms.",
            "c) Live Performances: Licensee is authorized to perform the New Song publicly in UNLIMITED commercial and for-profit live performances, concerts, and festivals.",
          ]
          : [
            `a) Audio Streaming & Downloads: Licensee is authorized to distribute and monetize the New Song across digital streaming platforms (including Spotify, Apple Music, YouTube Music, Tidal, and similar services) up to a cumulative maximum of ${resolvedStreamCap.toLocaleString("en-US")} monetized audio streams. Once the New Song reaches ${resolvedStreamCap.toLocaleString("en-US")} streams, Licensee must upgrade to an Unlimited license to continue monetized distribution.`,
            "b) Commercial Music Videos: Licensee is authorized to synchronize the New Song in up to ONE (1) commercial music video.",
            "c) Live Performances: Licensee is authorized to perform the New Song in up to ONE (1) commercial / for-profit live performance. Non-profit performances do not count toward this cap.",
          ],
      },
      {
        heading: "5. PUBLISHING RIGHTS & ROYALTY SPLITS (50/50)",
        paragraphs: [
          "With respect to the underlying musical composition embodied in the New Song, publishing and songwriting rights shall be split equally (50% / 50%) between Licensor and Licensee:",
          `• Licensor (${input.sellerLegalName} p/k/a ${input.producerName}): Fifty percent (50%) of the Writer's Share and fifty percent (50%) of the Publisher's Share.`,
          `• Licensee (${input.buyerLegalName}): Fifty percent (50%) of the Writer's Share and fifty percent (50%) of the Publisher's Share.`,
          "Licensee agrees to register Licensor's 50% share accurately with all applicable Performing Rights Organizations (ASCAP, BMI, SESAC, or international equivalents) and digital distributors.",
        ],
      },
      {
        heading: "6. CREDIT ATTRIBUTION",
        paragraphs: [
          `Credit attribution is mandatory for all releases, digital metadata, liner notes, social media descriptions, and promotional materials featuring the New Song. Licensee shall credit Licensor substantially in the following format: "Produced by ${input.producerName}".`,
        ],
      },
      {
        heading: "7. STRICT PROHIBITIONS & CONTENT ID RESTRICTIONS",
        paragraphs: [
          "a) Prohibition on Standalone Redistribution: The rights granted herein are strictly for incorporating the Beat into a new original vocal recording (Song). Licensee is explicitly prohibited from reselling, relicensing, sublicensing, loaning, gifting, or redistributing the raw Beat, the WAV master, or any individual Trackout Stems on their own, whether in original or modified form, or as part of any beat tape, instrumental album, sample pack, or sound library.",
          "b) Content ID & Fingerprinting Prohibition: Because this license is non-exclusive, Licensee is strictly prohibited from registering the Beat or the New Song with YouTube Content ID, Facebook Rights Manager, Audible Magic, or any other automated audio-fingerprinting or content-monetization system that could issue copyright claims against Licensor or other legitimate licensees of the Beat.",
          "c) Ownership of Underlying Beat: Licensor retains 100% of all right, title, and interest in and to the original Beat master recording and underlying instrumental composition.",
        ],
      },
      {
        heading: "8. WARRANTIES, INDEMNIFICATION & GENERAL PROVISIONS",
        paragraphs: [
          "Licensor warrants that Licensor controls the rights necessary to grant this license. Each party agrees to indemnify and hold harmless the other party and Tape Garden from any third-party claims arising out of a breach of this Agreement. This Agreement constitutes the entire understanding between the parties regarding the licensing of the Beat and supersedes any prior communications.",
        ],
      },
    ],
    acknowledgment: `EXECUTED ELECTRONICALLY VIA TAPE GARDEN ON ${input.effectiveDate.toUpperCase()} — TRANSACTION ID: ${input.purchaseId}`,
    sellerSignoff: `Licensor: ${input.sellerLegalName} (p/k/a ${input.producerName})`,
    buyerSignoff: `Licensee: ${input.buyerLegalName}`,
  };
}

export function compileSamplePackLicenseTemplate(
  input: SamplePackLicenseTemplateInput
): CompiledLicenseDocument {
  const formattedPrice = `$${Number(input.price || 0).toFixed(2)} USD`;

  return {
    title: "ROYALTY-FREE SAMPLE PACK LICENSE AGREEMENT",
    subtitle: "Tape Garden Official Licensing Record — Sample Pack License",
    purchaseId: input.purchaseId,
    effectiveDate: input.effectiveDate,
    metadataRows: [
      { label: "License ID", value: input.purchaseId },
      { label: "Effective Date", value: input.effectiveDate },
      {
        label: "Licensor (Creator)",
        value: `${input.sellerLegalName} (p/k/a ${input.producerName})`,
      },
      { label: "Licensee (Buyer)", value: input.buyerLegalName },
      { label: "Sample Pack Title", value: input.packTitle },
      { label: "License Tier", value: "Royalty-Free Sample Pack License" },
      { label: "License Fee Paid", value: formattedPrice },
      { label: "Term / Duration", value: "Perpetual (No Expiration)" },
    ],
    preamble: `This Royalty-Free Sample Pack License Agreement (the "Agreement") is entered into as of ${input.effectiveDate} (the "Effective Date"), by and between ${input.sellerLegalName}, professionally known as "${input.producerName}" ("Licensor"), and ${input.buyerLegalName} ("Licensee"). By completing the transaction referenced by License ID ${input.purchaseId} on Tape Garden, Licensor and Licensee agree to the terms and conditions set forth below.`,
    sections: [
      {
        heading: "1. ROYALTY-FREE USAGE GRANT",
        paragraphs: [
          `In consideration of the License Fee of ${formattedPrice} paid by Licensee, Licensor hereby grants to Licensee a non-exclusive, non-transferable, perpetual, worldwide, royalty-free right and license to use the audio samples, loops, one-shots, and sound recordings contained in "${input.packTitle}" (collectively, the "Samples") strictly for incorporation into new original musical compositions, beats, and audio productions ("New Works").`,
          "Licensee may distribute, release, perform, and monetize New Works incorporating the Samples across commercial streaming platforms, independent releases, and live performances without owing additional master or publishing royalties to Licensor.",
        ],
      },
      {
        heading: "2. PROHIBITION OF RESALE & STANDALONE REDISTRIBUTION",
        paragraphs: [
          "a) Strict Prohibition on Repackaging or Resale: Licensee is explicitly prohibited from reselling, sublicensing, loaning, sharing, uploading, or redistributing the Samples, in whole or in part, as standalone audio files or in isolation.",
          "b) Competing Products: The Samples may not be repackaged, modified, or included in any other sample pack, loop kit, drum kit, sound library, virtual instrument, synth preset bank, or competitive audio product, whether distributed commercially or free of charge.",
          "c) Content ID Restriction: Licensee may not register any raw or isolated Sample with automated audio-fingerprinting or Content ID systems.",
        ],
      },
      {
        heading: "3. OWNERSHIP, TERM & GENERAL PROVISIONS",
        paragraphs: [
          "Licensor retains 100% ownership of all right, title, and interest in and to the original Samples and sound recordings, subject to the license granted herein to Licensee for New Works. The term of this Agreement is perpetual. This Agreement constitutes the entire understanding between Licensor and Licensee with respect to the Sample Pack.",
        ],
      },
    ],
    acknowledgment: `EXECUTED ELECTRONICALLY VIA TAPE GARDEN ON ${input.effectiveDate.toUpperCase()} — TRANSACTION ID: ${input.purchaseId}`,
    sellerSignoff: `Licensor: ${input.sellerLegalName} (p/k/a ${input.producerName})`,
    buyerSignoff: `Licensee: ${input.buyerLegalName}`,
  };
}
