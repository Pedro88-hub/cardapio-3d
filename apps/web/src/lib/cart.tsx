'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CartLine, CartModifier } from '@/lib/api';

type CartContextValue = {
  tableId: string | null;
  slug: string | null;
  lines: CartLine[];
  total: number;
  count: number;
  setSession: (slug: string, tableId: string) => void;
  addLine: (input: {
    itemId: string;
    name: string;
    unitPrice: number;
    imageUrl: string | null;
    modifiers: CartModifier[];
  }) => void;
  removeLine: (lineId: string) => void;
  updateQty: (lineId: string, quantity: number) => void;
  clear: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function storageKey(slug: string, tableId: string) {
  return `cardapio-cart:${slug}:${tableId}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [slug, setSlug] = useState<string | null>(null);
  const [tableId, setTableId] = useState<string | null>(null);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const setSession = useCallback((nextSlug: string, nextTable: string) => {
    setSlug(nextSlug);
    setTableId(nextTable);
  }, []);

  useEffect(() => {
    if (!slug || !tableId) return;
    try {
      const raw = sessionStorage.getItem(storageKey(slug, tableId));
      if (raw) {
        setLines(JSON.parse(raw) as CartLine[]);
      } else {
        setLines([]);
      }
    } catch {
      setLines([]);
    }
    setHydrated(true);
  }, [slug, tableId]);

  useEffect(() => {
    if (!hydrated || !slug || !tableId) return;
    sessionStorage.setItem(storageKey(slug, tableId), JSON.stringify(lines));
  }, [lines, slug, tableId, hydrated]);

  const addLine = useCallback(
    (input: {
      itemId: string;
      name: string;
      unitPrice: number;
      imageUrl: string | null;
      modifiers: CartModifier[];
    }) => {
      setLines((prev) => [
        ...prev,
        {
          lineId: `${input.itemId}-${Date.now()}`,
          itemId: input.itemId,
          name: input.name,
          unitPrice: input.unitPrice,
          quantity: 1,
          imageUrl: input.imageUrl,
          modifiers: input.modifiers,
        },
      ]);
      setOpen(true);
    },
    [],
  );

  const removeLine = useCallback((lineId: string) => {
    setLines((prev) => prev.filter((l) => l.lineId !== lineId));
  }, []);

  const updateQty = useCallback((lineId: string, quantity: number) => {
    setLines((prev) =>
      prev
        .map((l) => (l.lineId === lineId ? { ...l, quantity } : l))
        .filter((l) => l.quantity > 0),
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const total = useMemo(
    () => lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
    [lines],
  );
  const count = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity, 0),
    [lines],
  );

  const value = useMemo(
    () => ({
      tableId,
      slug,
      lines,
      total,
      count,
      setSession,
      addLine,
      removeLine,
      updateQty,
      clear,
      open,
      setOpen,
    }),
    [
      tableId,
      slug,
      lines,
      total,
      count,
      setSession,
      addLine,
      removeLine,
      updateQty,
      clear,
      open,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
