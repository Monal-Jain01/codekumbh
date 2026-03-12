import Link from "next/link";
import { Home, Search, ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Big 404 */}
        <div className="space-y-2">
          <h1 className="text-8xl font-black text-primary/20 select-none">404</h1>
          <h2 className="text-2xl font-bold text-foreground">Page not found</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        {/* Helpful links */}
        <div className="space-y-3">
          <Link
            href="/"
            className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Home className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">Go to Home</span>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>

          <Link
            href="/properties"
            className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Search className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">Browse Properties</span>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-sm">⚡</span>
              </div>
              <span className="text-sm font-medium text-foreground">Dashboard</span>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  );
}
