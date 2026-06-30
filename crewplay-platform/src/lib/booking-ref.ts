/** 報名／訂單編號：現場付費用 booking.id 前 8 碼，線上付款用 merchant_trade_no */
export function bookingReference(booking: {
  id: string;
  merchant_trade_no?: string | null;
}): string {
  const trade = booking.merchant_trade_no?.trim();
  if (trade) return trade.slice(0, 12);
  return booking.id.replace(/-/g, "").slice(0, 8).toUpperCase();
}
