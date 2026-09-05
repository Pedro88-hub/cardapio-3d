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
import {
  addTableLine,
  confirmPayment,
  createPayment,
  getOrCreateTableSession,
  getTableSession,
  removeTableLine,
  sendOrderToKitchen,
  setTableSplit,
  updateTableLine,
  type CartModifier,
  type TableSession,
} from '@/lib/api';

function guestStorageKey(slug: string, tableId: string) {
  return `cardapio-guest:${slug}:${tableId}`;
}

function ensureGuest(slug: string, tableId: string) {
  const key = guestStorageKey(slug, tableId);
  try {
    const existing = localStorage.getItem(key);
    if (existing) return JSON.parse(existing) as { guestId: string; guestName: string };
  } catch {
    /* ignore */
  }
  const guest = {
    guestId: `g-${Math.random().toString(36).slice(2, 10)}`,
    guestName: `Convidado ${Math.floor(Math.random() * 90 + 10)}`,
  };
  localStorage.setItem(key, JSON.stringify(guest));
  return guest;
}

type CartContextValue = {
  tableId: string | null;
  slug: string | null;
  sessionId: string | null;
  guestId: string | null;
  guestName: string | null;
  session: TableSession | null;
  lines: TableSession['lines'];
  total: number;
  count: number;
  loading: boolean;
  setSession: (slug: string, tableId: string) => void;
  setGuestName: (name: string) => void;
  addLine: (input: {
    itemId: string;
    name: string;
    unitPrice: number;
    imageUrl: string | null;
    modifiers: CartModifier[];
  }) => Promise<void>;
  removeLine: (lineId: string) => Promise<void>;
  updateQty: (lineId: string, quantity: number) => Promise<void>;
  sendToKitchen: () => Promise<void>;
  setSplit: (mode: 'none' | 'by_person' | 'by_item', guestCount?: number) => Promise<void>;
  pay: (method: 'pix' | 'apple_pay' | 'google_pay', amount: number) => Promise<TableSession>;
  confirmPay: (paymentId: string) => Promise<void>;
  open: boolean;
  setOpen: (open: boolean) => void;
  refresh: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [slug, setSlug] = useState<string | null>(null);
  const [tableId, setTableId] = useState<string | null>(null);
  const [session, setSessionState] = useState<TableSession | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [guestName, setGuestNameState] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const setSession = useCallback((nextSlug: string, nextTable: string) => {
    setSlug(nextSlug);
    setTableId(nextTable);
  }, []);

  const refresh = useCallback(async () => {
    if (!slug || !tableId) return;
    const data = await getOrCreateTableSession(slug, tableId);
    setSessionState(data);
  }, [slug, tableId]);

  useEffect(() => {
    if (!slug || !tableId) return;
    const guest = ensureGuest(slug, tableId);
    setGuestId(guest.guestId);
    setGuestNameState(guest.guestName);
    setLoading(true);
    getOrCreateTableSession(slug, tableId)
      .then(setSessionState)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug, tableId]);

  // Polling — carrinho multiplayer da mesa
  useEffect(() => {
    if (!session?.id) return;
    const id = window.setInterval(() => {
      getTableSession(session.id)
        .then(setSessionState)
        .catch(() => undefined);
    }, 2500);
    return () => window.clearInterval(id);
  }, [session?.id]);

  const setGuestName = useCallback(
    (name: string) => {
      if (!slug || !tableId || !guestId) return;
      const next = { guestId, guestName: name.trim() || 'Convidado' };
      localStorage.setItem(guestStorageKey(slug, tableId), JSON.stringify(next));
      setGuestNameState(next.guestName);
    },
    [slug, tableId, guestId],
  );

  const addLine = useCallback(
    async (input: {
      itemId: string;
      name: string;
      unitPrice: number;
      imageUrl: string | null;
      modifiers: CartModifier[];
    }) => {
      if (!session?.id || !guestId) return;
      const data = await addTableLine(session.id, {
        guestId,
        guestName: guestName ?? 'Convidado',
        menuItemId: input.itemId,
        name: input.name,
        unitPrice: input.unitPrice,
        imageUrl: input.imageUrl,
        modifiers: input.modifiers,
      });
      setSessionState(data);
      setOpen(true);
    },
    [session?.id, guestId, guestName],
  );

  const removeLine = useCallback(
    async (lineId: string) => {
      if (!session?.id || !guestId) return;
      const data = await removeTableLine(session.id, lineId, guestId);
      setSessionState(data);
    },
    [session?.id, guestId],
  );

  const updateQty = useCallback(
    async (lineId: string, quantity: number) => {
      if (!session?.id || !guestId) return;
      const data = await updateTableLine(session.id, lineId, {
        quantity,
        guestId,
      });
      setSessionState(data);
    },
    [session?.id, guestId],
  );

  const sendToKitchen = useCallback(async () => {
    if (!session?.id) return;
    const data = await sendOrderToKitchen(session.id);
    setSessionState(data);
  }, [session?.id]);

  const setSplit = useCallback(
    async (mode: 'none' | 'by_person' | 'by_item', guestCount = 2) => {
      if (!session?.id) return;
      const data = await setTableSplit(session.id, {
        splitMode: mode,
        guestCount,
      });
      setSessionState(data);
    },
    [session?.id],
  );

  const pay = useCallback(
    async (method: 'pix' | 'apple_pay' | 'google_pay', amount: number) => {
      if (!session?.id) throw new Error('Sem sessão');
      const data = await createPayment(session.id, {
        method,
        amount,
        guestId: guestId ?? undefined,
      });
      setSessionState(data);
      return data;
    },
    [session?.id, guestId],
  );

  const confirmPay = useCallback(async (paymentId: string) => {
    const data = await confirmPayment(paymentId);
    setSessionState(data);
  }, []);

  const lines = session?.lines ?? [];
  const total = session?.total ?? 0;
  const count = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity, 0),
    [lines],
  );

  const value = useMemo(
    () => ({
      tableId,
      slug,
      sessionId: session?.id ?? null,
      guestId,
      guestName,
      session,
      lines,
      total,
      count,
      loading,
      setSession,
      setGuestName,
      addLine,
      removeLine,
      updateQty,
      sendToKitchen,
      setSplit,
      pay,
      confirmPay,
      open,
      setOpen,
      refresh,
    }),
    [
      tableId,
      slug,
      session,
      guestId,
      guestName,
      lines,
      total,
      count,
      loading,
      setSession,
      setGuestName,
      addLine,
      removeLine,
      updateQty,
      sendToKitchen,
      setSplit,
      pay,
      confirmPay,
      open,
      refresh,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
