'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { MenuResponse } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { CartButton, CartDrawer } from '@/components/CartDrawer';

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function MenuView({
  menu,
  tableId,
}: {
  menu: MenuResponse;
  tableId: string;
}) {
  const { setSession } = useCart();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(
    menu.categories[0]?.id ?? '',
  );

  useEffect(() => {
    setSession(menu.slug, tableId);
  }, [menu.slug, tableId, setSession]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return menu.categories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            !q ||
            item.name.toLowerCase().includes(q) ||
            (item.description?.toLowerCase().includes(q) ?? false),
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [menu.categories, query]);

  const accent = menu.primaryColor || '#B33A1B';

  return (
    <div className="min-h-dvh">
      <header className="relative overflow-hidden border-b border-[var(--border)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 10% -10%, ${accent}33, transparent 55%),
              radial-gradient(ellipse 60% 50% at 90% 0%, #1a1a1822, transparent 50%),
              linear-gradient(180deg, #f7f1e8 0%, #efe6d8 100%)
            `,
          }}
        />
        <div className="relative mx-auto max-w-3xl px-5 pb-8 pt-10">
          <p className="text-sm tracking-[0.18em] text-[var(--muted)] uppercase">
            Mesa {tableId}
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl leading-none tracking-tight text-[var(--ink)] md:text-6xl">
            {menu.name}
          </h1>
          <p className="mt-3 max-w-md text-[var(--muted)]">
            Cardápio híbrido — explore em 2D e abra pratos em escala real na sua
            mesa.
          </p>
          <label className="mt-6 block">
            <span className="sr-only">Buscar</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar prato ou bebida…"
              className="w-full rounded-xl border border-[var(--border)] bg-white/70 px-4 py-3 text-[var(--ink)] outline-none backdrop-blur placeholder:text-[var(--muted)] focus:border-[var(--ink)]/30"
            />
          </label>
        </div>
      </header>

      {!query && menu.categories.length > 0 ? (
        <nav className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur">
          <div className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-3 py-2">
            {menu.categories.map((cat) => (
              <a
                key={cat.id}
                href={`#cat-${cat.id}`}
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 rounded-lg px-3 py-2 text-sm transition ${
                  activeCategory === cat.id
                    ? 'bg-[var(--ink)] text-[var(--bg)]'
                    : 'text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                {cat.name}
              </a>
            ))}
          </div>
        </nav>
      ) : null}

      <main className="mx-auto max-w-3xl space-y-10 px-5 py-8 pb-28">
        {filtered.map((cat) => (
          <section key={cat.id} id={`cat-${cat.id}`}>
            <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">
              {cat.name}
            </h2>
            <ul className="mt-4 divide-y divide-[var(--border)]">
              {cat.items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/r/${menu.slug}/item/${item.id}?mesa=${tableId}`}
                    className="flex gap-4 py-4 transition hover:bg-black/[0.02]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-[var(--ink)]">{item.name}</h3>
                        {item.has3d ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-white"
                            style={{ backgroundColor: accent }}
                          >
                            Ver na minha mesa
                          </span>
                        ) : null}
                      </div>
                      {item.description ? (
                        <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                          {item.description}
                        </p>
                      ) : null}
                      <p className="mt-2 text-sm font-medium">
                        {formatBRL(item.basePrice)}
                      </p>
                    </div>
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="h-24 w-24 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="h-24 w-24 shrink-0 rounded-xl bg-black/5" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {filtered.length === 0 ? (
          <p className="text-[var(--muted)]">Nenhum item encontrado.</p>
        ) : null}
      </main>

      <CartButton accent={accent} />
      <CartDrawer accent={accent} />
    </div>
  );
}
