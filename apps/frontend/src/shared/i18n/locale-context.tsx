"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import en from "./locales/en.json";
import vi from "./locales/vi.json";

export type Locale = "en" | "vi";

const TRANSLATIONS: Record<Locale, typeof en> = { en, vi };

const STORAGE_KEY = "we3_locale";

// Derives the union of valid dot-paths ("home.title", "auth.signIn", ...)
// from en.json's actual shape, so a typo in a translation key is a
// compile-time error instead of a silent missing-string at runtime.
type Paths<T, Prefix extends string = ""> = T extends string
  ? Prefix
  : {
      [K in keyof T & string]: Paths<T[K], Prefix extends "" ? K : `${Prefix}.${K}`>;
    }[keyof T & string];

export type TranslationKey = Paths<typeof en>;

function resolveKey(dict: Record<string, unknown>, key: string): string | undefined {
  const value = key.split(".").reduce<unknown>((obj, part) => {
    if (obj && typeof obj === "object") {
      return (obj as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict);
  return typeof value === "string" ? value : undefined;
}

function detectInitialLocale(): Locale {
  if (typeof window === "undefined") {
    return "en";
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "vi") {
    return stored;
  }
  return window.navigator.language.toLowerCase().startsWith("vi") ? "vi" : "en";
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string>) => string;
  // For backend-originated error codes (see apps/backend's DomainError
  // subclasses) rather than static UI copy — `code` is a runtime string,
  // not a value `TranslationKey` can constrain at compile time. Falls back
  // to `fallbackMessage` (the backend's raw message) when `code` is
  // missing or has no translation yet, rather than showing a raw key.
  translateError: (code: string | undefined, fallbackMessage: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // Real locale (localStorage / browser language) is only knowable
  // client-side — starts at "en" for SSR, then corrects on mount.
  useEffect(() => {
    setLocaleState(detectInitialLocale());
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string>): string => {
      let text = resolveKey(TRANSLATIONS[locale], key) ?? key;
      if (params) {
        for (const [paramKey, paramValue] of Object.entries(params)) {
          text = text.replace(`{${paramKey}}`, paramValue);
        }
      }
      return text;
    },
    [locale],
  );

  const translateError = useCallback(
    (code: string | undefined, fallbackMessage: string): string => {
      if (!code) {
        return fallbackMessage;
      }
      return resolveKey(TRANSLATIONS[locale], `errors.${code}`) ?? fallbackMessage;
    },
    [locale],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t, translateError }),
    [locale, setLocale, t, translateError],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return ctx;
}
