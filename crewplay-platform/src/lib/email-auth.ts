export function normalizeEmail(input: string): string | null {
  const email = input.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export { generateOtp, isValidOtp } from "@/lib/phone-auth";
