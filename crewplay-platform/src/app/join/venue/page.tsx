"use client";

import Link from "next/link";
import { useState } from "react";
import {
  FormSection,
  JoinFormHero,
  MultiSelectDropdown,
  TextField,
} from "@/components/forms/FormControls";
import { VENUE_TIME_SLOTS } from "@/lib/form-options";

export default function VenueJoinPage() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    venue_name: "",
    address: "",
    price: "",
    phone: "",
    line_id: "",
    capacity: "",
    court_count: "",
    time_slots: [] as string[],
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.time_slots.length === 0) {
      setError("請至少選擇一個場館開放預約時間");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/forms/venue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "提交失敗");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失敗");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div>
        <JoinFormHero title="提交成功" subtitle="我們已收到您的場地刊登申請，將依序以電話或 LINE 與您聯繫。" />
        <div className="mx-auto max-w-lg px-4 py-10 text-center">
          <Link href="/" className="btn-primary inline-flex">
            返回首頁
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <JoinFormHero
        title="刊登場地，成為場主"
        subtitle="出租閒置時段的空間，帶來精準客群，利用後台輕鬆管理訂單，增加額外收入！"
      />
      <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-5 px-4 py-10">
        <FormSection title="場館基本資料">
          <TextField
            label="場館名稱"
            name="venue_name"
            required
            value={form.venue_name}
            onChange={(venue_name) => setForm({ ...form, venue_name })}
          />
          <TextField
            label="場館地址"
            name="address"
            required
            value={form.address}
            onChange={(address) => setForm({ ...form, address })}
          />
          <TextField
            label="場租價格"
            name="price"
            required
            value={form.price}
            onChange={(price) => setForm({ ...form, price })}
          />
        </FormSection>

        <FormSection title="聯絡方式">
          <TextField
            label="連絡電話"
            name="phone"
            type="tel"
            required
            value={form.phone}
            onChange={(phone) => setForm({ ...form, phone })}
          />
          <TextField
            label="LINEID"
            name="line_id"
            required
            value={form.line_id}
            onChange={(line_id) => setForm({ ...form, line_id })}
          />
        </FormSection>

        <FormSection title="場地規模與時段">
          <TextField
            label="場館預計單一時段租借多少人次"
            name="capacity"
            required
            value={form.capacity}
            onChange={(capacity) => setForm({ ...form, capacity })}
          />
          <TextField
            label="場地預計出借幾塊場地"
            name="court_count"
            required
            value={form.court_count}
            onChange={(court_count) => setForm({ ...form, court_count })}
          />
          <MultiSelectDropdown
            label="場館開放預約時間(可複選)"
            name="time_slots"
            required
            options={VENUE_TIME_SLOTS}
            value={form.time_slots}
            onChange={(time_slots) => setForm({ ...form, time_slots })}
          />
        </FormSection>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto">
          {loading ? "提交中…" : "提交"}
        </button>
      </form>
    </div>
  );
}
