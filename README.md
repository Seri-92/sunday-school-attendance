# Sunday School Attendance

日曜学校の出席管理アプリです。現在は Neon + PostgreSQL + Drizzle に加えて、Clerk のメール OTP 認証を導入しています。

## セットアップ

1. `.env.example` を参考に `.env.local` を作成し、Neon の接続文字列を `DATABASE_URL` に設定する
2. Clerk の `publishable key` を `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` に設定する
3. Clerk の `secret key` を `CLERK_SECRET_KEY` に設定する
4. migration を生成・適用する
5. seed を流す

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Neon / Clerk で必要なこと

1. Neon で開発用プロジェクトを作成する
2. 接続先 DB の connection string を取得する
3. `.env.local` に `DATABASE_URL=...` として保存する
4. Clerk でアプリケーションを作成し、Email address の Email code を有効化する
5. `.env.local` に Clerk のキーを保存する
6. ローカル開発は常にその開発用 DB を使う

本番用 DB は別プロジェクト、または別 branch / database として分離してください。

## DB 構成

以下のテーブルを Phase 1 で管理します。

- `teachers`
- `school_years`
- `classes`
- `students`
- `student_class_assignments`
- `attendance_dates`
- `attendance_records`

`teachers` には Clerk ユーザーとの紐付け用に `auth_user_id` を持たせています。`role`、`grade_code`、`assignment_type` は DB 上で型を固定しています。出席 `status` は未確定要件が残っているため、現時点では文字列として保持します。

## Seed の前提

`pnpm db:seed` は開発用のサンプルデータ投入用です。現在は次のサンプルを投入します。

- 年度: `2026年度`
- 教師: admin 1 名、teacher 2 名
- クラス: 幼稚園、小学 1 年、中学 1 年
- 生徒: 4 名
- 出席日: 2 週分

seed は既存データを削除して入れ直すので、開発用 DB でのみ実行してください。

## 認証フロー

- トップページでメールアドレスを入力すると、Clerk から認証コードを送信します
- 受信した 6 桁コードを入力すると `/dashboard` へ移動します
- 初回ログイン時に `teachers.email` 一致のレコードへ `auth_user_id` を保存します
- `teachers` に一致しないメールはダッシュボード上で案内表示します

## 動作確認

1. `pnpm db:migrate`
2. `pnpm db:seed`
3. `pnpm dev`
4. ブラウザで [http://localhost:3000](http://localhost:3000) を開く
5. `teacher@example.com` を入力して認証コードを送信する
6. 受信メールの 6 桁コードを入力し、`/dashboard` へ到達することを確認する
7. `teachers.auth_user_id` に Clerk の user id が保存されていることを確認する
