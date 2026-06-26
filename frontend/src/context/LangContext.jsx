import { createContext, useContext, useState, useEffect } from "react";
import { translations } from "../lib/i18n";

const LangContext = createContext(null);

export const LangProvider = ({ children }) => {
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "en");
  useEffect(() => { localStorage.setItem("lang", lang); }, [lang]);
  const t = translations[lang] || translations.en;
  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
};

export const useLang = () => useContext(LangContext);
