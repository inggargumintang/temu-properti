import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Toaster } from "../components/ui/sonner";
import { List, X } from "@phosphor-icons/react";

export const Layout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="brand-mark">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M7 11 L16 6 L25 11 V23 H7 V11 Z" fill="#FFFFFF"/>
              <rect x="11" y="16" width="4" height="7" fill="#002FA7"/>
              <rect x="17" y="14" width="5" height="4" fill="#002FA7"/>
            </svg>
          </span>
          <span className="font-bold tracking-tight text-[14px]" style={{fontFamily:'Manrope'}}>TEMU PROPERTI</span>
        </div>
        <button onClick={() => setMobileOpen(true)} aria-label="Open menu" data-testid="mobile-menu-button" className="p-2 -mr-2 text-slate-700">
          <List size={22} weight="bold" />
        </button>
      </div>

      {/* Desktop sidebar (lg+) */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" data-testid="mobile-drawer">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <div className="relative w-72 max-w-[85%] bg-white shadow-xl">
            <button onClick={close} aria-label="Close menu" className="absolute top-4 right-3 p-1.5 text-slate-500 z-10" data-testid="mobile-menu-close">
              <X size={20} weight="bold" />
            </button>
            <Sidebar onNavigate={close} />
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0 overflow-x-hidden pt-14 lg:pt-0">
        {children}
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
};
