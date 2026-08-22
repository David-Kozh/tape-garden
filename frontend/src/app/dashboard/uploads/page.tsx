"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, Music, Archive } from "lucide-react";

export default function UploadsDashboard() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Uploads</h1>
          <p className="text-muted-foreground mt-1">Manage your beats and sample packs.</p>
        </div>
        <Link href="/dashboard/uploads/new">
          <Button className="gap-2 w-full sm:w-auto">
            <Upload className="w-4 h-4" />
            New Upload
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="w-5 h-5 text-primary" />
              Beats
            </CardTitle>
            <CardDescription>Manage your uploaded beats.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              View, edit, or delete your published beats.
            </p>
            {/* Future list of beats goes here */}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-primary" />
              Sample Packs
            </CardTitle>
            <CardDescription>Manage your sample packs.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              View, edit, or delete your published sample packs.
            </p>
            {/* Future list of sample packs goes here */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
