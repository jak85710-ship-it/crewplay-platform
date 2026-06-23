import { promises as fs } from "fs";

import path from "path";

import { NextResponse } from "next/server";

import { sendVenueFormEmails, type VenueSubmission } from "@/lib/email";



const dataDir = path.join(process.cwd(), "public/data/submissions");



async function appendSubmission(kind: string, payload: unknown) {

  await fs.mkdir(dataDir, { recursive: true });

  const file = path.join(dataDir, `${kind}.json`);

  let rows: unknown[] = [];

  try {

    rows = JSON.parse(await fs.readFile(file, "utf8"));

  } catch {

    rows = [];

  }

  rows.push(payload);

  await fs.writeFile(file, JSON.stringify(rows, null, 2), "utf8");

}



function missing(body: Record<string, unknown>, keys: string[]) {

  return keys.filter((k) => {

    const v = body[k];

    if (Array.isArray(v)) return v.length === 0;

    return v === undefined || v === null || String(v).trim() === "";

  });

}



export async function POST(req: Request) {

  try {

    const body = await req.json();

    const required = [

      "venue_name",

      "address",

      "price",

      "phone",

      "line_id",

      "capacity",

      "court_count",

      "time_slots",

    ];

    const absent = missing(body, required);

    if (absent.length > 0) {

      return NextResponse.json({ error: `請填寫：${absent.join("、")}` }, { status: 400 });

    }



    const record: VenueSubmission = {

      id: crypto.randomUUID(),

      submitted_at: new Date().toISOString(),

      venue_name: String(body.venue_name).trim(),

      address: String(body.address).trim(),

      price: String(body.price).trim(),

      phone: String(body.phone).trim(),

      line_id: String(body.line_id).trim(),

      capacity: String(body.capacity).trim(),

      court_count: String(body.court_count).trim(),

      time_slots: body.time_slots as string[],

    };



    await appendSubmission("venue", record);

    await sendVenueFormEmails(record);



    return NextResponse.json({ ok: true, id: record.id });

  } catch (err) {

    const message = err instanceof Error ? err.message : "伺服器錯誤";

    return NextResponse.json({ error: message }, { status: 500 });

  }

}

