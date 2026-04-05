import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireAdminTeacher } from "@/lib/auth/admin";
import { createTeacherAction } from "./actions";

export const dynamic = "force-dynamic";

type AdminPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    notice?: string | string[];
  }>;
};

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const adminTeacher = await requireAdminTeacher();
  const params = await searchParams;
  const notice = getSingleValue(params.notice);
  const error = getSingleValue(params.error);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(120,53,15,0.10),_transparent_36%),linear-gradient(180deg,#f8f4ec_0%,#f3efe5_100%)]">
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6 sm:px-6 sm:py-10">
        <header className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-700">
                Admin
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
                教師を登録する
              </h1>
              <p className="text-sm leading-6 text-zinc-600">
                ログイン可能な教師アカウントを事前に登録します。登録時に Clerk
                ユーザーを用意し、`auth_user_id` を保存します。
              </p>
            </div>
            <SignOutButton />
          </div>

          <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50/80 p-4 text-sm text-amber-950">
            <p className="font-semibold">{adminTeacher.name}</p>
            <p className="mt-1 break-all">{adminTeacher.email}</p>
          </div>
        </header>

        <section className="mt-8 rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-zinc-950">新しい教師を追加</h2>
            <p className="text-sm leading-6 text-zinc-600">
              名前、メールアドレス、権限、有効状態を設定します。
            </p>
          </div>

          {notice ? (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
              {notice}
            </div>
          ) : null}

          {error ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-900">
              {error}
            </div>
          ) : null}

          <form action={createTeacherAction} className="mt-6 grid gap-5">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-zinc-800">教師名</span>
              <input
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-950 outline-none transition focus:border-amber-500"
                name="name"
                placeholder="山田 花子"
                required
                type="text"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-zinc-800">メールアドレス</span>
              <input
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-950 outline-none transition focus:border-amber-500"
                name="email"
                placeholder="teacher@example.com"
                required
                type="email"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-zinc-800">権限</span>
              <select
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-950 outline-none transition focus:border-amber-500"
                defaultValue="teacher"
                name="role"
              >
                <option value="teacher">教師</option>
                <option value="admin">管理者</option>
              </select>
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800">
              <input
                className="h-4 w-4 rounded border-zinc-300 text-amber-700 focus:ring-amber-500"
                defaultChecked
                name="active"
                type="checkbox"
              />
              有効な教師として登録する
            </label>

            <div className="pt-2">
              <button
                className="rounded-full bg-amber-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-800"
                type="submit"
              >
                教師を登録
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
