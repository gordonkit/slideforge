# SlideForge

[![CI](https://github.com/gordonkit/slideforge/actions/workflows/ci.yml/badge.svg)](https://github.com/gordonkit/slideforge/actions/workflows/ci.yml)
[![Node.js 24+](https://img.shields.io/badge/node-24%2B-5FA04E?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/gordonkit/slideforge/blob/main/LICENSE)
[![Development Status: Pre-Alpha](https://img.shields.io/badge/status-pre--alpha-orange.svg)](https://github.com/gordonkit/slideforge/blob/main/CHANGELOG.md)

[English](https://github.com/gordonkit/slideforge/blob/main/README.md) ·
[简体中文](https://github.com/gordonkit/slideforge/blob/main/README.zh-CN.md) ·
[日本語](https://github.com/gordonkit/slideforge/blob/main/README.ja.md)

[文件網站](https://slideforge.gordonkit.com/zh-TW/overview/)

SlideForge 是適合 AI 使用、以本機為主的框架，從經過驗證的 JSON、React 元件與 HTML/CSS
產生風格一致的簡報，並匯出可編輯的 PowerPoint 文字與圖形。

**第一階段：** 精簡的 Node.js 24+、ESM、strict TypeScript 框架，使用 React 19、Vite 8、
Playwright Chromium 與 `dom-to-pptx` **2.1.2**。它不是線上編輯器，也不保證與 Office 的
排版結果像素級一致。

## 快速入門

在此 repository 中，以 Node.js 24 以上執行：

```sh
PUPPETEER_SKIP_DOWNLOAD=true npm ci
npx playwright install --with-deps chromium
npm run build

# 建立含六種版型的完整範例，以及它的圖片目錄。
node dist/cli/index.js init presentation.json
node dist/cli/index.js build presentation.json --output presentation.html
node dist/cli/index.js preview presentation.json --port 5180
```

開啟 <http://127.0.0.1:5180/>。儲存 JSON 後頁面會自動更新，投影片也會縮放到符合視窗大小；按 Ctrl+C 停止預覽。在另一個終端機執行：

```sh
node dist/cli/index.js export presentation.json --output presentation.pptx
node dist/cli/index.js validate presentation.pptx
```

`init [file]` 預設建立 `presentation.json`，不會覆寫既有檔案。它會把範例圖片複製到 JSON 旁邊的
`<JSON 檔名>-assets/diagram.svg` 並改寫圖片路徑；預設會建立 `presentation-assets/diagram.svg`，
請讓這個目錄與 JSON 放在一起。範例包含封面、內容、雙欄、卡片、表格與圖表投影片，以及英文／繁體中文
文字、圖片、頁尾與備忘稿。完整內容請見 [範例 JSON](examples/basic/presentation.json)。

建置出的 HTML 使用指向 JSON 目錄的 `file://` `<base>` 來載入相對路徑的素材，因此**不是可攜、
自成一體的檔案**：搬到其他電腦或透過 HTTP 發布時，需要調整素材 URL 或 base。預覽則是在本機
loopback 上提供 JSON 目錄。匯出 PPTX 時，支援格式的本機圖片會在瀏覽器中內嵌為 data URL，其他圖片
必須能以 anonymous CORS 解碼。遺失、不支援或被 CORS 擋下的圖片會明確報錯，而不是被默默略過。
這不會改寫建置出的 HTML，也不會讓它變得可攜。

## 程式化使用

建置後，在 repository 根目錄存成 `example.mjs`：

```js
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  parsePresentation,
  renderPresentation,
  exportPresentation,
  validatePptx,
} from './dist/index.js';

const file = resolve('examples/basic/presentation.json');
const presentation = parsePresentation(JSON.parse(await readFile(file, 'utf8')));
const html = renderPresentation(presentation, {
  baseUrl: pathToFileURL(dirname(file) + '/').href,
});
await writeFile('presentation.html', html);
const issues = await exportPresentation(file, { output: 'presentation.pptx' });
console.log(issues);
const report = validatePptx(await readFile('presentation.pptx'));
console.log(report);
if (!report.valid) process.exitCode = 1;
```

然後執行 `node example.mjs`。公開 API 另外還有 `previewPresentation` 與 `validateLayout`，
請見 [API 與架構](docs/architecture.md)。

## 文件

[文件網站](https://slideforge.gordonkit.com/zh-TW/overview/) 提供英文、繁體中文、簡體中文與日文版本。
repository 內的詳細參考文件（英文）：

- [CLI 用法](docs/cli.md)
- [JSON schema 參考](docs/schema.md)
- [Design tokens](docs/design-tokens.md)
- [元件與版型](docs/components.md)
- [架構、API 與上游參考](docs/architecture.md)
- [驗證與選用的視覺比對](docs/validation.md)
- [限制與信任模型](docs/limitations.md)
- [AI 撰寫流程](docs/ai-workflow.md)
- [參與貢獻](CONTRIBUTING.md)、[行為準則](CODE_OF_CONDUCT.md)、[安全性政策](SECURITY.md)、
  [支援](SUPPORT.md) 與 [變更紀錄](CHANGELOG.md)
- [MIT 授權](LICENSE) 與 [第三方授權聲明](THIRD_PARTY_NOTICES.md)

## 範圍與預期

第一階段提供結構化撰寫、六種固定 16:9 版型系列（封面有四種變化）、淺色／深色主題、HTML 排版與預覽、由瀏覽器驅動的 PPTX
匯出、版面檢查，以及離線 PPTX 結構檢查。選用的視覺比對會透過外部的 LibreOffice Impress 與 Poppler
另外轉出 PPTX 畫面，並輸出每頁的 JSON 與差異圖。圖表是匯出成文字與圖形的 HTML/CSS 長條，
**不是 Office 原生圖表物件**。轉換器公開 API 不支援的 metadata，會在匯出後寫入 core-properties XML。

Unicode 會完整保留，但本機安裝的字型**不保證會嵌入**。多語言簡報請安裝合適的 CJK 字型，並在開啟
簡報的電腦上使用相同字型。部分上游效果可能被轉為點陣圖；SlideForge 沒有對不支援內容自動截圖替代的功能。

後續階段可能探索更豐富的撰寫方式、原生圖表、更多版型、字型打包、Microsoft PowerPoint 原生排版，
以及更完整的視覺回歸自動化。這些是方向，不是已實作的功能或交付承諾。本專案未宣稱做過手動
PowerPoint 相容性測試，也不宣稱像素級一致。

**請只匯出受信任的 HTML 與 URL。** Chromium 會執行頁面腳本，並可存取網路與該程序可用的本機資源。
本機預覽不是隔離邊界；此框架不是處理不受信任文件的多租戶服務。
