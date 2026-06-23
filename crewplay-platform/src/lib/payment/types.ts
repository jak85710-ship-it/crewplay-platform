export interface PaymentOrderInput {
  merchantTradeNo: string;
  amount: number;
  itemName: string;
  tradeDesc: string;
  returnUrl: string;
  orderResultUrl: string;
  clientBackUrl: string;
}

export interface PaymentFormFields {
  action: string;
  method: "POST";
  fields: Record<string, string>;
}

export interface PaymentProvider {
  name: string;
  createCheckoutForm(input: PaymentOrderInput): PaymentFormFields;
  verifyWebhook(payload: Record<string, string>): { valid: boolean; tradeNo: string; amount: number; paid: boolean };
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatTradeDate(d: Date): string {
  return (
    d.getFullYear() +
    "/" +
    pad(d.getMonth() + 1) +
    "/" +
    pad(d.getDate()) +
    " " +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes()) +
    ":" +
    pad(d.getSeconds())
  );
}

function urlEncodeUpper(str: string): string {
  return encodeURIComponent(str)
    .replace(/%20/g, "+")
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function ecpayCheckMacValue(params: Record<string, string>, hashKey: string, hashIV: string): string {
  const sorted = Object.keys(params)
    .filter((k) => k.toLowerCase() !== "checkmacvalue" && params[k] !== undefined && params[k] !== "")
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const raw = `HashKey=${hashKey}&${sorted.map((k) => `${k}=${params[k]}`).join("&")}&HashIV=${hashIV}`;
  const encoded = urlEncodeUpper(raw).toLowerCase();

  // Node crypto in API route; here use dynamic import pattern in provider file
  return encoded;
}

export { formatTradeDate, urlEncodeUpper, ecpayCheckMacValue };
