# Ver.11 Step1.1

今回の変更範囲は profiles 表示対応のみです。

- ユーザー一覧を Supabase の profiles から取得
- 予定追加画面の社内メンバー一覧を profiles から表示
- 名前・メールで検索
- 予定追加ボタンが開くことを維持

今回追加していないもの：外部業者、通知、Realtime、図面添付、PWA。

## 起動

1. 以前の `.env.local` をこのフォルダ直下へコピー
2. `npm install`
3. `npm run dev`
