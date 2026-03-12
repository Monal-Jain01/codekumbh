import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/auth/logout-button";
import { PropertySearch } from "@/components/property-search";
import { NewlyLaunched } from "@/components/newly-launched";
import { redirect } from "next/navigation";


export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // return (
    //   <div className="flex min-h-screen flex-col items-center justify-center p-4 gap-8">
    //     <div className="text-center space-y-4">
    //       <h1 className="text-4xl font-bold tracking-tight">Hello World</h1>
    //       <p className="text-muted-foreground">Welcome to the Hackathon Starter. Please log in to continue.</p>
    //       <Button asChild>
    //         <Link href="/auth/login">Log In</Link>
    //       </Button>
    //     </div>
    //     <PropertySearch />
    //     <NewlyLaunched />
    //   </div>
    // );
    redirect("/auth/sign-up");
  }

  return (
    <div className="flex mt-10 flex-col items-center justify-center p-4 gap-8">

      {/* Property Search Bar */}
      <PropertySearch />
      {/* Newly Launched Projects */}
      <NewlyLaunched />

    </div>
  );
}
