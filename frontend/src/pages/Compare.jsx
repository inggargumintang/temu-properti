import { useEffect, useState } from "react";
import api from "../lib/api";
import { Layout } from "../components/Layout";
import { useLang } from "../context/LangContext";
import { Button } from "../components/ui/button";
import { Plus, X, ChartBar } from "@phosphor-icons/react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

const fmtRM = (n) => `RM ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function Compare() {
  const { t } = useLang();
  const [allAreas, setAllAreas] = useState([]);
  const [selected, setSelected] = useState(["Mont Kiara", "KLCC", "Bangsar"]);
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/areas/all").then(r => setAllAreas(r.data.areas)).catch(() => {});
  }, []);

  const addArea = (a) => {
    if (selected.includes(a)) return;
    if (selected.length >= 5) { toast.error(t.compare.max); return; }
    setSelected([...selected, a]);
  };

  const removeArea = (a) => setSelected(selected.filter(x => x !== a));

  const run = async () => {
    if (selected.length < 2) return toast.error("Pick at least 2 areas");
    setBusy(true);
    try {
      const { data } = await api.post("/compare", { areas: selected });
      setResults(data.comparison);
      toast.success("Comparison complete");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const chartData = results ? results.map(r => ({
    area: r.area,
    avg: r.overall.average_price,
    median: r.overall.median_price,
    fair: r.overall.fair_price,
    psf: r.overall.rent_per_sqft,
  })) : [];

  return (
    <Layout>
      <div className="p-6 sm:p-8 max-w-[1600px] mx-auto" data-testid="compare-page">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">{t.compare.title}</h1>
        <p className="text-sm text-slate-600 mt-1 mb-6">{t.compare.sub}</p>

        <div className="bg-white border border-slate-200 rounded-sm p-5">
          <div className="flex flex-wrap gap-2 mb-4">
            {selected.map(a => (
              <span key={a} className="inline-flex items-center gap-1.5 bg-[#F0F4FF] text-[#002FA7] px-3 py-1.5 rounded-sm text-xs font-semibold" data-testid={`selected-${a}`}>
                {a}
                <button onClick={() => removeArea(a)} className="hover:text-[#DC2626]"><X size={12} weight="bold" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap mb-4">
            {allAreas?.filter(a => !selected.includes(a)).slice(0, 15).map(a => (
              <button key={a} onClick={() => addArea(a)} className="text-xs px-3 py-1.5 border border-slate-200 hover:border-[#002FA7] hover:text-[#002FA7] rounded-sm transition" data-testid={`add-${a}`}>
                <Plus size={10} weight="bold" className="inline mr-1" /> {a}
              </button>
            ))}
          </div>
          <Button onClick={run} disabled={busy} className="bg-[#002FA7] hover:bg-[#00227A] rounded-sm" data-testid="compare-run-button">
            <ChartBar size={16} weight="duotone" className="mr-2" />
            {busy ? "..." : t.compare.run}
          </Button>
        </div>

        {results && (
          <>
            <div className="mt-6 bg-white border border-slate-200 rounded-sm overflow-hidden" data-testid="compare-table">
              <table className="dense w-full text-sm tabular-nums">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="text-left">Area</th>
                    <th className="text-right">Listings</th>
                    <th className="text-right">Avg Price</th>
                    <th className="text-right">Median</th>
                    <th className="text-right">Fair Price</th>
                    <th className="text-right">Avg Size</th>
                    <th className="text-right">RM/sqft</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(r => (
                    <tr key={r.area} className="border-t border-slate-100">
                      <td className="font-semibold">{r.area}</td>
                      <td className="text-right">{r.overall.listing_count}</td>
                      <td className="text-right">{fmtRM(r.overall.average_price)}</td>
                      <td className="text-right">{fmtRM(r.overall.median_price)}</td>
                      <td className="text-right font-semibold text-[#002FA7]">{fmtRM(r.overall.fair_price)}</td>
                      <td className="text-right">{r.overall.average_size}</td>
                      <td className="text-right">{r.overall.rent_per_sqft.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 bg-white border border-slate-200 rounded-sm p-5">
              <h3 className="text-sm font-bold tracking-wide uppercase text-slate-700 mb-4">Average vs Median Rent</h3>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#E4E4E7" />
                  <XAxis dataKey="area" tick={{ fontSize: 11 }} stroke="#71717A" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#71717A" />
                  <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v) => fmtRM(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="avg" name="Average" fill="#002FA7" />
                  <Bar dataKey="median" name="Median" fill="#3B82F6" />
                  <Bar dataKey="fair" name="Fair" fill="#93C5FD" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
