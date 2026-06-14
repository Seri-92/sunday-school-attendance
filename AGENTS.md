<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ドメインルール

- 生徒の学年は、生徒本人の属性として扱う。
- クラスは、年度ごとの出席管理上の所属として扱う。
- 学年とクラスは基本的には対応するが、必ずしも一致しなくてよい。不一致はドメイン上の不整合ではない。
- クラス画面からの生徒登録では、開いているクラスに登録する。入力された学年は生徒本人の属性として保存する。
- 生徒情報の通常編集では、ユーザーがクラスを意識しなくてよいように、入力された学年から通常の所属クラスを自動で決める。
- 例外的なクラス所属の調整は、通常操作とは分けて扱う。
