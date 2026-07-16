# Codex Workflow

Codexはmainへ直接実装せず、指定ブランチとDraft PRを使います。

- 開始時に作業ツリー、ブランチ、既存差分を確認する。
- 正本データを先に更新し、HTMLへ情報を重複させない。
- Validation、静的検査、ブラウザ検証、GitHub Checksを証拠として残す。
- 認証情報、個人情報、affiliate URL全文をログへ出さない。
- 失敗を成功として報告せず、人間に残る確認事項を明記する。
- commit、push後もDraftを維持し、mainへのマージは人間の判断とする。

参照元: `README.md`、Phase 1〜8の開発履歴。最終レビュー: 2026-07-16。
