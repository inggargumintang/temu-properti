import { useEffect, useRef, useState } from "react";
import api from "../lib/api";
import { useLang } from "../context/LangContext";
import { MagnifyingGlass } from "@phosphor-icons/react";

export const SearchBar = ({ onAnalyze, busy }) => {
  const { t } = useLang();
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    let alive = true;
    const id = setTimeout(async () => {
      try {
        const { data } = await api.get(`/areas/autocomplete?q=${encodeURIComponent(q)}`);
        if (alive) setSuggestions(data.suggestions || []);
      } catch { /* ignore */ }
    }, 150);
    return () => { alive = false; clearTimeout(id); };
  }, [q]);

  const submit = (val) => {
    const v = (val ?? q).trim();
    if (!v) return;
    setOpen(false);
    onAnalyze(v);
  };

  return (
    <div ref={ref} className="relative w-full" data-testid="search-bar">
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex gap-2">
        <div className="relative flex-1">
          <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={t.search.placeholder}
            className="w-full h-11 pl-10 pr-4 text-sm bg-white border border-slate-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#002FA7]/20 focus:border-[#002FA7]"
            data-testid="search-input"
          />
          {open && suggestions.length > 0 && (
            <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-sm shadow-lg shadow-slate-200/50 max-h-72 overflow-auto" data-testid="search-suggestions">
              {suggestions.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => { setQ(s); submit(s); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[#F0F4FF] hover:text-[#002FA7] transition"
                  data-testid={`suggestion-${s.toLowerCase().replace(/\s+/g,'-')}`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="submit" disabled={busy}
          className="px-6 h-11 bg-[#002FA7] hover:bg-[#00227A] text-white text-sm font-semibold tracking-wide rounded-sm transition-all active:scale-[0.98] disabled:opacity-60"
          data-testid="search-analyze-button"
        >
          {busy ? t.search.analyzing : t.search.button}
        </button>
      </form>
    </div>
  );
};
