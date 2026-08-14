import { NextResponse } from "next/server";

import {
  detectSubmissionImageType,
  saveSubmissionImage,
  validateSubmissionImageFile,
  type SubmissionImageKind,
} from "@/lib/submission-images";
import { checkAndRecordImageUploadGuard } from "@/lib/form-abuse-guard";

export async function POST(req: Request) {
  try {
    const guard = await checkAndRecordImageUploadGuard({ req });
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

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
    const detectedType = detectSubmissionImageType(bytes);
    if (!detectedType) {
      return NextResponse.json({ error: "圖片檔案格式異常，請重新上傳" }, { status: 400 });
    }
    if (contentType && contentType !== "application/octet-stream" && contentType !== detectedType) {
      return NextResponse.json({ error: "圖片格式與檔案內容不一致" }, { status: 400 });
    }

    const saved = await saveSubmissionImage(bytes, detectedType, kind as SubmissionImageKind);

    return NextResponse.json({ ok: true, id: saved.id, url: saved.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "上傳失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
