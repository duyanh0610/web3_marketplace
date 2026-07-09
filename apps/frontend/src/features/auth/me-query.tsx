"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./auth-context";
import { useLocale } from "@/shared/i18n/locale-context";

interface MeResult {
  address: string;
  firstSeenAt: string;
}

const GRAPHQL_API_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_API_URL ?? "http://localhost:4000/graphql";

// Minimal raw-fetch GraphQL call — a full client (Apollo/graphql-request)
// is wired in Milestone 6. This exists in Milestone 1 purely to prove the
// issued JWT is actually accepted end-to-end by the `me` query.
export function MeQuery() {
  const { isAuthenticated, accessToken } = useAuth();
  const { t } = useLocale();
  const [me, setMe] = useState<MeResult | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      setMe(null);
      return;
    }
    fetch(GRAPHQL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ query: "{ me { address firstSeenAt } }" }),
    })
      .then((res) => res.json())
      .then((body) => setMe(body?.data?.me ?? null))
      .catch(() => setMe(null));
  }, [isAuthenticated, accessToken]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <p>
      {t("auth.meQueryLabel")}: {me ? `${me.address} (since ${me.firstSeenAt})` : t("auth.loading")}
    </p>
  );
}
