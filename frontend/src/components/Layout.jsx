import { Sidebar } from "./Sidebar";
import { Toaster } from "../components/ui/sonner";

export const Layout = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden">
        {children}
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
};
