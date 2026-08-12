import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

const en = {
  "brand.tagline": "Simple travel booking from one platform.",
  "nav.home": "Home",
  "nav.profile": "Profile",
  "auth.title": "Sign in to WayneWay",
  "auth.subtitle": "We'll email you a 6-digit code. No password to remember.",
  "auth.email": "Email address",
  "auth.sendCode": "Send code",
  "auth.codeTitle": "Enter your code",
  "auth.codeSubtitle": "We sent a 6-digit code to",
  "auth.verify": "Verify and continue",
  "auth.resend": "Resend code",
  "auth.changeEmail": "Use a different email",
  "auth.genericError": "That code isn't valid. Request a new one and try again.",
  "home.greeting": "Namaste",
  "home.whereTo": "Where are you going?",
  "home.from": "From",
  "home.to": "To",
  "profile.title": "Profile",
  "profile.edit": "Edit profile",
  "profile.security": "Security",
  "profile.devices": "Your devices",
  "profile.emergency": "Emergency contacts",
  "profile.places": "Saved places",
  "profile.notifications": "Notifications",
  "profile.privacy": "Privacy and data",
  "profile.language": "Language",
  "profile.delete": "Delete account",
  "profile.logout": "Log out",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.add": "Add",
  "common.delete": "Delete",
  "common.back": "Back",
  "common.retry": "Try again",
  "common.loading": "Loading…",
  "common.somethingWrong": "Something went wrong.",
} as const;

const hi: Partial<Record<keyof typeof en, string>> = {
  "brand.tagline": "एक ही प्लेटफ़ॉर्म से आसान यात्रा बुकिंग।",
  "nav.home": "होम",
  "nav.profile": "प्रोफ़ाइल",
  "auth.title": "WayneWay में साइन इन करें",
  "auth.subtitle": "हम आपको ईमेल पर 6 अंकों का कोड भेजेंगे।",
  "auth.email": "ईमेल पता",
  "auth.sendCode": "कोड भेजें",
  "auth.codeTitle": "अपना कोड दर्ज करें",
  "auth.codeSubtitle": "हमने कोड भेजा है",
  "auth.verify": "सत्यापित करें",
  "auth.resend": "कोड फिर भेजें",
  "auth.changeEmail": "दूसरा ईमेल इस्तेमाल करें",
  "home.greeting": "नमस्ते",
  "home.whereTo": "आप कहाँ जा रहे हैं?",
  "home.from": "कहाँ से",
  "home.to": "कहाँ तक",
  "profile.title": "प्रोफ़ाइल",
  "profile.edit": "प्रोफ़ाइल संपादित करें",
  "profile.security": "सुरक्षा",
  "profile.devices": "आपके डिवाइस",
  "profile.emergency": "आपातकालीन संपर्क",
  "profile.places": "सहेजे गए स्थान",
  "profile.notifications": "सूचनाएँ",
  "profile.privacy": "गोपनीयता और डेटा",
  "profile.language": "भाषा",
  "profile.delete": "खाता हटाएँ",
  "profile.logout": "लॉग आउट",
  "common.save": "सहेजें",
  "common.cancel": "रद्द करें",
  "common.add": "जोड़ें",
  "common.delete": "हटाएँ",
  "common.back": "पीछे",
  "common.retry": "फिर कोशिश करें",
  "common.loading": "लोड हो रहा है…",
};

export type Language = "en" | "hi";
export type TranslationKey = keyof typeof en;

const dictionaries: Record<Language, Partial<Record<TranslationKey, string>>> = { en, hi };

const STORAGE_KEY = "wayneway.language";

type I18nValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "hi") setLanguageState(stored);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    window.localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }, []);

  const t = useCallback(
    (key: TranslationKey) => dictionaries[language][key] ?? en[key],
    [language],
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
