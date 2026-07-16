# MARGIN MOS → Notion Sync セットアップ

> **重要:** Notion Tokenや実ページIDをREADME、コード、JSON、Issue、コミットへ書かないでください。`.env.example`をコピーして作る実ファイルはGit管理外です。初回は必ずdry-runを使用し、既存Notionの構造を人間が確認するまでapplyしません。

## 1. Notion Developer Portalで接続を作る

NotionのDeveloper PortalでInternal Integrationを作成し、MARGIN専用だと分かる名前を付けます。

## 2. Capabilitiesを設定する

dry-runにはRead content、applyにはInsert contentとUpdate contentが必要です。不要な権限は付けません。

## 3. MARGIN OSページを共有する

Notionで同期先となる「MARGIN OS」ルートページを開き、接続を明示的に追加します。接続へ共有されていないページはAPIから404として見えることがあります。

## 4. NOTION_TOKENを取得する

Developer PortalからIntegration Secretを取得します。画面共有、チャット、ログへ貼り付けません。

## 5. ルートページIDを確認する

MARGIN OSページURLからページIDを確認します。推測せず、対象ページであることをタイトルと親階層で再確認します。

## 6. GitHub Secretsへ登録する

Repository Settings → Secrets and variables → Actionsで次を登録します。

- `NOTION_TOKEN`
- `NOTION_ROOT_PAGE_ID`

Variable `NOTION_API_VERSION` は省略可能です。未設定時は`2026-03-11`を使います。

## 7. ローカル環境を作る

`.env.example`を`.env.local`へコピーし、値をローカルだけに設定します。本CLIは秘密情報を自動読込しないため、PowerShellセッションへ明示的に設定してください。

```powershell
$env:NOTION_TOKEN = "<secret>"
$env:NOTION_ROOT_PAGE_ID = "<page-id>"
$env:NOTION_DRY_RUN = "true"
$env:NOTION_SYNC_MODE = "dry-run"
```

## 8. 設定確認

```powershell
npm run notion:check
```

マニフェスト、文書、環境変数、NotionルートページへのRead accessだけを確認します。

## 9. ローカルdry-run

```powershell
npm run notion:dry-run
```

管理対象セクションの追加・更新・変更なしを表示します。Notionへ書き込みません。

## 10. GitHub Actionsでdry-run

Actions → MARGIN MOS Notion Sync → Run workflowで`mode=dry-run`、`target=all`を選びます。Summaryの対象文書、警告、エラーを確認します。

## 11. 確認後にapply

`mode=apply`、`confirm_apply=true`を同時に指定した手動実行だけがapplyできます。最初は1つのdocument idをtargetにし、管理範囲外のメモが保持されることを確認します。

## 12. ロールバック

1. GitHubで直前のMOS文書へ戻すコミットを作る。
2. dry-runで差分を確認する。
3. 対象documentだけapplyする。
4. 緊急時はNotionのページ履歴から復元する。

同期処理は未知のブロックや子ページを削除しません。`replace_managed_section`でも、MARGIN MOSの開始・終了Calloutに挟まれたブロックだけを更新します。
