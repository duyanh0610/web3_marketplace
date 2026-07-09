"use client";

import { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "./wagmi";
import { AuthProvider } from "@/features/auth/auth-context";
import { LocaleProvider, useLocale } from "@/shared/i18n/locale-context";

import "@rainbow-me/rainbowkit/styles.css";

function RainbowKitWithLocale({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  return <RainbowKitProvider locale={locale}>{children}</RainbowKitProvider>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <LocaleProvider>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitWithLocale>
            <AuthProvider>{children}</AuthProvider>
          </RainbowKitWithLocale>
        </QueryClientProvider>
      </WagmiProvider>
    </LocaleProvider>
  );
}
