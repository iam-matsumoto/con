# Ver.11 Step2.1 - Microsoft Teams タブ対応

このバージョンでは、現在のReactアプリをMicrosoft Teamsの「個人用タブ」として開けるようにするためのTeamsアプリパッケージ生成機能を追加しています。

## 重要

Teamsから開くには、アプリを **HTTPSでインターネット公開** する必要があります。
`localhost` や `192.168.x.x` のURLはTeams本番タブでは使えません。

## 1. まず今まで通り動作確認

`.env.local` を前バージョンからコピーしてから:

```powershell
npm install
npm run dev
```

既存の予定・通知・Realtimeが壊れていないことを確認してください。

## 2. Webへ公開

Vercel / Azure Static Web Apps / Cloudflare Pages など、HTTPS URLが発行されるサービスへ公開します。

例:

```text
https://company-schedule-example.vercel.app
```

Supabase側で公開URLを使う場合は、AuthenticationのURL Configurationにも公開URLを追加してください。

## 3. TeamsアプリZIPを作る

PowerShellでプロジェクトフォルダを開き、公開URLを指定して実行します。

```powershell
$env:TEAMS_APP_URL="https://company-schedule-example.vercel.app"
npm run teams:package
```

または:

```powershell
npm run teams:package -- https://company-schedule-example.vercel.app
```

成功すると:

```text
teams-app/company-schedule-teams-app.zip
```

が生成されます。

## 4. Teamsへ追加

Teamsの「アプリ」からカスタムアプリをアップロードできる環境なら、生成された
`company-schedule-teams-app.zip` をアップロードします。

会社のMicrosoft 365管理設定でカスタムアプリのアップロードが禁止されている場合は、Microsoft 365 / Teams管理者側で許可が必要です。

## 5. 今回の範囲

Step2.1では **Teamsの中で今のWebアプリを開けるところまで** です。

まだ入れていないもの:

- TeamsアカウントでのSSO
- TeamsユーザーとSupabase profilesの自動紐付け
- Teamsチャネルへの通知投稿

これらは次のStep2.2以降で追加します。

## ファイル

- `teams-app/manifest.template.json` : Teams manifestテンプレート
- `teams-app/color.png` : Teamsカラーアイコン
- `teams-app/outline.png` : Teamsアウトラインアイコン
- `scripts/build-teams-package.mjs` : 公開URLを入れてTeamsアプリZIPを生成するスクリプト
