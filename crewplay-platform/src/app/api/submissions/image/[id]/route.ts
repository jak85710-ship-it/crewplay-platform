import { NextResponse } from "next/server";

import { getSubmissionImage } from "@/lib/submission-images";

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Props) {
  const { id } = await params;
  const image = await getSubmissionImage(id);
  if (!image) {
    return NextResponse.json({ error: "找不到圖片" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
