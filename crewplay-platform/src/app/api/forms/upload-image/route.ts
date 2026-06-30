import { NextResponse } from "next/server";

import {
  saveSubmissionImage,
  validateSubmissionImageFile,
  type SubmissionImageKind,
} from "@/lib/submission-images";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") ?? "").trim();

    if (kind !== "host" && kind !== "venue") {
      return NextResponse.json({ error: "無效的上傳類型" }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "請選擇圖片檔案" }, { status: 400 });
    }

    const contentType = file.type || "application/octet-stream";
    const validationError = validateSubmissionImageFile(file, contentType);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const saved = await saveSubmissionImage(bytes, contentType, kind as SubmissionImageKind);

    return NextResponse.json({ ok: true, id: saved.id, url: saved.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "上傳失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
