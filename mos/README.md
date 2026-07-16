# MARGIN Operating System

MOSは、MARGINのブランド、編集、商品、制作、学習のルールをGitHubで履歴管理する運営文書です。現段階ではGitHubを正本候補とし、Notionには管理対象セクションだけを安全に同期します。

## 原則

- 公開サイトのデータ正本は引き続き `data/articles.json` と `data/products.json` とする。
- MOSは運用判断の正本候補であり、既存 `docs/` を削除しない。
- Notionの人間メモ、未知のブロック、子ページを無断で削除しない。
- dry-runを先に実行し、人間の確認なしにapplyしない。
- トークン、ページ本文、アフィリエイトURL全文を同期ログへ出さない。

## 更新フロー

Phase設計 → Codex実装 → Validation → Preview → 人間レビュー → 修正 → MOS更新 → Ready for review → main merge

## 参照元

`README.md`、`docs/`、`data/articles.json`、`data/products.json`、`scripts/validate-products.mjs`。最終レビュー: 2026-07-16。
