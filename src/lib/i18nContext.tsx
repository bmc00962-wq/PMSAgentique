// Shared i18n context — ensures all components react to language changes
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { type Language, isRTL, t as translate, SUPPORTED_LANGUAGES } from "@/lib/i18n";
import { DEFAULT_LANGUAGE } from "@/constants";

const STORAGE_KEY = "pms_language";

function getStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (stored && SUPPORTED_LANGUAGES.some(l => l.code === stored)) return stored;
  } catch {}
  return DEFAULT_LANGUAGE;
}

function applyLanguageToDOM(lang: Language): void {
  document.documentElement.lang = lang;
  document.documentElement.dir = isRTL(lang) ? "rtl" : "ltr";
}

interface I18nContextValue {
  language: Language;
  changeLanguage: (lang: Language) => void;
  t: (namespace: string, key: string) => string;
  isRTL: boolean;
  supportedLanguages: typeof SUPPORTED_LANGUAGES;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(getStoredLanguage);

  useEffect(() => {
    applyLanguageToDOM(language);
  }, [language]);

  const changeLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {}
    applyLanguageToDOM(lang);
  }, []);

  const t = useCallback(
    (namespace: string, key: string): string => translate(language, namespace, key),
    [language]
  );

  return (
    <I18nContext.Provider value={{
      language,
      changeLanguage,
      t,
      isRTL: isRTL(language),
      supportedLanguages: SUPPORTED_LANGUAGES,
    }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18nContext(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18nContext must be used within I18nProvider");
  return ctx;
}
