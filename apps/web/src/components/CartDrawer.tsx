'use client';

import { useCart } from '@/lib/cart';

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function CartDrawer({ accent }: { accent: string }) {
  const { open, setOpen, lines, total, updateQty, removeLine, clear, tableId } =
    useCart();

  if (!open) return null;

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
              Seu pedido
            </h2>
            {tableId ? (
              <p className="text-sm text-[var(--muted)]">Mesa {tableId}</p>
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

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {lines.length === 0 ? (
            <p className="text-[var(--muted)]">Carrinho vazio. Explore o cardápio.</p>
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
                      <p className="font-medium leading-tight">{line.name}</p>
                      <button
                        type="button"
                        onClick={() => removeLine(line.lineId)}
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
                          onClick={() => updateQty(line.lineId, line.quantity - 1)}
                        >
                          −
                        </button>
                        <span className="w-5 text-center text-sm">{line.quantity}</span>
                        <button
                          type="button"
                          className="h-7 w-7 rounded-full border border-[var(--border)]"
                          onClick={() => updateQty(line.lineId, line.quantity + 1)}
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
        </div>

        <footer className="space-y-3 border-t border-[var(--border)] px-5 py-4">
          <div className="flex items-center justify-between text-base">
            <span className="text-[var(--muted)]">Total</span>
            <span className="font-[family-name:var(--font-display)] text-xl">
              {formatBRL(total)}
            </span>
          </div>
          <button
            type="button"
            disabled={lines.length === 0}
            style={{ backgroundColor: accent }}
            className="w-full rounded-xl py-3 text-center font-medium text-white disabled:opacity-40"
          >
            Enviar para cozinha (em breve)
          </button>
          {lines.length > 0 ? (
            <button
              type="button"
              onClick={clear}
              className="w-full text-center text-sm text-[var(--muted)]"
            >
              Limpar carrinho
            </button>
          ) : null}
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
      Pedido
      {count > 0 ? (
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/20 px-1.5 text-xs">
          {count}
        </span>
      ) : null}
    </button>
  );
}
