/** 團主／場主上架費 — 藍新金流 EPG 固定付款頁 */
export const LISTING_PAYMENT_URL =
  process.env.NEXT_PUBLIC_NEWEBPAY_LISTING_URL?.trim() ||
  process.env.NEWEBPAY_LISTING_URL?.trim() ||
  "https://core.newebpay.com/EPG/crewplay/srGmIC";

export function getListingPaymentUrl(): string {
  return LISTING_PAYMENT_URL;
}
