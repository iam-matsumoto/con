# Ver.10 Step1（Supabase認証＋RLS）

## 1. SQLを実行
Supabase → SQL Editor で `supabase/ver10_step1_auth_rls.sql` を全部実行します。

## 2. 最初の管理者を作成
Supabase → Authentication → Users → Add user で、管理者のメールアドレスとパスワードを作成します。

作成したユーザーを開いて UUID をコピーし、SQL Editorで次を実行します。

```sql
insert into public.profiles (id, email, display_name, role, active)
values ('ここにUUID', '管理者メールアドレス', '管理者', 'admin', true);
```

## 3. 一般社員を追加
Authenticationでユーザー作成後、同じようにprofilesへ追加します。

```sql
insert into public.profiles (id, email, display_name, role, active)
values ('ここにUUID', '社員メールアドレス', '社員名', 'employee', true);
```

## 4. 起動
`.env.local` はVer.9のものをそのままコピーできます。

```powershell
npm install
npm run dev -- --host
```

## 確認
- ログアウト中はデータを取得できません。
- employeeは閲覧できますが、追加・編集・削除はDB側で拒否されます。
- adminは追加・編集・削除できます。
