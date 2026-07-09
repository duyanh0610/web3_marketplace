import { ApiError } from "./api-error";

export interface NonceResponse {
  nonce: string;
  expiresAt: string;
}

export interface VerifyResponse {
  accessToken: string;
  expiresAt: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

interface ErrorBody {
  error?: { code?: string; message?: string };
}

export async function requestNonce(address: string): Promise<NonceResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/siwe/nonce`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  if (!res.ok) {
    const body: ErrorBody | null = await res.json().catch(() => null);
    throw new ApiError(body?.error?.message ?? "Failed to request a sign-in nonce", body?.error?.code);
  }
  return res.json();
}

export async function verifySiwe(message: string, signature: string): Promise<VerifyResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/siwe/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, signature }),
  });
  if (!res.ok) {
    const body: ErrorBody | null = await res.json().catch(() => null);
    throw new ApiError(body?.error?.message ?? "Sign-in verification failed", body?.error?.code);
  }
  return res.json();
}
