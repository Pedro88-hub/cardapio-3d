'use client';

import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { API_URL } from '@/lib/api';
import { DishScanner } from '@/components/DishScanner';

type AdminItem = {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  imageUrl: string | null;
  available: boolean;
  has3d: boolean;
};

type AdminCategory = {
  id: string;
  name: string;
  items: AdminItem[];
};

type Dashboard = {
  slug: string;
  name: string;
  primaryColor: string;
  categories: AdminCategory[];
};

type Guide = {
  title: string;
  steps: { id: string; title: string; body: string; apps?: string[] }[];
  constraints: string[];
};

async function uploadFile(file: File) {
  const body = new FormData();
  body.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body });
  const data = (await res.json()) as { url?: string; error?: string; kind?: string };
  if (!res.ok || !data.url) throw new Error(data.error || 'Falha no envio');
  return data as { url: string; kind: string };
}

function FileDrop({
  label,
  hint,
  accept,
  fileName,
  previewUrl,
  onPick,
  disabled,
}: {
  label: string;
  hint: string;
  accept: string;
  fileName?: string | null;
  previewUrl?: string | null;
  onPick: (file: File) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block cursor-pointer rounded-2xl border border-dashed border-[var(--border)] bg-white/60 p-4 transition hover:border-[var(--ink)]/30">
      <span className="block text-sm font-medium text-[var(--ink)]">{label}</span>
      <span className="mt-1 block text-sm text-[var(--muted)]">{hint}</span>
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt=""
          className="mt-3 h-28 w-full rounded-xl object-cover"
        />
      ) : null}
      {fileName ? (
        <span className="mt-2 block truncate text-xs text-emerald-800">
          Pronto: {fileName}
        </span>
      ) : (
        <span className="mt-3 inline-flex rounded-lg bg-[var(--ink)] px-3 py-1.5 text-xs font-medium text-[var(--bg)]">
          Escolher arquivo
        </span>
      )}
      <input
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = '';
        }}
      />
    </label>
  );
}

export function AdminPanel({ slug }: { slug: string }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('29,90');
  const [imageUrl, setImageUrl] = useState('');
  const [imageName, setImageName] = useState<string | null>(null);
  const [glbUrl, setGlbUrl] = useState('');
  const [glbName, setGlbName] = useState<string | null>(null);
  const [usdzUrl, setUsdzUrl] = useState('');
  const [usdzName, setUsdzName] = useState<string | null>(null);
  const [lightingPreset, setLightingPreset] = useState('warm');
  const [scanReady, setScanReady] = useState(false);
  const [scanMode, setScanMode] = useState<'ai' | 'demo' | null>(null);
  const [manualFiles, setManualFiles] = useState(false);

  const load = useCallback(async () => {
    const [dash, g] = await Promise.all([
      fetch(`${API_URL}/admin/restaurants/${slug}`).then((r) => {
        if (!r.ok) throw new Error('Não foi possível abrir o painel.');
        return r.json() as Promise<Dashboard>;
      }),
      fetch(`${API_URL}/admin/guide/photogrammetry`).then((r) =>
        r.json() as Promise<Guide>,
      ),
    ]);
    setData(dash);
    setGuide(g);
    setCategoryId((prev) => prev || dash.categories[0]?.id || '');
  }, [slug]);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : 'Erro'));
  }, [load]);

  const parsePrice = (raw: string) => {
    const n = Number(raw.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  };

  const createItem = async () => {
    if (!categoryId || !name.trim()) {
      setError('Preencha pelo menos o nome do prato.');
      setStep(1);
      return;
    }
    const price = parsePrice(basePrice);
    if (!Number.isFinite(price) || price <= 0) {
      setError('Informe um preço válido, por exemplo 42,90.');
      setStep(1);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/admin/restaurants/${slug}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          name: name.trim(),
          description: description.trim() || undefined,
          basePrice: price,
          imageUrl: imageUrl || undefined,
          glbUrl: glbUrl || undefined,
          usdzUrl: usdzUrl || undefined,
          scaleFactor: 1,
          lightingPreset,
        }),
      });
      if (!res.ok) throw new Error('Não foi possível salvar o prato.');

      setName('');
      setDescription('');
      setBasePrice('29,90');
      setImageUrl('');
      setImageName(null);
      setGlbUrl('');
      setGlbName(null);
      setUsdzUrl('');
      setUsdzName(null);
      setStep(1);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar');
    } finally {
      setBusy(false);
    }
  };

  const removeItem = async (id: string) => {
    if (!confirm('Remover este prato do cardápio?')) return;
    setBusy(true);
    try {
      await fetch(`${API_URL}/admin/items/${id}`, { method: 'DELETE' });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const onPhoto = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const up = await uploadFile(file);
      setImageUrl(up.url);
      setImageName(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro no upload da foto');
    } finally {
      setBusy(false);
    }
  };

  const onGlb = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      if (!file.name.toLowerCase().endsWith('.glb')) {
        throw new Error('Para Android/Web, envie o arquivo .glb do app de scan.');
      }
      const up = await uploadFile(file);
      setGlbUrl(up.url);
      setGlbName(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro no upload 3D');
    } finally {
      setBusy(false);
    }
  };

  const onUsdz = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      if (!file.name.toLowerCase().endsWith('.usdz')) {
        throw new Error('Para iPhone, envie o arquivo .usdz do app de scan.');
      }
      const up = await uploadFile(file);
      setUsdzUrl(up.url);
      setUsdzName(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro no upload 3D');
    } finally {
      setBusy(false);
    }
  };

  const accent = data?.primaryColor || '#B33A1B';

  return (
    <div className="min-h-dvh">
      <header className="border-b border-[var(--border)] bg-[linear-gradient(180deg,#f7f1e8,#efe6d8)]">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm tracking-[0.16em] text-[var(--muted)] uppercase">
              Painel do restaurante
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight">
              {data?.name ?? '…'}
            </h1>
            <p className="mt-2 max-w-xl text-[var(--muted)]">
              Cadastre o prato, tire uma foto e o site gera o 3D pela câmera —
              sem baixar app e sem lidar com arquivos técnicos.
            </p>
          </div>
          <Link
            href={`/r/${slug}/mesa/12`}
            className="inline-flex justify-center rounded-xl px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: accent }}
          >
            Ver como o cliente vê
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-10 px-5 py-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-5">
          <div className="flex gap-2 text-sm">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setStep(n)}
                className={`rounded-full px-3 py-1.5 ${
                  step === n
                    ? 'text-white'
                    : 'border border-[var(--border)] text-[var(--muted)]'
                }`}
                style={step === n ? { backgroundColor: accent } : undefined}
              >
                {n === 1 ? '1. Dados' : n === 2 ? '2. Foto' : '3. Escanear 3D'}
              </button>
            ))}
          </div>

          <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-white/60 p-5">
            {step === 1 ? (
              <>
                <h2 className="font-[family-name:var(--font-display)] text-2xl">
                  O que é o prato?
                </h2>
                <label className="block text-sm">
                  Categoria do cardápio
                  <select
                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-3 text-base"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    {data?.categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  Nome do prato
                  <input
                    className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-3 text-base"
                    placeholder="Ex.: Brasa Smash"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  Descrição curta (opcional)
                  <textarea
                    className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-3 text-base"
                    rows={2}
                    placeholder="Ingredientes principais, ponto da carne…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  Preço (R$)
                  <input
                    className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-3 text-base"
                    inputMode="decimal"
                    placeholder="42,90"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  style={{ backgroundColor: accent }}
                  className="w-full rounded-xl py-3.5 font-medium text-white"
                >
                  Continuar · foto do prato
                </button>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <h2 className="font-[family-name:var(--font-display)] text-2xl">
                  Foto do prato
                </h2>
                <p className="text-sm text-[var(--muted)]">
                  Tire uma foto boa com o celular e envie aqui. Ela aparece no
                  cardápio mesmo se o 3D falhar.
                </p>
                <FileDrop
                  label="Enviar foto"
                  hint="JPG ou PNG · até 8 MB"
                  accept="image/jpeg,image/png,image/webp"
                  fileName={imageName}
                  previewUrl={imageUrl || null}
                  disabled={busy}
                  onPick={onPhoto}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 rounded-xl border border-[var(--border)] py-3"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    style={{ backgroundColor: accent }}
                    className="flex-1 rounded-xl py-3 font-medium text-white"
                  >
                    Continuar · 3D
                  </button>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={createItem}
                  className="w-full text-sm text-[var(--muted)] underline underline-offset-2"
                >
                  Salvar só com foto (sem 3D por enquanto)
                </button>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <h2 className="font-[family-name:var(--font-display)] text-2xl">
                  Escanear o prato (3D)
                </h2>
                <p className="text-sm text-[var(--muted)]">
                  Aponte a câmera para o prato pronto. O site fotografa e monta
                  o modelo sozinho — você não precisa saber o que é GLB ou USDZ.
                </p>

                <DishScanner
                  accent={accent}
                  disabled={busy}
                  onDone={(result) => {
                    setGlbUrl(result.glbUrl);
                    setUsdzUrl(result.usdzUrl || '');
                    setGlbName('modelo-gerado');
                    setUsdzName(result.usdzUrl ? 'modelo-gerado-ios' : null);
                    setScanReady(true);
                    setScanMode(result.mode);
                    if (!imageUrl && result.photoUrl) {
                      setImageUrl(result.photoUrl);
                      setImageName('foto-do-scan.jpg');
                    }
                  }}
                />

                {scanReady ? (
                  <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                    {scanMode === 'ai'
                      ? '3D do seu prato pronto para publicar.'
                      : 'Prévia 3D pronta (modo demonstração). Com chave de IA no servidor, o modelo será do prato real.'}
                  </p>
                ) : null}

                <button
                  type="button"
                  onClick={() => setManualFiles((v) => !v)}
                  className="text-sm text-[var(--muted)] underline underline-offset-2"
                >
                  {manualFiles
                    ? 'Ocultar envio manual'
                    : 'Já tenho arquivos de outro app (avançado)'}
                </button>

                {manualFiles ? (
                  <div className="space-y-3">
                    <FileDrop
                      label="Arquivo Android/Web"
                      hint="Somente se você já exportou de outro app."
                      accept=".glb,model/gltf-binary"
                      fileName={glbName}
                      disabled={busy}
                      onPick={onGlb}
                    />
                    <FileDrop
                      label="Arquivo iPhone"
                      hint="Somente se você já exportou de outro app."
                      accept=".usdz"
                      fileName={usdzName}
                      disabled={busy}
                      onPick={onUsdz}
                    />
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="text-sm text-[var(--muted)] underline underline-offset-2"
                >
                  {showAdvanced ? 'Ocultar luz' : 'Tipo de luz do prato (opcional)'}
                </button>
                {showAdvanced ? (
                  <label className="block text-sm">
                    Como o prato deve parecer iluminado
                    <select
                      className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-3"
                      value={lightingPreset}
                      onChange={(e) => setLightingPreset(e.target.value)}
                    >
                      <option value="warm">Quente (grelhados, burgers)</option>
                      <option value="neutral">Neutra</option>
                      <option value="cool">Fria (drinks)</option>
                    </select>
                  </label>
                ) : null}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 rounded-xl border border-[var(--border)] py-3"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={createItem}
                    style={{ backgroundColor: accent }}
                    className="flex-1 rounded-xl py-3 font-medium text-white disabled:opacity-50"
                  >
                    {busy ? 'Salvando…' : 'Publicar no cardápio'}
                  </button>
                </div>
              </>
            ) : null}

            {error ? (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            ) : null}
          </div>

          <div className="space-y-3">
            <h2 className="font-[family-name:var(--font-display)] text-2xl">
              Já no cardápio
            </h2>
            {data?.categories.map((cat) => (
              <div key={cat.id}>
                <h3 className="text-sm font-semibold tracking-wide text-[var(--muted)] uppercase">
                  {cat.name}
                </h3>
                <ul className="mt-2 divide-y divide-[var(--border)]">
                  {cat.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-black/5" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {item.name}
                            {item.has3d ? (
                              <span className="ml-2 text-xs text-[var(--muted)]">
                                com AR
                              </span>
                            ) : null}
                          </p>
                          <p className="text-sm text-[var(--muted)]">
                            {item.basePrice.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => removeItem(item.id)}
                        className="shrink-0 text-xs text-[var(--muted)] hover:text-[var(--ink)]"
                      >
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Como funciona o scan
          </h2>
          <ol className="space-y-3 text-sm text-[var(--muted)]">
            <li className="rounded-2xl border border-[var(--border)] bg-white/60 p-4">
              <strong className="text-[var(--ink)]">1.</strong> Monte o prato
              como o cliente receberia.
            </li>
            <li className="rounded-2xl border border-[var(--border)] bg-white/60 p-4">
              <strong className="text-[var(--ink)]">2.</strong> No passo
              “Escanear 3D”, permita a câmera e fotografe o prato de cima/ângulo
              claro.
            </li>
            <li className="rounded-2xl border border-[var(--border)] bg-white/60 p-4">
              <strong className="text-[var(--ink)]">3.</strong> O site gera o
              modelo sozinho e você só clica em publicar.
            </li>
          </ol>
          <div className="rounded-2xl bg-[#1c1916] p-4 text-sm text-[#f7f1e8]">
            <p className="font-medium">Modelo real do seu prato</p>
            <p className="mt-2 text-white/75">
              Sem chave de IA, o sistema usa uma prévia 3D só para testar o
              fluxo. Com <code className="text-white">REPLICATE_API_TOKEN</code>{' '}
              no servidor, a foto vira o 3D de verdade automaticamente.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
