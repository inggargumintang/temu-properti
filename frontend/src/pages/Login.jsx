import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { formatApiErrorDetail } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export default function Login() {
  const { login } = useAuth();
  const { t, lang, setLang } = useLang();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@temuproperti.com");
  const [password, setPassword] = useState("Admin@12345");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (e) {
      setError(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex" data-testid="login-page">
      {/* Left form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-10 bg-white">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-10">
            <span className="brand-mark">
              <svg viewBox="0 0 32 32" fill="none">
                <path d="M7 11 L16 6 L25 11 V23 H7 V11 Z" fill="#FFFFFF"/>
                <rect x="11" y="16" width="4" height="7" fill="#002FA7"/>
                <rect x="17" y="14" width="5" height="4" fill="#002FA7"/>
              </svg>
            </span>
            <span className="font-bold tracking-tight text-[15px]" style={{fontFamily:'Manrope'}}>TEMU PROPERTI</span>
            <span className="text-[11px] text-slate-500 ml-1 tracking-wide uppercase font-semibold">Market Intelligence</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-2">{t.auth.welcome}</h1>
          <p className="text-sm text-slate-600 mb-8 leading-relaxed">{t.auth.signinSub}</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-xs uppercase tracking-wide font-bold text-slate-500">{t.auth.email}</Label>
              <Input
                id="email" type="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 rounded-sm"
                data-testid="login-email-input"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs uppercase tracking-wide font-bold text-slate-500">{t.auth.password}</Label>
              <Input
                id="password" type="password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 rounded-sm"
                data-testid="login-password-input"
              />
            </div>

            {error && (
              <div className="text-xs text-[#DC2626] bg-red-50 border border-red-200 px-3 py-2 rounded-sm" data-testid="login-error">
                {error}
              </div>
            )}

            <Button
              type="submit" disabled={busy}
              className="w-full bg-[#002FA7] hover:bg-[#00227A] text-white rounded-sm h-11 font-semibold tracking-wide"
              data-testid="login-submit-button"
            >
              {busy ? t.common.loading : t.auth.signin}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            {t.auth.noAccount}{" "}
            <Link to="/register" className="text-[#002FA7] font-semibold hover:underline" data-testid="register-link">
              {t.auth.registerLink}
            </Link>
          </div>

          <div className="mt-10 text-center">
            <button onClick={() => setLang(lang === "en" ? "id" : "en")} className="text-xs text-slate-400 hover:text-slate-600" data-testid="login-lang-switch">
              {lang === "en" ? "Bahasa Indonesia →" : "English →"}
            </button>
          </div>
        </div>
      </div>

      {/* Right hero */}
      <div className="hidden lg:flex w-1/2 split-auth-hero items-end p-12 text-white">
        <div>
          <div className="text-xs uppercase tracking-[0.15em] font-bold mb-3 opacity-80">Malaysia · Property Analytics</div>
          <h2 className="text-4xl font-bold mb-3 leading-tight" style={{fontFamily:'Manrope'}}>
            Data-driven decisions for the Malaysian rental market.
          </h2>
          <p className="text-sm opacity-80 leading-relaxed max-w-md">
            Fair price benchmarks, ROI projections, area comparisons — all derived from public listing data.
          </p>
        </div>
      </div>
    </div>
  );
}
