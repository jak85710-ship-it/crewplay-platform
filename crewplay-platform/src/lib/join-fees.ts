/** 團主開團刊登費（平台向團主收取） */
export function getJoinHostFee(): number {
  const raw = process.env.JOIN_HOST_FEE ?? "500";
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 500;
}

/** 場主刊登費（平台向場主收取） */
export function getJoinVenueFee(): number {
  const raw = process.env.JOIN_VENUE_FEE ?? "500";
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 500;
}
