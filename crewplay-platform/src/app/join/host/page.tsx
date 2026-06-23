"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CheckboxField,
  FormSection,
  JoinFormHero,
  MultiSelectDropdown,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/forms/FormControls";
import { submitCheckoutForm } from "@/lib/checkout-client";
import { HOST_TIME_SLOTS, SKILL_LEVELS, WEEKDAYS } from "@/lib/form-options";

export default function HostJoinPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [platformFee, setPlatformFee] = useState(500);
  const [form, setForm] = useState({
    sport: "",
    location: "",
    weekday: "",
    time_slots: [] as string[],
    fee: "",
    skill_level: "",
    team_name: "",
    equipment: "",
    balls: "",
    phone: "",
    email: "",
    agreed: false,
  });

  useEffect(() => {
    fetch("/api/join/fees")
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.hostFee === "number") setPlatformFee(data.hostFee);
      })
      .catch(() => undefined);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.time_slots.length === 0) {
      setError("請至少選擇一個想運動的時段");
      return;
    }
    if (!form.agreed) {
      setError("請同意團主資訊用途規範");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/forms/host", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "提交失敗");

      if (data.checkout?.action) {
        submitCheckoutForm(data.checkout);
        return;
      }

      throw new Error("無法建立付款，請稍後再試");
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失敗");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <JoinFormHero
        title="我要開團"
        subtitle={`填寫資料後需支付平台開團刊登費 NT$ ${platformFee.toLocaleString()}，完成付款即送審。`}
      />
      <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-5 px-4 py-10">
        <FormSection title="運動資訊" description="告訴我們您想開什麼團">
          <TextField
            label="從事的運動項目"
            name="sport"
            required
            value={form.sport}
            onChange={(sport) => setForm({ ...form, sport })}
          />
          <TextField
            label="想揪團運動的地點"
            name="location"
            required
            value={form.location}
            onChange={(location) => setForm({ ...form, location })}
          />
          <SelectField
            label="每周固定約運動的時間"
            name="weekday"
            required
            value={form.weekday}
            onChange={(weekday) => setForm({ ...form, weekday })}
            options={WEEKDAYS}
          />
          <MultiSelectDropdown
            label="想運動的時段"
            name="time_slots"
            required
            options={HOST_TIME_SLOTS}
            value={form.time_slots}
            onChange={(time_slots) => setForm({ ...form, time_slots })}
          />
        </FormSection>

        <FormSection title="團隊設定">
          <TextAreaField
            label="想收取多少團費?"
            name="fee"
            required
            rows={2}
            value={form.fee}
            onChange={(fee) => setForm({ ...form, fee })}
          />
          <p className="text-xs text-slate-400 sm:col-span-2">此為您向球友收取的團費說明，非平台刊登費</p>
          <SelectField
            label="想找的程度為"
            name="skill_level"
            required
            value={form.skill_level}
            onChange={(skill_level) => setForm({ ...form, skill_level })}
            options={SKILL_LEVELS}
          />
          <TextField
            label="團隊名稱"
            name="team_name"
            required
            value={form.team_name}
            onChange={(team_name) => setForm({ ...form, team_name })}
          />
          <TextField
            label="需自備器材?"
            name="equipment"
            required
            value={form.equipment}
            onChange={(equipment) => setForm({ ...form, equipment })}
          />
          <TextField
            label="提供用球為?"
            name="balls"
            required
            value={form.balls}
            onChange={(balls) => setForm({ ...form, balls })}
          />
        </FormSection>

        <FormSection title="聯絡方式">
          <TextField
            label="電話號碼"
            name="phone"
            type="tel"
            required
            value={form.phone}
            onChange={(phone) => setForm({ ...form, phone })}
          />
          <TextField
            label="電子郵件(重要請勿亂填媒合成功後會寄通知)"
            name="email"
            type="email"
            required
            value={form.email}
            onChange={(email) => setForm({ ...form, email })}
          />
          <CheckboxField
            name="agreed"
            required
            checked={form.agreed}
            onChange={(agreed) => setForm({ ...form, agreed })}
            label={
              <>
                我同意使用{" "}
                <Link href="https://www.crewplay.tw/%e5%9c%98%e4%b8%bb%e8%b3%87%e8%a8%8a/" className="text-brand-600 underline">
                  團主資訊
                </Link>
                所規定之用途規範
              </>
            }
          />
        </FormSection>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto">
          {loading ? "處理中…" : "確認並前往付款"}
        </button>
      </form>
    </div>
  );
}
