"use client";

import { useState } from "react";
import {
  FormSection,
  JoinFormHero,
  SelectField,
  TextField,
} from "@/components/forms/FormControls";

const SPORTS_OPTIONS = ["桌球", "羽球", "網球", "其他"] as const;
const DEVICE_OPTIONS = [
  "智慧計分看板",
  "門禁系統",
  "燈光控制系統",
  "空調控制系統",
  "其他",
] as const;
const GOAL_OPTIONS = [
  "預約後自動開機/開燈",
  "球友個人數據同步至雲端",
  "線上計費與設備連動",
  "無人化管理",
  "其他",
] as const;
const PAIN_POINT_OPTIONS = [
  "人力成本高",
  "場地利用率低",
  "設備維護麻煩",
  "線上與線下數據不同步",
  "其他",
] as const;
const CONSULT_OPTIONS = ["線上影音諮詢", "電話初步溝通", "預約現場勘查"] as const;
const SLOT_OPTIONS = ["週一~五上午", "週一~五下午", "週末上午", "週末下午"] as const;

function MultiCheckboxGroup(props: {
  label: string;
  required?: boolean;
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  note?: string;
}) {
  return (
    <div className="sm:col-span-2">
      <p className="text-sm font-medium text-slate-700">
        {props.label}
        {props.required ? <span className="text-brand-500"> *</span> : null}
      </p>
      {props.note ? <p className="mt-1 text-xs text-slate-500">{props.note}</p> : null}
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {props.options.map((option) => {
          const checked = props.value.includes(option);
          return (
            <label
              key={option}
              className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-brand-300"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => {
                  if (e.target.checked) {
                    props.onChange([...props.value, option]);
                  } else {
                    props.onChange(props.value.filter((v) => v !== option));
                  }
                }}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span>{option}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function VenueDeviceConsultingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    venue_name: "",
    venue_address: "",
    contact_name_title: "",
    contact_phone: "",
    contact_email: "",
    sports: [] as string[],
    devices: [] as string[],
    network_ready: "是",
    goals: [] as string[],
    pain_points: [] as string[],
    consult_methods: [] as string[],
    preferred_slots: [] as string[],
  });

  function buildConfirmText() {
    return [
      "請確認以下資料是否正確：",
      `場地/會館名稱：${form.venue_name}`,
      `聯絡人：${form.contact_name_title}`,
      `聯絡電話：${form.contact_phone}`,
      `Email：${form.contact_email}`,
      "",
      "按下「確定」後將正式送出諮詢申請。",
    ].join("\n");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.sports.length === 0) return setError("請至少選擇一項運動項目");
    if (form.devices.length === 0) return setError("請至少選擇一項設備需求");
    if (form.goals.length === 0) return setError("請至少選擇一項核心功能");
    if (form.pain_points.length === 0) return setError("請至少選擇一項目前痛點");
    if (form.consult_methods.length === 0) return setError("請至少選擇一種諮詢方式");
    if (form.preferred_slots.length === 0) return setError("請至少選擇一個方便諮詢時間段");
    if (!window.confirm(buildConfirmText())) return;

    setLoading(true);
    try {
      const res = await fetch("/api/forms/venue-device-consulting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "送出失敗，請稍後再試");
      }
      setSuccess(
        "收到您的諮詢申請！我們的專員將在 2 個工作天內，透過您提供的聯絡方式與您取得聯繫，為您提供專屬的智慧場館串接解決方案。謝謝！"
      );
      setForm({
        venue_name: "",
        venue_address: "",
        contact_name_title: "",
        contact_phone: "",
        contact_email: "",
        sports: [],
        devices: [],
        network_ready: "是",
        goals: [],
        pain_points: [],
        consult_methods: [],
        preferred_slots: [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "送出失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <JoinFormHero
        title="設備連接與進階設定"
        subtitle="提升場地 30% 使用率！一鍵開啟您的智慧運動場館：設備串接諮詢"
      />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-4 text-sm leading-7 text-slate-700">
          您是有場地、有設備的優質場地主嗎？是否希望您的智慧設備能更自動化地為球友服務，為您帶來更多流量和收入？
          我們提供專業的場地設備建置與串接服務。只要您提供場地，我們就能幫助您將現場硬體（智慧看板、門禁與控制系統等）與我們的「揪團系統」精準串接。
          讓球友在線上下單後，到場即享自動連線、一鍵開啟，無人管理也能賺取源源不絕的收入。
        </p>
      </div>

      <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-5 px-4 pb-12">
        <FormSection title="1. 場地基本資訊">
          <TextField
            label="場地/會館名稱"
            name="venue_name"
            required
            placeholder="例如：樂動桌球會館"
            value={form.venue_name}
            onChange={(venue_name) => setForm({ ...form, venue_name })}
          />
          <TextField
            label="場地位址"
            name="venue_address"
            required
            placeholder="例如：高雄市三民區XX路XX號"
            value={form.venue_address}
            onChange={(venue_address) => setForm({ ...form, venue_address })}
          />
          <TextField
            label="聯絡人姓名與職稱"
            name="contact_name_title"
            required
            value={form.contact_name_title}
            onChange={(contact_name_title) => setForm({ ...form, contact_name_title })}
          />
          <TextField
            label="聯絡電話"
            name="contact_phone"
            required
            type="tel"
            value={form.contact_phone}
            onChange={(contact_phone) => setForm({ ...form, contact_phone })}
          />
          <TextField
            label="聯絡 Email"
            name="contact_email"
            required
            type="email"
            className="sm:col-span-2"
            value={form.contact_email}
            onChange={(contact_email) => setForm({ ...form, contact_email })}
          />
        </FormSection>

        <FormSection title="2. 設備需求與預期效果" description="針對需求完善的問題">
          <MultiCheckboxGroup
            label="您的場地目前主要經營哪些運動項目？"
            required
            options={SPORTS_OPTIONS}
            value={form.sports}
            onChange={(sports) => setForm({ ...form, sports })}
          />
          <MultiCheckboxGroup
            label="您目前擁有且希望串接的硬體設備有哪些？"
            required
            options={DEVICE_OPTIONS}
            value={form.devices}
            onChange={(devices) => setForm({ ...form, devices })}
          />
          <SelectField
            label="場地是否已有穩定的 WiFi/有線網路覆蓋？"
            name="network_ready"
            required
            value={form.network_ready}
            onChange={(network_ready) => setForm({ ...form, network_ready })}
            options={["是", "否"]}
          />
          <MultiCheckboxGroup
            label="您希望串接後實現哪些核心功能？"
            required
            options={GOAL_OPTIONS}
            value={form.goals}
            onChange={(goals) => setForm({ ...form, goals })}
          />
        </FormSection>

        <FormSection title="3. 諮詢方式與痛點詢問" description="針對需求完善的問題">
          <MultiCheckboxGroup
            label="您目前管理場地遇到的最大痛點是什麼？"
            required
            options={PAIN_POINT_OPTIONS}
            value={form.pain_points}
            onChange={(pain_points) => setForm({ ...form, pain_points })}
          />
          <MultiCheckboxGroup
            label="您希望進行哪種諮詢方式？"
            required
            options={CONSULT_OPTIONS}
            value={form.consult_methods}
            onChange={(consult_methods) => setForm({ ...form, consult_methods })}
          />
          <MultiCheckboxGroup
            label="方便諮詢的時間段"
            required
            options={SLOT_OPTIONS}
            value={form.preferred_slots}
            onChange={(preferred_slots) => setForm({ ...form, preferred_slots })}
          />
        </FormSection>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {success}
          </p>
        ) : null}

        <button type="submit" disabled={loading} className="btn-primary block w-full sm:w-auto">
          {loading ? "送出中…" : "送出諮詢申請"}
        </button>
      </form>
    </div>
  );
}
