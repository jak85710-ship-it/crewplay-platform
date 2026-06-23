export function Legal({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
      <div className="mt-6 space-y-4 text-slate-700">{children}</div>
    </div>
  );
}
