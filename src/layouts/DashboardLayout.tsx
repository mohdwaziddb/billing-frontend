import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";

export const DashboardLayout = () => {
  return (
    <div className="noise min-h-screen px-4 py-4 md:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1580px] flex-col gap-4 lg:flex-row lg:items-start">
        <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:w-[288px] lg:flex-shrink-0 xl:w-[312px]">
          <Sidebar />
        </div>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
