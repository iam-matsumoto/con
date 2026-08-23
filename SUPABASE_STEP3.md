# Ver.9 Step3 セットアップ

1. SupabaseのSQL Editorを開く。
2. `supabase/step3_master_data.sql` を全部貼り付けてRunする。
   - 今回作ったテーブルが空の状態で実行してください。
   - UUID型で作った空テーブルを、アプリが使うbigint型へ作り直します。
3. `.env.local` を前バージョンからコピーする。
4. `npm install`、`npm run dev` で起動する。
5. 管理者ログイン後、設定 → クラウド同期から、まず「社員・現場・お知らせを移行」、次に「このPCの予定をクラウドへ移行」を押す。

以後、社員・現場・お知らせ・予定の追加、編集、削除がSupabaseに保存されます。
