import { redirect } from "next/navigation";
import { EmailOtpSignIn } from "@/components/auth/email-otp-sign-in";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_34%),linear-gradient(180deg,#f7f8f4_0%,#eef3ea_100%)]">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-12 px-6 py-16 lg:flex-row lg:items-center lg:px-12">
        <section className="max-w-xl space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-700">
            Neon Auth
          </p>
          <h1 className="text-5xl font-semibold tracking-tight text-zinc-950">
            日曜学校の出席管理を、ログインからシンプルに。
          </h1>
          <p className="text-lg leading-8 text-zinc-700">
            Neon Auth のメール認証コードを使って、教師ごとのアクセスを安全に管理します。メールアドレスだけでサインインでき、初回ログイン時に教師データへ自動で紐付きます。
          </p>
          <div className="grid gap-4 text-sm text-zinc-700 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur">
              パスワード不要
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur">
              Neon Auth 連携
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur">
              教師情報と自動紐付け
            </div>
          </div>
        </section>

        <section className="w-full lg:flex lg:justify-end">
          <EmailOtpSignIn />
        </section>
      </main>
    </div>
  );
}
