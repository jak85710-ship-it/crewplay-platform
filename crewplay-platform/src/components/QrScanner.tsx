"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const READER_ID = "crewplay-host-qr-reader";

type Props = {
  onScan: (text: string) => void;
};

export function QrScanner({ onScan }: Props) {
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const scannedRef = useRef(false);
  const onScanRef = useRef(onScan);
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);

  onScanRef.current = onScan;

  const handleSuccess = useCallback(async (text: string) => {
    if (scannedRef.current) return;
    scannedRef.current = true;

    const scanner = scannerRef.current;
    if (scanner?.isScanning) {
      try {
        await scanner.stop();
      } catch {
        /* ignore */
      }
    }
    onScanRef.current(text);
  }, []);

  useEffect(() => {
    scannedRef.current = false;
    let cancelled = false;

    async function startCamera() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        const scanner = new Html5Qrcode(READER_ID, { verbose: false });
        scannerRef.current = scanner;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        };

        const tryStart = async (camera: string | { facingMode: string }) => {
          await scanner.start(camera, config, handleSuccess, () => undefined);
        };

        try {
          await tryStart({ facingMode: "environment" });
        } catch {
          const cameras = await Html5Qrcode.getCameras();
          if (!cameras.length) throw new Error("no_camera");
          const back =
            cameras.find((c) => /back|rear|後|environment/i.test(c.label)) ??
            cameras[cameras.length - 1];
          await tryStart(back.id);
        }

        if (!cancelled) {
          setCameraActive(true);
          setError("");
        }
      } catch {
        if (!cancelled) {
          setCameraActive(false);
          setError("無法開啟相機，請允許相機權限，或改用「相簿掃描／貼上 QR 內容」");
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (!scanner) return;
      const cleanup = async () => {
        if (scanner.isScanning) {
          try {
            await scanner.stop();
          } catch {
            /* ignore */
          }
        }
        try {
          await scanner.clear();
        } catch {
          /* ignore */
        }
      };
      void cleanup();
    };
  }, [handleSuccess]);

  async function scanFromFile(file: File | undefined) {
    if (!file || scannedRef.current) return;
    setFileBusy(true);
    setError("");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = scannerRef.current ?? new Html5Qrcode(`${READER_ID}-file`, { verbose: false });
      const text = await scanner.scanFile(file, false);
      await handleSuccess(text);
    } catch {
      setError("無法從圖片辨識 QR Code，請換一張或貼上 QR 網址");
    } finally {
      setFileBusy(false);
    }
  }

  function submitManual() {
    const text = manual.trim();
    if (!text || scannedRef.current) return;
    scannedRef.current = true;
    onScan(text);
  }

  return (
    <div className="space-y-4">
      <div
        id={READER_ID}
        className={`overflow-hidden rounded-2xl border border-slate-200 bg-black ${
          cameraActive ? "min-h-[280px]" : "hidden"
        }`}
      />

      {!cameraActive && !error && (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          正在啟動相機…
        </p>
      )}

      {error && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </p>
      )}

      <label className="block">
        <span className="block w-full cursor-pointer rounded-xl border border-brand-300 bg-brand-50 px-4 py-3 text-center text-sm font-semibold text-brand-800 hover:bg-brand-100">
          {fileBusy ? "辨識中…" : "從相簿／拍照掃描 QR"}
        </span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          disabled={fileBusy}
          onChange={(e) => {
            void scanFromFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">貼上 QR 內容（備用）</span>
        <textarea
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          rows={3}
          placeholder="https://crewplay.tw/checkin/pass?t=..."
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
