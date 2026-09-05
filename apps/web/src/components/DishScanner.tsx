'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type ScanResult = {
  photoUrl: string;
  glbUrl: string;
  usdzUrl: string | null;
  mode: 'ai' | 'demo';
  message: string;
};

export function DishScanner({
  accent,
  disabled,
  onDone,
}: {
  accent: string;
  disabled?: boolean;
  onDone: (result: ScanResult) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setReady(true);
    } catch {
      setError(
        'Não foi possível abrir a câmera. Permita o acesso ou envie uma foto da galeria.',
      );
      setReady(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas;
  };

  const generateFromBlob = async (blob: Blob) => {
    setBusy(true);
    setError(null);
    setStatus('Gerando o 3D do prato… isso pode levar alguns segundos.');
    try {
      const body = new FormData();
      body.append('photo', blob, 'prato.jpg');
      const res = await fetch('/api/scan/generate', { method: 'POST', body });
      const data = (await res.json()) as ScanResult & { error?: string };
      if (!res.ok) throw new Error(data.error || 'Falha ao gerar 3D');
      onDone(data);
      setStatus(data.message);
      stopCamera();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao gerar 3D');
      setStatus(null);
    } finally {
      setBusy(false);
    }
  };

  const onCapture = async () => {
    const canvas = captureFrame();
    if (!canvas) {
      setError('Aguarde a câmera carregar e tente de novo.');
      return;
    }
    const previewUrl = canvas.toDataURL('image/jpeg', 0.9);
    setPreview(previewUrl);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92),
    );
    if (!blob) {
      setError('Não foi possível capturar a foto.');
      return;
    }
    await generateFromBlob(blob);
  };

  const onGallery = async (file: File) => {
    setPreview(URL.createObjectURL(file));
    await generateFromBlob(file);
  };

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl bg-black">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Prévia do prato" className="aspect-[4/3] w-full object-cover" />
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="aspect-[4/3] w-full object-cover"
          />
        )}
        {!preview ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-sm text-white">
            Centralize o prato inteiro na mesa e toque em fotografar.
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled || busy || (!ready && !preview)}
          onClick={onCapture}
          style={{ backgroundColor: accent }}
          className="rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Gerando 3D…' : 'Fotografar e gerar 3D'}
        </button>
        <label className="flex cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] bg-white/70 py-3 text-sm font-medium">
          Galeria
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={disabled || busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onGallery(f);
              e.target.value = '';
            }}
          />
        </label>
      </div>

      {preview && !busy ? (
        <button
          type="button"
          className="w-full text-sm text-[var(--muted)] underline underline-offset-2"
          onClick={() => {
            setPreview(null);
            setStatus(null);
            void startCamera();
          }}
        >
          Tirar outra foto
        </button>
      ) : null}

      {status ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {status}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}
    </div>
  );
}
