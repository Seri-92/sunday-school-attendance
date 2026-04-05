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
            鶴見教会日曜学校
          </p>
          <h1 className="text-5xl font-semibold tracking-tight text-zinc-950">
            日曜学校の出席を、シンプルに管理
          </h1>
          <p className="text-lg leading-8 text-zinc-700">
            メールアドレスでログインするだけで、担当クラスの出席確認をすぐ始められます。
          </p>
          <div className="grid gap-4 text-sm text-zinc-700 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur">
              パスワード不要
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur">
              すぐにログイン
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
