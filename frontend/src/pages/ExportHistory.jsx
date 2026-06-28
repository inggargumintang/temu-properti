import { useEffect, useState } from "react";
import api from "../lib/api";
import { Layout } from "../components/Layout";
import { useLang } from "../context/LangContext";
import { DownloadSimple } from "@phosphor-icons/react";

export default function ExportHistory() {
  const { t } = useLang();
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get("/export/history/list").then(r => setItems(r.data.items || [])).catch(() => {});
  }, []);

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto" data-testid="exports-page">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">{t.nav.exports}</h1>
        <p className="text-sm text-slate-600 mt-1 mb-6">Your recent export activity.</p>

        {items.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-sm p-12 text-center">
            <DownloadSimple size={48} weight="duotone" className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">No exports yet.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
            <table className="dense w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="text-left">Filename</th>
                  <th className="text-left">Area</th>
                  <th className="text-left">Format</th>
                  <th className="text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map(it => (
                  <tr key={it.id} className="border-t border-slate-100">
                    <td className="font-mono-data text-xs">{it.filename}</td>
                    <td>{it.area}</td>
                    <td className="uppercase font-semibold text-[#002FA7]">{it.format}</td>
                    <td className="text-xs text-slate-500">{new Date(it.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
