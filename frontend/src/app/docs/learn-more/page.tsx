import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Flower2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "Learn More | Tape Garden",
  description:
    "How Tape Garden works — our gallery philosophy, buyer licensing and delivery, and producer studio mechanics.",
};

export default function LearnMorePage() {
  return (
    <main className="min-h-screen bg-background py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-12">
        {/* About Us Section */}
        <section aria-labelledby="about-heading" className="space-y-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-leaf-500/10 border border-leaf-500/20 text-leaf-300 text-xs font-semibold">
              <Flower2 className="w-3.5 h-3.5" />
              About Tape Garden
            </div>
            <h1
              id="about-heading"
              className="text-3xl sm:text-4xl font-lexend font-bold tracking-tight text-foreground"
            >
              Built like an art gallery, not a marketplace.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              A deliberately minimal space designed for music producers to show
              their best work. Built like an art gallery, not a marketplace — no
              extra noise.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Gallery Philosophy</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground leading-relaxed">
                Great production shouldn&apos;t have to shout to be heard. Each
                beat and sample pack is presented with room to breathe so the
                music comes first.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Curated Admission</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground leading-relaxed">
                Producers join through portfolio review or direct invite.
                Curation keeps the catalog focused on craft and intentionality
                rather than sheer volume.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Scarce Upload Slots (+2/mo)
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground leading-relaxed">
                Producers start with a small slot allocation and earn +2 beat
                slots and +2 sample pack slots each month (up to 50). Scarcity
                encourages publishing only your strongest work.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Deliberate Non-Features
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground leading-relaxed">
                No trending badges, no paid placement or boosted listings, no
                vanity metrics, and no subscriptions required to browse, buy, or
                belong.
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Guides Accordion */}
        <section aria-labelledby="guides-heading" className="space-y-4">
          <div className="space-y-1">
            <h2
              id="guides-heading"
              className="text-2xl font-lexend font-semibold tracking-tight text-foreground"
            >
              Guides
            </h2>
            <p className="text-sm text-muted-foreground">
              Everything you need to know about licensing, delivery, payouts,
              and upload slots.
            </p>
          </div>

          <Accordion
            multiple
            hiddenUntilFound
            defaultValue={["buyer-guide"]}
            className="gap-4"
          >
            {/* Buyer Guide */}
            <AccordionItem
              value="buyer-guide"
              className="rounded-xl border border-border bg-card text-card-foreground overflow-hidden not-last:border-b"
            >
              <AccordionTrigger className="items-center px-6 py-5 text-lg font-semibold hover:no-underline hover:bg-foreground/[0.03] rounded-none">
                <div className="flex flex-wrap items-baseline justify-between gap-2 pr-3 w-full">
                  <span>Buyer Guide</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    Licensing, delivery &amp; support
                  </span>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-6 pt-4 pb-6 border-t border-border/60 space-y-6 text-sm text-muted-foreground leading-relaxed">
                <div className="space-y-2.5">
                  <h4 className="text-base font-semibold text-foreground">
                    Licensing
                  </h4>
                  <p>
                    Every purchase includes an automatically generated,
                    executed PDF license agreement stored in your collection
                    alongside your audio files.
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong className="text-foreground">
                        Beats (Non-Exclusive):
                      </strong>{" "}
                      Producers can offer{" "}
                      <strong className="text-foreground">Limited</strong> and{" "}
                      <strong className="text-foreground">
                        Premium-Unlimited
                      </strong>{" "}
                      tiers. Both include the Master WAV and Trackout Stems on a{" "}
                      <strong className="text-foreground">perpetual</strong>{" "}
                      term with a 50/50 publishing split and mandatory producer
                      credit.
                    </li>
                    <li>
                      <strong className="text-foreground">
                        Limited vs. Premium-Unlimited:
                      </strong>{" "}
                      Limited covers 1 original song up to the listed monetized
                      stream cap (50,000 streams by default unless configured
                      otherwise by the producer), 1 commercial music video, and
                      1 for-profit live performance. You can upgrade a Limited
                      beat purchase to Premium-Unlimited from your collection
                      and have your original payment credited toward the
                      upgrade. Premium-Unlimited removes stream, video, and live
                      performance caps.
                    </li>
                    <li>
                      <strong className="text-foreground">
                        Restrictions:
                      </strong>{" "}
                      Beats are non-exclusive—you may not resell or redistribute
                      raw stems/instrumentals on their own, and you may not
                      register the beat or new song with automated
                      fingerprinting systems like YouTube Content ID.
                    </li>
                    <li>
                      <strong className="text-foreground">Sample Packs:</strong>{" "}
                      Includes a perpetual, non-exclusive, royalty-free license
                      to use the loops, one-shots, and sounds in new original
                      compositions without owing additional royalties. Isolated
                      samples may not be repackaged or resold as competing
                      kits/libraries or registered with Content ID.
                    </li>
                  </ul>
                </div>

                <div className="space-y-2.5">
                  <h4 className="text-base font-semibold text-foreground">
                    Checkout &amp; Delivery
                  </h4>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong className="text-foreground">
                        Stripe Checkout:
                      </strong>{" "}
                      Add beats or sample packs to your cart and complete
                      payment securely via Stripe Checkout. Purchased items are
                      fulfilled immediately once payment succeeds.
                    </li>
                    <li>
                      <strong className="text-foreground">
                        Accessing Files:
                      </strong>{" "}
                      Go to{" "}
                      <Link
                        href="/dashboard/collection"
                        className="text-primary font-medium"
                      >
                        /dashboard/collection
                      </Link>{" "}
                      to download your WAV/stems/archive files and your PDF
                      license agreement at any time.
                    </li>
                    <li>
                      <strong className="text-foreground">
                        Signed Links &amp; Rate Limits:
                      </strong>{" "}
                      Each file download generates a private{" "}
                      <strong className="text-foreground">
                        24-hour signed download link
                      </strong>
                      . Audio/archive file downloads are rate-limited to{" "}
                      <strong className="text-foreground">
                        3 downloads per hour
                      </strong>{" "}
                      per account (license PDFs do not count toward this limit).
                    </li>
                  </ul>
                </div>

                <div className="space-y-2.5">
                  <h4 className="text-base font-semibold text-foreground">
                    Support &amp; Contact
                  </h4>
                  <p>
                    Having trouble with a checkout, missing file, or download
                    link? Visit our{" "}
                    <Link
                      href="/docs/help"
                      className="text-primary font-medium"
                    >
                      Help &amp; Support
                    </Link>{" "}
                    page to email support with your order ID, or submit a user
                    or copyright report.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Producer Guide */}
            <AccordionItem
              value="producer-guide"
              className="rounded-xl border border-border bg-card text-card-foreground overflow-hidden"
            >
              <AccordionTrigger className="items-center px-6 py-5 text-lg font-semibold hover:no-underline hover:bg-foreground/[0.03] rounded-none">
                <div className="flex flex-wrap items-baseline justify-between gap-2 pr-3 w-full">
                  <span>Producer Guide</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    Admission, payouts &amp; upload slots
                  </span>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-6 pt-4 pb-6 border-t border-border/60 space-y-6 text-sm text-muted-foreground leading-relaxed">
                <div className="space-y-2.5">
                  <h4 className="text-base font-semibold text-foreground">
                    Joining the Garden
                  </h4>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong className="text-foreground">
                        Apply (
                        <Link
                          href="/apply"
                          className="text-primary font-medium"
                        >
                          /apply
                        </Link>
                        ):
                      </strong>{" "}
                      Submit your display name, email, portfolio URL, and an
                      optional note. Every application is reviewed individually.
                    </li>
                    <li>
                      <strong className="text-foreground">
                        Curated Invite (
                        <code className="text-xs px-1.5 py-0.5 rounded bg-muted/50 text-foreground">
                          /invite/[token]
                        </code>
                        ):
                      </strong>{" "}
                      Invited producers receive a unique onboarding link to
                      claim their studio directly.
                    </li>
                  </ul>
                </div>

                <div className="space-y-2.5">
                  <h4 className="text-base font-semibold text-foreground">
                    Studio &amp; Payouts
                  </h4>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong className="text-foreground">
                        90 / 10 Revenue Split:
                      </strong>{" "}
                      Producers keep{" "}
                      <strong className="text-foreground">90%</strong> of every
                      sale, and Tape Garden takes a{" "}
                      <strong className="text-foreground">10%</strong> platform
                      fee.
                    </li>
                    <li>
                      <strong className="text-foreground">
                        Stripe Express &amp; Active Status:
                      </strong>{" "}
                      Connect your Stripe Express account from your Studio
                      Overview (
                      <Link
                        href="/dashboard"
                        className="text-primary font-medium"
                      >
                        /dashboard
                      </Link>
                      ). Your Stripe status must be{" "}
                      <code className="text-xs px-1.5 py-0.5 rounded bg-muted/50 text-foreground">
                        active
                      </code>{" "}
                      before buyers can purchase your items—published tracks
                      remain listenable in the gallery, but checkout is disabled
                      until payout verification is complete.
                    </li>
                  </ul>
                </div>

                <div className="space-y-2.5">
                  <h4 className="text-base font-semibold text-foreground">
                    Upload Mechanics &amp; Scarcity
                  </h4>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong className="text-foreground">
                        Slot Allocations:
                      </strong>{" "}
                      Approved producers start with{" "}
                      <strong className="text-foreground">
                        2 beat slots and 2 sample pack slots
                      </strong>
                      , and receive{" "}
                      <strong className="text-foreground">
                        +2 beat slots and +2 sample pack slots per month
                      </strong>{" "}
                      up to a maximum cap of{" "}
                      <strong className="text-foreground">50 slots</strong>{" "}
                      each.
                    </li>
                    <li>
                      <strong className="text-foreground">
                        Drafts vs. Published:
                      </strong>{" "}
                      Both{" "}
                      <code className="text-xs px-1.5 py-0.5 rounded bg-muted/50 text-foreground">
                        draft
                      </code>{" "}
                      and{" "}
                      <code className="text-xs px-1.5 py-0.5 rounded bg-muted/50 text-foreground">
                        published
                      </code>{" "}
                      items consume an upload slot. Deleting an unpurchased item
                      permanently removes its files and frees the slot.
                    </li>
                    <li>
                      <strong className="text-foreground">
                        File Size Limits:
                      </strong>{" "}
                      Beat stems archives (
                      <code className="text-xs px-1.5 py-0.5 rounded bg-muted/50 text-foreground">
                        .zip
                      </code>
                      ) are capped at{" "}
                      <strong className="text-foreground">250MB</strong>, sample
                      pack archives (
                      <code className="text-xs px-1.5 py-0.5 rounded bg-muted/50 text-foreground">
                        .zip
                      </code>
                      ) at <strong className="text-foreground">500MB</strong>,
                      audio previews at{" "}
                      <strong className="text-foreground">100MB</strong>, and
                      optional cover art images at{" "}
                      <strong className="text-foreground">10MB</strong>.
                    </li>
                    <li>
                      <strong className="text-foreground">
                        Deleting Purchased Items:
                      </strong>{" "}
                      If an item has already been purchased, deleting it
                      archives it (
                      <code className="text-xs px-1.5 py-0.5 rounded bg-muted/50 text-foreground">
                        removed
                      </code>{" "}
                      for beats /{" "}
                      <code className="text-xs px-1.5 py-0.5 rounded bg-muted/50 text-foreground">
                        hidden
                      </code>{" "}
                      for sample packs) instead of deleting the assets. It is
                      removed from the public gallery and frees your slot, while
                      past buyers retain permanent download access in{" "}
                      <code className="text-xs px-1.5 py-0.5 rounded bg-muted/50 text-foreground">
                        /dashboard/collection
                      </code>
                      .
                    </li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* Bottom Actions */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/60">
          <Button render={<Link href="/gallery" />} className="gap-2">
            <span>Explore Gallery</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            render={<Link href="/apply" />}
            className="gap-2"
          >
            <span>Apply as Producer</span>
          </Button>
          <Button
            variant="ghost"
            render={<Link href="/docs/help" />}
            className="ml-auto"
          >
            Help &amp; Support
          </Button>
        </div>
      </div>
    </main>
  );
}
