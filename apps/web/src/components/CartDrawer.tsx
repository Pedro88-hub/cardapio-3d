'use client';

import { useMemo, useState } from 'react';
import { useCart } from '@/lib/cart';

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function CartDrawer({ accent }: { accent: string }) {
  const {
    open,
    setOpen,
    lines,
    total,
    updateQty,
    removeLine,
    tableId,
    guestName,
    setGuestName,
    sendToKitchen,
    setSplit,
    session,
    pay,
    confirmPay,
  } = useCart();

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
  const [guestCount, setGuestCount] = useState(2);

  const amountDue = useMemo(() => {
    if (!session) return total;
    if (session.splitMode === 'by_person') {
      return total / Math.max(1, session.guestCount);
    }
    return total;
  }, [session, total]);

  if (!open) return null;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Erro');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Fechar carrinho"
        className="absolute inset-0 bg-black/45"
        onClick={() => setOpen(false)}
      />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl tracking-tight">
              Pedido da mesa
            </h2>
            {tableId ? (
              <p className="text-sm text-[var(--muted)]">
                Mesa {tableId} · compartilhado
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full px-3 py-1 text-sm text-[var(--muted)] hover:bg-black/5"
          >
            Fechar
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <label className="block text-sm">
            <span className="text-[var(--muted)]">Seu nome na mesa</span>
            <input
              value={guestName ?? ''}
              onChange={(e) => setGuestName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white/70 px-3 py-2"
              placeholder="Como te chamamos?"
            />
          </label>

          {lines.length === 0 ? (
            <p className="text-[var(--muted)]">
              Carrinho vazio. Itens adicionados por qualquer pessoa da mesa
              aparecem aqui.
            </p>
          ) : (
            <ul className="space-y-4">
              {lines.map((line) => (
                <li
                  key={line.lineId}
                  className="flex gap-3 border-b border-[var(--border)] pb-4"
                >
                  {line.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={line.imageUrl}
                      alt=""
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-black/5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium leading-tight">{line.name}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {line.guestName}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => run(() => removeLine(line.lineId))}
                        className="text-xs text-[var(--muted)] hover:text-[var(--ink)]"
                      >
                        Remover
                      </button>
                    </div>
                    {line.modifiers.length > 0 ? (
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {line.modifiers.map((m) => m.name).join(', ')}
                      </p>
                    ) : null}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="h-7 w-7 rounded-full border border-[var(--border)]"
                          onClick={() =>
                            run(() => updateQty(line.lineId, line.quantity - 1))
                          }
                        >
                          −
                        </button>
                        <span className="w-5 text-center text-sm">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          className="h-7 w-7 rounded-full border border-[var(--border)]"
                          onClick={() =>
                            run(() => updateQty(line.lineId, line.quantity + 1))
                          }
                        >
                          +
                        </button>
                      </div>
                      <span className="text-sm font-medium">
                        {formatBRL(line.unitPrice * line.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <section className="space-y-2">
            <h3 className="text-sm font-medium">Divisão de conta</h3>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['none', 'Integral'],
                  ['by_person', 'Por pessoa'],
                  ['by_item', 'Por item'],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(() => setSplit(mode, guestCount))
                  }
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    session?.splitMode === mode
                      ? 'border-transparent text-white'
                      : 'border-[var(--border)]'
                  }`}
                  style={
                    session?.splitMode === mode
                      ? { backgroundColor: accent }
                      : undefined
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            {session?.splitMode === 'by_person' ? (
              <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
                Pessoas
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value) || 1)}
                  onBlur={() => run(() => setSplit('by_person', guestCount))}
                  className="w-16 rounded-lg border border-[var(--border)] px-2 py-1"
                />
              </label>
            ) : null}
            {session?.splitMode === 'by_item' ? (
              <p className="text-xs text-[var(--muted)]">
                Cada um paga os itens marcados com seu nome.
              </p>
            ) : null}
          </section>

          {session?.orders?.[0] ? (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              Pedido enviado à cozinha (
              {session.orders[0].status.replace('_', ' ')})
            </p>
          ) : null}

          {pixCode ? (
            <div className="space-y-2 rounded-xl border border-[var(--border)] bg-white/70 p-3 text-sm">
              <p className="font-medium">Pix (simulado)</p>
              <textarea
                readOnly
                value={pixCode}
                className="h-20 w-full rounded-lg border border-[var(--border)] p-2 text-xs"
              />
              {pendingPaymentId ? (
                <button
                  type="button"
                  disabled={busy}
                  style={{ backgroundColor: accent }}
                  className="w-full rounded-xl py-2 font-medium text-white"
                  onClick={() =>
                    run(async () => {
                      await confirmPay(pendingPaymentId);
                      setPixCode(null);
                      setPendingPaymentId(null);
                      setMessage('Pagamento confirmado');
                    })
                  }
                >
                  Já paguei · confirmar
                </button>
              ) : null}
            </div>
          ) : null}

          {message ? (
            <p className="text-sm text-[var(--muted)]">{message}</p>
          ) : null}
        </div>

        <footer className="space-y-2 border-t border-[var(--border)] px-5 py-4">
          <div className="flex items-center justify-between text-base">
            <span className="text-[var(--muted)]">
              {session?.splitMode === 'by_person' ? 'Por pessoa' : 'Total'}
            </span>
            <span className="font-[family-name:var(--font-display)] text-xl">
              {formatBRL(amountDue)}
            </span>
          </div>

          <button
            type="button"
            disabled={busy || lines.length === 0}
            style={{ backgroundColor: accent }}
            className="w-full rounded-xl py-3 text-center font-medium text-white disabled:opacity-40"
            onClick={() =>
              run(async () => {
                await sendToKitchen();
                setMessage('Pedido enviado à cozinha (integração PDV futura)');
              })
            }
          >
            Enviar para cozinha
          </button>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={busy || total <= 0}
              className="rounded-xl border border-[var(--border)] py-2 text-xs font-medium disabled:opacity-40"
              onClick={() =>
                run(async () => {
                  const data = await pay('pix', amountDue);
                  const payment = data.payments.find((p) => p.id === data.lastPaymentId)
                    ?? data.payments[0];
                  const meta = payment?.meta as { copiaCola?: string } | null;
                  setPixCode(meta?.copiaCola ?? null);
                  setPendingPaymentId(payment?.id ?? null);
                })
              }
            >
              Pix
            </button>
            <button
              type="button"
              disabled={busy || total <= 0}
              className="rounded-xl border border-[var(--border)] py-2 text-xs font-medium disabled:opacity-40"
              onClick={() =>
                run(async () => {
                  const data = await pay('apple_pay', amountDue);
                  const id = data.lastPaymentId ?? data.payments[0]?.id;
                  if (id) await confirmPay(id);
                  setMessage('Apple Pay simulado · pago');
                })
              }
            >
              Apple Pay
            </button>
            <button
              type="button"
              disabled={busy || total <= 0}
              className="rounded-xl border border-[var(--border)] py-2 text-xs font-medium disabled:opacity-40"
              onClick={() =>
                run(async () => {
                  const data = await pay('google_pay', amountDue);
                  const id = data.lastPaymentId ?? data.payments[0]?.id;
                  if (id) await confirmPay(id);
                  setMessage('Google Pay simulado · pago');
                })
              }
            >
              Google Pay
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}

export function CartButton({ accent }: { accent: string }) {
  const { count, setOpen } = useCart();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      style={{ backgroundColor: accent }}
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-white shadow-lg"
    >
      Mesa
      {count > 0 ? (
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/20 px-1.5 text-xs">
          {count}
        </span>
      ) : null}
    </button>
  );
}
