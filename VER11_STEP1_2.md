# Ver.11 Step1.2 - 予定のSupabase保存

## 今回の変更だけ
- ログイン後に `schedules` をSupabaseから自動読み込み
- 予定追加時にSupabaseへ保存
- 選択社員は `profile_ids uuid[]` として保存
- 予定編集・削除もSupabaseへ反映
- PC/スマホで再読み込みしても同じ予定を取得

## 最初に1回だけ
Supabase SQL Editorで `supabase/ver11_step1_2_schedule_save.sql` を実行してください。

## 今回まだ入れていないもの
- 外部業者
- 通知
- Realtime（開いたままの画面への即時反映）
- 図面添付
- Teams化

※ 別端末では、ログインまたはページ再読み込み時に最新予定を取得します。Realtimeは後のStepで追加します。
