# SlideForge

[![CI](https://github.com/gordonkit/slideforge/actions/workflows/ci.yml/badge.svg)](https://github.com/gordonkit/slideforge/actions/workflows/ci.yml)
[![Node.js 24+](https://img.shields.io/badge/node-24%2B-5FA04E?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/gordonkit/slideforge/blob/main/LICENSE)
[![Development Status: Pre-Alpha](https://img.shields.io/badge/status-pre--alpha-orange.svg)](https://github.com/gordonkit/slideforge/blob/main/CHANGELOG.md)

[English](https://github.com/gordonkit/slideforge/blob/main/README.md) ·
[繁體中文](https://github.com/gordonkit/slideforge/blob/main/README.zh-TW.md) ·
[简体中文](https://github.com/gordonkit/slideforge/blob/main/README.zh-CN.md)

[ドキュメント](https://slideforge.gordonkit.com/ja/overview/)

SlideForge は、AI での利用を想定したローカル中心のフレームワークです。検証済みの JSON、React
コンポーネント、HTML/CSS から一貫性のあるプレゼンテーションを作成し、編集可能な PowerPoint の
テキストと図形として書き出します。

**フェーズ 1：** Node.js 24 以降、ESM、strict TypeScript による最小構成のフレームワークで、
React 19、Vite 8、Playwright Chromium、`dom-to-pptx` **2.1.2** を使います。ホスト型のエディターでは
なく、Office での描画がピクセル単位で一致することも保証しません。

## npm からインストール

バージョン 0.1.0 以降、SlideForge は `slideforge` という名前で npm に公開されています。自分の
プロジェクトで、Node.js 24 以降を使って実行します。

```sh
npm install slideforge
npx playwright install --with-deps chromium

npx slideforge init presentation.json --template corporate
npx slideforge preview presentation.json
npx slideforge export presentation.json --output presentation.pptx
```

インストール時に Chromium はダウンロードされないため、`playwright install` はマシンごとに一度
実行します。`--with-deps` は Linux に必要なシステムライブラリも入れるもので、Windows と macOS
では省略できます。使われるのは SlideForge が依存する Playwright のバージョンです。ライブラリ
API は `slideforge` からインポートします。

## クイックスタート

SlideForge 自体を開発する場合は、このリポジトリで、Node.js 24 以降を使って実行します。

```sh
PUPPETEER_SKIP_DOWNLOAD=true npm ci
npx playwright install --with-deps chromium
npm run build

# レイアウトファミリーごとに 1 枚ずつのサンプルと、その画像ディレクトリを作成します。
node dist/cli/index.js init presentation.json
node dist/cli/index.js build presentation.json --output presentation.html
node dist/cli/index.js preview presentation.json --port 5180
```

<http://127.0.0.1:5180/> を開きます。JSON を保存するとページが自動で再読み込みされ、スライドは
ウィンドウに合わせて縮小表示されます。Ctrl+C でプレビューを停止します。別のターミナルで次を実行します。

```sh
node dist/cli/index.js export presentation.json --output presentation.pptx
node dist/cli/index.js validate presentation.pptx
```

`init [file]` の既定は `presentation.json` で、既存のファイルは上書きしません。サンプル画像を
JSON の隣の `<JSON のファイル名>-assets/diagram.svg` にコピーし、画像のパスを書き換えます。既定では
`presentation-assets/diagram.svg` が作成されるので、このディレクトリは JSON と一緒に保ってください。
サンプルには表紙、本文、2 列、カード、表、グラフのスライドと、英語・繁体字中国語のテキスト、画像、
フッター、ノートが含まれます。全体は [サンプル JSON](examples/basic/presentation.json) を参照してください。

ビルドした HTML は、相対パスの素材を読み込むために JSON のディレクトリを指す `file://` の `<base>` を
使います。そのため**持ち運び可能な自己完結型のファイルではありません**。別の端末に移す場合や HTTP で
公開する場合は、素材の URL や base の扱いを変更する必要があります。プレビューは JSON のディレクトリを
ループバックで配信します。PPTX の書き出し時、対応形式のローカル画像はブラウザ内で data URL として
埋め込まれ、それ以外の画像は anonymous CORS でデコードできる必要があります。見つからない画像、未対応の
画像、CORS で拒否された画像は、黙って省略されずに明確なエラーになります。これはビルドした HTML を
書き換えたり、持ち運び可能にしたりするものではありません。

## プログラムからの利用

ビルド後、リポジトリのルートに `example.mjs` として保存します。

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

続けて `node example.mjs` を実行します。公開 API には `previewPresentation` と `validateLayout` も
あります。[API とアーキテクチャ](docs/architecture.md) を参照してください。

## ドキュメント

[ドキュメントサイト](https://slideforge.gordonkit.com/ja/overview/) は英語、繁体字中国語、簡体字中国語、
日本語で提供しています。リポジトリ内の詳細なリファレンス（英語）は次のとおりです。

- [CLI の使い方](docs/cli.md)
- [JSON スキーマのリファレンス](docs/schema.md)
- [テンプレート](docs/templates.md)
- [デザイントークン](docs/design-tokens.md)
- [コンポーネントとレイアウト](docs/components.md)
- [アーキテクチャ、API、上流の参考資料](docs/architecture.md)
- [検証と任意の視覚比較](docs/validation.md)
- [制限と信頼モデル](docs/limitations.md)
- [AI による作成ワークフロー](docs/ai-workflow.md)
- [コントリビュート](CONTRIBUTING.md)、[行動規範](CODE_OF_CONDUCT.md)、
  [セキュリティポリシー](SECURITY.md)、[サポート](SUPPORT.md)、[変更履歴](CHANGELOG.md)
- [Apache-2.0 ライセンス](LICENSE)、[NOTICE](NOTICE)、[サードパーティーライセンス表示](THIRD_PARTY_NOTICES.md)

## 範囲と前提

フェーズ 1 は、構造化された作成、固定の 16:9 レイアウトファミリーとバリアント、ライト／ダークのテーマ、内容を変えずに見た目を切り替えるデータだけのテンプレート（`init --template corporate`）、HTML の描画と
プレビュー、ブラウザ経由の PPTX 書き出し、レイアウト検査、オフラインの PPTX 構造検査を提供します。
任意の視覚比較では、外部の LibreOffice Impress と Poppler で PPTX を別途描画し、スライドごとの JSON と
差分画像を書き出します。グラフはテキストと図形として書き出される HTML/CSS のバーであり、
**Office ネイティブのグラフオブジェクトではありません**。変換器の公開 API が対応していないメタデータは、
書き出し後に core-properties XML へ書き込みます。

Unicode は保持されますが、ローカルにインストールしたフォントの**埋め込みは保証されません**。多言語の
デッキには適切な CJK フォントをインストールし、デッキを開く端末でも同じフォントを使ってください。上流の
一部の効果はラスター化される場合があります。SlideForge には未対応の内容を自動でスクリーンショットに
置き換える機能はありません。

今後のフェーズでは、より豊かな作成手段、ネイティブのグラフ、追加のレイアウト、フォントのパッケージ化、
Microsoft PowerPoint ネイティブでの描画、より広い視覚回帰の自動化を検討する可能性があります。これらは
方向性であり、実装済みの機能や提供の約束ではありません。PowerPoint での手動互換性テストやピクセル単位の
一致は主張していません。

**信頼できる HTML と URL だけを書き出してください。** Chromium はページのスクリプトを実行し、そのプロセスが
利用できるネットワークとローカルのリソースにアクセスできます。ループバックのプレビューは分離の境界では
なく、このフレームワークは信頼できない文書を扱うマルチテナントのサービスではありません。
