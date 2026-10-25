# 進度紀錄

| 階段 | 狀態 | Commit |
| --- | --- | --- |
| Stage 0 計畫 | ✅ 完成 | `[Stage 0]` |
| Stage 1 Registry 重構 | ✅ 完成 | `[Stage 1]` |
| Stage 2 `family/variant` 命名 | ✅ 完成 | `[Stage 2]` |
| Stage 3 Cover variants | ✅ 完成 | `[Stage 3]` |
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

## Stage 2 — `family/variant` 命名與背景 key（2026-10-25）

- 完成：
  - `slideObject(family, variants, shape)`：`layout` 改為 `z.enum([family, "family/variant", …])`；每個 family 的 `variants` 只宣告一次。
  - registry：`layoutNames`、`layoutFamily`、`layoutVariant`、`slideVariant`、`unknownLayoutMessage`（已知 family 列出其 variant，否則列出 family）。
  - `LayoutName` 型別；`backgrounds` key 由 `layoutNames` 產生；`slideBackground` 依 slide → `family/variant` → family → default。
  - `Slide` 元件輸出 `sf-variant-<v>` 與 `data-variant`，`data-layout` 維持 family；新增選填 `variant` prop。renderer 收到 `variant`。
  - root export 名稱 helper 與型別。
  - 文件：`docs/schema.md`（Layout names、背景優先順序）、`docs/components.md`、`docs/architecture.md`（Layout names API）、CHANGELOG、`site/src/content.ts` 四語（slides 段落與背景優先順序）。
- 檢查：
  - `npm run check` → 通過；`npm --prefix site run check` → 通過。
  - `npm run test:unit` → 8 files / 99 tests 通過。修改既有測試 1 處：`content.test.tsx` 的 class 斷言改為含 `sf-variant-default` 與 `data-variant`（計畫允許）。
  - 範例 deck HTML 與 Stage 1 比對：去除 `sf-variant-default`/`data-variant="default"` 後完全相同。
  - `npm run test:integration` → 11 tests 通過。
  - 範例 deck export + validate → valid，6 slides，editableTextCount 35，shapeCount 52，無 issues（與 Stage 1 相同）。
- 偏離計畫：
  - `Slide` 元件新增選填 `variant` prop（計畫未列），供 Stage 4 由 template 決定 variant 時傳入。
  - 未建 site 的 site build（只跑 `site check`）。
- 待決／下一步：Stage 3（cover variants）。先確定 variant 名稱與視覺；需要時新增 token。

## Stage 3 — Cover variants（2026-10-25）

- 完成：
  - `cover` variants：`default`、`centered`（標題、副標、作者置中）、`split`（右側 640px 強調色 panel；slide 右 padding 與 footer 右緣讓出 736px）、`band`（header 往上、往兩側延伸到 slide 邊緣，accent 底色、on-accent 文字；標題位置與 content 高度不變）。
  - `CoverLayout` 在 `split` 時輸出 `aria-hidden` 的 `.sf-cover-panel`；其他 variant 不新增元素（band 用 header 本身的底色）。
  - 新 token：`layoutTokens["cover-panel"] = 640`。
  - 新範例 `examples/variants/presentation.json`（四種 cover variant）。
  - 測試：unit（variant class、只有 split 有 panel、cover/table 的未知 variant 訊息）；integration（export variants 範例：除字型外無 layout issue、每頁可編輯文字數相同、split/band 各多 1 個 shape）。
  - 文件：`docs/schema.md`（variant 表）、`docs/design-tokens.md`（cover-panel 與 split/band 幾何）、`docs/components.md`、`docs/limitations.md`、README 四語、CHANGELOG、site 四語（功能列表、slides 段落）。
- 檢查：
  - `npm run check` → 通過；`npm --prefix site run check` 與 `run build` → 通過。
  - `npm run test:unit` → 100 tests 通過。
  - `npm run test:integration` → 12 tests 通過。
  - `examples/variants` export + validate → valid，4 slides，editableTextCount 20（每頁 5），shapeCount 26，export 無 layout issue。
  - 目視：HTML 截圖（淺色、深色）與 LibreOffice 將 PPTX 轉成 PDF 的結果一致；panel 與 band 為原生形狀、文字可編輯。PowerPoint 本身未測。
- 偏離計畫：
  - 計畫原本說在 `examples/basic` 加一張；改為另建 `examples/variants`，避免改動 init 範本與「六張投影片」的既有測試與文件。
- 待決／下一步：Stage 4（template schema 與合併）。
