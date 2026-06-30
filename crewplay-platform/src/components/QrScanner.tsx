"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onScan: (text: string) => void;
};

export function QrScanner({ onScan }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");
  const scannedRef = useRef(false);

  useEffect(() => {
    scannedRef.current = false;
    let stream: MediaStream | null = null;
    let timer: number | null = null;
    let cancelled = false;

    async function start() {
      if (typeof window === "undefined") return;

      const Detector = (window as Window & { BarcodeDetector?: new (opts: { formats: string[] }) => {
        detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
      } }).BarcodeDetector;

      if (!Detector || !navigator.mediaDevices?.getUserMedia) {
        setSupported(false);
        return;
      }

      setSupported(true);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const detector = new Detector({ formats: ["qr_code"] });
        timer = window.setInterval(async () => {
          if (cancelled || scannedRef.current || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const value = codes[0]?.rawValue;
            if (value) {
              scannedRef.current = true;
              onScan(value);
            }
          } catch {
            /* ignore frame errors */
          }
        }, 450);
      } catch {
        setSupported(false);
        setError("無法開啟相機，請改用下方貼上 QR 內容");
      }
    }

    start();

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onScan]);

  function submitManual() {
    const text = manual.trim();
    if (!text) return;
    onScan(text);
  }

  return (
    <div className="space-y-4">
      {supported && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black">
          <video ref={videoRef} className="aspect-square w-full object-cover" playsInline muted />
        </div>
      )}

      {supported === false && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          此瀏覽器無法直接掃描，請貼上球友 QR Code 的網址或內容。
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <label className="block text-sm">
        <span className="font-medium text-slate-700">貼上 QR 內容（備用）</span>
        <textarea
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          rows={3}
          placeholder="掃描後的網址或條碼內容"
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        />
      </label>
      <button
        type="button"
        onClick={submitManual}
        disabled={!manual.trim()}
        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        確認條碼內容
      </button>
    </div>
  );
}
