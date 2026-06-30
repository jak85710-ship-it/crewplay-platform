"use client";

import { useEffect, useId, useRef, useState } from "react";
import { BrandLogoMark } from "@/components/BrandLogo";

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-bold text-brand-900">{title}</h2>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function TextField({
  label,
  name,
  type = "text",
  required,
  value,
  onChange,
  placeholder,
  className = "",
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className={`block text-sm sm:col-span-1 ${className}`}>
      <span className="font-medium text-slate-700">
        {label}
        {required && <span className="text-brand-500"> *</span>}
      </span>
      {hint && <span className="mt-0.5 block text-xs text-slate-400">{hint}</span>}
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={fieldClass}
      />
    </label>
  );
}

export function TextAreaField({
  label,
  name,
  required,
  value,
  onChange,
  rows = 3,
  className = "",
}: {
  label: string;
  name: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  className?: string;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className={`block text-sm sm:col-span-2 ${className}`}>
      <span className="font-medium text-slate-700">
        {label}
        {required && <span className="text-brand-500"> *</span>}
      </span>
      <textarea
        id={id}
        name={name}
        required={required}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={fieldClass}
      />
    </label>
  );
}

export function SelectField({
  label,
  name,
  required,
  value,
  onChange,
  options,
  placeholder = "請選擇",
  className = "",
}: {
  label: string;
  name: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className={`block text-sm sm:col-span-1 ${className}`}>
      <span className="font-medium text-slate-700">
        {label}
        {required && <span className="text-brand-500"> *</span>}
      </span>
      <select
        id={id}
        name={name}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={fieldClass}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

export function MultiSelectDropdown({
  label,
  name,
  required,
  options,
  value,
  onChange,
  placeholder = "請選擇（可複選）",
  className = "",
}: {
  label: string;
  name: string;
  required?: boolean;
  options: readonly string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function toggle(option: string) {
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  }

  const summary =
    value.length === 0
      ? placeholder
      : value.length <= 2
        ? value.join("、")
        : `已選 ${value.length} 項`;

  return (
    <div ref={rootRef} className={`relative text-sm sm:col-span-2 ${className}`}>
      <span id={id} className="font-medium text-slate-700">
        {label}
        {required && <span className="text-brand-500"> *</span>}
      </span>
      <button
        type="button"
        aria-labelledby={id}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`${fieldClass} flex w-full items-center justify-between text-left ${
          value.length === 0 ? "text-slate-400" : "text-slate-900"
        }`}
      >
        <span className="truncate pr-2">{summary}</span>
        <span className="text-xs text-slate-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 hover:bg-brand-50"
            >
              <input
                type="checkbox"
                name={name}
                value={opt}
                checked={value.includes(opt)}
                onChange={() => toggle(opt)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-slate-700">{opt}</span>
            </label>
          ))}
        </div>
      )}

    </div>
  );
}

export function ImageUploadField({
  label,
  name,
  required,
  file,
  previewUrl,
  onFileChange,
  hint,
}: {
  label: string;
  name: string;
  required?: boolean;
  file: File | null;
  previewUrl: string;
  onFileChange: (file: File | null, previewUrl: string) => void;
  hint?: string;
}) {
  const id = useId();
  const [localError, setLocalError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.files?.[0] ?? null;
    if (previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    if (!next) {
      onFileChange(null, "");
      setLocalError("");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(next.type)) {
      onFileChange(null, "");
      e.target.value = "";
      setLocalError("僅支援 JPG、PNG、WebP 格式");
      return;
    }
    if (next.size > 4 * 1024 * 1024) {
      onFileChange(null, "");
      e.target.value = "";
      setLocalError("圖片大小請在 4MB 以內");
      return;
    }
    setLocalError("");
    onFileChange(next, URL.createObjectURL(next));
  }

  return (
    <div className="sm:col-span-2">
      <span className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-brand-500"> *</span>}
      </span>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start">
        <label
          htmlFor={id}
          className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-brand-300 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800 hover:bg-brand-100"
        >
          {file ? "重新選擇圖片" : "選擇圖片"}
          <input
            id={id}
            name={name}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required={required && !file}
            onChange={handleChange}
            className="sr-only"
          />
        </label>
        {previewUrl && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="預覽" className="max-h-48 w-auto max-w-full object-contain" />
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-400">JPG / PNG / WebP，4MB 以內。建議上傳團隊合照、場地實景或活動照片。</p>
      {localError && <p className="mt-2 text-xs text-red-600">{localError}</p>}
    </div>
  );
}

export function CheckboxField({
  label,
  name,
  required,
  checked,
  onChange,
}: {
  label: React.ReactNode;
  name: string;
  required?: boolean;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex items-start gap-3 text-sm sm:col-span-2">
      <input
        id={id}
        name={name}
        type="checkbox"
        required={required}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
      <span className="text-slate-600">{label}</span>
    </label>
  );
}

export function JoinFormHero({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="brand-hero relative overflow-hidden px-4 py-12 sm:py-16">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <div className="rounded-2xl bg-white p-3 shadow-lg">
          <BrandLogoMark size={64} />
        </div>
        <h1 className="mt-6 text-3xl font-bold text-white sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-xl text-brand-100">{subtitle}</p>}
      </div>
    </div>
  );
}
