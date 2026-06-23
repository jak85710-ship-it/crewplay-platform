import { promises as fs } from "fs";

import path from "path";

import { NextResponse } from "next/server";

import { sendHostFormEmails, type HostSubmission } from "@/lib/email";



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

      "sport",

      "location",

      "weekday",

      "time_slots",

      "fee",

      "skill_level",

      "team_name",

      "equipment",

      "balls",

      "phone",

      "email",

    ];

    const absent = missing(body, required);

    if (absent.length > 0) {

      return NextResponse.json({ error: `請填寫：${absent.join("、")}` }, { status: 400 });

    }

    if (!body.agreed) {

      return NextResponse.json({ error: "請同意團主資訊用途規範" }, { status: 400 });

    }



    const record: HostSubmission = {

      id: crypto.randomUUID(),

      submitted_at: new Date().toISOString(),

      sport: String(body.sport).trim(),

      location: String(body.location).trim(),

      weekday: String(body.weekday).trim(),

      time_slots: body.time_slots as string[],

      fee: String(body.fee).trim(),

      skill_level: String(body.skill_level).trim(),

      team_name: String(body.team_name).trim(),

      equipment: String(body.equipment).trim(),

      balls: String(body.balls).trim(),

      phone: String(body.phone).trim(),

      email: String(body.email).trim(),

    };



    await appendSubmission("host", record);

    await sendHostFormEmails(record);



    return NextResponse.json({ ok: true, id: record.id });

  } catch (err) {

    const message = err instanceof Error ? err.message : "伺服器錯誤";

    return NextResponse.json({ error: message }, { status: 500 });

  }

}

