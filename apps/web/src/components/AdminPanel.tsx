'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { API_URL } from '@/lib/api';

type AdminItem = {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  imageUrl: string | null;
  available: boolean;
  has3d: boolean;
  asset: {
    glbUrl: string;
    usdzUrl: string | null;
    scaleFactor: number;
    lightingPreset: string;
  } | null;
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

export function AdminPanel({ slug }: { slug: string }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    categoryId: '',
    name: '',
    description: '',
    basePrice: '29.90',
    imageUrl: '',
    glbUrl: '',
    usdzUrl: '',
    scaleFactor: '1',
    lightingPreset: 'warm',
  });

  const load = useCallback(async () => {
    const [dash, g] = await Promise.all([
      fetch(`${API_URL}/admin/restaurants/${slug}`).then((r) => {
        if (!r.ok) throw new Error('Falha ao carregar painel');
        return r.json() as Promise<Dashboard>;
      }),
      fetch(`${API_URL}/admin/guide/photogrammetry`).then((r) =>
        r.json() as Promise<Guide>,
      ),
    ]);
    setData(dash);
    setGuide(g);
    if (!form.categoryId && dash.categories[0]) {
      setForm((f) => ({ ...f, categoryId: dash.categories[0].id }));
    }
  }, [slug, form.categoryId]);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : 'Erro'));
  }, [load]);

  const createItem = async () => {
    if (!form.categoryId || !form.name) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/admin/restaurants/${slug}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: form.categoryId,
          name: form.name,
          description: form.description || undefined,
          basePrice: Number(form.basePrice),
          imageUrl: form.imageUrl || undefined,
          glbUrl: form.glbUrl || undefined,
          usdzUrl: form.usdzUrl || undefined,
          scaleFactor: Number(form.scaleFactor) || 1,
          lightingPreset: form.lightingPreset,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setForm((f) => ({
        ...f,
        name: '',
        description: '',
        imageUrl: '',
        glbUrl: '',
        usdzUrl: '',
      }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar');
    } finally {
      setBusy(false);
    }
  };

  const removeItem = async (id: string) => {
    if (!confirm('Remover este item?')) return;
    setBusy(true);
    try {
      await fetch(`${API_URL}/admin/items/${id}`, { method: 'DELETE' });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const accent = data?.primaryColor || '#B33A1B';

  return (
    <div className="min-h-dvh">
      <header className="border-b border-[var(--border)] bg-[linear-gradient(180deg,#f7f1e8,#efe6d8)]">
        <div className="mx-auto flex max-w-5xl items-end justify-between gap-4 px-5 py-8">
          <div>
            <p className="text-sm tracking-[0.16em] text-[var(--muted)] uppercase">
              Back-office · Fase 4
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight">
              {data?.name ?? 'Painel'}
            </h1>
            <p className="mt-2 max-w-xl text-[var(--muted)]">
              Cadastre pratos, vincule modelos 3D e siga o pipeline de
              fotogrametria.
            </p>
          </div>
          <Link
            href={`/r/${slug}/mesa/12`}
            className="rounded-xl px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: accent }}
          >
            Ver cardápio cliente
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-10 px-5 py-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Novo item
          </h2>
          <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-white/50 p-4">
            <label className="block text-sm">
              Categoria
              <select
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2"
                value={form.categoryId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, categoryId: e.target.value }))
                }
              >
                {data?.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Nome
              <input
                className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              Descrição
              <textarea
                className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2"
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                Preço
                <input
                  className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2"
                  value={form.basePrice}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, basePrice: e.target.value }))
                  }
                />
              </label>
              <label className="block text-sm">
                Foto (URL)
                <input
                  className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2"
                  value={form.imageUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, imageUrl: e.target.value }))
                  }
                />
              </label>
            </div>
            <label className="block text-sm">
              GLB / glTF (Web + Android)
              <input
                className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2"
                placeholder="/models/prato.glb"
                value={form.glbUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, glbUrl: e.target.value }))
                }
              />
            </label>
            <label className="block text-sm">
              USDZ (iOS)
              <input
                className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2"
                placeholder="/models/prato.usdz"
                value={form.usdzUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, usdzUrl: e.target.value }))
                }
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                scaleFactor
                <input
                  className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2"
                  value={form.scaleFactor}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, scaleFactor: e.target.value }))
                  }
                />
              </label>
              <label className="block text-sm">
                lightingPreset
                <select
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2"
                  value={form.lightingPreset}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lightingPreset: e.target.value }))
                  }
                >
                  <option value="neutral">neutral</option>
                  <option value="warm">warm</option>
                  <option value="cool">cool</option>
                </select>
              </label>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={createItem}
              style={{ backgroundColor: accent }}
              className="w-full rounded-xl py-3 font-medium text-white disabled:opacity-50"
            >
              Cadastrar prato
            </button>
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
          </div>

          <div className="space-y-4">
            <h2 className="font-[family-name:var(--font-display)] text-2xl">
              Cardápio atual
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
                      <div>
                        <p className="font-medium">
                          {item.name}{' '}
                          {item.has3d ? (
                            <span className="text-xs text-[var(--muted)]">
                              · 3D
                            </span>
                          ) : null}
                        </p>
                        <p className="text-sm text-[var(--muted)]">
                          R${' '}
                          {item.basePrice.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => removeItem(item.id)}
                        className="text-xs text-[var(--muted)] hover:text-[var(--ink)]"
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
            {guide?.title ?? 'Fotogrametria'}
          </h2>
          <ol className="space-y-4">
            {guide?.steps.map((step, i) => (
              <li
                key={step.id}
                className="rounded-2xl border border-[var(--border)] bg-white/50 p-4"
              >
                <p className="text-xs tracking-wide text-[var(--muted)] uppercase">
                  Passo {i + 1}
                </p>
                <h3 className="mt-1 font-medium">{step.title}</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">{step.body}</p>
                {step.apps ? (
                  <p className="mt-2 text-xs text-[var(--ink)]">
                    Apps: {step.apps.join(' · ')}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
          <div className="rounded-2xl border border-[var(--border)] bg-[#1c1916] p-4 text-[#f7f1e8]">
            <p className="text-sm font-medium">Restrições (Fase 5)</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-white/75">
              {guide?.constraints.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}
