# 進度紀錄

| 階段 | 狀態 | Commit |
| --- | --- | --- |
| Stage 0 計畫 | ✅ 完成 | `[Stage 0]` |
| Stage 1 Registry 重構 | ⏳ 未開始 | |
| Stage 2 `family/variant` 命名 | ⏳ 未開始 | |
| Stage 3 Cover variants | ⏳ 未開始 | |
| Stage 4 Template schema 與合併 | ⏳ 未開始 | |
| Stage 5 Template 載入與 CLI | ⏳ 未開始 | |
| Stage 6 新 family（選做） | ⏳ 未開始 | |

每筆紀錄格式：

```text
## Stage N — 標題（YYYY-MM-DD）
- 完成：…
- 檢查：指令 → 結果（通過/失敗與摘要）
- 偏離計畫：…（無則寫「無」）
- 待決／下一步：…
```

---

## Stage 0 — 計畫（2026-10-25）

- 完成：建立分支 `feat/layout-registry-templates`；撰寫 `.plan/README.md`、`plan.md`、本檔。
- 檢查：只有文件，未執行建置或測試。
- 偏離計畫：無。
- 待決／下一步：開始 Stage 1。開始前先記錄重構前範例 deck 的 `build` HTML 輸出（存於 scratchpad，不 commit），作為比對基準。
