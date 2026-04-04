import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireSession } from "@/lib/auth/session";
import { syncTeacherAuthUser } from "@/lib/auth/teachers";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireSession();
  const linkedTeacher = await syncTeacherAuthUser({
    id: session.user.id,
    email: session.user.email,
  });

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-12">
        <header className="flex flex-col gap-4 rounded-3xl bg-white p-8 shadow-sm sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">
              Dashboard
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
              ログインに成功しました
            </h1>
            <p className="text-sm leading-6 text-zinc-600">
              Clerk のセッションを確認し、教師テーブルとの紐付け状態を表示しています。
            </p>
          </div>
          <SignOutButton />
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-3xl bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-950">認証ユーザー</h2>
            <dl className="mt-6 space-y-4 text-sm">
              <div className="rounded-2xl border border-zinc-200 p-4">
                <dt className="text-zinc-500">ユーザー ID</dt>
                <dd className="mt-1 break-all font-medium text-zinc-950">
                  {session.user.id}
                </dd>
              </div>
              <div className="rounded-2xl border border-zinc-200 p-4">
                <dt className="text-zinc-500">メールアドレス</dt>
                <dd className="mt-1 font-medium text-zinc-950">
                  {session.user.email}
                </dd>
              </div>
              <div className="rounded-2xl border border-zinc-200 p-4">
                <dt className="text-zinc-500">メール確認状態</dt>
                <dd className="mt-1 font-medium text-zinc-950">
                  {session.user.emailVerified ? "確認済み" : "未確認"}
                </dd>
              </div>
            </dl>
          </article>

          <aside className="rounded-3xl bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-950">教師データ連携</h2>

            {linkedTeacher.status === "linked" ? (
              <dl className="mt-6 space-y-4 text-sm">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <dt className="text-emerald-700">連携状態</dt>
                  <dd className="mt-1 font-semibold text-emerald-950">
                    紐付け済み
                  </dd>
                </div>
                <div className="rounded-2xl border border-zinc-200 p-4">
                  <dt className="text-zinc-500">教師メール</dt>
                  <dd className="mt-1 font-medium text-zinc-950">
                    {linkedTeacher.teacher.email}
                  </dd>
                </div>
                <div className="rounded-2xl border border-zinc-200 p-4">
                  <dt className="text-zinc-500">ロール</dt>
                  <dd className="mt-1 font-medium text-zinc-950">
                    {linkedTeacher.teacher.role}
                  </dd>
                </div>
                <div className="rounded-2xl border border-zinc-200 p-4">
                  <dt className="text-zinc-500">アクティブ</dt>
                  <dd className="mt-1 font-medium text-zinc-950">
                    {linkedTeacher.teacher.active ? "有効" : "無効"}
                  </dd>
                </div>
              </dl>
            ) : null}

            {linkedTeacher.status === "inactive" ? (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                <p className="font-semibold">この教師アカウントは無効化されています。</p>
                <p className="mt-2">
                  ログイン自体は成功していますが、管理者が有効化するまで利用できません。
                </p>
              </div>
            ) : null}

            {linkedTeacher.status === "missing" ? (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                <p className="font-semibold">教師テーブルに一致するメールが見つかりません。</p>
                <p className="mt-2">
                  {linkedTeacher.email} を `teachers.email` に登録してください。
                </p>
              </div>
            ) : null}

            {linkedTeacher.status === "conflict" ? (
              <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-900">
                <p className="font-semibold">
                  この教師メールには別の Auth ユーザー ID が紐付いています。
                </p>
                <p className="mt-2 break-all">
                  既存の `auth_user_id`: {linkedTeacher.existingAuthUserId}
                </p>
              </div>
            ) : null}
          </aside>
        </section>

        <div className="mt-8 text-sm text-zinc-600">
          <Link className="font-medium text-emerald-700 hover:text-emerald-800" href="/">
            ログイン画面に戻る
          </Link>
        </div>
      </main>
    </div>
  );
}
