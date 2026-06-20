export default function SummaryLoading() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(5,150,105,0.18),_transparent_34%),linear-gradient(180deg,#f7f8f4_0%,#eef4ef_100%)]">
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-8 sm:px-8 sm:py-12">
        <header className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
          <div className="h-4 w-32 rounded-full bg-emerald-100" />
          <div className="mt-5 h-10 w-48 rounded-2xl bg-zinc-100" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="h-14 rounded-[1.5rem] bg-zinc-100" />
            <div className="h-14 rounded-[1.5rem] bg-zinc-100" />
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="h-60 rounded-[2rem] border border-white/70 bg-white/80 shadow-sm" />
          <div className="h-60 rounded-[2rem] border border-white/70 bg-white/80 shadow-sm" />
        </section>
      </main>
    </div>
  );
}
