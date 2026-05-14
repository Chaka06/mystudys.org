import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { RightSidebar } from "@/components/layout/RightSidebar";
import { MainContent } from "@/components/layout/MainContent";
import { LayoutContainer } from "@/components/layout/LayoutContainer";
import { RealtimeProvider } from "@/components/providers/RealtimeProvider";
import { PullToRefreshProvider } from "@/components/providers/PullToRefreshProvider";
import { OfflineProvider } from "@/components/providers/OfflineProvider";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <RealtimeProvider>
      <OfflineProvider />
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col">
        <Navbar />
        <LayoutContainer>
          <Sidebar />
          <MainContent>
            <PullToRefreshProvider>
              <div className="page-transition">
                {children}
              </div>
            </PullToRefreshProvider>
          </MainContent>
          <RightSidebar />
        </LayoutContainer>
        <MobileNav />
      </div>
    </RealtimeProvider>
  );
}
