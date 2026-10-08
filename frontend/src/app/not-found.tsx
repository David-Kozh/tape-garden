import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <h1 className="text-4xl font-heading font-bold mb-4 tracking-tight">
        404
      </h1>
      <p className="text-lg text-muted-foreground mb-8">
        This page could not be found.
      </p>
      <Link
        href="/"
        className="px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-full font-medium shadow-sm"
      >
        Return to home
      </Link>
    </div>
  );
}
