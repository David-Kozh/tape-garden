import Link from "next/link";
import { Copyright, Mail, UserX, ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// TODO: Replace with your production support email address
const SUPPORT_EMAIL = "support@tapegarden.com";

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Help &amp; Support</h1>
          <p className="text-muted-foreground">
            Need assistance, want to report an issue, or need to submit a legal
            notice? Choose an option below.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-primary">
                <UserX className="w-5 h-5" />
                <CardTitle className="text-lg">Report a User</CardTitle>
              </div>
              <CardDescription>
                Report producer impersonation, fraudulent activity, or
                harassment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full justify-between"
                render={<Link href="/report?type=producer_report" />}
              >
                <span>Submit User Report</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive">
                <Copyright className="w-5 h-5" />
                <CardTitle className="text-lg">File a Copyright Claim</CardTitle>
              </div>
              <CardDescription>
                Submit a DMCA or copyright infringement takedown notice for
                unauthorized use of your work.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full justify-between"
                render={<Link href="/report?type=copyright_infringement" />}
              >
                <span>File Copyright Claim</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <CardTitle className="text-lg">Contact Support</CardTitle>
            </div>
            <CardDescription>
              For general questions, account help, or follow-ups on an existing
              case, reach out to our support team directly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
