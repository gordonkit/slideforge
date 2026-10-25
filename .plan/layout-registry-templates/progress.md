# 進度紀錄

| 階段 | 狀態 | Commit |
| --- | --- | --- |
| Stage 0 計畫 | ✅ 完成 | `[Stage 0]` |
| Stage 1 Registry 重構 | ✅ 完成 | `[Stage 1]` |
| Stage 2 `family/variant` 命名 | ✅ 完成 | `[Stage 2]` |
| Stage 3 Cover variants | ✅ 完成 | `[Stage 3]` |
| Stage 4 Template schema 與合併 | ✅ 完成 | `[Stage 4]` |
| Stage 5 Template 載入與 CLI | ✅ 完成 | `[Stage 5]` |
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

## Stage 4 — Template schema 與合併（2026-10-25）

- 完成：
  - `src/templates/schema.ts`：`templateSchema`（strict；`name`、`description`、`palette.{light,dark}`、`fontFamily`、`tokens`、`backgrounds`、`variants`）、`parseTemplate`、`mergeTokens`。token 只開放數值、依 group 設上下限；合併後檢查 5 條幾何規則（主垂直加總 = 1080、cover 垂直 ≤ 1080、cover-top ≤ cover-header、footer 在 padding-bottom 內、split panel 寬度）。
  - `tokens.ts`：`cssVariables(tokens)`、`DesignTokens` 型別；`designCssVariables` 改用它（輸出不變）。
  - `presentation.ts`：export `backgroundsSchema`、`fontFamilySchema`；`slideBackground(presentation, slide, template?)`，以「同 key 由 presentation 覆蓋 template」合併後再依序查找。
  - `slideVariant(slide, defaults?)`；`SlideLayout` 接收 `variant`。
  - `renderPresentation(input, { template })`：palette、字型、token、variant、背景依優先順序套用。
  - 測試：`tests/unit/templates.test.ts` 22 項。
  - 文件：新增 `docs/templates.md`；`docs/architecture.md`（RenderOptions、source map）、`docs/design-tokens.md`、`docs/schema.md`、README 四語文件列表、CHANGELOG。
- 檢查：
  - `npm run check` → 通過。
  - `npm run test:unit` → 122 tests 通過。
  - `npm run build` → 通過。沒有 template 時：variants 範例 HTML 與 Stage 3 位元組相同；basic 範例與 Stage 2 的差異只有 Stage 3 新增的 cover variant CSS 與 `--sf-layout-cover-panel`。
  - API 實測：basic 範例套用示範 template（amber palette、title 64、radius 0、header 200/content 724、cover → band），Chromium `validateLayout` → 0 issues，截圖確認生效。
  - integration 未重跑：此階段沒有改 CLI/exporter，而且沒有 template 時 HTML 與前一階段相同。
- 偏離計畫：
  - **D5 修改**：template 不含 `theme`。原因：presentation 的 `theme` 在 parse 時預設為 `"light"`，無法分辨作者是否寫了 theme；若改成無預設值，會破壞公開 API 與既有測試。改為 `palette.light` / `palette.dark` 各自覆寫，由 presentation 的 `theme` 選擇。
  - **D6 細化**：背景是「同 key 合併」，而不是「presentation 整串查完才查 template」；所以 template 的 `cover` 背景不會被 presentation 的 `default` 蓋掉（已寫入 docs/templates.md）。
  - site 延到 Stage 5 與 JSON/CLI 載入一起更新（計畫允許）。
- 待決／下一步：Stage 5。重點：template 相對路徑資源的解析（export 用 file URL；preview 需由 Vite 提供 template 目錄，如 `/@fs/` 或另設路徑）、內建 template 隨套件發佈、`init --template`、Docker。

## Stage 5 — Template 載入、內建 template 與 CLI（2026-10-26）

- 完成：
  - `presentation.json` 新增選填 `template`（`templateReferenceSchema`：內建名稱，或 `./`、`../` 路徑；不接受反斜線與絕對路徑）。
  - `src/templates/load.ts`：`loadTemplate(reference, from)`（路徑可指向 `.json` 或含 `template.json` 的資料夾；內建在套件 `templates/<name>/`）、`builtInTemplates()`、`loadPresentation(file)`、`fileRenderOptions(file, loaded)`。錯誤訊息：找不到檔案、未知內建名稱（列出可用名稱）、JSON 格式錯誤、schema 問題（沿用 presentation 的逐行格式，抽出 `describeSchemaError`）。
  - `renderPresentation` 新增 `templateBaseUrl`；template 的相對背景以它為基準。presentation 寫了 `template` 卻沒傳入 template 時丟出說明性錯誤（renderer 不讀檔）。
  - CLI：`build`、`export`、`preview` 都經 loader；`init --template <name|./path>` 先載入驗證、再寫入；`--template` 用在其他指令時回傳 exit 2。
  - preview：每次 `/` 都重新載入 template，並監看 template 檔與資料夾；template 圖片以 `/@slideforge/template/` 提供（只允許圖片副檔名，有路徑穿越防護）。
  - 內建 template：`default`（不覆寫任何值）、`corporate`（navy/amber 雙主題 palette、radius 0、`cover: band`、`assets/rule.svg` 當預設背景）。`package.json` 的 `files` 加入 `templates`；Dockerfile 與 `Dockerfile.dockerignore` 也加入 `templates`。
  - 測試：unit 新增 8 項（reference 格式、templateBaseUrl、loader 各種成功與錯誤）；integration 新增 2 項（內建 template 的 init/build/export 與錯誤 exit code；本地 template 的 export 背景與 preview 資源服務、穿越與非圖片 404）。
  - 文件：`docs/templates.md`（使用方式、資源、API）、`docs/schema.md`、`docs/cli.md`、`docs/architecture.md`、`docs/limitations.md`（信任模型）、`docs/ai-workflow.md`、`docker/README.md`、README 四語、CHANGELOG、site 四語（CLI init、presentation 欄位、新增 Templates 段落、themes、cover 列）。
- 檢查：
  - `npm run check` → 通過；`npm --prefix site run check`／`build` → 通過。
  - `npm test`（unit + integration + visual）→ 11 files / 143 tests 通過。
  - CLI 實測：`init --template corporate` → build → export → validate：valid，6 slides，editableTextCount 35，shapeCount 47（有背景層的 slide 少了 converter 的整頁色塊，band 多 1 個）。LibreOffice 轉 PDF 目視：band 封面、template 資產的 amber 線、方角卡片、palette 皆正確。
  - Docker：`docker compose … run --rm --build cli export /work/corp.json` → 成功，validate 結果同上；容器內 `init --template corporate` 成功。
- 偏離計畫：
  - 第一次 Docker build 失敗，因為 `docker/Dockerfile.dockerignore` 採白名單、沒有 `templates/`；已補上。
  - Git Bash 會把 `/work/...` 參數改寫成 Windows 路徑，Docker 指令要加 `MSYS_NO_PATHCONV=1`（只影響本機測試指令，文件中的範例不變）。
  - build／export 產生的 HTML 以絕對 `file:` URL 引用 template 圖片（已在 docs 說明：built HTML 綁定本機）。
- 待決／下一步：Stage 6（選做：新增一個 family 驗證擴充流程）。合併前決定 `.plan/` 是否保留。
