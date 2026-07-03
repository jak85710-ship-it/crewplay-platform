"use server";

import { cookies } from "next/headers";

import { processVerificationSubmit } from "@/lib/submit-member-verification";

export type VerifySubmitState = {
  ok?: boolean;
  error?: string;
  code?: string;
};

export async function submitVerificationAction(
  _prev: VerifySubmitState,
  formData: FormData
): Promise<VerifySubmitState> {
  const cookieStore = await cookies();
  const result = await processVerificationSubmit(formData, cookieStore);

  if (!result.ok) {
    return { ok: false, error: result.error, code: result.code };
  }

  return { ok: true };
}
