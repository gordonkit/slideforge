export type Locale = "en" | "zh-TW" | "zh-CN" | "ja";

export type Text = Record<Locale, string>;

/** A table cell is either literal text shared by every locale, such as code, or translated text. */
export type Cell = string | Text;

export type Section = {
  id: string;
  title: Text;
  body: Text;
  bodyLink?: {
    label: Text;
    href: string;
  };
  code?: string;
  bullets?: Record<Locale, string[]>;
  note?: Text;
  links?: Array<{
    label: Text;
    href: string;
  }>;
  interfaces?: Array<{
    title: Text;
    label: Text;
    body: Text;
    example: string;
  }>;
  table?: {
    caption: Text;
    headers: Cell[];
    rows: Cell[][];
  };
};

export type Page = {
  id: string;
  category: "getting-started" | "authoring" | "reference" | "project";
  title: Text;
  heading?: Text;
  summary: Text;
  sections: Section[];
};

export const repositoryUrl = "https://github.com/gordonkit/slideforge";

export function cellText(cell: Cell, locale: Locale): string {
  return typeof cell === "string" ? cell : cell[locale];
}

export const categories = [
  { id: "getting-started", label: { en: "Getting Started", "zh-TW": "快速開始", "zh-CN": "快速开始", ja: "はじめに" } },
  { id: "authoring", label: { en: "Authoring", "zh-TW": "簡報撰寫", "zh-CN": "演示文稿编写", ja: "スライド作成" } },
  { id: "reference", label: { en: "Reference", "zh-TW": "參考資料", "zh-CN": "参考资料", ja: "リファレンス" } },
  { id: "project", label: { en: "Project", "zh-TW": "專案資訊", "zh-CN": "项目信息", ja: "プロジェクト" } },
] as const;

const yes: Text = { en: "Yes", "zh-TW": "是", "zh-CN": "是", ja: "はい" };
const no: Text = { en: "No", "zh-TW": "否", "zh-CN": "否", ja: "いいえ" };

export const pages: Page[] = [
  {
    id: "overview",
    category: "getting-started",
    title: { en: "Overview", "zh-TW": "總覽", "zh-CN": "概览", ja: "概要" },
    heading: { en: "SlideForge", "zh-TW": "SlideForge", "zh-CN": "SlideForge", ja: "SlideForge" },
    summary: {
      en: "Generate consistent, editable PowerPoint presentations from validated JSON, React components, and HTML/CSS.",
      "zh-TW": "以經過驗證的 JSON、React 元件與 HTML/CSS，產生風格一致且可編輯的 PowerPoint 簡報。",
      "zh-CN": "以经过验证的 JSON、React 组件与 HTML/CSS，生成风格一致且可编辑的 PowerPoint 演示文稿。",
      ja: "検証済みの JSON、React コンポーネント、HTML/CSS から、一貫性があり編集可能な PowerPoint プレゼンテーションを生成します。",
    },
    sections: [
      {
        id: "about-project",
        title: { en: "About this project", "zh-TW": "關於此專案", "zh-CN": "关于此项目", ja: "このプロジェクトについて" },
        body: {
          en: "SlideForge is an open-source GordonKit project. It renders structured slide content with a shared design system, previews it in the browser, and exports editable PowerPoint text and shapes through dom-to-pptx instead of a new conversion engine.",
          "zh-TW": "SlideForge 是 GordonKit 開源專案。它以共用的設計系統排版結構化的投影片內容，在瀏覽器中預覽，並透過 dom-to-pptx 匯出可編輯的 PowerPoint 文字與圖形，而不是另外打造轉換引擎。",
          "zh-CN": "SlideForge 是 GordonKit 开源项目。它以共用的设计系统排版结构化的幻灯片内容，在浏览器中预览，并通过 dom-to-pptx 导出可编辑的 PowerPoint 文字与图形，而不是另外打造转换引擎。",
          ja: "SlideForge は GordonKit オープンソースプロジェクトです。共通のデザインシステムで構造化されたスライド内容を組版し、ブラウザでプレビューし、独自の変換エンジンではなく dom-to-pptx を使って編集可能な PowerPoint のテキストと図形を書き出します。",
        },
        bodyLink: {
          label: { en: "open-source GordonKit project", "zh-TW": "GordonKit 開源專案", "zh-CN": "GordonKit 开源项目", ja: "GordonKit オープンソースプロジェクト" },
          href: repositoryUrl,
        },
      },
      {
        id: "interfaces",
        title: { en: "Ways to use it", "zh-TW": "使用方式", "zh-CN": "使用方式", ja: "利用方法" },
        body: {
          en: "Every interface runs the same pipeline: the strict schema, shared layouts and tokens, Chromium rendering, layout checks, and structural PPTX validation.",
          "zh-TW": "所有使用方式都走同一條流程：嚴格的 schema、共用的版型與 design tokens、Chromium 排版、版面檢查，以及 PPTX 結構驗證。",
          "zh-CN": "所有使用方式都走同一条流程：严格的 schema、共用的版式与 design tokens、Chromium 排版、版面检查，以及 PPTX 结构验证。",
          ja: "どの利用方法も同じパイプラインを通ります。厳格なスキーマ、共通のレイアウトとデザイントークン、Chromium による描画、レイアウト検査、PPTX の構造検証です。",
        },
        interfaces: [
          {
            title: { en: "CLI", "zh-TW": "CLI", "zh-CN": "CLI", ja: "CLI" },
            label: { en: "Terminal and automation", "zh-TW": "終端機與自動化", "zh-CN": "终端与自动化", ja: "ターミナルと自動化" },
            body: {
              en: "Create, build, preview, export, and validate decks from the terminal or a CI job.",
              "zh-TW": "在終端機或 CI 中建立、建置、預覽、匯出與驗證簡報。",
              "zh-CN": "在终端或 CI 中创建、构建、预览、导出与验证演示文稿。",
              ja: "ターミナルや CI ジョブから、デッキの作成、ビルド、プレビュー、書き出し、検証を行います。",
            },
            example: "node dist/cli/index.js export deck.json -o deck.pptx",
          },
          {
            title: { en: "Node.js API", "zh-TW": "Node.js API", "zh-CN": "Node.js API", ja: "Node.js API" },
            label: { en: "Application integration", "zh-TW": "應用程式整合", "zh-CN": "应用程序集成", ja: "アプリケーション統合" },
            body: {
              en: "Call typed functions to parse content, render HTML, start a preview, export PPTX, and read validation reports.",
              "zh-TW": "呼叫具型別的函式來解析內容、產生 HTML、啟動預覽、匯出 PPTX 並讀取驗證報告。",
              "zh-CN": "调用具类型的函数来解析内容、生成 HTML、启动预览、导出 PPTX 并读取验证报告。",
              ja: "型付きの関数で、内容の解析、HTML の生成、プレビューの起動、PPTX の書き出し、検証レポートの取得を行います。",
            },
            example: "await exportPresentation(file, { output })",
          },
          {
            title: { en: "AI authoring", "zh-TW": "AI 撰寫", "zh-CN": "AI 编写", ja: "AI による作成" },
            label: { en: "Coding agents", "zh-TW": "程式碼代理", "zh-CN": "编程代理", ja: "コーディングエージェント" },
            body: {
              en: "Agents write schema-valid JSON with approved layouts instead of arbitrary positioning, then run the same checks.",
              "zh-TW": "AI 代理依 schema 撰寫 JSON、使用核准的版型而非任意定位，再執行相同的檢查。",
              "zh-CN": "AI 代理依 schema 编写 JSON、使用核准的版式而非任意定位，再运行相同的检查。",
              ja: "エージェントは任意の配置ではなく承認済みのレイアウトでスキーマに沿った JSON を書き、同じ検査を実行します。",
            },
            example: "AGENTS.md · docs/ai-workflow.md",
          },
        ],
      },
      {
        id: "pipeline",
        title: { en: "Pipeline", "zh-TW": "處理流程", "zh-CN": "处理流程", ja: "パイプライン" },
        body: {
          en: "Content is validated before it is rendered, and the exported package is checked before it is written. The converter runs inside Chromium, not in a simulated DOM.",
          "zh-TW": "內容在排版前先經過驗證，匯出的檔案在寫入前也會檢查。轉換器在 Chromium 內執行，而不是模擬的 DOM。",
          "zh-CN": "内容在排版前先经过验证，导出的文件在写入前也会检查。转换器在 Chromium 内运行，而不是模拟的 DOM。",
          ja: "内容は描画前に検証され、書き出したパッケージは保存前に検査されます。変換は模擬 DOM ではなく Chromium の中で実行されます。",
        },
        code: `JSON → strict Zod schema → typed presentation
     → React static markup + shared CSS/tokens → HTML
     → Playwright Chromium → layout validation
     → bundled dom-to-pptx → PPTX bytes
     → text outlines, text box fitting, East Asian font, core metadata
     → structural validation → output file`,
      },
      {
        id: "scope",
        title: { en: "Phase 1 scope", "zh-TW": "第一階段範圍", "zh-CN": "第一阶段范围", ja: "フェーズ 1 の範囲" },
        body: {
          en: "Phase 1 is a minimal, local-first framework for Node.js 24 or newer. It includes:",
          "zh-TW": "第一階段是精簡、以本機為主的框架，需要 Node.js 24 以上，內容包括：",
          "zh-CN": "第一阶段是精简、以本机为主的框架，需要 Node.js 24 以上，内容包括：",
          ja: "フェーズ 1 は Node.js 24 以降向けの、ローカル中心の最小構成のフレームワークです。次を含みます。",
        },
        bullets: {
          en: [
            "Fixed 16:9 layout families with variants, light and dark themes, and data-only templates",
            "HTML rendering and a loopback Vite preview",
            "Browser-driven export to editable PowerPoint text and shapes",
            "Layout checks, offline PPTX structure checks, and optional visual comparison",
          ],
          "zh-TW": [
            "固定的 16:9 版型系列與變化、淺色與深色主題，以及純資料的範本",
            "HTML 輸出與僅限本機的 Vite 預覽",
            "由瀏覽器驅動、匯出可編輯 PowerPoint 文字與圖形",
            "版面檢查、離線 PPTX 結構檢查，以及選用的視覺比對",
          ],
          "zh-CN": [
            "固定的 16:9 版式系列与变体、浅色与深色主题，以及纯数据的模板",
            "HTML 输出与仅限本机的 Vite 预览",
            "由浏览器驱动、导出可编辑 PowerPoint 文字与图形",
            "版面检查、离线 PPTX 结构检查，以及可选的视觉比对",
          ],
          ja: [
            "バリアントを持つ固定の 16:9 レイアウトファミリー、ライトとダークのテーマ、データだけのテンプレート",
            "HTML の生成とループバックの Vite プレビュー",
            "ブラウザ経由で編集可能な PowerPoint のテキストと図形へ書き出し",
            "レイアウト検査、オフラインの PPTX 構造検査、任意の視覚比較",
          ],
        },
        note: {
          en: "Charts are editable bars and text, not native Office chart objects. SlideForge does not claim pixel-perfect conversion, and local fonts are not guaranteed to be embedded.",
          "zh-TW": "圖表是可編輯的長條與文字，不是 Office 原生圖表物件。SlideForge 不宣稱像素級一致的轉換，也不保證能嵌入本機字型。",
          "zh-CN": "图表是可编辑的长条与文字，不是 Office 原生图表对象。SlideForge 不宣称像素级一致的转换，也不保证能嵌入本机字体。",
          ja: "グラフは編集可能なバーとテキストであり、Office ネイティブのグラフオブジェクトではありません。SlideForge はピクセル単位で同一の変換をうたっておらず、ローカルフォントの埋め込みも保証しません。",
        },
      },
    ],
  },
  {
    id: "quickstart",
    category: "getting-started",
    title: { en: "Quickstart", "zh-TW": "快速入門", "zh-CN": "快速入门", ja: "クイックスタート" },
    summary: {
      en: "Install the toolchain, create the example deck with one slide per layout family, preview it, and export an editable PPTX.",
      "zh-TW": "安裝工具鏈，建立每個版型系列各一張的範例簡報，預覽後匯出可編輯的 PPTX。",
      "zh-CN": "安装工具链，创建每个版式系列各一张的示例演示文稿，预览后导出可编辑的 PPTX。",
      ja: "ツールチェーンをインストールし、レイアウトファミリーごとに 1 枚ずつのサンプルデッキを作成してプレビューし、編集可能な PPTX を書き出します。",
    },
    sections: [
      {
        id: "requirements",
        title: { en: "Requirements", "zh-TW": "需求", "zh-CN": "需求", ja: "必要なもの" },
        body: {
          en: "SlideForge runs locally. Prepare the following before you start:",
          "zh-TW": "SlideForge 在本機執行，開始前請準備：",
          "zh-CN": "SlideForge 在本机运行，开始前请准备：",
          ja: "SlideForge はローカルで動作します。始める前に次を用意してください。",
        },
        bullets: {
          en: [
            "Node.js 24 or newer and npm",
            "Playwright Chromium and its system libraries",
            "Fonts with the glyphs your deck needs, such as Microsoft JhengHei or Noto Sans CJK for Chinese",
          ],
          "zh-TW": [
            "Node.js 24 以上與 npm",
            "Playwright Chromium 及其系統函式庫",
            "具備簡報所需字形的字型，例如中文可用微軟正黑體或 Noto Sans CJK",
          ],
          "zh-CN": [
            "Node.js 24 以上与 npm",
            "Playwright Chromium 及其系统库",
            "具备演示文稿所需字形的字体，例如中文可用 Microsoft JhengHei 或 Noto Sans CJK",
          ],
          ja: [
            "Node.js 24 以降と npm",
            "Playwright Chromium とそのシステムライブラリ",
            "デッキに必要な字形を持つフォント（中国語なら Microsoft JhengHei や Noto Sans CJK など）",
          ],
        },
      },
      {
        id: "install-npm",
        title: { en: "Install from npm", "zh-TW": "從 npm 安裝", "zh-CN": "从 npm 安装", ja: "npm からインストール" },
        body: {
          en: "From version 0.1.0, SlideForge is published to npm as slideforge. Install it in your project, then install Playwright's Chromium once per machine; installing the package does not download it. --with-deps also installs the Linux system libraries and can be left out on Windows and macOS. The commands on this site use node dist/cli/index.js from a clone; with the package, run them as npx slideforge.",
          "zh-TW": "自 0.1.0 版起，SlideForge 以 slideforge 名稱發佈在 npm。在你的專案中安裝後，每台電腦要安裝一次 Playwright 的 Chromium；安裝套件時不會自動下載。--with-deps 會一併安裝 Linux 的系統函式庫，在 Windows 與 macOS 可以省略。本站的指令以 clone 後的 node dist/cli/index.js 示範；使用套件時改成 npx slideforge 即可。",
          "zh-CN": "自 0.1.0 版起，SlideForge 以 slideforge 名称发布在 npm。在你的项目中安装后，每台电脑要安装一次 Playwright 的 Chromium；安装包时不会自动下载。--with-deps 会一并安装 Linux 的系统库，在 Windows 与 macOS 可以省略。本站的命令以 clone 后的 node dist/cli/index.js 演示；使用包时改成 npx slideforge 即可。",
          ja: "バージョン 0.1.0 以降、SlideForge は slideforge という名前で npm に公開されています。プロジェクトにインストールしたら、Playwright の Chromium をマシンごとに一度インストールします。パッケージのインストール時にはダウンロードされません。--with-deps は Linux のシステムライブラリも入れるもので、Windows と macOS では省略できます。このサイトのコマンドはクローンした node dist/cli/index.js で示しています。パッケージでは npx slideforge として実行します。",
        },
        code: `npm install slideforge
npx playwright install --with-deps chromium
npx slideforge init presentation.json --template corporate
npx slideforge preview presentation.json`,
      },
      {
        id: "install",
        title: { en: "Build from source", "zh-TW": "從原始碼建置", "zh-CN": "从源码构建", ja: "ソースからビルド" },
        body: {
          en: "To work on SlideForge itself, clone the repository and build it. Skipping the Puppeteer download avoids a second browser; SlideForge launches Playwright's Chromium.",
          "zh-TW": "要開發 SlideForge 本身時，複製 repository 並建置。略過 Puppeteer 下載可避免多裝一套瀏覽器，SlideForge 使用的是 Playwright 的 Chromium。",
          "zh-CN": "要开发 SlideForge 本身时，克隆仓库并构建。跳过 Puppeteer 下载可避免多装一套浏览器，SlideForge 使用的是 Playwright 的 Chromium。",
          ja: "SlideForge 自体を開発する場合は、リポジトリをクローンしてビルドします。Puppeteer のダウンロードを省くと 2 つ目のブラウザを入れずに済みます。SlideForge は Playwright の Chromium を起動します。",
        },
        code: `git clone https://github.com/gordonkit/slideforge.git
cd slideforge
PUPPETEER_SKIP_DOWNLOAD=true npm ci
npx playwright install --with-deps chromium
npm run build`,
      },
      {
        id: "create",
        title: { en: "Create and preview a deck", "zh-TW": "建立並預覽簡報", "zh-CN": "创建并预览演示文稿", ja: "デッキの作成とプレビュー" },
        body: {
          en: "init copies the complete example and its image into presentation-assets/ next to the JSON. Preview serves the JSON directory on 127.0.0.1, reloads the browser whenever you save, and scales slides to fit the window.",
          "zh-TW": "init 會複製完整範例，並把圖片放到 JSON 旁邊的 presentation-assets/。預覽會在 127.0.0.1 提供 JSON 所在目錄，每次存檔都會自動重新整理瀏覽器，並把投影片縮放到符合視窗大小。",
          "zh-CN": "init 会复制完整示例，并把图片放到 JSON 旁边的 presentation-assets/。预览会在 127.0.0.1 提供 JSON 所在目录，每次保存都会自动刷新浏览器，并把幻灯片缩放到适合窗口大小。",
          ja: "init は完全なサンプルをコピーし、画像を JSON の隣の presentation-assets/ に置きます。プレビューは JSON のディレクトリを 127.0.0.1 で配信し、保存するたびにブラウザを自動で再読み込みし、スライドをウィンドウに合わせて縮小表示します。",
        },
        code: `node dist/cli/index.js init presentation.json
node dist/cli/index.js build presentation.json --output presentation.html
node dist/cli/index.js preview presentation.json --port 5180`,
      },
      {
        id: "export",
        title: { en: "Export and validate", "zh-TW": "匯出與驗證", "zh-CN": "导出与验证", ja: "書き出しと検証" },
        body: {
          en: "Export fails on layout errors and prints warnings. validate prints a JSON report with the slide count and editable text count.",
          "zh-TW": "遇到版面錯誤時匯出會失敗，警告則會列出。validate 會輸出 JSON 報告，包含投影片數與可編輯文字數。",
          "zh-CN": "遇到版面错误时导出会失败，警告则会列出。validate 会输出 JSON 报告，包含幻灯片数与可编辑文字数。",
          ja: "レイアウトエラーがあると書き出しは失敗し、警告は表示されます。validate はスライド数と編集可能なテキスト数を含む JSON レポートを出力します。",
        },
        code: `node dist/cli/index.js export presentation.json --output presentation.pptx
node dist/cli/index.js validate presentation.pptx`,
        note: {
          en: "A valid report is not proof of visual fidelity. Open important decks in PowerPoint before you deliver them.",
          "zh-TW": "報告有效不代表視覺上完全一致。重要的簡報在交付前請用 PowerPoint 開啟確認。",
          "zh-CN": "报告有效不代表视觉上完全一致。重要的演示文稿在交付前请用 PowerPoint 打开确认。",
          ja: "レポートが有効でも見た目の一致は証明されません。重要なデッキは納品前に PowerPoint で開いて確認してください。",
        },
      },
    ],
  },
  {
    id: "cli",
    category: "getting-started",
    title: { en: "CLI", "zh-TW": "CLI", "zh-CN": "CLI", ja: "CLI" },
    heading: { en: "CLI reference", "zh-TW": "CLI 參考", "zh-CN": "CLI 参考", ja: "CLI リファレンス" },
    summary: {
      en: "The slideforge command creates, builds, previews, exports, and validates presentations.",
      "zh-TW": "slideforge 指令可建立、建置、預覽、匯出與驗證簡報。",
      "zh-CN": "slideforge 命令可创建、构建、预览、导出与验证演示文稿。",
      ja: "slideforge コマンドで、プレゼンテーションの作成、ビルド、プレビュー、書き出し、検証を行います。",
    },
    sections: [
      {
        id: "commands",
        title: { en: "Commands", "zh-TW": "指令", "zh-CN": "命令", ja: "コマンド" },
        body: {
          en: "Build the repository first, then run the emitted entry point. Paths are relative to the current directory. -o aliases --output.",
          "zh-TW": "請先建置 repository，再執行產生的進入點。路徑相對於目前目錄，-o 等同 --output。",
          "zh-CN": "请先构建仓库，再运行生成的入口。路径相对于当前目录，-o 等同 --output。",
          ja: "先にリポジトリをビルドし、生成されたエントリーポイントを実行します。パスはカレントディレクトリからの相対です。-o は --output の別名です。",
        },
        table: {
          caption: { en: "CLI commands", "zh-TW": "CLI 指令", "zh-CN": "CLI 命令", ja: "CLI コマンド" },
          headers: [
            { en: "Command", "zh-TW": "指令", "zh-CN": "命令", ja: "コマンド" },
            { en: "Purpose", "zh-TW": "用途", "zh-CN": "用途", ja: "用途" },
          ],
          rows: [
            ["init [file] [--template t]", { en: "Copy the example (one slide per layout family) and its assets; never overwrites. --template names a template in the new JSON after checking it loads", "zh-TW": "複製範例（每個版型系列各一張）與素材，不會覆寫既有檔案。--template 會先確認範本可載入，再寫入新 JSON", "zh-CN": "复制示例（每个版式系列各一张）与素材，不会覆盖已有文件。--template 会先确认模板可加载，再写入新 JSON", ja: "サンプル（レイアウトファミリーごとに 1 枚）と素材をコピー。既存ファイルは上書きしない。--template は読み込めることを確認してから新しい JSON にテンプレートを指定" }],
            ["build <json> [-o html]", { en: "Validate JSON and write an HTML document with inline CSS", "zh-TW": "驗證 JSON 並輸出內嵌 CSS 的 HTML", "zh-CN": "验证 JSON 并输出内嵌 CSS 的 HTML", ja: "JSON を検証し、CSS をインラインにした HTML を出力" }],
            ["preview <json> [--port n]", { en: "Serve a loopback Vite preview that reloads on save, port 5180 by default", "zh-TW": "啟動僅限本機、存檔即自動更新的 Vite 預覽，預設連接埠 5180", "zh-CN": "启动仅限本机、保存即自动刷新的 Vite 预览，默认端口 5180", ja: "保存時に自動で再読み込みするループバックの Vite プレビューを起動。既定のポートは 5180" }],
            ["export <input> -o pptx", { en: "Export JSON, local HTML, or a trusted URL to PPTX", "zh-TW": "將 JSON、本機 HTML 或受信任的 URL 匯出為 PPTX", "zh-CN": "将 JSON、本机 HTML 或受信任的 URL 导出为 PPTX", ja: "JSON、ローカル HTML、信頼できる URL を PPTX に書き出し" }],
            ["validate <pptx>", { en: "Print an offline structural report as JSON", "zh-TW": "以 JSON 輸出離線結構檢查報告", "zh-CN": "以 JSON 输出离线结构检查报告", ja: "オフラインの構造レポートを JSON で出力" }],
          ],
        },
      },
      {
        id: "export-input",
        title: { en: "Export input", "zh-TW": "匯出來源", "zh-CN": "导出来源", ja: "書き出しの入力" },
        body: {
          en: "Slides are found with [data-pptx=\"slide\"], .slide by default. Use --selector for your own trusted HTML. The output directory must already exist.",
          "zh-TW": "預設以 [data-pptx=\"slide\"], .slide 找出投影片。自訂的受信任 HTML 可用 --selector 指定。輸出目錄必須已經存在。",
          "zh-CN": "默认以 [data-pptx=\"slide\"], .slide 找出幻灯片。自定义的受信任 HTML 可用 --selector 指定。输出目录必须已经存在。",
          ja: "既定では [data-pptx=\"slide\"], .slide でスライドを探します。独自の信頼できる HTML には --selector を使います。出力先ディレクトリは事前に存在している必要があります。",
        },
        code: `node dist/cli/index.js export slides.html --output slides.pptx --selector '.deck-page'
node dist/cli/index.js export http://127.0.0.1:5180/ --output preview.pptx`,
        note: {
          en: "Export runs page scripts in Chromium with network access. Export only trusted HTML and URLs.",
          "zh-TW": "匯出時頁面腳本會在可連網的 Chromium 中執行，請只匯出受信任的 HTML 與 URL。",
          "zh-CN": "导出时页面脚本会在可联网的 Chromium 中运行，请只导出受信任的 HTML 与 URL。",
          ja: "書き出し時、ページのスクリプトはネットワークにアクセスできる Chromium で実行されます。信頼できる HTML と URL だけを書き出してください。",
        },
      },
      {
        id: "exit-codes",
        title: { en: "Exit codes", "zh-TW": "結束代碼", "zh-CN": "退出代码", ja: "終了コード" },
        body: {
          en: "Warnings alone never fail a command.",
          "zh-TW": "只有警告時不會讓指令失敗。",
          "zh-CN": "只有警告时不会让命令失败。",
          ja: "警告だけではコマンドは失敗しません。",
        },
        table: {
          caption: { en: "Exit codes", "zh-TW": "結束代碼", "zh-CN": "退出代码", ja: "終了コード" },
          headers: [
            { en: "Code", "zh-TW": "代碼", "zh-CN": "代码", ja: "コード" },
            { en: "Meaning", "zh-TW": "意義", "zh-CN": "含义", ja: "意味" },
          ],
          rows: [
            ["0", { en: "Success, including help", "zh-TW": "成功，包括顯示說明", "zh-CN": "成功，包括显示帮助", ja: "成功（ヘルプ表示を含む）" }],
            ["1", { en: "Operation failed, invalid content, or invalid PPTX", "zh-TW": "操作失敗、內容無效或 PPTX 無效", "zh-CN": "操作失败、内容无效或 PPTX 无效", ja: "処理の失敗、内容の不正、PPTX の不正" }],
            ["2", { en: "Invalid usage, such as a missing --output or invalid port", "zh-TW": "用法錯誤，例如缺少 --output 或連接埠無效", "zh-CN": "用法错误，例如缺少 --output 或端口无效", ja: "使い方の誤り（--output の欠落、不正なポートなど）" }],
          ],
        },
      },
      {
        id: "docker",
        title: { en: "Run in Docker", "zh-TW": "在 Docker 中執行", "zh-CN": "在 Docker 中运行", ja: "Docker で実行する" },
        body: {
          en: "The image bundles Node.js, the pinned Chromium, and Noto CJK and Liberation fonts, so you do not install them yourself. Compose mounts the repository root at /work, or the folder in SLIDEFORGE_WORK, and the CLI arguments follow cli. Paths are container paths under /work.",
          "zh-TW": "映像檔內含 Node.js、鎖定版本的 Chromium，以及 Noto CJK 與 Liberation 字型，不必自行安裝。Compose 會把 repository 根目錄（或 SLIDEFORGE_WORK 指定的資料夾）掛載到 /work，CLI 參數接在 cli 後面。路徑要寫容器內 /work 底下的路徑。",
          "zh-CN": "镜像内含 Node.js、锁定版本的 Chromium，以及 Noto CJK 与 Liberation 字体，无需自行安装。Compose 会把仓库根目录（或 SLIDEFORGE_WORK 指定的文件夹）挂载到 /work，CLI 参数接在 cli 后面。路径要写容器内 /work 下的路径。",
          ja: "イメージには Node.js、固定バージョンの Chromium、Noto CJK と Liberation フォントが含まれるため、自分でインストールする必要はありません。Compose はリポジトリのルート（または SLIDEFORGE_WORK のフォルダー）を /work にマウントし、CLI の引数は cli の後に続けます。パスはコンテナー内の /work 以下で指定します。",
        },
        code: `docker compose -f docker/compose.yaml --profile cli run --rm --build cli export /work/examples/basic/presentation.json --output /work/presentation.pptx
docker compose -f docker/compose.yaml --profile cli run --rm cli validate /work/presentation.pptx`,
        note: {
          en: "The container is a CLI, not an export service, and the same trust model applies. preview is not supported in the container. PowerPoint still uses Microsoft JhengHei for CJK text, which the image does not include. Studio background links need network access to bg.gordonkit.com from the container, and localhost studio links do not work there.",
          "zh-TW": "容器提供的是 CLI，不是匯出服務，信任模型不變。容器中不支援 preview。PowerPoint 的 CJK 文字仍使用映像檔沒有內含的微軟正黑體。Studio 背景連結需要容器能連到 bg.gordonkit.com，localhost 的 studio 連結在容器中無法使用。",
          "zh-CN": "容器提供的是 CLI，不是导出服务，信任模型不变。容器中不支持 preview。PowerPoint 的 CJK 文字仍使用镜像未内含的 Microsoft JhengHei。Studio 背景链接需要容器能连到 bg.gordonkit.com，localhost 的 studio 链接在容器中无法使用。",
          ja: "コンテナーが提供するのは CLI であり、書き出しサービスではありません。信頼モデルは同じです。コンテナーでは preview を使えません。PowerPoint の CJK テキストには、イメージに含まれない Microsoft JhengHei が引き続き使われます。Studio の背景リンクには、コンテナーから bg.gordonkit.com へのネットワーク接続が必要です。localhost の studio リンクはコンテナー内では使えません。",
        },
        links: [
          { label: { en: "Container guide", "zh-TW": "容器說明", "zh-CN": "容器说明", ja: "コンテナーのガイド" }, href: `${repositoryUrl}/blob/main/docker/README.md` },
        ],
      },
    ],
  },
  {
    id: "schema",
    category: "authoring",
    title: { en: "JSON schema", "zh-TW": "JSON Schema", "zh-CN": "JSON Schema", ja: "JSON スキーマ" },
    summary: {
      en: "Presentation content is a strict JSON document. Unknown keys are errors, and every layout has its own required fields.",
      "zh-TW": "簡報內容是嚴格的 JSON 文件。未知的欄位會視為錯誤，每種版型都有各自的必填欄位。",
      "zh-CN": "演示文稿内容是严格的 JSON 文档。未知的字段会视为错误，每种版式都有各自的必填字段。",
      ja: "プレゼンテーションの内容は厳格な JSON ドキュメントです。未知のキーはエラーになり、レイアウトごとに必須フィールドがあります。",
    },
    sections: [
      {
        id: "presentation",
        title: { en: "Presentation", "zh-TW": "簡報", "zh-CN": "演示文稿", ja: "プレゼンテーション" },
        body: {
          en: "The executable schema is src/schemas/presentation.ts, written with Zod. parsePresentation validates input and applies defaults.",
          "zh-TW": "可執行的 schema 位於 src/schemas/presentation.ts，以 Zod 撰寫。parsePresentation 會驗證輸入並套用預設值。",
          "zh-CN": "可执行的 schema 位于 src/schemas/presentation.ts，以 Zod 编写。parsePresentation 会验证输入并应用默认值。",
          ja: "実行可能なスキーマは Zod で書かれた src/schemas/presentation.ts です。parsePresentation が入力を検証し、既定値を適用します。",
        },
        table: {
          caption: { en: "Presentation fields", "zh-TW": "簡報欄位", "zh-CN": "演示文稿字段", ja: "プレゼンテーションのフィールド" },
          headers: [
            { en: "Field", "zh-TW": "欄位", "zh-CN": "字段", ja: "フィールド" },
            { en: "Required", "zh-TW": "必填", "zh-CN": "必填", ja: "必須" },
            { en: "Value", "zh-TW": "內容", "zh-CN": "内容", ja: "値" },
          ],
          rows: [
            ["metadata", yes, { en: "title (required), author, subject, lang (default en)", "zh-TW": "title（必填）、author、subject、lang（預設 en）", "zh-CN": "title（必填）、author、subject、lang（默认 en）", ja: "title（必須）、author、subject、lang（既定は en）" }],
            ["template", no, { en: "Built-in template name, or a ./ or ../ path to a template; see Templates", "zh-TW": "內建範本名稱，或以 ./、../ 開頭的範本路徑，見「範本」", "zh-CN": "内置模板名称，或以 ./、../ 开头的模板路径，见“模板”", ja: "組み込みテンプレート名、または ./ か ../ で始まるテンプレートのパス。「テンプレート」を参照" }],
            ["theme", no, { en: "light (default) or dark", "zh-TW": "light（預設）或 dark", "zh-CN": "light（默认）或 dark", ja: "light（既定）または dark" }],
            ["fontFamily", no, { en: "Local font family list, up to 200 characters", "zh-TW": "本機字型清單，最多 200 字元", "zh-CN": "本机字体列表，最多 200 字符", ja: "ローカルフォントのファミリー一覧（最大 200 文字）" }],
            ["backgrounds", no, { en: "Background sources for default and each layout; see Backgrounds", "zh-TW": "default 與各版型的背景來源，見「背景」", "zh-CN": "default 与各版式的背景来源，见“背景”", ja: "default と各レイアウトの背景。「背景」を参照" }],
            ["slides", yes, { en: "1 to 200 slides", "zh-TW": "1 到 200 張投影片", "zh-CN": "1 到 200 张幻灯片", ja: "1〜200 枚のスライド" }],
          ],
        },
      },
      {
        id: "slides",
        title: { en: "Slides and layouts", "zh-TW": "投影片與版型", "zh-CN": "幻灯片与版式", ja: "スライドとレイアウト" },
        body: {
          en: "Every slide needs layout and title, and may have subtitle, footer, notes, and background. Notes become PowerPoint speaker notes. layout is a family, or family/variant such as cover/default: the family decides the fields and the variant only how the slide is drawn, so changing it leaves the content unchanged. A bare family is drawn as default. cover also has centered, split (an accent panel on the right third), and band (an accent block behind the title), and quote has centered; the other families have only default. Each family adds its own fields:",
          "zh-TW": "每張投影片都需要 layout 與 title，可另加 subtitle、footer、notes 與 background，notes 會成為 PowerPoint 的演講者備忘稿。layout 可以是版型系列，或 cover/default 這類「系列/變化」：系列決定欄位，變化只決定呈現方式，因此換變化不必改內容。只寫系列名稱時使用 default。cover 另有 centered、split（右側三分之一的強調色塊）與 band（標題後方的強調色帶），quote 另有 centered，其他系列只有 default。各系列另有專屬欄位：",
          "zh-CN": "每张幻灯片都需要 layout 与 title，可另加 subtitle、footer、notes 与 background，notes 会成为 PowerPoint 的演讲者备注。layout 可以是版式系列，或 cover/default 这类“系列/变体”：系列决定字段，变体只决定呈现方式，因此换变体不必改内容。只写系列名称时使用 default。cover 另有 centered、split（右侧三分之一的强调色块）与 band（标题后方的强调色带），quote 另有 centered，其他系列只有 default。各系列另有专属字段：",
          ja: "各スライドには layout と title が必要で、subtitle、footer、notes、background も指定できます。notes は PowerPoint の発表者ノートになります。layout はレイアウトのファミリー、または cover/default のような「ファミリー/バリアント」です。ファミリーがフィールドを決め、バリアントは描き方だけを決めるので、バリアントを変えても内容はそのままです。ファミリー名だけなら default で描かれます。cover にはほかに centered、split（右側 3 分の 1 の強調色パネル）、band（タイトルの背後の強調色の帯）が、quote には centered があり、ほかのファミリーは default だけです。ファミリーごとに次のフィールドが加わります。",
        },
        table: {
          caption: { en: "Layout fields", "zh-TW": "版型欄位", "zh-CN": "版式字段", ja: "レイアウトのフィールド" },
          headers: [
            "layout",
            { en: "Fields", "zh-TW": "欄位", "zh-CN": "字段", ja: "フィールド" },
          ],
          rows: [
            ["cover", { en: "Optional author", "zh-TW": "選填 author", "zh-CN": "可选 author", ja: "任意の author" }],
            ["content", { en: "blocks: 1–12 content blocks", "zh-TW": "blocks：1–12 個內容區塊", "zh-CN": "blocks：1–12 个内容块", ja: "blocks：1〜12 個のコンテンツブロック" }],
            ["two-columns", { en: "left and right: 1–12 blocks each", "zh-TW": "left 與 right：各 1–12 個區塊", "zh-CN": "left 与 right：各 1–12 个块", ja: "left と right：それぞれ 1〜12 個のブロック" }],
            ["cards", { en: "cards: 1–6 cards with title and blocks", "zh-TW": "cards：1–6 張含 title 與 blocks 的卡片", "zh-CN": "cards：1–6 张含 title 与 blocks 的卡片", ja: "cards：title と blocks を持つ 1〜6 枚のカード" }],
            ["table", { en: "columns (1–8) and rows (1–14), one cell per column", "zh-TW": "columns（1–8）與 rows（1–14），每列儲存格數須等於欄數", "zh-CN": "columns（1–8）与 rows（1–14），每行单元格数须等于列数", ja: "columns（1〜8）と rows（1〜14）。各行のセル数は列数と同じ" }],
            ["chart", { en: "data: 1–10 label/value pairs; optional unit and blocks", "zh-TW": "data：1–10 組 label/value；選填 unit 與 blocks", "zh-CN": "data：1–10 组 label/value；可选 unit 与 blocks", ja: "data：1〜10 組の label/value。unit と blocks は任意" }],
            ["quote", { en: "quote: up to 1,000 characters; optional attribution", "zh-TW": "quote：最多 1,000 字元；選填 attribution", "zh-CN": "quote：最多 1,000 字符；可选 attribution", ja: "quote：最大 1,000 文字。attribution は任意" }],
          ],
        },
      },
      {
        id: "blocks",
        title: { en: "Content blocks", "zh-TW": "內容區塊", "zh-CN": "内容块", ja: "コンテンツブロック" },
        body: {
          en: "Blocks are plain text, not Markdown or HTML. Images need alt text and may use HTTP(S) URLs, relative paths, or base64 raster data URLs.",
          "zh-TW": "區塊內容是純文字，不是 Markdown 或 HTML。圖片必須提供 alt，可使用 HTTP(S) URL、相對路徑或 base64 點陣圖 data URL。",
          "zh-CN": "块内容是纯文本，不是 Markdown 或 HTML。图片必须提供 alt，可使用 HTTP(S) URL、相对路径或 base64 位图 data URL。",
          ja: "ブロックはプレーンテキストで、Markdown や HTML ではありません。画像には alt が必要で、HTTP(S) URL、相対パス、base64 のラスター画像 data URL を使えます。",
        },
        code: `{ "type": "paragraph", "text": "One clear idea." }
{ "type": "bullets", "items": ["First", "Second"], "ordered": false }
{ "type": "image", "src": "assets/diagram.svg", "alt": "Workflow diagram", "caption": "Optional" }`,
      },
      {
        id: "backgrounds",
        title: { en: "Backgrounds", "zh-TW": "背景", "zh-CN": "背景", ja: "背景" },
        body: {
          en: "A background fills the slide behind its content. Each slide uses its own background, else backgrounds.<family>/<variant>, else backgrounds.<family>, else backgrounds.default; \"none\" turns it off for one slide. A source is an image (same rules as image blocks, cropped to cover the slide) or a Math Background Studio share link, which the studio's /render page draws at export.",
          "zh-TW": "背景會鋪滿整張投影片，位於內容下方。每張投影片依序使用自己的 background、backgrounds.<系列>/<變化>、backgrounds.<系列>、backgrounds.default；設為 \"none\" 可讓單頁不使用背景。來源可以是圖片（規則與圖片區塊相同，會裁切以鋪滿投影片），或 Math Background Studio 的分享連結，匯出時由 studio 的 /render 頁面繪製。",
          "zh-CN": "背景会铺满整张幻灯片，位于内容下方。每张幻灯片依次使用自己的 background、backgrounds.<系列>/<变体>、backgrounds.<系列>、backgrounds.default；设为 \"none\" 可让单页不使用背景。来源可以是图片（规则与图片块相同，会裁剪以铺满幻灯片），或 Math Background Studio 的分享链接，导出时由 studio 的 /render 页面绘制。",
          ja: "背景はスライド全体に敷かれ、内容の下に表示されます。各スライドは自分の background、なければ backgrounds.<ファミリー>/<バリアント>、なければ backgrounds.<ファミリー>、なければ backgrounds.default を使います。\"none\" でそのスライドだけ背景をなくせます。指定できるのは画像（画像ブロックと同じ規則で、スライドを覆うようにトリミング）または Math Background Studio の共有リンクで、リンクは書き出し時に studio の /render ページが描画します。",
        },
        code: `{
  "backgrounds": {
    "default": "assets/plain.svg",
    "cover": "https://bg.gordonkit.com/studio#d=1PYo…"
  },
  "slides": [
    { "layout": "cover", "title": "Uses backgrounds.cover" },
    { "layout": "table", "title": "No background", "background": "none", "columns": ["A"], "rows": [["1"]] }
  ]
}`,
        note: {
          en: "Share links are accepted only from https://bg.gordonkit.com or a localhost development server. Backgrounds become 1920 × 1080 pictures in the PowerPoint slide background, not editable shapes.",
          "zh-TW": "分享連結只接受 https://bg.gordonkit.com 或 localhost 開發伺服器。背景會成為 PowerPoint 投影片背景中的 1920 × 1080 圖片，不是可編輯的圖形。",
          "zh-CN": "分享链接只接受 https://bg.gordonkit.com 或 localhost 开发服务器。背景会成为 PowerPoint 幻灯片背景中的 1920 × 1080 图片，不是可编辑的图形。",
          ja: "共有リンクは https://bg.gordonkit.com または localhost の開発サーバーのものだけを受け付けます。背景は PowerPoint のスライド背景に 1920 × 1080 の画像として入り、編集できる図形にはなりません。",
        },
        links: [
          { label: { en: "Math Background Studio", "zh-TW": "Math Background Studio", "zh-CN": "Math Background Studio", ja: "Math Background Studio" }, href: "https://bg.gordonkit.com/studio" },
        ],
      },
      {
        id: "templates",
        title: { en: "Templates", "zh-TW": "範本", "zh-CN": "模板", ja: "テンプレート" },
        body: {
          en: "A template holds the look apart from the content: palette overrides for light and dark, a font family, numeric design tokens within bounds that keep the canvas geometry, backgrounds, and the variant each family's bare-name slides use. Name one with template: a built-in (default or corporate) or a ./ or ../ path to a template file or a folder with template.json. Its relative images resolve from the template's folder. The presentation's own theme, fontFamily, backgrounds entries, and a variant written in layout take precedence; changing the template restyles the deck without touching its slides. examples/templates is a deck with its own template to try this on.",
          "zh-TW": "範本把外觀與內容分開：淺色與深色的配色覆寫、字型、在不破壞畫布幾何的範圍內調整數值 design token、背景，以及各系列只寫系列名稱時使用的變化。以 template 指定：內建範本（default 或 corporate），或以 ./、../ 開頭、指向範本檔或含 template.json 資料夾的路徑。範本的相對圖片路徑以範本資料夾為基準。簡報自己的 theme、fontFamily、backgrounds 項目，以及 layout 中寫明的變化優先；換範本即可改變整份簡報的外觀，不必修改投影片。examples/templates 是一份附有自己範本的簡報，可以直接試試看。",
          "zh-CN": "模板把外观与内容分开：浅色与深色的配色覆盖、字体、在不破坏画布几何的范围内调整数值 design token、背景，以及各系列只写系列名称时使用的变体。以 template 指定：内置模板（default 或 corporate），或以 ./、../ 开头、指向模板文件或含 template.json 文件夹的路径。模板的相对图片路径以模板文件夹为基准。演示文稿自己的 theme、fontFamily、backgrounds 条目，以及 layout 中写明的变体优先；换模板即可改变整份演示文稿的外观，不必修改幻灯片。examples/templates 是一份附有自己模板的演示文稿，可以直接试试看。",
          ja: "テンプレートは見た目を内容から切り離します。ライトとダークの配色の上書き、フォントファミリー、キャンバスの幾何を崩さない範囲の数値デザイントークン、背景、そしてファミリー名だけのスライドに使うバリアントを指定できます。template で指定し、値は組み込み（default または corporate）か、テンプレートのファイルまたは template.json を含むフォルダーを指す ./ か ../ で始まるパスです。テンプレートの相対画像パスはテンプレートのフォルダーから解決されます。プレゼンテーション自身の theme、fontFamily、backgrounds の項目、layout に書いたバリアントが優先されます。テンプレートを替えれば、スライドに手を入れずにデッキ全体の見た目が変わります。examples/templates は独自のテンプレートを持つデッキで、そのまま試せます。",
        },
        code: `// brand/template.json
{
  "name": "brand",
  "palette": { "light": { "accent": "#0f766e" } },
  "tokens": { "type": { "title": 64 }, "border": { "radius": 0 } },
  "backgrounds": { "default": "assets/corner.svg" },
  "variants": { "cover": "split" }
}

// decks/presentation.json
{ "metadata": { "title": "Brand deck" }, "template": "../brand", "slides": [ … ] }`,
        note: {
          en: "Templates are data only: they cannot add CSS, HTML, layout families, or variants. Token checks keep regions on the slide but do not prove that content fits or that colors have enough contrast.",
          "zh-TW": "範本只有資料：無法加入 CSS、HTML、版型系列或變化。token 檢查能讓各區域留在投影片內，但無法保證內容放得下，也無法保證色彩對比足夠。",
          "zh-CN": "模板只有数据：无法加入 CSS、HTML、版式系列或变体。token 检查能让各区域留在幻灯片内，但无法保证内容放得下，也无法保证色彩对比足够。",
          ja: "テンプレートはデータだけで、CSS、HTML、レイアウトファミリー、バリアントは追加できません。トークンの検査は各領域をスライド内に収めますが、内容が収まることや色のコントラストが十分なことは保証しません。",
        },
      },
      {
        id: "minimal",
        title: { en: "Minimal deck", "zh-TW": "最小範例", "zh-CN": "最小示例", ja: "最小構成のデッキ" },
        body: {
          en: "Schema limits are data limits, not a promise that content fits a slide. Check the rendered layout separately.",
          "zh-TW": "schema 的上限是資料限制，不代表內容一定放得進投影片，請另外檢查排版結果。",
          "zh-CN": "schema 的上限是数据限制，不代表内容一定放得进幻灯片，请另外检查排版结果。",
          ja: "スキーマの上限はデータの制限であり、内容がスライドに収まる保証ではありません。描画結果は別途確認してください。",
        },
        code: `{
  "metadata": { "title": "Team update", "lang": "en" },
  "theme": "light",
  "slides": [
    {
      "layout": "content",
      "title": "This week",
      "blocks": [
        { "type": "paragraph", "text": "The first milestone is complete." },
        { "type": "bullets", "items": ["Review", "Refine", "Export"] }
      ],
      "notes": "Discuss the next milestone."
    }
  ]
}`,
      },
    ],
  },
  {
    id: "layouts",
    category: "authoring",
    title: { en: "Layouts and components", "zh-TW": "版型與元件", "zh-CN": "版式与组件", ja: "レイアウトとコンポーネント" },
    summary: {
      en: "Layout families compose a small set of React components that emit predictable DOM for reliable conversion.",
      "zh-TW": "各版型系列由少量 React 元件組成，產生可預期的 DOM 結構，讓轉換結果穩定。",
      "zh-CN": "各版式系列由少量 React 组件组成，生成可预期的 DOM 结构，让转换结果稳定。",
      ja: "各レイアウトファミリーは少数の React コンポーネントで構成され、変換が安定するよう予測可能な DOM を出力します。",
    },
    sections: [
      {
        id: "six-layouts",
        title: { en: "Choosing a layout", "zh-TW": "選擇版型", "zh-CN": "选择版式", ja: "レイアウトの選び方" },
        body: {
          en: "Keep one main idea per slide. Split crowded slides instead of shrinking text.",
          "zh-TW": "每張投影片只放一個重點。內容太擠時請拆成多張，不要縮小文字。",
          "zh-CN": "每张幻灯片只放一个重点。内容太挤时请拆成多张，不要缩小文字。",
          ja: "1 枚のスライドには 1 つの主題だけを置きます。詰め込みすぎた場合は文字を小さくせず、スライドを分けてください。",
        },
        table: {
          caption: { en: "Layouts", "zh-TW": "版型", "zh-CN": "版式", ja: "レイアウト" },
          headers: [
            "layout",
            { en: "Use for", "zh-TW": "適用情境", "zh-CN": "适用场景", ja: "用途" },
          ],
          rows: [
            ["cover", { en: "Opening slide with a large title and optional author; variants centered, split, and band", "zh-TW": "開場，大標題與選填的作者；另有 centered、split、band 變化", "zh-CN": "开场，大标题与可选的作者；另有 centered、split、band 变体", ja: "大きなタイトルと任意の作者を置く表紙。centered、split、band のバリアントあり" }],
            ["content", { en: "An explanation with paragraphs, lists, and images", "zh-TW": "以段落、清單與圖片說明", "zh-CN": "以段落、列表与图片说明", ja: "段落、リスト、画像による説明" }],
            ["two-columns", { en: "Comparisons such as before and after", "zh-TW": "比較，例如前後對照", "zh-CN": "比较，例如前后对照", ja: "前後比較などの対比" }],
            ["cards", { en: "Up to six short parallel ideas", "zh-TW": "最多六個簡短的並列重點", "zh-CN": "最多六个简短的并列重点", ja: "最大 6 つの短い並列項目" }],
            ["table", { en: "Compact grids of text", "zh-TW": "精簡的文字表格", "zh-CN": "精简的文字表格", ja: "コンパクトな表" }],
            ["chart", { en: "Simple nonnegative values, optionally with an explanation column", "zh-TW": "簡單的非負數值，可附說明欄", "zh-CN": "简单的非负数值，可附说明栏", ja: "単純な非負の値。説明列も付けられる" }],
            ["quote", { en: "One short quotation with an optional attribution; variant centered", "zh-TW": "一段簡短引言與選填的出處；另有 centered 變化", "zh-CN": "一段简短引言与可选的出处；另有 centered 变体", ja: "短い引用 1 つと任意の出典。centered のバリアントあり" }],
          ],
        },
      },
      {
        id: "components",
        title: { en: "Components", "zh-TW": "元件", "zh-CN": "组件", ja: "コンポーネント" },
        body: {
          en: "Components are exported from the package root. They emit markup only; renderPresentation supplies the stylesheet, theme, font, and fixed canvas.",
          "zh-TW": "元件從套件根目錄匯出，只產生 HTML 標記；樣式表、主題、字型與固定畫布由 renderPresentation 提供。",
          "zh-CN": "组件从包根目录导出，只生成 HTML 标记；样式表、主题、字体与固定画布由 renderPresentation 提供。",
          ja: "コンポーネントはパッケージのルートからエクスポートされ、マークアップだけを出力します。スタイルシート、テーマ、フォント、固定キャンバスは renderPresentation が提供します。",
        },
        table: {
          caption: { en: "Components", "zh-TW": "元件", "zh-CN": "组件", ja: "コンポーネント" },
          headers: [
            { en: "Component", "zh-TW": "元件", "zh-CN": "组件", ja: "コンポーネント" },
            { en: "Output", "zh-TW": "輸出", "zh-CN": "输出", ja: "出力" },
          ],
          rows: [
            ["Slide", { en: "Full slide frame with title, content, footer, and notes", "zh-TW": "完整投影片框架，含標題、內容、頁尾與備忘稿", "zh-CN": "完整幻灯片框架，含标题、内容、页脚与备注", ja: "タイトル、内容、フッター、ノートを含むスライド枠" }],
            ["SlideTitle · SlideSubtitle", { en: "Header with heading and subtitle", "zh-TW": "含標題與副標題的頁首", "zh-CN": "含标题与副标题的页眉", ja: "見出しとサブタイトルのヘッダー" }],
            ["SlideContent · SlideColumns", { en: "Content region and equal two-column grid", "zh-TW": "內容區與等寬雙欄", "zh-CN": "内容区与等宽双栏", ja: "コンテンツ領域と等幅 2 列グリッド" }],
            ["SlideCard", { en: "Titled card", "zh-TW": "含標題的卡片", "zh-CN": "含标题的卡片", ja: "タイトル付きカード" }],
            ["SlideImage · SlideTable", { en: "Image figure with caption, semantic table", "zh-TW": "含說明的圖片、語意化表格", "zh-CN": "含说明的图片、语义化表格", ja: "キャプション付き画像、セマンティックな表" }],
            ["SlideChart", { en: "Horizontal HTML/CSS bars with labels and values", "zh-TW": "含標籤與數值的 HTML/CSS 橫條", "zh-CN": "含标签与数值的 HTML/CSS 横条", ja: "ラベルと値付きの HTML/CSS 横棒" }],
            ["SlideFooter", { en: "Footer text and slide number", "zh-TW": "頁尾文字與頁碼", "zh-CN": "页脚文字与页码", ja: "フッターテキストとページ番号" }],
          ],
        },
      },
      {
        id: "custom-html",
        title: { en: "Custom trusted HTML", "zh-TW": "自訂受信任的 HTML", "zh-CN": "自定义受信任的 HTML", ja: "独自の信頼できる HTML" },
        body: {
          en: "Give each slide a fixed 1920 × 1080 box marked with data-pptx=\"slide\". Keep text and simple fills as DOM and CSS when editability matters. Mark intentional decorative overlap so the overlap check skips it.",
          "zh-TW": "每張投影片給定固定的 1920 × 1080 區塊並標上 data-pptx=\"slide\"。需要可編輯時，文字與簡單填色請保留為 DOM 與 CSS。刻意的裝飾性重疊請加上標記，讓重疊檢查略過。",
          "zh-CN": "每张幻灯片给定固定的 1920 × 1080 区块并标上 data-pptx=\"slide\"。需要可编辑时，文字与简单填色请保留为 DOM 与 CSS。刻意的装饰性重叠请加上标记，让重叠检查跳过。",
          ja: "各スライドに data-pptx=\"slide\" を付けた固定 1920 × 1080 のボックスを用意します。編集可能性が重要な場合は、テキストと単純な塗りを DOM と CSS のまま保ってください。意図的な装飾の重なりには印を付けると、重なり検査の対象外になります。",
        },
        code: `<section data-pptx="slide" style="width:1920px;height:1080px">
  <h1>Editable title</h1>
  <div data-pptx-allow-overlap="true">…decorative layers…</div>
</section>`,
      },
    ],
  },
  {
    id: "design-tokens",
    category: "authoring",
    title: { en: "Design tokens", "zh-TW": "Design Tokens", "zh-CN": "Design Tokens", ja: "デザイントークン" },
    summary: {
      en: "One set of tokens defines the canvas, palettes, spacing, and type for both HTML rendering and PPTX export.",
      "zh-TW": "同一組 tokens 定義畫布、色票、間距與字級，HTML 排版與 PPTX 匯出共用。",
      "zh-CN": "同一组 tokens 定义画布、色板、间距与字号，HTML 排版与 PPTX 导出共用。",
      ja: "1 組のトークンでキャンバス、パレット、余白、文字を定義し、HTML の描画と PPTX の書き出しで共有します。",
    },
    sections: [
      {
        id: "canvas",
        title: { en: "Canvas", "zh-TW": "畫布", "zh-CN": "画布", ja: "キャンバス" },
        body: {
          en: "Slides are 1920 × 1080 CSS pixels, exported as 13.333 × 7.5 inch 16:9 PowerPoint slides, so 1 CSS pixel becomes 0.5 pt. Tokens live in src/themes/tokens.ts and are exposed to CSS as --sf-* custom properties.",
          "zh-TW": "投影片為 1920 × 1080 CSS 像素，匯出為 13.333 × 7.5 吋的 16:9 PowerPoint 投影片，因此 1 CSS 像素等於 0.5 pt。tokens 定義在 src/themes/tokens.ts，並以 --sf-* CSS 自訂屬性提供給樣式表。",
          "zh-CN": "幻灯片为 1920 × 1080 CSS 像素，导出为 13.333 × 7.5 英寸的 16:9 PowerPoint 幻灯片，因此 1 CSS 像素等于 0.5 pt。tokens 定义在 src/themes/tokens.ts，并以 --sf-* CSS 自定义属性提供给样式表。",
          ja: "スライドは 1920 × 1080 CSS ピクセルで、13.333 × 7.5 インチの 16:9 PowerPoint スライドとして書き出されるため、1 CSS ピクセルは 0.5 pt になります。トークンは src/themes/tokens.ts にあり、--sf-* の CSS カスタムプロパティとして公開されます。",
        },
      },
      {
        id: "themes",
        title: { en: "Themes", "zh-TW": "主題", "zh-CN": "主题", ja: "テーマ" },
        body: {
          en: "Choose light or dark per presentation with the theme field. A template can override any of these colors for either theme; the built-in values are:",
          "zh-TW": "以 theme 欄位為每份簡報選擇 light 或 dark。範本可以覆寫任一主題的這些色彩；內建值如下：",
          "zh-CN": "以 theme 字段为每份演示文稿选择 light 或 dark。模板可以覆盖任一主题的这些色彩；内置值如下：",
          ja: "theme フィールドでプレゼンテーションごとに light か dark を選びます。テンプレートはどちらのテーマのこれらの色も上書きできます。組み込みの値は次のとおりです。",
        },
        table: {
          caption: { en: "Theme colors", "zh-TW": "主題色彩", "zh-CN": "主题色彩", ja: "テーマの色" },
          headers: ["Token", "light", "dark"],
          rows: [
            ["background", "#ffffff", "#101827"],
            ["foreground", "#172033", "#f8fafc"],
            ["muted", "#526078", "#b5c2d6"],
            ["accent", "#2563eb", "#60a5fa"],
            ["surface", "#f1f5f9", "#1e293b"],
            ["border", "#cbd5e1", "#475569"],
          ],
        },
      },
      {
        id: "typography",
        title: { en: "Typography", "zh-TW": "字級", "zh-CN": "字号", ja: "タイポグラフィ" },
        body: {
          en: "Sizes are CSS pixels on the fixed canvas, followed by the exported PowerPoint size.",
          "zh-TW": "尺寸以固定畫布上的 CSS 像素計，後面是匯出到 PowerPoint 的字級。",
          "zh-CN": "尺寸以固定画布上的 CSS 像素计，后面是导出到 PowerPoint 的字号。",
          ja: "サイズは固定キャンバス上の CSS ピクセルで、続けて PowerPoint に書き出されるサイズを示します。",
        },
        table: {
          caption: { en: "Type sizes", "zh-TW": "字級", "zh-CN": "字号", ja: "文字サイズ" },
          headers: [
            { en: "Element", "zh-TW": "元素", "zh-CN": "元素", ja: "要素" },
            { en: "Size", "zh-TW": "尺寸", "zh-CN": "尺寸", ja: "サイズ" },
          ],
          rows: [
            [{ en: "Cover title", "zh-TW": "封面標題", "zh-CN": "封面标题", ja: "表紙のタイトル" }, "90px · 45 pt"],
            [{ en: "Slide title", "zh-TW": "投影片標題", "zh-CN": "幻灯片标题", ja: "スライドのタイトル" }, "60px · 30 pt"],
            [{ en: "Body text", "zh-TW": "內文", "zh-CN": "正文", ja: "本文" }, "36px · 18 pt"],
            [{ en: "Subtitle", "zh-TW": "副標題", "zh-CN": "副标题", ja: "サブタイトル" }, "33px · 16.5 pt"],
            [{ en: "Table and chart", "zh-TW": "表格與圖表", "zh-CN": "表格与图表", ja: "表とグラフ" }, "31.5px · 15.75 pt"],
            [{ en: "Caption", "zh-TW": "圖說", "zh-CN": "图注", ja: "キャプション" }, "25.5px · 12.75 pt"],
            [{ en: "Footer", "zh-TW": "頁尾", "zh-CN": "页脚", ja: "フッター" }, "24px · 12 pt"],
          ],
        },
      },
      {
        id: "fonts",
        title: { en: "Fonts", "zh-TW": "字型", "zh-CN": "字体", ja: "フォント" },
        body: {
          en: "The default stack is Arial, Microsoft JhengHei, Noto Sans CJK TC, Noto Sans TC, sans-serif. Export sets Microsoft JhengHei as the PowerPoint East Asian font, so Chinese text on Windows uses the same font in HTML and PowerPoint.",
          "zh-TW": "預設字型順序為 Arial、Microsoft JhengHei、Noto Sans CJK TC、Noto Sans TC、sans-serif。匯出時會把 PowerPoint 的東亞字型設為微軟正黑體，所以在 Windows 上中文在 HTML 與 PowerPoint 會使用同一套字型。",
          "zh-CN": "默认字体顺序为 Arial、Microsoft JhengHei、Noto Sans CJK TC、Noto Sans TC、sans-serif。导出时会把 PowerPoint 的东亚字体设为 Microsoft JhengHei，所以在 Windows 上中文在 HTML 与 PowerPoint 会使用同一套字体。",
          ja: "既定のフォント順は Arial、Microsoft JhengHei、Noto Sans CJK TC、Noto Sans TC、sans-serif です。書き出し時に PowerPoint の東アジア言語フォントを Microsoft JhengHei に設定するため、Windows では中国語のテキストが HTML と PowerPoint で同じフォントになります。",
        },
        note: {
          en: "A fallback list does not install fonts, and system fonts are not guaranteed to be embedded. Install the same fonts on the machine that opens the deck.",
          "zh-TW": "字型清單不會安裝字型，系統字型也不保證會嵌入檔案。請在開啟簡報的電腦上安裝相同字型。",
          "zh-CN": "字体列表不会安装字体，系统字体也不保证会嵌入文件。请在打开演示文稿的电脑上安装相同字体。",
          ja: "フォントの代替リストはフォントをインストールせず、システムフォントの埋め込みも保証されません。デッキを開く端末にも同じフォントをインストールしてください。",
        },
      },
    ],
  },
  {
    id: "ai-workflow",
    category: "authoring",
    title: { en: "AI workflow", "zh-TW": "AI 撰寫流程", "zh-CN": "AI 编写流程", ja: "AI ワークフロー" },
    heading: { en: "AI authoring workflow", "zh-TW": "AI 撰寫流程", "zh-CN": "AI 编写流程", ja: "AI による作成ワークフロー" },
    summary: {
      en: "AI agents produce presentations from the executable schema and shared design system, without changing the rendering engine.",
      "zh-TW": "AI 代理依可執行的 schema 與共用設計系統產生簡報，不修改排版引擎。",
      "zh-CN": "AI 代理依可执行的 schema 与共用设计系统生成演示文稿，不修改排版引擎。",
      ja: "AI エージェントは描画エンジンを変更せず、実行可能なスキーマと共通のデザインシステムからプレゼンテーションを作成します。",
    },
    sections: [
      {
        id: "brief",
        title: { en: "1. Establish the brief", "zh-TW": "1. 確認需求", "zh-CN": "1. 确认需求", ja: "1. 要件を確認する" },
        body: {
          en: "Determine the audience, language, message, slide count, and source facts. Do not fabricate metrics or sources, and label illustrative data clearly.",
          "zh-TW": "確認對象、語言、訊息、投影片數與資料來源。不要捏造數據或出處，示意用的資料要清楚標示。",
          "zh-CN": "确认对象、语言、信息、幻灯片数与数据来源。不要捏造数据或出处，示意用的数据要清楚标示。",
          ja: "対象者、言語、メッセージ、スライド数、根拠となる事実を確認します。数値や出典を捏造せず、例示用のデータはその旨を明記します。",
        },
      },
      {
        id: "author",
        title: { en: "2. Author structured content", "zh-TW": "2. 撰寫結構化內容", "zh-CN": "2. 编写结构化内容", ja: "2. 構造化された内容を書く" },
        body: {
          en: "Start from init, keep only schema-supported fields, and pick layouts by purpose. Use plain strings rather than Markdown or HTML.",
          "zh-TW": "從 init 開始，只保留 schema 支援的欄位，依用途選擇版型。內容用純文字，不要用 Markdown 或 HTML。",
          "zh-CN": "从 init 开始，只保留 schema 支持的字段，依用途选择版式。内容用纯文本，不要用 Markdown 或 HTML。",
          ja: "init から始め、スキーマが対応するフィールドだけを残し、目的に合わせてレイアウトを選びます。Markdown や HTML ではなくプレーンな文字列を使います。",
        },
        code: "node dist/cli/index.js init draft.json",
      },
      {
        id: "review",
        title: { en: "3. Preview, export, and validate", "zh-TW": "3. 預覽、匯出與驗證", "zh-CN": "3. 预览、导出与验证", ja: "3. プレビュー、書き出し、検証" },
        body: {
          en: "Review the fixed canvas for clipping, contrast, missing images, and density. Fix layout errors and investigate warnings instead of hiding them.",
          "zh-TW": "在固定畫布上檢查裁切、對比、缺圖與內容密度。修正版面錯誤，並查明警告原因，而不是隱藏它們。",
          "zh-CN": "在固定画布上检查裁切、对比、缺图与内容密度。修正版面错误，并查明警告原因，而不是隐藏它们。",
          ja: "固定キャンバス上で、切れ、コントラスト、画像の欠落、情報量を確認します。レイアウトエラーは修正し、警告は隠さずに原因を調べます。",
        },
        code: `node dist/cli/index.js preview draft.json
node dist/cli/index.js export draft.json --output draft.pptx
node dist/cli/index.js validate draft.pptx`,
      },
      {
        id: "report",
        title: { en: "4. Report evidence honestly", "zh-TW": "4. 如實回報結果", "zh-CN": "4. 如实报告结果", ja: "4. 結果を正直に報告する" },
        body: {
          en: "State which checks ran and what remains unverified. Describe charts as editable bars, and never claim pixel perfection, embedded fonts, or a PowerPoint review that did not happen.",
          "zh-TW": "說明實際執行了哪些檢查、哪些尚未驗證。圖表要描述為可編輯的長條，不要宣稱像素級一致、字型已嵌入，或宣稱做過其實沒做的 PowerPoint 檢查。",
          "zh-CN": "说明实际运行了哪些检查、哪些尚未验证。图表要描述为可编辑的长条，不要宣称像素级一致、字体已嵌入，或宣称做过其实没做的 PowerPoint 检查。",
          ja: "実際に行った検査と未確認の点を明記します。グラフは編集可能なバーとして説明し、ピクセル単位の一致、フォントの埋め込み、実施していない PowerPoint での確認を主張しないでください。",
        },
        links: [
          { label: { en: "AGENTS.md", "zh-TW": "AGENTS.md", "zh-CN": "AGENTS.md", ja: "AGENTS.md" }, href: `${repositoryUrl}/blob/main/AGENTS.md` },
        ],
      },
    ],
  },
  {
    id: "api",
    category: "reference",
    title: { en: "Node.js API", "zh-TW": "Node.js API", "zh-CN": "Node.js API", ja: "Node.js API" },
    summary: {
      en: "Typed ESM functions for parsing, rendering, previewing, exporting, and validating presentations.",
      "zh-TW": "以具型別的 ESM 函式解析、排版、預覽、匯出與驗證簡報。",
      "zh-CN": "以具类型的 ESM 函数解析、排版、预览、导出与验证演示文稿。",
      ja: "プレゼンテーションの解析、描画、プレビュー、書き出し、検証を行う型付きの ESM 関数です。",
    },
    sections: [
      {
        id: "functions",
        title: { en: "Functions", "zh-TW": "函式", "zh-CN": "函数", ja: "関数" },
        body: {
          en: "Import from ./dist/index.js after building the repository.",
          "zh-TW": "建置 repository 後，從 ./dist/index.js 匯入。",
          "zh-CN": "构建仓库后，从 ./dist/index.js 导入。",
          ja: "リポジトリをビルドした後、./dist/index.js からインポートします。",
        },
        table: {
          caption: { en: "Public functions", "zh-TW": "公開函式", "zh-CN": "公开函数", ja: "公開関数" },
          headers: [
            { en: "Function", "zh-TW": "函式", "zh-CN": "函数", ja: "関数" },
            { en: "Purpose", "zh-TW": "用途", "zh-CN": "用途", ja: "用途" },
          ],
          rows: [
            ["parsePresentation", { en: "Validate input and return typed data, or throw", "zh-TW": "驗證輸入並回傳具型別的資料，失敗時拋出錯誤", "zh-CN": "验证输入并返回具类型的数据，失败时抛出错误", ja: "入力を検証して型付きデータを返す。失敗時は例外" }],
            ["renderPresentation", { en: "Return a complete HTML document", "zh-TW": "回傳完整的 HTML 文件", "zh-CN": "返回完整的 HTML 文档", ja: "完全な HTML ドキュメントを返す" }],
            ["previewPresentation", { en: "Start a loopback Vite server for a JSON file", "zh-TW": "為 JSON 檔啟動僅限本機的 Vite 伺服器", "zh-CN": "为 JSON 文件启动仅限本机的 Vite 服务器", ja: "JSON ファイル用のループバック Vite サーバーを起動" }],
            ["exportPresentation", { en: "Export JSON, HTML, or a URL to PPTX and return layout issues", "zh-TW": "將 JSON、HTML 或 URL 匯出為 PPTX，並回傳版面問題", "zh-CN": "将 JSON、HTML 或 URL 导出为 PPTX，并返回版面问题", ja: "JSON、HTML、URL を PPTX に書き出し、レイアウトの問題を返す" }],
            ["validateLayout · validatePptx", { en: "Browser layout checks and offline PPTX structure checks", "zh-TW": "瀏覽器版面檢查與離線 PPTX 結構檢查", "zh-CN": "浏览器版面检查与离线 PPTX 结构检查", ja: "ブラウザのレイアウト検査とオフラインの PPTX 構造検査" }],
          ],
        },
      },
      {
        id: "example",
        title: { en: "Example", "zh-TW": "範例", "zh-CN": "示例", ja: "例" },
        body: {
          en: "Save this as example.mjs in the repository root and run node example.mjs.",
          "zh-TW": "在 repository 根目錄存成 example.mjs，再執行 node example.mjs。",
          "zh-CN": "在仓库根目录保存为 example.mjs，再运行 node example.mjs。",
          ja: "リポジトリのルートに example.mjs として保存し、node example.mjs で実行します。",
        },
        code: `import { readFile } from 'node:fs/promises';
import { exportPresentation, validatePptx } from './dist/index.js';

const issues = await exportPresentation('examples/basic/presentation.json', {
  output: 'presentation.pptx',
});
console.log(issues);

const report = validatePptx(await readFile('presentation.pptx'));
if (!report.valid) process.exitCode = 1;`,
      },
      {
        id: "export-options",
        title: { en: "Export options", "zh-TW": "匯出選項", "zh-CN": "导出选项", ja: "書き出しオプション" },
        body: {
          en: "Options for exportPresentation(input, options). Failures throw; returned issues are layout diagnostics.",
          "zh-TW": "exportPresentation(input, options) 的選項。失敗時會拋出錯誤，回傳值是版面診斷結果。",
          "zh-CN": "exportPresentation(input, options) 的选项。失败时会抛出错误，返回值是版面诊断结果。",
          ja: "exportPresentation(input, options) のオプションです。失敗時は例外を投げ、戻り値はレイアウト診断です。",
        },
        table: {
          caption: { en: "Export options", "zh-TW": "匯出選項", "zh-CN": "导出选项", ja: "書き出しオプション" },
          headers: [
            { en: "Option", "zh-TW": "選項", "zh-CN": "选项", ja: "オプション" },
            { en: "Default", "zh-TW": "預設", "zh-CN": "默认", ja: "既定値" },
            { en: "Meaning", "zh-TW": "說明", "zh-CN": "说明", ja: "意味" },
          ],
          rows: [
            ["output", { en: "Required", "zh-TW": "必填", "zh-CN": "必填", ja: "必須" }, { en: "Output PPTX path", "zh-TW": "輸出的 PPTX 路徑", "zh-CN": "输出的 PPTX 路径", ja: "出力する PPTX のパス" }],
            ["selector", "[data-pptx=\"slide\"], .slide", { en: "Slide elements in document order", "zh-TW": "依文件順序選取的投影片元素", "zh-CN": "依文档顺序选取的幻灯片元素", ja: "文書順に取得するスライド要素" }],
            ["metadata", { en: "From the document", "zh-TW": "取自文件", "zh-CN": "取自文档", ja: "ドキュメントから取得" }, { en: "title, author, subject, and lang overrides", "zh-TW": "覆寫 title、author、subject 與 lang", "zh-CN": "覆盖 title、author、subject 与 lang", ja: "title、author、subject、lang の上書き" }],
            ["validate", "true", { en: "Layout errors block export; false still collects issues", "zh-TW": "版面錯誤會阻止匯出；設為 false 仍會收集問題", "zh-CN": "版面错误会阻止导出；设为 false 仍会收集问题", ja: "レイアウトエラーで書き出しを止める。false でも問題は収集する" }],
            ["timeout", "60000", { en: "Playwright timeout in milliseconds", "zh-TW": "Playwright 逾時，單位毫秒", "zh-CN": "Playwright 超时，单位毫秒", ja: "Playwright のタイムアウト（ミリ秒）" }],
            ["textSlack", "{ ratio: 0.06, min: 91440, max: 457200 }", { en: "Extra text box width in EMU; false keeps converter sizes", "zh-TW": "文字框加寬量，單位 EMU；false 維持轉換器原尺寸", "zh-CN": "文本框加宽量，单位 EMU；false 保持转换器原尺寸", ja: "テキストボックスに加える幅（EMU）。false で変換器のサイズを維持" }],
            ["eastAsianFont", "Microsoft JhengHei", { en: "PowerPoint East Asian font for CJK text", "zh-TW": "PowerPoint 中 CJK 文字使用的東亞字型", "zh-CN": "PowerPoint 中 CJK 文字使用的东亚字体", ja: "CJK テキストに使う PowerPoint の東アジア言語フォント" }],
          ],
        },
      },
    ],
  },
  {
    id: "validation",
    category: "reference",
    title: { en: "Validation", "zh-TW": "驗證", "zh-CN": "验证", ja: "検証" },
    summary: {
      en: "Content, layout, package structure, and visual comparison are checked separately. Passing one does not imply passing the others.",
      "zh-TW": "內容、版面、檔案結構與視覺比對分開檢查，通過其中一項不代表其他項目也通過。",
      "zh-CN": "内容、版面、文件结构与视觉比对分开检查，通过其中一项不代表其他项目也通过。",
      ja: "内容、レイアウト、パッケージ構造、視覚比較はそれぞれ別に検査されます。1 つに合格しても他に合格したことにはなりません。",
    },
    sections: [
      {
        id: "layout-rules",
        title: { en: "Layout rules", "zh-TW": "版面規則", "zh-CN": "版面规则", ja: "レイアウトのルール" },
        body: {
          en: "validateLayout(page, options) checks rendered slides in Chromium. Errors block export; warnings are reported.",
          "zh-TW": "validateLayout(page, options) 在 Chromium 中檢查排版後的投影片。錯誤會阻止匯出，警告則會回報。",
          "zh-CN": "validateLayout(page, options) 在 Chromium 中检查排版后的幻灯片。错误会阻止导出，警告则会报告。",
          ja: "validateLayout(page, options) は Chromium で描画されたスライドを検査します。エラーは書き出しを止め、警告は報告されます。",
        },
        table: {
          caption: { en: "Layout rules", "zh-TW": "版面規則", "zh-CN": "版面规则", ja: "レイアウトのルール" },
          headers: [
            { en: "Rule", "zh-TW": "規則", "zh-CN": "规则", ja: "ルール" },
            { en: "Severity", "zh-TW": "等級", "zh-CN": "等级", ja: "重大度" },
            { en: "Checks", "zh-TW": "檢查內容", "zh-CN": "检查内容", ja: "検査内容" },
          ],
          rows: [
            ["dimensions", "error", { en: "Slide box differs from the canvas", "zh-TW": "投影片尺寸與畫布不同", "zh-CN": "幻灯片尺寸与画布不同", ja: "スライドの寸法がキャンバスと異なる" }],
            ["boundaries", "error", { en: "Content extends beyond the slide", "zh-TW": "內容超出投影片範圍", "zh-CN": "内容超出幻灯片范围", ja: "内容がスライドの外にはみ出す" }],
            ["overflow", "error", { en: "Clipped or scrolling content", "zh-TW": "內容被裁切或出現捲動", "zh-CN": "内容被裁切或出现滚动", ja: "内容が切れる、またはスクロールが発生する" }],
            ["images", "error", { en: "Missing or undecodable images", "zh-TW": "圖片遺失或無法解碼", "zh-CN": "图片缺失或无法解码", ja: "画像が見つからない、またはデコードできない" }],
            ["fonts", "warning", { en: "First named text font is unavailable", "zh-TW": "第一個指定的字型無法使用", "zh-CN": "第一个指定的字体无法使用", ja: "最初に指定したフォントが使えない" }],
            ["overlap", "warning", { en: "Visible text or media boxes intersect", "zh-TW": "可見的文字或媒體區塊互相重疊", "zh-CN": "可见的文字或媒体区块互相重叠", ja: "表示中のテキストやメディアが重なる" }],
          ],
        },
      },
      {
        id: "pptx-structure",
        title: { en: "PPTX structure", "zh-TW": "PPTX 結構", "zh-CN": "PPTX 结构", ja: "PPTX の構造" },
        body: {
          en: "validatePptx(data) performs offline ZIP and XML checks: required parts, relationships, content types, slide references, and dimensions. It is not full OOXML schema validation or an Office acceptance test.",
          "zh-TW": "validatePptx(data) 進行離線 ZIP 與 XML 檢查：必要的組件、關聯、內容類型、投影片參照與尺寸。這不是完整的 OOXML schema 驗證，也不是 Office 相容性測試。",
          "zh-CN": "validatePptx(data) 进行离线 ZIP 与 XML 检查：必要的部件、关系、内容类型、幻灯片引用与尺寸。这不是完整的 OOXML schema 验证，也不是 Office 兼容性测试。",
          ja: "validatePptx(data) は ZIP と XML をオフラインで検査します。必須パーツ、リレーションシップ、コンテンツタイプ、スライド参照、寸法が対象です。完全な OOXML スキーマ検証や Office の受け入れテストではありません。",
        },
        code: `{
  "valid": true,
  "slideCount": 6,
  "editableTextCount": 35,
  "shapeCount": 52,
  "issues": []
}`,
      },
      {
        id: "visual",
        title: { en: "Optional visual comparison", "zh-TW": "選用的視覺比對", "zh-CN": "可选的视觉比对", ja: "任意の視覚比較" },
        body: {
          en: "comparePresentation renders the PPTX with LibreOffice Impress and Poppler, captures the source slides, and writes per-slide difference reports. Both tools must be installed separately.",
          "zh-TW": "comparePresentation 會用 LibreOffice Impress 與 Poppler 轉出 PPTX 畫面、擷取原始投影片，並輸出每頁的差異報告。這兩個工具需要另外安裝。",
          "zh-CN": "comparePresentation 会用 LibreOffice Impress 与 Poppler 渲染 PPTX、截取原始幻灯片，并输出每页的差异报告。这两个工具需要另外安装。",
          ja: "comparePresentation は LibreOffice Impress と Poppler で PPTX を描画し、元のスライドをキャプチャして、スライドごとの差分レポートを書き出します。どちらのツールも別途インストールが必要です。",
        },
        code: `import { comparePresentation } from './dist/index.js';

const reports = await comparePresentation(
  'presentation.html',
  'presentation.pptx',
  'review/comparison',
);
console.log(reports.map(report => report.differenceRatio));`,
        note: {
          en: "Image differences are rendering differences, not automatically structural defects. LibreOffice is not Microsoft PowerPoint, and no pass threshold is imposed.",
          "zh-TW": "影像差異屬於排版差異，不等於結構錯誤。LibreOffice 不是 Microsoft PowerPoint，也沒有預設的通過門檻。",
          "zh-CN": "图像差异属于渲染差异，不等于结构错误。LibreOffice 不是 Microsoft PowerPoint，也没有预设的通过阈值。",
          ja: "画像の差異は描画の違いであり、自動的に構造上の欠陥を意味するものではありません。LibreOffice は Microsoft PowerPoint ではなく、合否のしきい値も設けていません。",
        },
      },
    ],
  },
  {
    id: "limitations",
    category: "project",
    title: { en: "Limitations and security", "zh-TW": "限制與安全性", "zh-CN": "限制与安全性", ja: "制限とセキュリティ" },
    summary: {
      en: "What Phase 1 does not do, how browser and PowerPoint rendering differ, and the trust model for export.",
      "zh-TW": "第一階段不做哪些事、瀏覽器與 PowerPoint 的排版差異，以及匯出的信任模型。",
      "zh-CN": "第一阶段不做哪些事、浏览器与 PowerPoint 的渲染差异，以及导出的信任模型。",
      ja: "フェーズ 1 で行わないこと、ブラウザと PowerPoint の描画の違い、書き出しの信頼モデルについて説明します。",
    },
    sections: [
      {
        id: "boundaries",
        title: { en: "Phase 1 boundaries", "zh-TW": "第一階段的界線", "zh-CN": "第一阶段的边界", ja: "フェーズ 1 の境界" },
        body: {
          en: "Keep these limits in mind when you plan a deck:",
          "zh-TW": "規劃簡報時請留意以下限制：",
          "zh-CN": "规划演示文稿时请留意以下限制：",
          ja: "デッキを計画するときは次の制限に注意してください。",
        },
        bullets: {
          en: [
            "A fixed set of 16:9 layout families and variants; templates are data only; no slide editor or arbitrary styling",
            "Charts are HTML/CSS bars, not native Office charts",
            "No automatic raster fallback for unsupported content",
            "Built HTML uses a local file base and is not portable",
            "Backgrounds are pictures, and studio links need network access to the studio",
          ],
          "zh-TW": [
            "一組固定的 16:9 版型系列與變化；範本只有資料；沒有投影片編輯器，也不支援任意樣式",
            "圖表是 HTML/CSS 長條，不是 Office 原生圖表",
            "不支援的內容不會自動轉成點陣圖",
            "建置出的 HTML 使用本機檔案路徑，無法直接搬到別處使用",
            "背景是圖片；使用 studio 連結時需要能連線到 studio",
          ],
          "zh-CN": [
            "一组固定的 16:9 版式系列与变体；模板只有数据；没有幻灯片编辑器，也不支持任意样式",
            "图表是 HTML/CSS 长条，不是 Office 原生图表",
            "不支持的内容不会自动转成位图",
            "构建出的 HTML 使用本机文件路径，无法直接搬到别处使用",
            "背景是图片；使用 studio 链接时需要能连接到 studio",
          ],
          ja: [
            "16:9 のレイアウトファミリーとバリアントは固定。テンプレートはデータのみ。スライドエディターや任意のスタイル指定はない",
            "グラフは HTML/CSS のバーで、Office ネイティブのグラフではない",
            "未対応の内容を自動でラスター画像に置き換える機能はない",
            "ビルドした HTML はローカルのファイルパスを基準にしており、持ち運べない",
            "背景は画像になり、studio のリンクには studio へのネットワーク接続が必要",
          ],
        },
      },
      {
        id: "fonts-fitting",
        title: { en: "Fonts and text fitting", "zh-TW": "字型與文字框", "zh-CN": "字体与文本框", ja: "フォントとテキストの収まり" },
        body: {
          en: "PowerPoint measures text slightly differently from Chromium. Export widens invisible text boxes by 6% of their width, between 0.1 and 0.5 inches, so short labels do not wrap. Multi-line paragraphs may wrap a little later than in HTML.",
          "zh-TW": "PowerPoint 量測文字的方式與 Chromium 略有不同。匯出時會把不可見的文字框加寬其寬度的 6%（0.1 到 0.5 吋之間），避免短標籤換行。多行段落的換行位置可能比 HTML 稍晚。",
          "zh-CN": "PowerPoint 测量文字的方式与 Chromium 略有不同。导出时会把不可见的文本框加宽其宽度的 6%（0.1 到 0.5 英寸之间），避免短标签换行。多行段落的换行位置可能比 HTML 稍晚。",
          ja: "PowerPoint のテキスト計測は Chromium とわずかに異なります。書き出し時に不可視のテキストボックスを幅の 6%（0.1〜0.5 インチ）広げ、短いラベルが折り返さないようにします。複数行の段落は HTML より少し遅れて折り返すことがあります。",
        },
      },
      {
        id: "text-outlines",
        title: { en: "Text outlines", "zh-TW": "文字邊線", "zh-CN": "文字描边", ja: "文字の輪郭線" },
        body: {
          en: "The template token border.title-outline (0–6 px) strokes slide and cover titles in the palette's outline color. Export writes CSS -webkit-text-stroke as a native PowerPoint text outline on the editable run. The stroke covers half of each glyph edge, so keep it to 2–4 px for CJK titles. LibreOffice does not draw these outlines, and text-shadow and other text effects stay HTML-only.",
          "zh-TW": "範本 token border.title-outline（0–6 px）會用配色中的 outline 顏色替投影片與封面標題加上邊線。匯出時，CSS 的 -webkit-text-stroke 會寫成 PowerPoint 原生的文字外框，文字仍可編輯。邊線有一半會蓋在字形上，中文標題建議 2–4 px。LibreOffice 不會畫出這種外框；text-shadow 等其他文字特效只在 HTML 中顯示。",
          "zh-CN": "模板 token border.title-outline（0–6 px）会用配色中的 outline 颜色为幻灯片与封面标题加上描边。导出时，CSS 的 -webkit-text-stroke 会写成 PowerPoint 原生的文字轮廓，文字仍可编辑。描边有一半会盖在字形上，中文标题建议 2–4 px。LibreOffice 不会画出这种轮廓；text-shadow 等其他文字特效只在 HTML 中显示。",
          ja: "テンプレートのトークン border.title-outline（0〜6 px）は、配色の outline の色でスライドと表紙のタイトルに輪郭線を付けます。書き出し時、CSS の -webkit-text-stroke は編集可能なテキストのまま PowerPoint ネイティブの文字の輪郭になります。線の半分は字形に重なるため、CJK のタイトルでは 2〜4 px にしてください。LibreOffice はこの輪郭を描画せず、text-shadow などほかの文字効果は HTML でのみ表示されます。",
        },
      },
      {
        id: "trust",
        title: { en: "Trust model", "zh-TW": "信任模型", "zh-CN": "信任模型", ja: "信頼モデル" },
        body: {
          en: "Export launches Chromium, runs page scripts, loads subresources, and allows network access. SlideForge is a developer CLI, not a multi-tenant export service for untrusted documents. Preview binds to 127.0.0.1 but serves every file in the JSON directory.",
          "zh-TW": "匯出會啟動 Chromium、執行頁面腳本、載入子資源並允許連網。SlideForge 是開發者用的 CLI，不是處理不受信任文件的多租戶匯出服務。預覽只綁定 127.0.0.1，但會提供 JSON 目錄中的所有檔案。",
          "zh-CN": "导出会启动 Chromium、运行页面脚本、加载子资源并允许联网。SlideForge 是开发者用的 CLI，不是处理不受信任文件的多租户导出服务。预览只绑定 127.0.0.1，但会提供 JSON 目录中的所有文件。",
          ja: "書き出しは Chromium を起動し、ページのスクリプトを実行し、サブリソースを読み込み、ネットワークアクセスを許可します。SlideForge は開発者向けの CLI であり、信頼できない文書を扱うマルチテナントの書き出しサービスではありません。プレビューは 127.0.0.1 にのみバインドしますが、JSON のディレクトリ内のすべてのファイルを配信します。",
        },
        note: {
          en: "Report vulnerabilities privately through GitHub security advisories, not public issues.",
          "zh-TW": "發現安全性漏洞時，請透過 GitHub security advisory 私下回報，不要開公開 issue。",
          "zh-CN": "发现安全漏洞时，请通过 GitHub security advisory 私下报告，不要开公开 issue。",
          ja: "脆弱性は公開の issue ではなく、GitHub のセキュリティアドバイザリーから非公開で報告してください。",
        },
        links: [
          { label: { en: "Security policy", "zh-TW": "安全性政策", "zh-CN": "安全策略", ja: "セキュリティポリシー" }, href: `${repositoryUrl}/blob/main/SECURITY.md` },
          { label: { en: "Full limitations", "zh-TW": "完整限制說明", "zh-CN": "完整限制说明", ja: "制限の詳細" }, href: `${repositoryUrl}/blob/main/docs/limitations.md` },
        ],
      },
    ],
  },
  {
    id: "contributing",
    category: "project",
    title: { en: "Contributing", "zh-TW": "參與貢獻", "zh-CN": "参与贡献", ja: "コントリビュート" },
    summary: {
      en: "Set up the development environment, run the checks, and open a pull request.",
      "zh-TW": "建立開發環境、執行檢查，並提出 pull request。",
      "zh-CN": "搭建开发环境、运行检查，并提交 pull request。",
      ja: "開発環境を整え、検査を実行し、プルリクエストを作成します。",
    },
    sections: [
      {
        id: "development",
        title: { en: "Development", "zh-TW": "開發", "zh-CN": "开发", ja: "開発" },
        body: {
          en: "Use Node.js 24 or newer and the checked-in lockfile.",
          "zh-TW": "使用 Node.js 24 以上與 repository 內的 lockfile。",
          "zh-CN": "使用 Node.js 24 以上与仓库内的 lockfile。",
          ja: "Node.js 24 以降と、リポジトリに含まれるロックファイルを使います。",
        },
        code: `PUPPETEER_SKIP_DOWNLOAD=true npm ci
npx playwright install --with-deps chromium
npm run check
npm run build
npm test`,
      },
      {
        id: "documentation-site",
        title: { en: "Documentation site", "zh-TW": "文件網站", "zh-CN": "文档网站", ja: "ドキュメントサイト" },
        body: {
          en: "This site lives in site/ with its own lockfile. Content for every language is in site/src/content.ts. The main branch deploys it to Cloudflare Pages.",
          "zh-TW": "此網站位於 site/，有自己的 lockfile。各語言的內容都在 site/src/content.ts。main 分支會將它部署到 Cloudflare Pages。",
          "zh-CN": "此网站位于 site/，有自己的 lockfile。各语言的内容都在 site/src/content.ts。main 分支会将它部署到 Cloudflare Pages。",
          ja: "このサイトは独自のロックファイルを持つ site/ にあります。全言語の内容は site/src/content.ts にあります。main ブランチから Cloudflare Pages にデプロイされます。",
        },
        code: `npm --prefix site ci
npm --prefix site run dev
npm --prefix site run build`,
      },
      {
        id: "pull-requests",
        title: { en: "Pull requests", "zh-TW": "Pull Request", "zh-CN": "Pull Request", ja: "プルリクエスト" },
        body: {
          en: "Keep changes small, typed, and reproducible:",
          "zh-TW": "變更請保持精簡、具型別且可重現：",
          "zh-CN": "变更请保持精简、具类型且可重现：",
          ja: "変更は小さく、型付きで、再現可能に保ってください。",
        },
        bullets: {
          en: [
            "Change the schema, renderer, tests, and affected documentation together",
            "Reuse tokens, components, and layouts instead of one-off styling",
            "Describe exactly which checks ran, including failures",
            "Do not commit generated decks, screenshots, or credentials",
          ],
          "zh-TW": [
            "schema、排版、測試與相關文件一起修改",
            "重用 tokens、元件與版型，不要寫一次性的樣式",
            "具體說明執行了哪些檢查，包括失敗的項目",
            "不要 commit 產生的簡報、截圖或憑證",
          ],
          "zh-CN": [
            "schema、排版、测试与相关文档一起修改",
            "复用 tokens、组件与版式，不要写一次性的样式",
            "具体说明运行了哪些检查，包括失败的项目",
            "不要提交生成的演示文稿、截图或凭据",
          ],
          ja: [
            "スキーマ、描画、テスト、関連ドキュメントをまとめて変更する",
            "その場限りのスタイルではなく、トークン、コンポーネント、レイアウトを再利用する",
            "実行した検査を失敗も含めて正確に記載する",
            "生成したデッキ、スクリーンショット、認証情報をコミットしない",
          ],
        },
        links: [
          { label: { en: "CONTRIBUTING.md", "zh-TW": "CONTRIBUTING.md", "zh-CN": "CONTRIBUTING.md", ja: "CONTRIBUTING.md" }, href: `${repositoryUrl}/blob/main/CONTRIBUTING.md` },
          { label: { en: "Code of conduct", "zh-TW": "行為準則", "zh-CN": "行为准则", ja: "行動規範" }, href: `${repositoryUrl}/blob/main/CODE_OF_CONDUCT.md` },
        ],
      },
      {
        id: "license",
        title: { en: "License", "zh-TW": "授權", "zh-CN": "许可证", ja: "ライセンス" },
        body: {
          en: "SlideForge is released under the Apache License 2.0, with a NOTICE file. Bundled third-party packages keep their own terms, listed in THIRD_PARTY_NOTICES.md.",
          "zh-TW": "SlideForge 以 Apache License 2.0 釋出，並附有 NOTICE 檔。打包在內的第三方套件保留各自的授權條款，列於 THIRD_PARTY_NOTICES.md。",
          "zh-CN": "SlideForge 以 Apache License 2.0 发布，并附有 NOTICE 文件。打包在内的第三方包保留各自的许可条款，列于 THIRD_PARTY_NOTICES.md。",
          ja: "SlideForge は Apache License 2.0 で公開されており、NOTICE ファイルが付属します。同梱されるサードパーティーパッケージはそれぞれの条件に従い、THIRD_PARTY_NOTICES.md に記載されています。",
        },
        links: [
          { label: { en: "Apache-2.0 license", "zh-TW": "Apache-2.0 授權", "zh-CN": "Apache-2.0 许可证", ja: "Apache-2.0 ライセンス" }, href: `${repositoryUrl}/blob/main/LICENSE` },
          { label: { en: "NOTICE", "zh-TW": "NOTICE", "zh-CN": "NOTICE", ja: "NOTICE" }, href: `${repositoryUrl}/blob/main/NOTICE` },
          { label: { en: "Third-party notices", "zh-TW": "第三方授權聲明", "zh-CN": "第三方许可声明", ja: "サードパーティーライセンス表示" }, href: `${repositoryUrl}/blob/main/THIRD_PARTY_NOTICES.md` },
        ],
      },
    ],
  },
];
