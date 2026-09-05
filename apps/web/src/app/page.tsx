import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-16">
      <p className="text-sm tracking-[0.2em] text-[var(--muted)] uppercase">
        Demo MVP
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl leading-none tracking-tight">
        Cardápio WebAR
      </h1>
      <p className="mt-4 text-[var(--muted)]">
        Escaneie o QR da mesa ou abra a mesa demo da Casa Brasa.
      </p>
      <Link
        href="/r/casa-brasa/mesa/12"
        className="mt-8 inline-flex items-center justify-center rounded-xl bg-[#B33A1B] px-5 py-3.5 font-medium text-white"
      >
        Abrir mesa 12 · Casa Brasa
      </Link>
    </main>
  );
}
