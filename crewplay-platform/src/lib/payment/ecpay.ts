import crypto from "crypto";
import type { PaymentOrderInput, PaymentProvider, PaymentFormFields } from "./types";
import { ecpayCheckMacValue, formatTradeDate } from "./types";

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex").toUpperCase();
}

function checkMac(params: Record<string, string>, hashKey: string, hashIV: string): string {
  const encoded = ecpayCheckMacValue(params, hashKey, hashIV);
  return sha256(encoded);
}

export function createEcpayProvider(): PaymentProvider {
  const merchantId = process.env.ECPAY_MERCHANT_ID ?? "2000132";
  const hashKey = process.env.ECPAY_HASH_KEY ?? "5294y06JbISpM5x9";
  const hashIV = process.env.ECPAY_HASH_IV ?? "v77hoKGq4kWxNNIS";
  const isTest = (process.env.ECPAY_ENV ?? "test") !== "production";

  const action = isTest
    ? "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5"
    : "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5";

  return {
    name: "ecpay",
    createCheckoutForm(input: PaymentOrderInput): PaymentFormFields {
      const fields: Record<string, string> = {
        MerchantID: merchantId,
        MerchantTradeNo: input.merchantTradeNo,
        MerchantTradeDate: formatTradeDate(new Date()),
        PaymentType: "aio",
        TotalAmount: String(input.amount),
        TradeDesc: input.tradeDesc.slice(0, 200),
        ItemName: input.itemName.slice(0, 400),
        ReturnURL: input.returnUrl,
        OrderResultURL: input.orderResultUrl,
        ClientBackURL: input.clientBackUrl,
        ChoosePayment: "ALL",
        EncryptType: "1",
      };
      fields.CheckMacValue = checkMac(fields, hashKey, hashIV);
      return { action, method: "POST", fields };
    },
    verifyWebhook(payload: Record<string, string>) {
      const received = payload.CheckMacValue ?? "";
      const copy = { ...payload };
      delete copy.CheckMacValue;
      const expected = checkMac(copy, hashKey, hashIV);
      const valid = received.toUpperCase() === expected;
      const tradeNo = payload.MerchantTradeNo ?? "";
      const amount = parseInt(payload.TradeAmt ?? "0", 10);
      const paid = valid && payload.RtnCode === "1";
      return { valid, tradeNo, amount, paid };
    },
  };
}

export function getPaymentProvider(): PaymentProvider {
  return createEcpayProvider();
}
