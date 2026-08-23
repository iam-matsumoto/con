# Supabase接続手順（Ver.8 Step 1）

この版は、まずSupabaseプロジェクトへの接続確認まで行います。既存データはまだLocalStorageに保存されるため、接続設定に失敗しても今の機能は壊れません。

## 1. Supabaseでプロジェクトを作成

1. Supabaseにログイン
2. `New project` を選択
3. Project name、Database password、Regionを設定
4. 作成完了まで待つ

## 2. URLとPublishable Keyを設定

1. Supabase Dashboardの `Project Settings` → `API` を開く
2. Project URLとPublishable Keyを確認
3. このプロジェクト直下の `.env.example` をコピーして `.env.local` に名前変更
4. 値を書き換える

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxx
```

注意：`service_role`キーはブラウザアプリに絶対に入れないでください。

## 3. データベースを作成

1. Supabase Dashboardの `SQL Editor` を開く
2. `supabase/schema.sql` の内容をすべて貼り付ける
3. `Run` を押す

## 4. 接続確認

```powershell
npm install
npm run dev
```

管理者でログインし、`設定` → `クラウド同期（Supabase）` → `接続を確認` を押します。

「接続済み」と表示されればStep 1完了です。

## 次のStep

- Supabase Authへログインを移行
- LocalStorageの予定・社員・現場・お知らせをSupabaseへ移行
- リアルタイム同期を有効化
