# Ver.11 Step1 予定追加ボタン修正版

予定追加ボタンを押した際に、Step1では削除済みの外部業者用stateを呼び出していたため、JavaScriptエラーでモーダルが表示されない問題を修正しました。

修正箇所: `src/App.tsx` の `openAddSchedule()`
