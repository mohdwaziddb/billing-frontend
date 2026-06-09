import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";

export const DashboardLayout = () => {
  return (
    <div className="noise min-h-screen bg-[var(--app-bg)] px-3 py-3 md:px-5 md:py-5">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-[1680px] flex-col gap-5 lg:flex-row lg:items-start">
        <div className="lg:sticky lg:top-5 lg:h-[calc(100vh-2.5rem)] lg:flex-shrink-0">
          <Sidebar />
        </div>
        <main className="min-w-0 flex-1 space-y-5 lg:min-h-[calc(100vh-2.5rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
