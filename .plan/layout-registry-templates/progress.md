# 進度紀錄

| 階段 | 狀態 | Commit |
| --- | --- | --- |
| Stage 0 計畫 | ✅ 完成 | `[Stage 0]` |
| Stage 1 Registry 重構 | ✅ 完成 | `[Stage 1]` |
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

## Stage 1 — Registry 重構（2026-10-25）

- 完成：
  - `src/schemas/fields.ts`：共用欄位 schema（xmlText、image/background source、content block、`slideObject(family, shape)`）。`presentation.ts` 改為從 registry 組出 `slideSchema`、`backgrounds` key 與未知 layout 錯誤訊息，並 re-export 原有公開 schema。
  - `src/layouts/<family>/{schema.ts,render.tsx,<family>.css}` × 6；`registry.ts`（`layouts` tuple、`LayoutFamily`、`layoutFamilies`、`quotedList`）；`types.ts`（`LayoutProps<F>`）；`index.tsx` 改為 mapped-type 查表（缺 renderer 會編譯失敗）並輸出 `layoutStylesheet`。
  - table 的「每列欄數」檢查從整個 union 的 `superRefine` 移到 table schema 本身。
  - build 改為複製 `src/**` 下所有非 TS 檔（即各 CSS）到 `dist/`。
  - 新增 `tests/unit/layouts.test.ts`（4 項）。
  - 文件：`docs/architecture.md` source map 與 build 說明、`docs/components.md`、`docs/design-tokens.md` 來源、`CONTRIBUTING.md`「Adding a layout family」。
- 檢查：
  - `npm run check` → 通過。
  - `npm run test:unit` → 8 files / 95 tests 通過（既有 91 項未修改即通過，新增 4 項）。
  - `npm run build` → 通過；`dist/layouts/<family>/<family>.css` 皆存在。
  - 範例 deck `build` HTML 與重構前比對：`<style>` 以外完全相同；CSS 規則集合相同，只有順序不同（family CSS 接在共用 CSS、`[hidden]`、`@media print` 之後）並多一行 content.css 註解。
  - `npm run test:integration` → 1 file / 11 tests 通過（約 30 秒）。
  - 範例 deck export + validate → valid，6 slides，editableTextCount 35，shapeCount 52，無 issues。
- 偏離計畫：
  - variant 清單寫在各 family 的 `schema.ts` 定義物件中，沒有另開 `variants.ts`（檔案較少，資訊集中）。
  - 新增 `src/layouts/types.ts` 與 `src/schemas/fields.ts`（避免 schema ↔ registry 循環 import）。
  - CSS 規則順序改變；已確認各規則 selector 特異度不互相依賴順序。
  - `quotedList` 兩項時輸出 `"a" or "b"`（不加逗號）；三項以上與原訊息相同。
- 備註：用 Write 工具寫入含 `\uXXXX` 的 regex 時，escape 被解碼成實際字元；已從原始檔還原兩行並以 grep 確認。之後涉及這類 regex 時，要從 git 原文複製或寫完後檢查。
- 待決／下一步：Stage 2（`family/variant` 命名與背景 key）。
