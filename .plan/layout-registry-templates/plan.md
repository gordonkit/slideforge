# Layout registry 與 template 計畫

- 分支：`feat/layout-registry-templates`
- 建立：2026-10-25
- 進度：見 [progress.md](progress.md)

## 目標

1. **內容與外觀分離**：`presentation.json` 只放內容；配色、字型、token、背景、版面變化由 template 提供，換 template 不用改內容。
2. **Layout 可持續擴充**：layout 以 `family/variant` 命名，新增 layout 或 variant 只需新增一個資料夾並登錄到 registry，不必改散落各處的 `switch`、union 與 key 清單。
3. **向後相容**：現有 JSON（`"layout": "cover"` 等六種、`theme`、`fontFamily`、`backgrounds`）的輸出行為不變。

## 非目標（本計畫不做）

- 第三方或外部載入的 layout 程式碼（如 `acme:cover/x`）；只支援 repo 內建的 layout。
- Template 帶任意 CSS 或任意 HTML。
- Template marketplace、遠端 template 下載。
- 原生 Office 圖表、像素級轉換保證。

## 設計決策

### D1. 命名：`family/variant`

- 名稱格式：`^[a-z][a-z0-9-]*(?:/[a-z][a-z0-9-]*)?$`，例如 `cover`、`cover/split`。
- **family** 決定 schema（欄位）；**variant** 只決定呈現，不能新增欄位。
- 需要新欄位 → 新 family，或在 family 加選填欄位；不可做成 variant。
- 每個 family 都有 `default` variant；bare 名稱 `cover` 表示「未指定 variant」，由 template 決定，沒有 template 時用 `default`。`cover/default` 也合法且明確指定。

### D2. Schema：保留輸入字串，由 registry 產生 enum

- `slideSchema` 仍為 `z.discriminatedUnion("layout", …)`；每個 family 的 discriminator 改為 `z.enum([family, "family/variant", …])`（Zod 4 支援 enum discriminator）。
- 解析後 `slide.layout` 保持使用者寫的字串，不改寫，確保 `parsePresentation` 可重複套用。
- 提供 `layoutFamily(name)`、`layoutVariant(name)` helper；程式內分派一律用 family。
- 未知名稱的錯誤訊息由 registry 列出所有合法名稱。
- 型別推論需維持：registry 以 `as const` tuple 定義，確保 `z.infer` 仍是精確 union。若 TypeScript 推論無法維持，退回手動列出 family 的 union，但 variant 清單仍由 registry 產生（於 progress 記錄）。

### D3. Registry 結構

```text
src/layouts/
  registry.ts            每個 family 的定義集合、名稱 helper、查表 render
  index.tsx              SlideLayout：查表分派（取代 switch）
  cover/
    schema.ts            family 欄位（Zod shape）
    render.tsx           React component（收 slide 與 variant）
    variants.ts          variant 清單，第一個為 default
    cover.css            只用 token 的樣式；variant 以 .sf-variant-<name> 區分
  content/ two-columns/ cards/ table/ chart/
```

- 共用欄位（title、subtitle、footer、notes、background）與 content block 仍在 `src/schemas/presentation.ts`。
- CSS：共用部分留在 `src/themes/slides.css`，各 family 的 CSS 在 build 時合併；`npm run build` 的複製步驟與 `src/renderers/html.tsx` 讀取方式要跟著改。
- 輸出標記：`class="sf-slide sf-layout-<family> sf-variant-<variant>"`、`data-layout="<family>"`、`data-variant="<variant>"`。既有 `sf-layout-<family>` class 與 `data-layout` 值不變。

### D4. 背景 key

- `backgrounds` 的 key 由 registry 產生：`default`、每個 family、每個 `family/variant`。
- 優先順序：slide `background` → `backgrounds["family/variant"]` → `backgrounds[family]` → `backgrounds.default`（之後 template 的 backgrounds 接在 presentation 之後，見 D6）。
- variant 以「實際套用的 variant」計（含 template 指定的預設 variant）。

### D5. Template 內容（只有資料）

`templates/<name>/template.json`：

```json
{
  "name": "corporate",
  "theme": "dark",
  "palette": { "accent": "#f5a524" },
  "fontFamily": "Noto Sans TC, Arial, sans-serif",
  "tokens": { "type": { "title": 64 }, "border": { "radius": 0 } },
  "backgrounds": { "default": "assets/plain.svg", "cover": "https://bg.gordonkit.com/studio#d=…" },
  "variants": { "cover": "band", "content": "default" }
}
```

- strict Zod schema；`palette` 的 key 與 `themeTokens` 相同、值為 `#rrggbb`；`palette` 套在 `theme` 選定的那組之上。
- `tokens` 只能覆寫既有 group/key、數值有上下限；覆寫後須滿足垂直區塊不變式（`padding-top + header + content + padding-bottom = 1080`，cover 同理），否則報錯。
- `variants` 的 key 必須是 family、值必須是該 family 已登錄的 variant。
- template 內的相對資源路徑相對於 template 目錄解析。

### D6. Template 載入與優先順序

- `presentation.json` 新增選填 `template`：
  - 以 `./`、`../` 開頭 → 相對於 JSON 檔的目錄；
  - 其他 → 內建 template 名稱（`templates/<name>/`，隨 npm 套件發佈）。
- 核心 `renderPresentation(input, options)` 保持純函式：新增 `options.template`（已載入的 template 物件與其 base URL）。讀檔由新的 loader（例如 `loadPresentation(path)`）負責，CLI、preview、export 共用。
- 合併優先順序（高到低）：slide 自身 → presentation 層 → template → 內建預設。
  - `theme`、`fontFamily`、`backgrounds` 在 presentation 層有值時覆蓋 template。
  - variant：slide 寫明 `family/variant` → template `variants[family]` → `default`。
- preview 也要監看 template 目錄。

## 階段

每階段結束條件都包含：`npm run check`、`npm run test:unit` 通過；涉及輸出時再跑 `npm run build` 與 `npm run test:integration`，並用範例 deck 實際 export 檢查 layout issues 與結構報告。結果照實記錄在 progress.md。

### Stage 0 — 計畫

- 產出：`.plan/README.md`、本檔、`progress.md`。
- Commit：`[Stage 0] Add layout registry and template plan`

### Stage 1 — Registry 重構（行為不變）

- 把六個 layout 搬進 `src/layouts/<family>/`（schema、render、css、variants 只有 `default`）。
- `slideSchema`、`backgrounds` key、`SlideLayout` 分派、錯誤訊息改由 registry 產生。
- CSS 拆分與 build 合併；確認 `dist/` 內容與 renderer 讀取正常。
- 驗收：
  - 既有 unit/integration 測試不修改即通過（只允許調整與檔案路徑有關的部分，需記錄）。
  - 範例 deck 的 HTML 輸出與重構前相同（比對 `build` 產出的 HTML；只接受 CSS 規則順序以外零差異，差異需記錄理由）。
  - 新增 registry 單元測試：名稱清單、錯誤訊息列出合法名稱。
- 文件：`docs/architecture.md` source map；`CONTRIBUTING.md` 加「如何新增 layout」。使用者可見行為無變化，site 不用改。
- Commit：`[Stage 1] Move layouts into a registry without changing output`

### Stage 2 — `family/variant` 命名與背景 key

- 名稱解析 helper、schema enum、`data-variant` 與 `sf-variant-*` 輸出。
- `backgrounds` 接受 `family/variant` key，依 D4 解析；`slideBackground` 更新。
- 此階段每個 family 只有 `default`，所以合法的新名稱只有 `<family>/default`。
- 驗收：unit 測試涵蓋名稱解析、非法名稱、背景優先順序；既有輸出除了新增的 `sf-variant-default` class / `data-variant` 屬性外不變。
- 文件：`docs/schema.md`、`docs/components.md`（若描述標記）、CHANGELOG、`site/src/content.ts` 四種語言。
- Commit：`[Stage 2] Name layouts as family/variant`

### Stage 3 — 第一批 variant（cover）

- 新增 `cover/split`、`cover/centered`、`cover/band`（最終名稱與數量在此階段確認後記錄）。
- 只用 token 與既有 CSS 能力，不新增 schema 欄位。
- 每個 variant 都有 example fixture；export 後 layout validation 無 error，結構報告正常，editable text 數量與 `cover` 一致。
- `examples/basic` 是否加入 variant 示範：加一張即可，避免 init 範本過長。
- 文件：`docs/schema.md` layout 目錄、`docs/design-tokens.md`（若新增 token）、`docs/limitations.md`、README 中「六種 layout」措辭、site 四種語言、CHANGELOG。
- Commit：`[Stage 3] Add cover variants`

### Stage 4 — Template schema 與合併（核心）

- `src/templates/`：template Zod schema、token 覆寫驗證（D5 不變式）、合併函式（D6 優先順序）。
- `renderPresentation(input, { template })`；`RenderOptions` 擴充。
- variant 預設由 template 決定；背景解析加入 template 層。
- 驗收：unit 測試涵蓋每條優先順序、非法 token、不變式失敗、非法 variant；沒有 template 的輸出與 Stage 3 相同。
- 文件：`docs/schema.md`（template 章節）、`docs/design-tokens.md`（可覆寫的 token 與限制）、`docs/architecture.md`（API）、CHANGELOG。site 可延到 Stage 5 一起更新。
- Commit：`[Stage 4] Add template schema and merging`

### Stage 5 — Template 載入、內建 template 與 CLI

- `presentation.json` 的 `template` 欄位；loader 解析路徑或內建名稱，template 資源以 template 目錄為基準。
- CLI `build`/`preview`/`export` 使用 loader；preview 監看 template 目錄；`init --template <name>`。
- 內建 template：`default`（等同現狀）與一個示範（如 `corporate`），隨套件發佈（`package.json` 的 `files`）。
- Docker 映像確認能使用內建 template 與 `/work` 下的本地 template。
- 驗收：integration 測試涵蓋本地與內建 template 的 build/export；找不到 template 時錯誤訊息清楚。
- 文件：`docs/cli.md`、`docs/schema.md`、`docs/limitations.md`、`docs/ai-workflow.md`、README（四語）、site 四種語言、CHANGELOG。
- Commit：`[Stage 5] Load templates from files and add built-in templates`

### Stage 6（選做）— 驗證 family 擴充

- 新增一個 family（如 `section` 或 `quote`）驗證「新增資料夾 + 登錄」流程確實足夠，並依實際經驗修正 CONTRIBUTING 的步驟。
- Commit：`[Stage 6] Add <family> layout`

## 風險

| 風險 | 對策 |
| --- | --- |
| registry 動態產生 schema 使 TypeScript 型別退化 | D2 的 `as const` tuple；不行就退回手動 family union |
| CSS 拆分改變規則順序導致樣式差異 | Stage 1 比對 HTML 與 export 結果 |
| variant 在 HTML 正常、PPTX 跑版 | 每個 variant 必須 export 驗證；只用 token 與既有 CSS 能力 |
| token 覆寫破壞 layout validator 前提 | D5 的範圍限制與不變式檢查 |
| 四語文件不同步 | 每階段驗收列出要改的文件；site 與 `docs/` 同一個 commit |
