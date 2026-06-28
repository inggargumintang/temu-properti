import { useState } from "react";
import api from "../lib/api";
import { Layout } from "../components/Layout";
import { SearchBar } from "../components/SearchBar";
import { useLang } from "../context/LangContext";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend
} from "recharts";
import {
  Sparkle, TrendUp, Buildings, ChartLine, House, ArrowRight, DownloadSimple, FloppyDisk, ArrowSquareOut
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";

const PIE_COLORS = ["#002FA7", "#3B82F6", "#93C5FD", "#E0E7FF"];

const KpiCard = ({ label, value, sub, testId }) => (
  <div className="kpi-card bg-white border border-slate-200 rounded-sm p-4 sm:p-5" data-testid={testId}>
    <div className="text-[10px] sm:text-[11px] tracking-[0.05em] uppercase text-slate-500 font-bold mb-1.5 sm:mb-2">{label}</div>
    <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tighter text-slate-900 tabular-nums">{value}</div>
    {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
  </div>
);

const fmtRM = (n) => `RM ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function Dashboard() {
  const { t, lang } = useLang();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tableSort, setTableSort] = useState({ col: "monthly_rent", dir: "asc" });
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [filterFurn, setFilterFurn] = useState("All");

  const handleAnalyze = async (area) => {
    setBusy(true);
    setData(null);
    try {
      const { data } = await api.get(`/analyze`, { params: { area, lang } });
      setData(data);
      setPage(1);
      toast.success(`${data.area} — ${data.listings.length} listings analyzed`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to analyze");
    } finally {
      setBusy(false);
    }
  };

  const doExport = async (fmt) => {
    if (!data) return;
    try {
      const res = await api.get(`/export/${fmt}`, { params: { area: data.area }, responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `TemuProperti_${data.area.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0,10).replace(/-/g,"")}.${fmt}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${fmt.toUpperCase()}`);
    } catch {
      toast.error("Export failed");
    }
  };

  const doSave = async () => {
    if (!data) return;
    try {
      await api.post("/saved", { area: data.area, payload: data });
      toast.success("Saved");
    } catch {
      toast.error("Save failed");
    }
  };

  // Sort + filter listings
  const filteredListings = data ? (data.listings || []).filter(l => filterFurn === "All" || l.furnishing_status === filterFurn) : [];
  const sortedListings = [...filteredListings].sort((a, b) => {
    const av = a[tableSort.col] ?? 0; const bv = b[tableSort.col] ?? 0;
    if (typeof av === "string") return tableSort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    return tableSort.dir === "asc" ? av - bv : bv - av;
  });
  const totalPages = Math.ceil(sortedListings.length / pageSize) || 1;
  const pageItems = sortedListings.slice((page - 1) * pageSize, page * pageSize);
  const setSort = (col) => setTableSort(s => ({ col, dir: s.col === col && s.dir === "asc" ? "desc" : "asc" }));

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-[1600px] mx-auto" data-testid="dashboard-page">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">{t.nav.dashboard}</h1>
          <p className="text-sm text-slate-600 mt-1">{t.tagline}</p>
        </div>

        <SearchBar onAnalyze={handleAnalyze} busy={busy} />

        {!data && !busy && (
          <div className="mt-12 bg-white border border-slate-200 rounded-sm p-12 text-center" data-testid="dashboard-empty">
            <ChartLine size={48} weight="duotone" className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Search to begin</h3>
            <p className="text-sm text-slate-500">Try <span className="text-[#002FA7] font-semibold">Mont Kiara</span>, <span className="text-[#002FA7] font-semibold">KLCC</span>, or <span className="text-[#002FA7] font-semibold">Bangsar</span>.</p>
          </div>
        )}

        {busy && (
          <div className="mt-12 bg-white border border-slate-200 rounded-sm p-12 text-center text-sm text-slate-500">
            Analyzing rental market data...
          </div>
        )}

        {data && (
          <>
            {/* Result header */}
            <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900" data-testid="result-area-name">{data.area}</h2>
                <span className={`text-[10px] tracking-wide uppercase font-bold px-2 py-1 rounded-sm ${data.data_source === "live" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {data.data_source === "live" ? t.common.liveData : t.common.mockData}
                </span>
                {data.from_cache && <span className="text-[10px] uppercase font-bold text-slate-500">{t.common.fromCache}</span>}
              </div>
              <div className="flex gap-2">
                <Button onClick={doSave} variant="outline" className="rounded-sm h-9 text-xs" data-testid="save-analysis-button">
                  <FloppyDisk size={14} weight="duotone" className="mr-1.5" /> {t.common.save}
                </Button>
                <Button onClick={() => doExport("csv")} variant="outline" className="rounded-sm h-9 text-xs" data-testid="export-csv-button">
                  <DownloadSimple size={14} weight="duotone" className="mr-1.5" /> CSV
                </Button>
                <Button onClick={() => doExport("xlsx")} className="bg-[#002FA7] hover:bg-[#00227A] rounded-sm h-9 text-xs" data-testid="export-xlsx-button">
                  <DownloadSimple size={14} weight="duotone" className="mr-1.5" /> XLSX
                </Button>
              </div>
            </div>

            {/* KPI Grid */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4" data-testid="kpi-grid">
              <KpiCard testId="kpi-listings" label={t.kpi.listings} value={data.overall.listing_count} />
              <KpiCard testId="kpi-avg-price" label={t.kpi.avgPrice} value={fmtRM(data.overall.average_price)} />
              <KpiCard testId="kpi-median-price" label={t.kpi.medianPrice} value={fmtRM(data.overall.median_price)} />
              <KpiCard testId="kpi-fair-price" label={t.kpi.fairPrice} value={fmtRM(data.overall.fair_price)} />
              <KpiCard testId="kpi-psf" label={t.kpi.psf} value={`RM ${data.overall.rent_per_sqft.toFixed(2)}`} />
              <KpiCard testId="kpi-avg-size" label={t.kpi.avgSize} value={`${data.overall.average_size.toFixed(0)} sqft`} />
            </div>

            {/* Insights */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {data.ai_insights && data.ai_insights.length > 0 && (
                <div className="ai-insight-bg border border-[#3B82F6]/20 rounded-sm p-5" data-testid="ai-insights-card">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkle size={18} weight="fill" className="text-[#002FA7]" />
                    <h3 className="text-sm font-bold tracking-wide uppercase text-[#002FA7]">{t.insights.title} · {t.insights.ai}</h3>
                  </div>
                  <ul className="space-y-2">
                    {data.ai_insights.map((ins, i) => (
                      <li key={i} className="flex gap-2 text-sm text-slate-700 leading-relaxed">
                        <ArrowRight size={14} weight="bold" className="text-[#002FA7] mt-1 flex-shrink-0" />
                        <span>{ins}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="bg-white border border-slate-200 rounded-sm p-5" data-testid="rule-insights-card">
                <div className="flex items-center gap-2 mb-3">
                  <TrendUp size={18} weight="duotone" className="text-slate-700" />
                  <h3 className="text-sm font-bold tracking-wide uppercase text-slate-700">{t.insights.title} · {t.insights.rule}</h3>
                </div>
                <ul className="space-y-2">
                  {data.rule_insights.map((ins, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700 leading-relaxed">
                      <span className="brand-dot mt-1.5 flex-shrink-0" />
                      <span>{ins}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Charts */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title={t.charts.priceDist} testId="chart-histogram">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.price_histogram}>
                    <CartesianGrid strokeDasharray="2 4" stroke="#E4E4E7" />
                    <XAxis dataKey="range" tick={{ fontSize: 10 }} stroke="#71717A" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#71717A" />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="count" fill="#4F46E5" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title={t.charts.avgByType} testId="chart-avg-by-type">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.by_unit_type}>
                    <CartesianGrid strokeDasharray="2 4" stroke="#E4E4E7" />
                    <XAxis dataKey="unit_type" tick={{ fontSize: 11 }} stroke="#71717A" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#71717A" />
                    <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v) => fmtRM(v)} />
                    <Bar dataKey="average_price" fill="#002FA7" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title={t.charts.furnishing} testId="chart-furnishing">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={data.furnishing_distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => `${e.percentage}%`}>
                      {data.furnishing_distribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title={t.charts.psfByType} testId="chart-psf">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.psf_by_type}>
                    <CartesianGrid strokeDasharray="2 4" stroke="#E4E4E7" />
                    <XAxis dataKey="unit_type" tick={{ fontSize: 11 }} stroke="#71717A" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#71717A" />
                    <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v) => `RM ${v}/sqft`} />
                    <Bar dataKey="rent_per_sqft" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Price Summary Table */}
            <div className="mt-6 bg-white border border-slate-200 rounded-sm overflow-hidden" data-testid="price-summary-table">
              <div className="px-5 py-3 border-b border-slate-200">
                <h3 className="text-sm font-bold tracking-wide uppercase text-slate-700 flex items-center gap-2"><Buildings size={16} weight="duotone"/> Price Summary by Unit Type</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="dense w-full text-sm tabular-nums">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="text-left">{t.table.unitType}</th>
                      <th className="text-right">{t.table.count}</th>
                      <th className="text-right">{t.table.avgPrice}</th>
                      <th className="text-right">{t.table.median}</th>
                      <th className="text-right">{t.table.mode}</th>
                      <th className="text-right">{t.table.fair}</th>
                      <th className="text-right">{t.table.avgSize}</th>
                      <th className="text-right">{t.table.psf}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_unit_type.map(r => (
                      <tr key={r.unit_type} className="border-t border-slate-100">
                        <td className="font-semibold">{r.unit_type}</td>
                        <td className="text-right">{r.listing_count}</td>
                        <td className="text-right">{fmtRM(r.average_price)}</td>
                        <td className="text-right">{fmtRM(r.median_price)}</td>
                        <td className="text-right">{fmtRM(r.mode_price)}</td>
                        <td className="text-right font-semibold text-[#002FA7]">{fmtRM(r.fair_price)}</td>
                        <td className="text-right">{r.average_size}</td>
                        <td className="text-right">{r.rent_per_sqft}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Unit Listings */}
            <div className="mt-6 bg-white border border-slate-200 rounded-sm overflow-hidden" data-testid="listings-table">
              <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-bold tracking-wide uppercase text-slate-700 flex items-center gap-2"><House size={16} weight="duotone"/> Unit Listings ({sortedListings.length})</h3>
                <select value={filterFurn} onChange={(e) => { setFilterFurn(e.target.value); setPage(1); }} className="text-xs h-8 border border-slate-200 rounded-sm px-2" data-testid="filter-furnishing">
                  <option value="All">All Furnishing</option>
                  <option>Fully Furnished</option>
                  <option>Partially Furnished</option>
                  <option>Unfurnished</option>
                </select>
              </div>
              <div className="overflow-x-auto hidden sm:block">
                <table className="dense w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="text-left cursor-pointer" onClick={() => setSort("title")}>{t.table.title}</th>
                      <th className="text-left cursor-pointer" onClick={() => setSort("property_name")}>{t.table.property}</th>
                      <th className="text-left cursor-pointer" onClick={() => setSort("bedroom_type")}>{t.table.unitType}</th>
                      <th className="text-right cursor-pointer" onClick={() => setSort("monthly_rent")}>{t.table.monthly} ↕</th>
                      <th className="text-right cursor-pointer" onClick={() => setSort("size_sqft")}>{t.table.size} ↕</th>
                      <th className="text-left">{t.table.furnishing}</th>
                      <th className="text-center">{t.table.url}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((l, i) => (
                      <tr key={l.source_listing_id + i} className="border-t border-slate-100" data-testid={`listing-row-${i}`}>
                        <td className="max-w-[280px] truncate" title={l.title}>{l.title}</td>
                        <td>{l.property_name}</td>
                        <td>{l.bedroom_type}</td>
                        <td className="text-right tabular-nums font-semibold">{fmtRM(l.monthly_rent)}</td>
                        <td className="text-right tabular-nums">{l.size_sqft}</td>
                        <td className="text-xs">{l.furnishing_status}</td>
                        <td className="text-center">
                          <a href={l.listing_url} target="_blank" rel="noreferrer" className="text-[#002FA7] hover:underline inline-flex items-center gap-1 text-xs">
                            <ArrowSquareOut size={14} />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile card list */}
              <div className="sm:hidden divide-y divide-slate-100">
                {pageItems.map((l, i) => (
                  <a key={l.source_listing_id + i} href={l.listing_url} target="_blank" rel="noreferrer" className="block p-4 active:bg-slate-50" data-testid={`listing-card-${i}`}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-[10px] font-bold tracking-wide uppercase text-[#002FA7] bg-[#F0F4FF] px-1.5 py-0.5 rounded-sm">{l.bedroom_type}</span>
                      <span className="text-base font-extrabold text-slate-900 tabular-nums">{fmtRM(l.monthly_rent)}</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900 leading-snug mb-1 line-clamp-2">{l.property_name}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                      <span>{l.size_sqft} sqft</span>
                      <span>·</span>
                      <span>{l.furnishing_status}</span>
                      <ArrowSquareOut size={12} className="ml-auto text-[#002FA7]" />
                    </div>
                  </a>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <span>Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border border-slate-200 rounded-sm disabled:opacity-40" data-testid="page-prev">Prev</button>
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border border-slate-200 rounded-sm disabled:opacity-40" data-testid="page-next">Next</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      {/* Sticky mobile action bar (only when data loaded) */}
      {data && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 px-3 py-2 flex gap-2 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]" data-testid="mobile-action-bar">
          <Button onClick={doSave} variant="outline" className="flex-1 rounded-sm h-10 text-xs" data-testid="mobile-save-button">
            <FloppyDisk size={14} weight="duotone" className="mr-1" /> {t.common.save}
          </Button>
          <Button onClick={() => doExport("csv")} variant="outline" className="flex-1 rounded-sm h-10 text-xs" data-testid="mobile-export-csv">
            <DownloadSimple size={14} weight="duotone" className="mr-1" /> CSV
          </Button>
          <Button onClick={() => doExport("xlsx")} className="flex-1 bg-[#002FA7] hover:bg-[#00227A] rounded-sm h-10 text-xs" data-testid="mobile-export-xlsx">
            <DownloadSimple size={14} weight="duotone" className="mr-1" /> XLSX
          </Button>
        </div>
      )}
    </Layout>
  );
}

const ChartCard = ({ title, children, testId }) => (
  <div className="bg-white border border-slate-200 rounded-sm p-5" data-testid={testId}>
    <h3 className="text-sm font-bold tracking-wide uppercase text-slate-700 mb-4">{title}</h3>
    {children}
  </div>
);
