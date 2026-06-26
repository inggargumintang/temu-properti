import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { Layout } from "../components/Layout";
import { useLang } from "../context/LangContext";
import { Bookmark, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";

const fmtRM = (n) => `RM ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function SavedAnalysis() {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/saved");
      setItems(data.items || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!window.confirm("Delete this saved analysis?")) return;
    try {
      await api.delete(`/saved/${id}`);
      toast.success("Deleted");
      load();
    } catch { toast.error("Failed to delete"); }
  };

  return (
    <Layout>
      <div className="p-6 sm:p-8 max-w-[1400px] mx-auto" data-testid="saved-page">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">{t.nav.saved}</h1>
        <p className="text-sm text-slate-600 mt-1 mb-6">Your bookmarked area analyses.</p>

        {loading && <div className="text-sm text-slate-500">Loading...</div>}
        {!loading && items.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-sm p-12 text-center" data-testid="saved-empty">
            <Bookmark size={48} weight="duotone" className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">No saved analyses yet. Run a search and click &quot;Save Analysis&quot;.</p>
          </div>
        )}
        {!loading && items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(it => (
              <div key={it.id} className="bg-white border border-slate-200 rounded-sm p-5" data-testid={`saved-item-${it.id}`}>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold tracking-tight text-slate-900">{it.area}</h3>
                  <button onClick={() => remove(it.id)} className="text-slate-400 hover:text-[#DC2626] transition" data-testid={`delete-${it.id}`}>
                    <Trash size={16} weight="duotone" />
                  </button>
                </div>
                {it.overall && (
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">Listings</span><span className="font-semibold tabular-nums">{it.overall.listing_count}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Avg Price</span><span className="font-semibold tabular-nums">{fmtRM(it.overall.average_price)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Fair Price</span><span className="font-semibold text-[#002FA7] tabular-nums">{fmtRM(it.overall.fair_price)}</span></div>
                  </div>
                )}
                <div className="mt-4 text-[10px] uppercase tracking-wide text-slate-400">{new Date(it.created_at).toLocaleString()}</div>
                <Link to={`/?area=${encodeURIComponent(it.area)}`} className="mt-3 inline-block text-xs text-[#002FA7] font-semibold hover:underline">View →</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
