import { useState } from "react";
import api from "../lib/api";
import { Layout } from "../components/Layout";
import { useLang } from "../context/LangContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Calculator } from "@phosphor-icons/react";

const fmtRM = (n) => `RM ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function ROI() {
  const { t } = useLang();
  const [form, setForm] = useState({
    purchase_price: 800000,
    monthly_rent: 3500,
    occupancy_rate: 95,
    annual_maintenance: 6000,
    annual_tax: 1500,
  });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const update = (k, v) => setForm({ ...form, [k]: v });

  const onCalc = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/roi", {
        ...form,
        occupancy_rate: form.occupancy_rate / 100,
      });
      setResult(data);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto" data-testid="roi-page">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">{t.roi.title}</h1>
        <p className="text-sm text-slate-600 mt-1 mb-6">{t.roi.sub}</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={onCalc} className="bg-white border border-slate-200 rounded-sm p-6 space-y-4">
            <Field label={t.roi.purchasePrice} testId="roi-purchase-price">
              <Input type="number" required min={1} value={form.purchase_price} onChange={e => update("purchase_price", +e.target.value)} className="rounded-sm" data-testid="roi-purchase-input" />
            </Field>
            <Field label={t.roi.monthlyRent} testId="roi-monthly-rent">
              <Input type="number" required min={1} value={form.monthly_rent} onChange={e => update("monthly_rent", +e.target.value)} className="rounded-sm" data-testid="roi-rent-input" />
            </Field>
            <Field label={t.roi.occupancy} testId="roi-occupancy">
              <Input type="number" required min={0} max={100} value={form.occupancy_rate} onChange={e => update("occupancy_rate", +e.target.value)} className="rounded-sm" data-testid="roi-occupancy-input" />
            </Field>
            <Field label={t.roi.maintenance} testId="roi-maintenance">
              <Input type="number" min={0} value={form.annual_maintenance} onChange={e => update("annual_maintenance", +e.target.value)} className="rounded-sm" data-testid="roi-maintenance-input" />
            </Field>
            <Field label={t.roi.tax} testId="roi-tax">
              <Input type="number" min={0} value={form.annual_tax} onChange={e => update("annual_tax", +e.target.value)} className="rounded-sm" data-testid="roi-tax-input" />
            </Field>
            <Button type="submit" disabled={busy} className="w-full bg-[#002FA7] hover:bg-[#00227A] rounded-sm h-11" data-testid="roi-calculate-button">
              <Calculator size={16} weight="duotone" className="mr-2" />
              {busy ? "..." : t.roi.calculate}
            </Button>
          </form>

          <div className="space-y-4" data-testid="roi-results">
            {!result && (
              <div className="bg-white border border-slate-200 rounded-sm p-10 text-center text-sm text-slate-500">
                Enter your investment details to calculate yields.
              </div>
            )}
            {result && (
              <>
                <Metric label={t.roi.grossYield} value={`${result.gross_yield}%`} accent testId="roi-gross-yield" />
                <Metric label={t.roi.netYield} value={`${result.net_yield}%`} accent testId="roi-net-yield" />
                <Metric label={t.roi.annualIncome} value={fmtRM(result.annual_gross_income)} testId="roi-annual-income" />
                <Metric label={t.roi.payback} value={result.payback_period ? `${result.payback_period} ${t.roi.years}` : "—"} testId="roi-payback" />
                <Metric label="Net Annual Income" value={fmtRM(result.net_income)} testId="roi-net-income" />
                <Metric label="Annual Expenses" value={fmtRM(result.annual_expenses)} testId="roi-expenses" />
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

const Field = ({ label, children, testId }) => (
  <div data-testid={testId}>
    <Label className="text-xs uppercase tracking-wide font-bold text-slate-500">{label}</Label>
    <div className="mt-1.5">{children}</div>
  </div>
);

const Metric = ({ label, value, accent, testId }) => (
  <div className={`bg-white border ${accent ? "border-[#002FA7]/30" : "border-slate-200"} rounded-sm p-5`} data-testid={testId}>
    <div className="text-xs tracking-wide uppercase text-slate-500 font-bold mb-1">{label}</div>
    <div className={`text-2xl sm:text-3xl font-extrabold tracking-tighter ${accent ? "text-[#002FA7]" : "text-slate-900"} tabular-nums`}>{value}</div>
  </div>
);
