"use client";

import { useAccount } from "wagmi";
import { useAuth } from "./auth-context";
import { useLocale } from "@/shared/i18n/locale-context";

export function SignInButton() {
  const { isConnected } = useAccount();
  const { isAuthenticated, address, isSigningIn, error, signIn, signOut } = useAuth();
  const { t } = useLocale();

  if (!isConnected) {
    return null;
  }

  if (isAuthenticated) {
    return (
      <div>
        <span>{t("auth.signedInAs", { address: address ?? "" })}</span>{" "}
        <button onClick={signOut}>{t("auth.signOut")}</button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => void signIn()} disabled={isSigningIn}>
        {isSigningIn ? t("auth.signingIn") : t("auth.signIn")}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
