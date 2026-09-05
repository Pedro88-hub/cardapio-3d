'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { MenuItemDetail, ModifierOption } from '@/lib/api';

type ModelViewerElement = HTMLElement & {
  src: string;
  iosSrc?: string;
  activateAR?: () => Promise<void>;
  canActivateAR?: boolean;
  scale?: string;
  updateFraming?: () => void;
  getDimensions?: () => { x: number; y: number; z: number };
  model?: { scene?: unknown };
};

type SceneLike = {
  name?: string;
  visible?: boolean;
  traverse?: (cb: (obj: SceneLike) => void) => void;
  getObjectByName?: (name: string) => SceneLike | undefined;
};

function resolveAssetUrl(url: string) {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (typeof window === 'undefined') return url;
  return new URL(url, window.location.origin).toString();
}

function findNode(root: SceneLike | undefined, name: string): SceneLike | null {
  if (!root) return null;
  if (root.getObjectByName) return root.getObjectByName(name) ?? null;
  let found: SceneLike | null = null;
  root.traverse?.((obj) => {
    if (obj.name === name) found = obj;
  });
  return found;
}

function applyRealWorldScale(
  viewer: ModelViewerElement,
  scaleFactor: number,
) {
  // Modelos já foram reexportados em tamanho real (~prato).
  // scaleFactor no banco é ajuste fino (1 = tamanho bakeado).
  const s = Number.isFinite(scaleFactor) && scaleFactor > 0 ? scaleFactor : 1;
  const value = `${s} ${s} ${s}`;
  viewer.scale = value;
  viewer.setAttribute('scale', value);
  viewer.updateFraming?.();
}

function applyMeshVisibility(
  viewer: ModelViewerElement,
  selected: Record<string, boolean>,
  options: ModifierOption[],
) {
  const scene = viewer.model?.scene as SceneLike | undefined;
  if (!scene) return;

  for (const opt of options) {
    if (!opt.meshNodeName) continue;
    const node = findNode(scene, opt.meshNodeName);
    if (!node || typeof node.visible !== 'boolean') continue;
    node.visible = Boolean(selected[opt.id]);
  }
}

export function ModelViewerAR({
  item,
  selected,
  accent,
}: {
  item: MenuItemDetail;
  selected: Record<string, boolean>;
  accent: string;
}) {
  const ref = useRef<ModelViewerElement | null>(null);
  const [ready, setReady] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [arAvailable, setArAvailable] = useState<boolean | null>(null);
  const [arError, setArError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(true);

  const asset = item.asset;
  const allOptions = useMemo(
    () => item.modifiers.flatMap((g) => g.options),
    [item.modifiers],
  );

  const glbUrl = asset ? resolveAssetUrl(asset.glbUrl) : '';
  const usdzUrl = asset?.usdzUrl ? resolveAssetUrl(asset.usdzUrl) : '';

  useEffect(() => {
    let cancelled = false;
    import('@google/model-viewer').then(() => {
      if (!cancelled) setScriptLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!glbUrl) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'fetch';
    link.href = glbUrl;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, [glbUrl]);

  useEffect(() => {
    if (!usdzUrl) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'fetch';
    link.href = usdzUrl;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, [usdzUrl]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !scriptLoaded || !glbUrl) return;

    el.setAttribute('src', glbUrl);
    if (usdzUrl) el.setAttribute('ios-src', usdzUrl);
    else el.removeAttribute('ios-src');

    el.setAttribute('alt', item.name);
    el.setAttribute('ar', '');
    el.setAttribute('ar-modes', 'quick-look scene-viewer webxr');
    el.setAttribute('ar-scale', 'fixed');
    el.setAttribute('ar-placement', 'floor');
    el.setAttribute('camera-controls', '');
    el.setAttribute('touch-action', 'none');
    el.setAttribute('shadow-intensity', '1');
    el.setAttribute(
      'exposure',
      asset?.lightingPreset === 'cool' ? '0.9' : '1.05',
    );
    el.setAttribute('environment-image', 'neutral');
    el.setAttribute('loading', 'eager');
    el.setAttribute('reveal', 'auto');
    if (item.imageUrl) el.setAttribute('poster', item.imageUrl);

    const refreshAr = () => {
      setArAvailable(Boolean(el.canActivateAR));
    };

    const onLoad = () => {
      applyRealWorldScale(el, asset?.scaleFactor ?? 1);
      setReady(true);
      applyMeshVisibility(el, selected, allOptions);
      refreshAr();
      window.setTimeout(refreshAr, 400);
      window.setTimeout(refreshAr, 1200);
    };

    const onArStatus = (event: Event) => {
      const detail = (event as CustomEvent<{ status?: string }>).detail;
      refreshAr();
      if (detail?.status === 'failed') {
        setArError(
          'AR indisponível neste aparelho/navegador. Use Safari no iPhone ou Chrome no Android.',
        );
        setArAvailable(false);
      }
      if (
        detail?.status === 'not-presenting' ||
        detail?.status === 'session-started'
      ) {
        setArError(null);
      }
    };

    el.addEventListener('load', onLoad);
    el.addEventListener('ar-status', onArStatus);
    return () => {
      el.removeEventListener('load', onLoad);
      el.removeEventListener('ar-status', onArStatus);
    };
  }, [
    scriptLoaded,
    glbUrl,
    usdzUrl,
    item.name,
    item.imageUrl,
    asset?.lightingPreset,
    asset?.scaleFactor,
    selected,
    allOptions,
  ]);

  useEffect(() => {
    if (!ready || !ref.current) return;
    applyMeshVisibility(ref.current, selected, allOptions);
  }, [selected, allOptions, ready]);

  const launchAr = async () => {
    const el = ref.current;
    if (!el?.activateAR) {
      setArError('Visualizador 3D ainda carregando. Aguarde um instante.');
      return;
    }
    try {
      setArError(null);
      await el.activateAR();
    } catch {
      setArError(
        'Não foi possível abrir o AR. No iPhone use Safari; no Android use Chrome.',
      );
    }
  };

  if (!asset) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-black/5 text-sm text-[var(--muted)]">
        Modelo 3D indisponível — use a foto 2D.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl bg-[#1c1916]">
        {scriptLoaded ? (
          <model-viewer
            ref={ref}
            style={{
              width: '100%',
              height: '380px',
              background: 'transparent',
              ['--poster-color' as string]: 'transparent',
            }}
          >
            {/* Esconde o botão nativo — usamos um CTA único abaixo */}
            <button
              slot="ar-button"
              type="button"
              style={{ display: 'none' }}
              aria-hidden
            />
          </model-viewer>
        ) : (
          <div className="flex h-[380px] items-center justify-center text-sm text-white/60">
            Carregando visualização 3D…
          </div>
        )}

        <div className="pointer-events-none absolute left-3 top-3 flex gap-2">
          <span
            className="rounded-md px-2 py-1 text-[11px] font-medium text-white"
            style={{ backgroundColor: accent }}
          >
            AR · 1:1
          </span>
          {!ready && scriptLoaded ? (
            <span className="rounded-md bg-black/50 px-2 py-1 text-[11px] text-white/80">
              Pré-carregando…
            </span>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={launchAr}
        disabled={!ready}
        style={{ backgroundColor: accent }}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {ready ? 'Ver na minha mesa' : 'Preparando modelo 3D…'}
      </button>

      {showHint ? (
        <div className="rounded-xl border border-[var(--border)] bg-white/60 px-4 py-3 text-sm text-[var(--muted)]">
          <p className="font-medium text-[var(--ink)]">Como funciona</p>
          <p className="mt-1">
            Toque em <strong>Ver na minha mesa</strong>. A câmera só é pedida
            nesse momento. O prato aparece em escala real (~tamanho de prato).
          </p>
          <p className="mt-1 text-xs">iPhone: Safari · Android: Chrome</p>
          <button
            type="button"
            onClick={() => setShowHint(false)}
            className="mt-2 text-xs underline underline-offset-2"
          >
            Entendi
          </button>
        </div>
      ) : null}

      {arAvailable === false || arError ? (
        <p className="text-center text-xs text-[var(--muted)]">
          {arError ??
            'Este aparelho não reportou suporte a AR. Você ainda pode girar o modelo 3D acima.'}
        </p>
      ) : null}

      {!usdzUrl ? (
        <p className="text-center text-xs text-amber-800/80">
          Este item ainda não tem USDZ (iOS). AR pode falhar no iPhone.
        </p>
      ) : null}
    </div>
  );
}
