import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";

export const DashboardLayout = () => {
  return (
    <div className="noise min-h-screen px-4 py-4 md:px-6 lg:h-screen lg:overflow-hidden lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1600px] flex-col gap-4 lg:h-[calc(100vh-2rem)] lg:min-h-0 lg:flex-row">
        <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:w-80 lg:flex-shrink-0">
          <Sidebar />
        </div>
        <main className="flex-1 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
