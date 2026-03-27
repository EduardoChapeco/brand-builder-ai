import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";

const AppShell = () => {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default AppShell;
