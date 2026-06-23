/** 正規化為 09xxxxxxxx */
export function normalizePhone(input: string): string | null {
  const digits = (input || "").replace(/\D/g, "");
  if (digits.startsWith("8869") && digits.length === 12) {
    return `0${digits.slice(3)}`;
  }
  if (digits.startsWith("886") && digits.length === 11) {
    return `0${digits.slice(3)}`;
  }
  if (digits.startsWith("09") && digits.length === 10) {
    return digits;
  }
  return null;
}

export function maskPhone(phone: string): string {
  const n = normalizePhone(phone);
  if (!n || n.length < 10) return phone;
  return `${n.slice(0, 4)}***${n.slice(-3)}`;
}

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function isValidOtp(code: string): boolean {
  return /^\d{6}$/.test(code.trim());
}
