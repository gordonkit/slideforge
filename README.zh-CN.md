# SlideForge

[![CI](https://github.com/gordonkit/slideforge/actions/workflows/ci.yml/badge.svg)](https://github.com/gordonkit/slideforge/actions/workflows/ci.yml)
[![Node.js 24+](https://img.shields.io/badge/node-24%2B-5FA04E?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/gordonkit/slideforge/blob/main/LICENSE)
[![Development Status: Pre-Alpha](https://img.shields.io/badge/status-pre--alpha-orange.svg)](https://github.com/gordonkit/slideforge/blob/main/CHANGELOG.md)

[English](https://github.com/gordonkit/slideforge/blob/main/README.md) ·
[繁體中文](https://github.com/gordonkit/slideforge/blob/main/README.zh-TW.md) ·
[日本語](https://github.com/gordonkit/slideforge/blob/main/README.ja.md)

[文档网站](https://slideforge.gordonkit.com/zh-CN/overview/)

SlideForge 是适合 AI 使用、以本机为主的框架，从经过验证的 JSON、React 组件与 HTML/CSS
生成风格一致的演示文稿，并导出可编辑的 PowerPoint 文字与图形。

**第一阶段：** 精简的 Node.js 24+、ESM、strict TypeScript 框架，使用 React 19、Vite 8、
Playwright Chromium 与 `dom-to-pptx` **2.1.2**。它不是在线编辑器，也不保证与 Office 的
渲染结果像素级一致。

## 快速入门

在此仓库中，以 Node.js 24 以上运行：

```sh
PUPPETEER_SKIP_DOWNLOAD=true npm ci
npx playwright install --with-deps chromium
npm run build

# 创建含六种版式的完整示例，以及它的图片目录。
node dist/cli/index.js init presentation.json
node dist/cli/index.js build presentation.json --output presentation.html
node dist/cli/index.js preview presentation.json --port 5180
```

打开 <http://127.0.0.1:5180/>。保存 JSON 后页面会自动刷新，幻灯片也会缩放到适合窗口大小；按 Ctrl+C 停止预览。在另一个终端运行：

```sh
node dist/cli/index.js export presentation.json --output presentation.pptx
node dist/cli/index.js validate presentation.pptx
```

`init [file]` 默认创建 `presentation.json`，不会覆盖已有文件。它会把示例图片复制到 JSON 旁边的
`<JSON 文件名>-assets/diagram.svg` 并改写图片路径；默认会创建 `presentation-assets/diagram.svg`，
请让这个目录与 JSON 放在一起。示例包含封面、内容、双栏、卡片、表格与图表幻灯片，以及英文／繁体中文
文字、图片、页脚与备注。完整内容请见 [示例 JSON](examples/basic/presentation.json)。

构建出的 HTML 使用指向 JSON 目录的 `file://` `<base>` 来加载相对路径的素材，因此**不是可移植、
自包含的文件**：搬到其他电脑或通过 HTTP 发布时，需要调整素材 URL 或 base。预览则是在本机
loopback 上提供 JSON 目录。导出 PPTX 时，支持格式的本机图片会在浏览器中内嵌为 data URL，其他图片
必须能以 anonymous CORS 解码。缺失、不支持或被 CORS 拦截的图片会明确报错，而不是被默默忽略。
这不会改写构建出的 HTML，也不会让它变得可移植。

## 编程使用

构建后，在仓库根目录保存为 `example.mjs`：

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

然后运行 `node example.mjs`。公开 API 另外还有 `previewPresentation` 与 `validateLayout`，
请见 [API 与架构](docs/architecture.md)。

## 文档

[文档网站](https://slideforge.gordonkit.com/zh-CN/overview/) 提供英文、繁体中文、简体中文与日文版本。
仓库内的详细参考文档（英文）：

- [CLI 用法](docs/cli.md)
- [JSON schema 参考](docs/schema.md)
- [Design tokens](docs/design-tokens.md)
- [组件与版式](docs/components.md)
- [架构、API 与上游参考](docs/architecture.md)
- [验证与可选的视觉比对](docs/validation.md)
- [限制与信任模型](docs/limitations.md)
- [AI 编写流程](docs/ai-workflow.md)
- [参与贡献](CONTRIBUTING.md)、[行为准则](CODE_OF_CONDUCT.md)、[安全策略](SECURITY.md)、
  [支持](SUPPORT.md) 与 [变更记录](CHANGELOG.md)
- [MIT 许可证](LICENSE) 与 [第三方许可声明](THIRD_PARTY_NOTICES.md)

## 范围与预期

第一阶段提供结构化编写、六种固定 16:9 版式、浅色／深色主题、HTML 渲染与预览、由浏览器驱动的 PPTX
导出、版面检查，以及离线 PPTX 结构检查。可选的视觉比对会通过外部的 LibreOffice Impress 与 Poppler
另外渲染 PPTX，并输出每页的 JSON 与差异图。图表是导出成文字与图形的 HTML/CSS 长条，
**不是 Office 原生图表对象**。转换器公开 API 不支持的 metadata，会在导出后写入 core-properties XML。

Unicode 会完整保留，但本机安装的字体**不保证会嵌入**。多语言演示文稿请安装合适的 CJK 字体，并在打开
演示文稿的电脑上使用相同字体。部分上游效果可能被转为位图；SlideForge 没有对不支持内容自动截图替代的功能。

后续阶段可能探索更丰富的编写方式、原生图表、更多版式、字体打包、Microsoft PowerPoint 原生渲染，
以及更完整的视觉回归自动化。这些是方向，不是已实现的功能或交付承诺。本项目未宣称做过手动
PowerPoint 兼容性测试，也不宣称像素级一致。

**请只导出受信任的 HTML 与 URL。** Chromium 会运行页面脚本，并可访问网络与该进程可用的本机资源。
本机预览不是隔离边界；此框架不是处理不受信任文件的多租户服务。
