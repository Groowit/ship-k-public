export function PolicyShell({
  title,
  updatedAt,
  children
}: {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <section className="container py-8">
      <article className="mx-auto max-w-3xl rounded-md border bg-white p-6">
        <p className="text-sm font-semibold uppercase tracking-normal text-muted-foreground">
          {updatedAt}
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-normal">{title}</h1>
        <div className="mt-6 grid gap-4 leading-7 text-muted-foreground">{children}</div>
      </article>
    </section>
  );
}
