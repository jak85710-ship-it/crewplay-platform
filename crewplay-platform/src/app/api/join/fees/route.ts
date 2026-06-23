import { NextResponse } from "next/server";

import { getJoinHostFee, getJoinVenueFee } from "@/lib/join-fees";

export async function GET() {
  return NextResponse.json({
    hostFee: getJoinHostFee(),
    venueFee: getJoinVenueFee(),
  });
}
