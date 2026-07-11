export const VOLLEYBALL_POSITIONS = [
  "主攻（大砲）",
  "輔舉",
  "攔中",
  "舉球",
  "自由球員",
  "都可以",
] as const;

const POSITION_NOTE_KEY = "[排球位置]";
const POSITION_DETAIL_NOTE_KEY = "[排球位置備註]";

export type VolleyballPosition = (typeof VOLLEYBALL_POSITIONS)[number];

function isVolleyballPosition(value: string): value is VolleyballPosition {
  return (VOLLEYBALL_POSITIONS as readonly string[]).includes(value);
}

export function normalizeVolleyballPosition(value: string | null | undefined): VolleyballPosition | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (isVolleyballPosition(text)) return text;
  return null;
}

export function composeBookingNoteWithVolleyballPosition(input: {
  baseNote?: string | null;
  sport?: string | null;
  position?: string | null;
  positionDetail?: string | null;
}): string {
  const baseNote = String(input.baseNote ?? "").trim();
  const sport = String(input.sport ?? "").trim();
  if (sport !== "排球") return baseNote;

  const position = normalizeVolleyballPosition(input.position);
  const detail = String(input.positionDetail ?? "").trim().slice(0, 120);
  if (!position && !detail) return baseNote;

  const lines = baseNote
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith(POSITION_NOTE_KEY) && !line.startsWith(POSITION_DETAIL_NOTE_KEY));

  if (position) {
    lines.push(`${POSITION_NOTE_KEY}${position}`);
  }
  if (detail) {
    lines.push(`${POSITION_DETAIL_NOTE_KEY}${detail}`);
  }

  return lines.join("\n");
}

export function extractVolleyballPositionFromNote(note: string | null | undefined): {
  position: VolleyballPosition | null;
  detail: string | null;
  noteWithoutPosition: string;
} {
  const rows = String(note ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let position: VolleyballPosition | null = null;
  let detail: string | null = null;
  const kept: string[] = [];

  for (const row of rows) {
    if (row.startsWith(POSITION_NOTE_KEY)) {
      position = normalizeVolleyballPosition(row.slice(POSITION_NOTE_KEY.length));
      continue;
    }
    if (row.startsWith(POSITION_DETAIL_NOTE_KEY)) {
      const text = row.slice(POSITION_DETAIL_NOTE_KEY.length).trim();
      detail = text || null;
      continue;
    }
    kept.push(row);
  }

  return {
    position,
    detail,
    noteWithoutPosition: kept.join("\n"),
  };
}
