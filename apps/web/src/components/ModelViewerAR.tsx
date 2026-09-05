'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type { MenuItemDetail, ModifierOption } from '@/lib/api';

type ModelViewerElement = HTMLElement & {
  model?: {
    scene?: unknown;
  };
};

type SceneLike = {
  name?: string;
  visible?: boolean;
  children?: SceneLike[];
  traverse?: (cb: (obj: SceneLike) => void) => void;
  getObjectByName?: (name: string) => SceneLike | undefined;
};

function findNode(root: SceneLike | undefined, name: string): SceneLike | null {
  if (!root) return null;
  if (root.getObjectByName) {
    return root.getObjectByName(name) ?? null;
  }
  let found: SceneLike | null = null;
  root.traverse?.((obj) => {
    if (obj.name === name) found = obj;
  });
  return found;
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

    const isOn = Boolean(selected[opt.id]);
    node.visible = isOn;
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
  const [showGuide, setShowGuide] = useState(true);

  const asset = item.asset;
  const allOptions = useMemo(
    () => item.modifiers.flatMap((g) => g.options),
    [item.modifiers],
  );

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
    if (!asset?.glbUrl) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'fetch';
    link.href = asset.glbUrl;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, [asset?.glbUrl]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !scriptLoaded) return;

    const onLoad = () => {
      setReady(true);
      applyMeshVisibility(el, selected, allOptions);
    };
    el.addEventListener('load', onLoad);
    return () => el.removeEventListener('load', onLoad);
  }, [scriptLoaded, selected, allOptions]);

  useEffect(() => {
    if (!ready || !ref.current) return;
    applyMeshVisibility(ref.current, selected, allOptions);
  }, [selected, allOptions, ready]);

  if (!asset) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-black/5 text-sm text-[var(--muted)]">
        Modelo 3D indisponível — use a foto 2D.
      </div>
    );
  }

  const scale = `${asset.scaleFactor} ${asset.scaleFactor} ${asset.scaleFactor}`;
  const exposure =
    asset.lightingPreset === 'warm'
      ? '1.1'
      : asset.lightingPreset === 'cool'
        ? '0.9'
        : '1';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#1c1916]">
      {scriptLoaded ? (
        <model-viewer
          ref={ref as RefObject<HTMLElement>}
          src={asset.glbUrl}
          ios-src={asset.usdzUrl ?? undefined}
          alt={item.name}
          ar
          ar-modes="webxr scene-viewer quick-look"
          camera-controls
          touch-action="pan-y"
          shadow-intensity="1"
          exposure={exposure}
          environment-image="neutral"
          poster={item.imageUrl ?? undefined}
          loading="eager"
          scale={scale}
          style={{ width: '100%', height: '360px', background: 'transparent' }}
        />
      ) : (
        <div className="flex h-[360px] items-center justify-center text-sm text-white/60">
          Carregando visualização 3D…
        </div>
      )}

      {showGuide ? (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-10 text-white">
          <p className="text-sm font-medium">Como ver na mesa</p>
          <p className="mt-1 text-xs text-white/75">
            Toque em AR, aponte a câmera para a superfície da mesa e mova o
            celular até o modelo ancorar em escala real.
          </p>
          <button
            type="button"
            onClick={() => setShowGuide(false)}
            className="mt-3 text-xs underline underline-offset-2"
          >
            Entendi
          </button>
        </div>
      ) : null}

      <div className="absolute left-3 top-3 flex gap-2">
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
  );
}
