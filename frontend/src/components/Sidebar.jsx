import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import {
  House, MagnifyingGlass, Bookmark, ChartBar, Calculator,
  DownloadSimple, Gear, SignOut, Translate
} from "@phosphor-icons/react";

export const Sidebar = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLang();
  const navigate = useNavigate();

  const items = [
    { to: "/", icon: House, label: t.nav.dashboard, testId: "nav-dashboard" },
    { to: "/search", icon: MagnifyingGlass, label: t.nav.search, testId: "nav-search" },
    { to: "/saved", icon: Bookmark, label: t.nav.saved, testId: "nav-saved" },
    { to: "/compare", icon: ChartBar, label: t.nav.compare, testId: "nav-compare" },
    { to: "/roi", icon: Calculator, label: t.nav.roi, testId: "nav-roi" },
    { to: "/exports", icon: DownloadSimple, label: t.nav.exports, testId: "nav-exports" },
    { to: "/settings", icon: Gear, label: t.nav.settings, testId: "nav-settings" },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col min-h-screen lg:sticky lg:top-0" data-testid="sidebar">
      <div className="px-5 py-5 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="brand-mark">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M7 11 L16 6 L25 11 V23 H7 V11 Z" fill="#FFFFFF"/>
              <rect x="11" y="16" width="4" height="7" fill="#002FA7"/>
              <rect x="17" y="14" width="5" height="4" fill="#002FA7"/>
            </svg>
          </span>
          <span className="font-bold tracking-tight text-[15px] text-slate-900" style={{fontFamily: 'Manrope'}}>TEMU PROPERTI</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-1 tracking-wide uppercase font-semibold">Market Intelligence</div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === "/"}
            data-testid={it.testId}
            onClick={() => onNavigate && onNavigate()}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-all duration-200 ${
                isActive
                  ? "bg-[#F0F4FF] text-[#002FA7] font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`
            }
          >
            <it.icon size={18} weight="duotone" />
            <span>{it.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3 space-y-2">
        <button
          onClick={() => setLang(lang === "en" ? "id" : "en")}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 rounded-sm transition"
          data-testid="lang-switcher"
        >
          <Translate size={16} weight="duotone" />
          <span className="font-semibold">{lang === "en" ? "EN" : "ID"}</span>
          <span className="text-slate-400">— Click to switch</span>
        </button>
        <div className="px-3 py-2 border-t border-slate-100 pt-3">
          <div className="text-xs text-slate-500 mb-0.5">{user?.name || user?.email}</div>
          <div className="text-[11px] text-slate-400 mb-2 truncate">{user?.email}</div>
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="w-full flex items-center justify-center gap-2 text-xs text-slate-600 hover:text-[#DC2626] py-1.5 border border-slate-200 hover:border-[#DC2626] rounded-sm transition"
          >
            <SignOut size={14} />
            {t.auth.signout}
          </button>
        </div>
      </div>
    </aside>
  );
};
