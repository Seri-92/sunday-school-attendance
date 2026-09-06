# Sunday School Attendance

日曜学校の出席管理アプリです。現在は Neon + PostgreSQL + Drizzle に加えて、Clerk のメール OTP 認証を導入しています。

## セットアップ

1. `.env.example` を参考に `.env.local` を作成し、Neon の接続文字列を `DATABASE_URL` に設定する
2. Clerk の `publishable key` を `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` に設定する
3. Clerk の `secret key` を `CLERK_SECRET_KEY` に設定する
4. LINE Messaging API のチャネルアクセストークンと、先生グループのIDをそれぞれ `LINE_CHANNEL_ACCESS_TOKEN`、`LINE_ATTENDANCE_GROUP_ID` に設定する
5. `CRON_SECRET` に16文字以上のランダムな文字列を設定する
6. migration を生成・適用する
7. seed を流す

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

## 出席入力リマインド

Vercel Cron は毎週日曜 21:00（日本時間）に `/api/cron/attendance-reminder` を呼び出します。Vercel Hobby では実行時刻が最大59分程度ずれることがあります。

当日について、各クラスの全生徒の出欠、幼小科・中学科の保護者人数、中学科のその他人数のいずれかが未保存であれば、先生グループへ「9月6日の日曜学校の出席を入力してください。」のように対象の日付入りで送信します。保存済みの0人も入力済みです。LINE公式アカウントを先生グループに参加させ、Webhookで取得したグループIDを `LINE_ATTENDANCE_GROUP_ID` に設定してください。

催促後は、出欠（中学科のその他人数を含む）・保護者人数の保存が成功した後に、その日曜分の完了を確認します。すべてそろえば「9月6日の日曜学校の出席入力が完了しています。」と1回だけ送信します。月曜以降の保存にも対応し、催促前の入力完了では通知しません。追加の定期チェックはありません。

`attendance_notifications` に年度・日付・通知種別ごとの送信記録を残します。一意制約と行ロックで同時保存を制御し、送信前に記録したUUIDをLINEの再送キーとして使います。送信済みの通知は訂正保存やCron再実行でも送りません。送信先と文言も記録時の値で固定します。

通信障害・5xxでは3秒のタイムアウトと0.5秒の待機を挟み、1回だけ再試行します。失敗しても出席の保存は取り消しません。送信記録は未送信のまま残り、同じ日曜分の次の保存でも再試行します。障害後に保存がなければ自動復旧はしません。LINEの再送キーの有効期間（24時間）を超える重複送信を避けるため、記録作成から23時間以上経った未送信通知は自動送信を止め、Vercelログにエラーを残します。必要時はグループの履歴を確認して手動で連絡してください。LINEの受理を送信済みとし、既読や端末への到達は確認しません。

### 反映手順

通知履歴テーブルを追加するmigration `0011_loud_bastion.sql` を先に適用し、その後に新コードをデプロイします。

```bash
pnpm db:migrate       # 開発用DB
pnpm db:migrate:prod  # 本番用DB（接続先を確認して実行）
```

旧実装で送った催促は履歴に含まれません。完了通知の対象になるのは新実装で記録した催促からです。切り替えた週のCronを手動再実行すると、旧実装ですでに送った催促をもう一度送る可能性があります。

本番デプロイ時には、VercelのProduction環境変数にも `CRON_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN`、`LINE_ATTENDANCE_GROUP_ID` を設定してください。`CRON_SECRET` はVercelがCron呼び出し時に自動で付与するBearerトークンの照合に使います。

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
