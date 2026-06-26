import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { formatApiErrorDetail } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export default function Register() {
  const { register } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(email, password, name);
      navigate("/");
    } catch (e) {
      setError(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex" data-testid="register-page">
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-10 bg-white">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-10">
            <span className="brand-dot" />
            <span className="font-bold tracking-tight text-[15px]" style={{fontFamily:'Manrope'}}>SPEEDHOME</span>
            <span className="text-[11px] text-slate-500 ml-1 tracking-wide uppercase font-semibold">Market Intelligence</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-2">{t.auth.createAccount}</h1>
          <p className="text-sm text-slate-600 mb-8 leading-relaxed">{t.auth.registerSub}</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-xs uppercase tracking-wide font-bold text-slate-500">{t.auth.name}</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 rounded-sm" data-testid="register-name-input" />
            </div>
            <div>
              <Label htmlFor="email" className="text-xs uppercase tracking-wide font-bold text-slate-500">{t.auth.email}</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 rounded-sm" data-testid="register-email-input" />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs uppercase tracking-wide font-bold text-slate-500">{t.auth.password}</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 rounded-sm" data-testid="register-password-input" />
            </div>

            {error && (
              <div className="text-xs text-[#DC2626] bg-red-50 border border-red-200 px-3 py-2 rounded-sm" data-testid="register-error">{error}</div>
            )}

            <Button type="submit" disabled={busy} className="w-full bg-[#002FA7] hover:bg-[#00227A] text-white rounded-sm h-11 font-semibold tracking-wide" data-testid="register-submit-button">
              {busy ? t.common.loading : t.auth.register}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            {t.auth.haveAccount}{" "}
            <Link to="/login" className="text-[#002FA7] font-semibold hover:underline" data-testid="signin-link">
              {t.auth.signinLink}
            </Link>
          </div>
        </div>
      </div>
      <div className="hidden lg:flex w-1/2 split-auth-hero items-end p-12 text-white">
        <div>
          <div className="text-xs uppercase tracking-[0.15em] font-bold mb-3 opacity-80">Malaysia · Property Analytics</div>
          <h2 className="text-4xl font-bold mb-3 leading-tight" style={{fontFamily:'Manrope'}}>Start analyzing in seconds.</h2>
          <p className="text-sm opacity-80 leading-relaxed max-w-md">Powerful analytics for investors, agents, and owners.</p>
        </div>
      </div>
    </div>
  );
}
