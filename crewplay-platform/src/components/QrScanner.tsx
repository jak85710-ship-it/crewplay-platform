"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const READER_ID = "crewplay-host-qr-reader";
const FILE_READER_ID = "crewplay-host-qr-file-reader";

type Props = {
  onScan: (text: string) => void | boolean | Promise<void | boolean>;
};

export function QrScanner({ onScan }: Props) {
  const cameraScannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const scannedRef = useRef(false);
  const onScanRef = useRef(onScan);
  const startCameraRef = useRef<() => Promise<void>>(async () => {});
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(true);
  const [fileBusy, setFileBusy] = useState(false);

  onScanRef.current = onScan;

  const stopCamera = useCallback(async () => {
    const scanner = cameraScannerRef.current;
    if (!scanner?.isScanning) return;
    try {
      await scanner.stop();
    } catch {
      /* ignore */
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraStarting(true);
    setError("");

    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      if (cameraScannerRef.current?.isScanning) {
        await stopCamera();
      } else if (cameraScannerRef.current) {
        try {
          cameraScannerRef.current.clear();
        } catch {
          /* ignore */
        }
        cameraScannerRef.current = null;
      }

      const scanner = new Html5Qrcode(READER_ID, { verbose: false });
      cameraScannerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const edge = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.max(180, Math.floor(edge * 0.75));
          return { width: size, height: size };
        },
        disableFlip: false,
      };

      const onDetected = (decodedText: string) => {
        void notifyScanRef.current(decodedText);
      };

      const tryStart = async (camera: string | MediaTrackConstraints) => {
        await scanner.start(camera, config, onDetected, () => undefined);
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

      setCameraActive(true);
      setError("");
    } catch {
      setCameraActive(false);
      setError("無法開啟相機，請允許相機權限，或改用「相簿／拍照掃描 QR」");
    } finally {
      setCameraStarting(false);
    }
  }, [stopCamera]);

  const notifyScanRef = useRef<(text: string) => Promise<void>>(async () => {});

  notifyScanRef.current = async (text: string) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    await stopCamera();

    try {
      const result = await onScanRef.current(text);
      if (result === false) {
        scannedRef.current = false;
        setError("無法辨識此 QR Code，請再試一次或貼上 QR 網址");
        await startCameraRef.current();
      }
    } catch {
      scannedRef.current = false;
      setError("處理失敗，請再試一次");
      await startCameraRef.current();
    }
  };

  startCameraRef.current = startCamera;

  useEffect(() => {
    scannedRef.current = false;
    void startCamera();

    return () => {
      const scanner = cameraScannerRef.current;
      cameraScannerRef.current = null;
      if (!scanner) return;
      void (async () => {
        if (scanner.isScanning) {
          try {
            await scanner.stop();
          } catch {
            /* ignore */
          }
        }
        try {
          scanner.clear();
        } catch {
          /* ignore */
        }
      })();
    };
  }, [startCamera]);

  async function scanFromFile(file: File | undefined) {
    if (!file || scannedRef.current || fileBusy) return;
    setFileBusy(true);
    setError("");

    await stopCamera();

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const fileScanner = new Html5Qrcode(FILE_READER_ID, { verbose: false });
      const text = await fileScanner.scanFile(file, false);
      fileScanner.clear();
      await notifyScanRef.current(text);
    } catch {
      scannedRef.current = false;
      setError("無法從圖片辨識 QR Code，請確認圖片清晰、QR 完整，或改貼上 QR 網址");
      await startCameraRef.current();
    } finally {
      setFileBusy(false);
    }
  }

  async function submitManual() {
    const text = manual.trim();
    if (!text || scannedRef.current) return;
    await notifyScanRef.current(text);
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-black">
        <div id={READER_ID} className="min-h-[280px] w-full" />
        {cameraStarting && (
          <p className="absolute inset-0 flex items-center justify-center bg-slate-900/80 px-4 text-center text-sm text-white">
            正在啟動相機…
          </p>
        )}
      </div>

      <div
        id={FILE_READER_ID}
        aria-hidden
        className="pointer-events-none fixed left-[-9999px] h-[300px] w-[300px] overflow-hidden"
      />

      {error && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </p>
      )}

      {!cameraActive && !cameraStarting && !error && (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          相機未啟用，請使用下方「相簿／拍照掃描」或貼上 QR 網址。
        </p>
      )}

      <label className="block">
        <span className="block w-full cursor-pointer rounded-xl border border-brand-300 bg-brand-50 px-4 py-3 text-center text-sm font-semibold text-brand-800 hover:bg-brand-100">
          {fileBusy ? "辨識中…" : "從相簿／拍照掃描 QR"}
        </span>
        <input
          type="file"
          accept="image/*"
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
        onClick={() => void submitManual()}
        disabled={!manual.trim() || fileBusy}
        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        確認條碼內容
      </button>
    </div>
  );
}
