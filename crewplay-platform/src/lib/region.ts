/** 試算表／文案中的台中 → 臺中（不影響「台版」等用詞） */
export function normalizeTaichungCopy(text: string): string {
  return (text || "").replace(/台中市/g, "臺中市").replace(/台中/g, "臺中");
}

/** 縣市名稱正規化（臺/台、空白） */
export function normalizeRegionName(name: string): string {
  return normalizeTaichungCopy(name)
    .trim()
    .replace(/台/g, "臺")
    .replace(/\s+/g, "");
}

/** 縣市別名（試算表常見寫法 → 標準縣市） */
const REGION_ALIASES: Record<string, string[]> = {
  花蓮縣: ["花蓮市"],
  新竹縣: ["竹北市", "竹北"],
  桃園市: ["中壢市", "中壢"],
  臺南市: ["台南市"],
  臺中市: ["台中市"],
  臺北市: ["台北市"],
};

/** 將試算表 region 正規化成網站標準縣市 */
export function canonicalRegionName(name: string): string {
  const n = normalizeRegionName(name);
  if (!n) return "";
  for (const [canonical, aliases] of Object.entries(REGION_ALIASES)) {
    const c = normalizeRegionName(canonical);
    if (n === c || aliases.some((a) => normalizeRegionName(a) === n)) return c;
  }
  return n;
}

export function regionsMatch(a: string, b: string): boolean {
  const na = canonicalRegionName(a);
  const nb = canonicalRegionName(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

const CITY_CENTERS: { region: string; lat: number; lng: number }[] = [
  { region: "基隆市", lat: 25.128, lng: 121.739 },
  { region: "臺北市", lat: 25.034, lng: 121.564 },
  { region: "新北市", lat: 25.012, lng: 121.465 },
  { region: "桃園市", lat: 24.994, lng: 121.301 },
  { region: "新竹市", lat: 24.804, lng: 120.971 },
  { region: "新竹縣", lat: 24.839, lng: 121.002 },
  { region: "苗栗縣", lat: 24.561, lng: 120.821 },
  { region: "臺中市", lat: 24.147, lng: 120.673 },
  { region: "彰化縣", lat: 24.051, lng: 120.516 },
  { region: "南投縣", lat: 23.961, lng: 120.971 },
  { region: "雲林縣", lat: 23.709, lng: 120.431 },
  { region: "嘉義市", lat: 23.48, lng: 120.449 },
  { region: "嘉義縣", lat: 23.452, lng: 120.255 },
  { region: "臺南市", lat: 23.0, lng: 120.227 },
  { region: "高雄市", lat: 22.627, lng: 120.301 },
  { region: "屏東縣", lat: 22.549, lng: 120.548 },
  { region: "宜蘭縣", lat: 24.702, lng: 121.737 },
  { region: "花蓮縣", lat: 23.987, lng: 121.601 },
  { region: "臺東縣", lat: 22.797, lng: 121.144 },
];

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 依經緯度推估所在縣市（粗略，無需外部 API） */
export function regionFromCoords(lat: number, lng: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < 21.5 || lat > 26.5 || lng < 119 || lng > 122.5) return null;

  let best: string | null = null;
  let bestDist = Infinity;
  for (const city of CITY_CENTERS) {
    const d = distanceKm(lat, lng, city.lat, city.lng);
    if (d < bestDist) {
      bestDist = d;
      best = city.region;
    }
  }
  return best;
}

/** 鄰近縣市（用於該區揪團不足時補足） */
export function neighborRegions(region: string): string[] {
  const key = normalizeRegionName(region);
  const groups: string[][] = [
    ["基隆市", "臺北市", "新北市", "桃園市"],
    ["新竹市", "新竹縣", "苗栗縣", "桃園市"],
    ["臺中市", "彰化縣", "南投縣", "苗栗縣"],
    ["雲林縣", "嘉義市", "嘉義縣", "彰化縣"],
    ["臺南市", "高雄市", "嘉義縣", "屏東縣"],
    ["高雄市", "屏東縣", "臺南市"],
    ["宜蘭縣", "新北市", "臺北市"],
    ["花蓮縣", "臺東縣", "宜蘭縣"],
  ];
  for (const group of groups) {
    if (group.some((r) => normalizeRegionName(r) === key)) {
      return group.filter((r) => normalizeRegionName(r) !== key);
    }
  }
  return [];
}

export const REGION_OPTIONS = CITY_CENTERS.map((c) => c.region);
