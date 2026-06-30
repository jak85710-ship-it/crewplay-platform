"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FormSection,
  ImageUploadField,
  JoinFormHero,
  MultiSelectDropdown,
  TextField,
} from "@/components/forms/FormControls";
import { VENUE_TIME_SLOTS } from "@/lib/form-options";
import { LISTING_PAYMENT_URL } from "@/lib/listing-payment";

export default function VenueJoinPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [platformFee, setPlatformFee] = useState(500);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
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

  useEffect(() => {
    fetch("/api/join/fees")
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.venueFee === "number") setPlatformFee(data.venueFee);
      })
      .catch(() => undefined);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.time_slots.length === 0) {
      setError("請至少選擇一個場館開放預約時間");
      return;
    }
    if (!imageFile) {
      setError("請上傳場地照片");
      return;
    }

    setLoading(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", imageFile);
      uploadData.append("kind", "venue");
      const uploadRes = await fetch("/api/forms/upload-image", {
        method: "POST",
        body: uploadData,
      });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadJson.error || "圖片上傳失敗");

      const res = await fetch("/api/forms/venue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, trust_image_id: uploadJson.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "提交失敗");

      window.location.assign(data.paymentUrl || LISTING_PAYMENT_URL);
      return;
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失敗");
    } finally {
      setLoading(false);
    }
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
            hint="您出租給球友的場租，非平台刊登費"
          />
        </FormSection>

        <FormSection
          title="場地照片"
          description="上傳場館外觀、球場實景或設施照片，讓球友更放心預約"
        >
          <ImageUploadField
            label="場館／球場照片"
            name="trust_image"
            required
            file={imageFile}
            previewUrl={imagePreview}
            onFileChange={(file, previewUrl) => {
              setImageFile(file);
              setImagePreview(previewUrl);
            }}
            hint="例如：球場全景、入口、更衣室或停車場等"
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

        <div className="space-y-2">
          <button type="submit" disabled={loading} className="btn-primary block w-full sm:w-auto">
            {loading ? "處理中…" : "確認並前往付款"}
          </button>
          <p className="text-left text-sm text-slate-500 sm:max-w-md">
            完成表單後需支付平台刊登費 NT$ {platformFee.toLocaleString()}
          </p>
          <p className="text-left text-sm text-slate-500 sm:max-w-md">
            若未自動跳轉，請{" "}
            <a
              href={LISTING_PAYMENT_URL}
              className="font-medium text-brand-600 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              點此前往付款
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}
