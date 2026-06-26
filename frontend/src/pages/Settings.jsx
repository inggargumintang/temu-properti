import { Layout } from "../components/Layout";
import { useLang } from "../context/LangContext";
import { useAuth } from "../context/AuthContext";
import { Translate, User } from "@phosphor-icons/react";

export default function Settings() {
  const { t, lang, setLang } = useLang();
  const { user } = useAuth();
  return (
    <Layout>
      <div className="p-6 sm:p-8 max-w-[900px] mx-auto" data-testid="settings-page">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">{t.settings.title}</h1>
        <p className="text-sm text-slate-600 mt-1 mb-6">Manage your preferences and account.</p>

        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <Translate size={18} weight="duotone" className="text-[#002FA7]" />
              <h3 className="text-sm font-bold tracking-wide uppercase text-slate-700">{t.settings.language}</h3>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setLang("en")} className={`px-4 py-2 text-sm rounded-sm border ${lang === "en" ? "bg-[#002FA7] text-white border-[#002FA7]" : "bg-white text-slate-700 border-slate-200 hover:border-[#002FA7]"}`} data-testid="lang-en">English</button>
              <button onClick={() => setLang("id")} className={`px-4 py-2 text-sm rounded-sm border ${lang === "id" ? "bg-[#002FA7] text-white border-[#002FA7]" : "bg-white text-slate-700 border-slate-200 hover:border-[#002FA7]"}`} data-testid="lang-id">Bahasa Indonesia</button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <User size={18} weight="duotone" className="text-[#002FA7]" />
              <h3 className="text-sm font-bold tracking-wide uppercase text-slate-700">{t.settings.account}</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Name</span><span className="font-semibold">{user?.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-mono-data text-xs">{user?.email}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Role</span><span className="font-semibold uppercase text-[#002FA7]">{user?.role}</span></div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
