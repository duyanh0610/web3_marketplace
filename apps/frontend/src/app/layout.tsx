import type { Metadata } from "next";
import { ReactNode } from "react";
import { Providers } from "@/shared/web3/providers";

export const metadata: Metadata = {
  title: "Web3 NFT Marketplace",
  description: "Production-grade Web3 NFT Marketplace portfolio project",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
