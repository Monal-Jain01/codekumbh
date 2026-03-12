import { ListingWizard } from "@/components/property/listing-wizard";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewPropertyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <Link
          href="/properties"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft size={14} /> Back to Properties
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">List Your Property</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Follow the steps to add your property to Estator
          </p>
        </div>

        <ListingWizard />
      </div>
    </div>
  );
}
