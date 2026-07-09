"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { SignInButton } from "@/features/auth/sign-in-button";
import { MeQuery } from "@/features/auth/me-query";
import { LanguageSwitcher } from "@/shared/i18n/language-switcher";
import { useLocale } from "@/shared/i18n/locale-context";

// Scaffold-only placeholder page. Real marketplace grid/listing pages are
// built in Milestone 7 — see docs/milestones/milestone-07-frontend-mvp.md.
export default function HomePage() {
  const { t } = useLocale();

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <LanguageSwitcher />
      </div>
      <h1>{t("home.title")}</h1>
      <p>{t("home.subtitle")}</p>
      <ConnectButton />
      <SignInButton />
      <MeQuery />
    </main>
  );
}
