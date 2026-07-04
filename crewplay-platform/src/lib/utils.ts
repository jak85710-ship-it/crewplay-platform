const DEFAULT_PHOTO =
  "https://storage.googleapis.com/crewplay-arena-storage/photo/a1.jpg";

export const BRAND_LOGO_PATH = "/brand/logo.png";

const GCS_PHOTO_BASE = "https://storage.googleapis.com/crewplay-arena-storage/photo/";

export function parseFee(introduce: string): { amount: number | null; label: string } {
  if (!introduce) return { amount: null, label: "" };
  const m = introduce.match(/費用[：:]\s*[^\n]*/);
  if (!m) return { amount: null, label: "" };
  const label = m[0].replace(/^費用[：:]\s*/, "").trim();
  const num = label.match(/(\d+)/);
  return { amount: num ? parseInt(num[1], 10) : null, label };
}

export function parseIntroField(introduce: string, label: string): string {
  const re = new RegExp(`${label}[：:]\\s*([^\\n]+)`);
  const m = (introduce || "").match(re);
  return m ? m[1].trim() : "";
}

export function feeSummary(team: { fee_amount: number | null; fee_label: string; introduce: string }): string {
  if (team.fee_label) return team.fee_label;
  if (team.fee_amount) return `$${team.fee_amount}/人`;
  const parsed = parseFee(team.introduce);
  return parsed.label || parsed.amount ? `$${parsed.amount}/人` : "請見詳情";
}

/** 只有上傳團圖（r*.jpg）才顯示，其餘一律用品牌 Logo */
export function getTeamPhotoUrl(team: { photo: string; sheet_row: number }): string {
  const photo = (team.photo || "").trim();
  const expectedSuffix = `/photo/r${team.sheet_row}.jpg`;
  const localPhoto = expectedSuffix;

  if (photo === localPhoto || photo.endsWith(expectedSuffix)) {
    return photo.startsWith("http") ? photo : localPhoto;
  }

  if (photo.startsWith("http") && photo === `${GCS_PHOTO_BASE}r${team.sheet_row}.jpg`) {
    return photo;
  }

  // Allow curated Google Storage photos when they are real uploaded rows (r*.jpg),
  // even if sheet_row differs (weekday duplicated listings).
  if (photo.startsWith(GCS_PHOTO_BASE) && /\/photo\/r\d+\.jpg$/i.test(photo)) {
    return photo;
  }

  return BRAND_LOGO_PATH;
}

export function isUploadedTeamPhoto(team: { photo: string; sheet_row: number }): boolean {
  return getTeamPhotoUrl(team) !== BRAND_LOGO_PATH;
}

export function normalizePhoto(photo: string): string {
  if (!photo || !photo.startsWith("http")) return DEFAULT_PHOTO;
  return photo;
}

export function teamSlug(team: { id: string; sheet_row: number }): string {
  return team.id || `row-${team.sheet_row}`;
}

export function formatIntroduce(intro: string): string[] {
  return intro.split(/\n/).map((l) => l.trim()).filter(Boolean);
}

export const SPORTS = ["羽球", "桌球", "排球", "籃球", "匹克球", "棒球", "網球", "足球"] as const;

export const REGIONS = [
  "台北市", "新北市", "桃園市", "臺中市", "台南市", "高雄市",
  "基隆市", "新竹市", "新竹縣", "苗栗縣", "彰化縣", "南投縣",
  "雲林縣", "嘉義市", "嘉義縣", "屏東縣", "宜蘭縣", "花蓮縣",
  "台東縣", "澎湖縣", "金門縣", "連江縣",
] as const;

export const PAGE_SIZE = 12;
