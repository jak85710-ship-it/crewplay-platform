import { NextResponse } from "next/server";

import { verifyAdminKey } from "@/lib/analytics-store";
import { getVerificationImage } from "@/lib/verification-images";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  if (!verifyAdminKey(req)) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }

  const { id } = await params;
  const image = await getVerificationImage(decodeURIComponent(id));
  if (!image) {
    return NextResponse.json({ error: "找不到影像" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "private, no-store",
    },
  });
}
