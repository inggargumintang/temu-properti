import { Layout } from "../components/Layout";
import { SearchBar } from "../components/SearchBar";
import { useLang } from "../context/LangContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../lib/api";
import { ClockCounterClockwise } from "@phosphor-icons/react";

export default function Search() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.get("/search/history").then(r => setHistory(r.data.items || [])).catch(() => {});
  }, []);

  const handleAnalyze = (area) => {
    navigate(`/?area=${encodeURIComponent(area)}`);
    // Trigger directly via search bar event in dashboard; simplest is just navigate and let user redo
    // Or use URL param — Dashboard reads it
  };

  return (
    <Layout>
      <div className="p-6 sm:p-8 max-w-[1200px] mx-auto" data-testid="search-page">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">{t.nav.search}</h1>
        <p className="text-sm text-slate-600 mt-1 mb-6">Find any Malaysian rental area and run a full analysis.</p>

        <SearchBar onAnalyze={handleAnalyze} />

        {history.length > 0 && (
          <div className="mt-8 bg-white border border-slate-200 rounded-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <ClockCounterClockwise size={18} weight="duotone" className="text-slate-600" />
              <h3 className="text-sm font-bold tracking-wide uppercase text-slate-700">Recent searches</h3>
            </div>
            <div className="flex gap-2 flex-wrap">
              {history.slice(0, 20).map((h, i) => (
                <button key={i} onClick={() => handleAnalyze(h.matched_area || h.keyword)} className="text-xs px-3 py-1.5 border border-slate-200 hover:border-[#002FA7] hover:text-[#002FA7] rounded-sm transition" data-testid={`history-${i}`}>
                  {h.matched_area || h.keyword}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
