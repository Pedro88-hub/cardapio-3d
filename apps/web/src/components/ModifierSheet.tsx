'use client';

import type { ModifierGroup } from '@/lib/api';

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function ModifierSheet({
  open,
  onClose,
  groups,
  selected,
  onToggle,
  unitPrice,
  accent,
}: {
  open: boolean;
  onClose: () => void;
  groups: ModifierGroup[];
  selected: Record<string, boolean>;
  onToggle: (groupId: string, optionId: string) => void;
  unitPrice: number;
  accent: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Fechar personalização"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
      />
      <div className="relative max-h-[85dvh] w-full max-w-lg overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl">
              Personalizar
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Preço atual · {formatBRL(unitPrice)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-[var(--muted)]"
          >
            Pronto
          </button>
        </div>

        <div className="max-h-[60dvh] space-y-6 overflow-y-auto px-5 py-5">
          {groups.map((group) => (
            <section key={group.id}>
              <h3 className="text-sm font-medium tracking-wide text-[var(--ink)]">
                {group.name}
                {group.required ? (
                  <span className="ml-2 text-[var(--muted)]">obrigatório</span>
                ) : null}
              </h3>
              <ul className="mt-3 space-y-2">
                {group.options.map((opt) => {
                  const on = Boolean(selected[opt.id]);
                  return (
                    <li key={opt.id}>
                      <button
                        type="button"
                        onClick={() => onToggle(group.id, opt.id)}
                        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                          on
                            ? 'border-transparent text-white'
                            : 'border-[var(--border)] bg-white/50'
                        }`}
                        style={on ? { backgroundColor: accent } : undefined}
                      >
                        <span>
                          <span className="block font-medium">{opt.name}</span>
                          {opt.meshNodeName ? (
                            <span
                              className={`text-xs ${on ? 'text-white/70' : 'text-[var(--muted)]'}`}
                            >
                              3D · {opt.action} `{opt.meshNodeName}`
                            </span>
                          ) : null}
                        </span>
                        <span className="text-sm">
                          {opt.priceDelta === 0
                            ? 'Incluso'
                            : `+ ${formatBRL(opt.priceDelta)}`}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
