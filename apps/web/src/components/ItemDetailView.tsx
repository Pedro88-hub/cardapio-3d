'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { MenuItemDetail } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { CartButton, CartDrawer } from '@/components/CartDrawer';
import { ModelViewerAR } from '@/components/ModelViewerAR';
import { ModifierSheet } from '@/components/ModifierSheet';

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function buildDefaultSelection(item: MenuItemDetail) {
  const selected: Record<string, boolean> = {};
  for (const group of item.modifiers) {
    for (const opt of group.options) {
      selected[opt.id] = opt.defaultOn;
    }
  }
  return selected;
}

export function ItemDetailView({
  item,
  tableId,
}: {
  item: MenuItemDetail;
  tableId: string;
}) {
  const { setSession, addLine } = useCart();
  const [selected, setSelected] = useState(() => buildDefaultSelection(item));
  const [sheetOpen, setSheetOpen] = useState(item.modifiers.length > 0);
  const accent = item.restaurant.primaryColor || '#B33A1B';

  useEffect(() => {
    setSession(item.restaurant.slug, tableId);
  }, [item.restaurant.slug, tableId, setSession]);

  const unitPrice = useMemo(() => {
    let total = item.basePrice;
    for (const group of item.modifiers) {
      for (const opt of group.options) {
        if (selected[opt.id]) total += opt.priceDelta;
      }
    }
    return total;
  }, [item, selected]);

  const toggleOption = (groupId: string, optionId: string) => {
    const group = item.modifiers.find((g) => g.id === groupId);
    if (!group) return;

    setSelected((prev) => {
      const next = { ...prev };
      if (!group.multiSelect) {
        for (const opt of group.options) {
          next[opt.id] = opt.id === optionId;
        }
      } else {
        next[optionId] = !prev[optionId];
      }
      return next;
    });
  };

  const handleAdd = () => {
    const modifiers = item.modifiers.flatMap((g) =>
      g.options
        .filter((o) => selected[o.id])
        .map((o) => ({
          optionId: o.id,
          name: o.name,
          priceDelta: o.priceDelta,
        })),
    );
    addLine({
      itemId: item.id,
      name: item.name,
      unitPrice,
      imageUrl: item.imageUrl,
      modifiers,
    });
  };

  return (
    <div className="min-h-dvh pb-28">
      <div className="mx-auto max-w-3xl px-5 pt-6">
        <Link
          href={`/r/${item.restaurant.slug}/mesa/${tableId}`}
          className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
        >
          ← Voltar ao cardápio
        </Link>

        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div>
            {item.has3d ? (
              <ModelViewerAR item={item} selected={selected} accent={accent} />
            ) : item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt={item.name}
                className="aspect-[4/3] w-full rounded-2xl object-cover"
              />
            ) : (
              <div className="aspect-[4/3] rounded-2xl bg-black/5" />
            )}

            {item.has3d ? (
              <p className="mt-3 text-center text-xs text-[var(--muted)]">
                Use o botão AR no visualizador (câmera só é pedida nesse momento).
                Foto com marca d&apos;água: em breve.
              </p>
            ) : null}
          </div>

          <div>
            <p className="text-sm text-[var(--muted)]">{item.category.name}</p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl leading-none tracking-tight">
              {item.name}
            </h1>
            {item.description ? (
              <p className="mt-3 text-[var(--muted)]">{item.description}</p>
            ) : null}
            <p className="mt-4 font-[family-name:var(--font-display)] text-3xl">
              {formatBRL(unitPrice)}
            </p>

            {item.modifiers.length > 0 ? (
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="mt-6 w-full rounded-xl border border-[var(--border)] bg-white/60 px-4 py-3 text-left text-sm backdrop-blur"
              >
                Personalizar ingredientes
                <span className="mt-0.5 block text-[var(--muted)]">
                  Alterações refletem no 3D e no preço
                </span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleAdd}
              style={{ backgroundColor: accent }}
              className="mt-4 w-full rounded-xl py-3.5 font-medium text-white"
            >
              Adicionar · {formatBRL(unitPrice)}
            </button>
          </div>
        </div>
      </div>

      <ModifierSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        groups={item.modifiers}
        selected={selected}
        onToggle={toggleOption}
        unitPrice={unitPrice}
        accent={accent}
      />

      <CartButton accent={accent} />
      <CartDrawer accent={accent} />
    </div>
  );
}
