"use client";

import { Locale, useLocale } from "./locale-context";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <select
      aria-label={t("common.language")}
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
    >
      <option value="en">English</option>
      <option value="vi">Tiếng Việt</option>
    </select>
  );
}
