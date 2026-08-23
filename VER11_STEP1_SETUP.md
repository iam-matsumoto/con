# Ver.11 Step1 セットアップ

1. Supabase SQL Editorで `supabase/ver11_step1_profiles_participants.sql` を実行します。
2. `.env.local` にSupabase URLとPublishable Keyを設定します。
3. `npm install` → `npm run dev` を実行します。
4. ログイン後、設定画面の「マスターデータを読み込む」で `profiles` を取得します。

社員の追加・無効化はSupabase Authenticationと`profiles`で行います。アプリ内のユーザー一覧は閲覧専用です。
外部業者は予定ごとに「会社名＋人数」を登録し、人数は−／＋ボタンで変更できます。
