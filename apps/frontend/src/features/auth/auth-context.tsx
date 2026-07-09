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
import { useAccount, useChainId, useSignMessage } from "wagmi";
import { SiweMessage } from "siwe";
import { requestNonce, verifySiwe } from "./siwe-api";
import { ApiError } from "./api-error";
import { useLocale } from "@/shared/i18n/locale-context";

interface StoredSession {
  accessToken: string;
  address: string;
  expiresAt: string;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  address: string | undefined;
  accessToken: string | null;
  isSigningIn: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// localStorage, not an httpOnly cookie — a deliberate simplicity trade-off
// for this portfolio project (see docs/milestones/milestone-01-wallet-authentication.md
// Risks): vulnerable to XSS reading the token, but avoids needing the
// backend to manage cookie-based sessions/CORS credentials for a SPA.
const STORAGE_KEY = "we3_auth_session";

function loadSession(): StoredSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

function saveSession(session: StoredSession | null): void {
  if (typeof window === "undefined") {
    return;
  }
  if (session) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { address, isConnected, isDisconnected } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const { t, translateError } = useLocale();

  const [session, setSession] = useState<StoredSession | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate from localStorage once, client-side only (SSR has no window).
  useEffect(() => {
    setSession(loadSession());
  }, []);

  // Only clear on a *definitive* disconnect or a real address mismatch —
  // not during wagmi's transient "reconnecting" phase on page load, which
  // would otherwise wipe a still-valid hydrated session before wagmi has
  // finished restoring the previous wallet connection.
  useEffect(() => {
    if (!session) {
      return;
    }
    const addressMismatch = isConnected && address && session.address.toLowerCase() !== address.toLowerCase();
    if (isDisconnected || addressMismatch) {
      setSession(null);
      saveSession(null);
    }
  }, [isConnected, isDisconnected, address, session]);

  const signIn = useCallback(async () => {
    if (!address) {
      setError(t("auth.connectWalletFirst"));
      return;
    }
    setIsSigningIn(true);
    setError(null);
    try {
      const { nonce } = await requestNonce(address);

      const siweMessage = new SiweMessage({
        domain: window.location.host,
        address,
        statement: "Sign in to Web3 NFT Marketplace",
        uri: window.location.origin,
        version: "1",
        chainId,
        nonce,
      });
      const message = siweMessage.prepareMessage();

      const signature = await signMessageAsync({ message });

      const { accessToken, expiresAt } = await verifySiwe(message, signature);

      const newSession: StoredSession = { accessToken, address, expiresAt };
      setSession(newSession);
      saveSession(newSession);
    } catch (err) {
      if (err instanceof ApiError) {
        // Backend's stable `code` (e.g. NONCE_EXPIRED) is looked up in the
        // current locale's dictionary first; falls back to the backend's
        // raw English `message` only if no translation exists for it yet.
        setError(translateError(err.code, err.message));
      } else {
        setError(err instanceof Error ? err.message : t("auth.signInFailed"));
      }
    } finally {
      setIsSigningIn(false);
    }
  }, [address, chainId, signMessageAsync, t, translateError]);

  const signOut = useCallback(() => {
    setSession(null);
    saveSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(session),
      address: session?.address,
      accessToken: session?.accessToken ?? null,
      isSigningIn,
      error,
      signIn,
      signOut,
    }),
    [session, isSigningIn, error, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
