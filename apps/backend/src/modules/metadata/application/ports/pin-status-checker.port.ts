export const PIN_STATUS_CHECKER = Symbol("PIN_STATUS_CHECKER");

// "Pull" alternative to Pinata's webhook (push) confirmation — Pinata
// webhooks require an Enterprise plan (verified against the real API: a
// webhook can't be configured on lower tiers), but this status-check
// endpoint works on every plan. See docs/milestones/milestone-03-metadata-ipfs.md.
export interface PinStatusCheckerPort {
  isPinned(cid: string): Promise<boolean>;
}
