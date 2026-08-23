# Ver.11 Step1 profiles対応のみ

今回追加した内容は次の2点だけです。

1. 社員一覧を `public.profiles` から読み込む
2. 予定登録の社内メンバーを `profiles.id`（UUID）で選択する

外部業者、通知、Realtime、図面添付はまだ追加していません。

## 手順

1. Supabase SQL Editorで `supabase/ver11_step1_profiles_only.sql` を実行
2. `.env.local` をVer.10と同じ内容で配置
3. `npm install`
4. `npm run dev`
5. 管理者でログインし「ユーザー一覧」を開く
6. 予定追加画面で社内メンバーを選択できることを確認
