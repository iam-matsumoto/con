# Ver.11 Step1.3 — 外部業者（会社名＋人数）

今回追加したのは外部業者だけです。

- 予定追加・編集画面に「外部業者」を追加
- 入力項目は会社名と人数のみ
- 人数は大きな − / ＋ ボタンで変更
- 1つの予定に複数の外部業者を追加可能
- 外部業者はログインユーザーではなく通知対象にもなりません
- Supabase の schedules.external_contractors(JSONB) に保存
- 既存の profiles / 予定保存処理は維持

## 先に実行するSQL
Supabase SQL Editorで以下を一度だけ実行してください。

`supabase/ver11_step1_3_external_contractors.sql`

## 起動
前バージョンで使っていた `.env.local` をこのフォルダ直下へコピーしてから:

```powershell
npm install
npm run dev
```

## 確認
1. 予定を追加する
2. 社内メンバーを選択する
3. 外部業者の会社名を入力する
4. − / ＋ で人数を設定して「追加」
5. 予定を保存する
6. F5で更新しても外部業者が残っていることを確認する
