import {
  Bars3Icon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentIcon,
  CodeBracketIcon,
  PresentationChartBarIcon,
  ArrowTopRightOnSquareIcon,
  LanguageIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  SunIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import { categories, cellText, type Locale, type Page, type Section, pages, repositoryUrl } from "./content";

const labels: Record<Locale, Record<string, string>> = {
  en: { search: "Search documentation", close: "Close search", onPage: "On this page", menu: "Open navigation", copy: "Copy code", copied: "Copied", previous: "Previous", next: "Next", results: "Search results", noResults: "No matching documentation", license: "MIT License", notices: "Third-party notices", language: "Change language", theme: "Toggle theme" },
  "zh-TW": { search: "搜尋文件", close: "關閉搜尋", onPage: "本頁內容", menu: "開啟導覽", copy: "複製程式碼", copied: "已複製", previous: "上一頁", next: "下一頁", results: "搜尋結果", noResults: "找不到符合的文件", license: "MIT 授權", notices: "第三方授權聲明", language: "切換語言", theme: "切換主題" },
  "zh-CN": { search: "搜索文档", close: "关闭搜索", onPage: "本页内容", menu: "打开导航", copy: "复制代码", copied: "已复制", previous: "上一页", next: "下一页", results: "搜索结果", noResults: "找不到匹配的文档", license: "MIT 许可证", notices: "第三方许可声明", language: "切换语言", theme: "切换主题" },
  ja: { search: "ドキュメントを検索", close: "検索を閉じる", onPage: "このページの内容", menu: "ナビゲーションを開く", copy: "コードをコピー", copied: "コピーしました", previous: "前のページ", next: "次のページ", results: "検索結果", noResults: "一致するドキュメントがありません", license: "MIT ライセンス", notices: "サードパーティーライセンス表示", language: "言語を切り替える", theme: "テーマを切り替える" },
};

const localeOptions: Array<{ value: Locale; short: string; label: string }> = [
  { value: "en", short: "EN", label: "English" },
  { value: "zh-TW", short: "繁中", label: "繁體中文" },
  { value: "zh-CN", short: "简中", label: "简体中文" },
  { value: "ja", short: "日本語", label: "日本語" },
];

const siteUrl = "https://slideforge.gordonkit.com";

function routeHref(locale: Locale, pageId: string): string {
  return `/${locale}/${pageId}/`;
}

function pageTitle(page: Page, locale: Locale): string {
  return `${page.heading?.[locale] ?? page.title[locale]} | SlideForge Docs`;
}

function updateMeta(selector: string, content: string): void {
  document.head.querySelector<HTMLMetaElement>(selector)?.setAttribute("content", content);
}

function updateAlternate(hreflang: string, href: string): void {
  document.head.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${hreflang}"]`)?.setAttribute("href", href);
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private windows; preferences then last for the visit.
  }
}

function readRoute(): { locale?: Locale; pageId?: string } {
  const [localeSegment, pageSegment] = location.pathname.split("/").filter(Boolean);
  return {
    locale: localeOptions.find((option) => option.value === localeSegment)?.value,
    pageId: pages.some((item) => item.id === pageSegment) ? pageSegment : undefined,
  };
}

function sectionText(section: Section, locale: Locale): string[] {
  return [
    section.title[locale],
    section.body[locale],
    ...(section.bullets?.[locale] ?? []),
    ...(section.interfaces?.flatMap((entry) => [entry.title[locale], entry.label[locale], entry.body[locale]]) ?? []),
    ...(section.table?.rows.flatMap((row) => row.map((cell) => cellText(cell, locale))) ?? []),
    ...(section.images?.flatMap((image) => [image.alt[locale], image.caption === undefined ? "" : cellText(image.caption, locale)]) ?? []),
  ];
}

function Logo() {
  return (
    <span className="whitespace-nowrap text-sm font-normal tracking-normal text-ink sm:text-base dark:text-white">
      SlideForge <span className="text-slate-400">Docs</span>
    </span>
  );
}

function App() {
  const initialRoute = readRoute();
  const storedLocale = readStorage("sf-locale");
  const [locale, setLocale] = useState<Locale>(() => initialRoute.locale ?? localeOptions.find((option) => option.value === storedLocale)?.value ?? "en");
  const [dark, setDark] = useState(() => readStorage("sf-theme") === "dark" || (!readStorage("sf-theme") && matchMedia("(prefers-color-scheme: dark)").matches));
  const [pageId, setPageId] = useState(() => initialRoute.pageId ?? "overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const pageIndex = Math.max(0, pages.findIndex((item) => item.id === pageId));
  const page = pages[pageIndex];
  const t = labels[locale];

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    writeStorage("sf-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    document.documentElement.lang = locale;
    writeStorage("sf-locale", locale);
    const title = pageTitle(page, locale);
    const description = page.summary[locale];
    const canonicalUrl = `${siteUrl}${routeHref(locale, page.id)}`;
    document.title = title;
    document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute("href", canonicalUrl);
    updateAlternate("en", `${siteUrl}${routeHref("en", page.id)}`);
    updateAlternate("zh-Hant-TW", `${siteUrl}${routeHref("zh-TW", page.id)}`);
    updateAlternate("zh-Hans-CN", `${siteUrl}${routeHref("zh-CN", page.id)}`);
    updateAlternate("ja", `${siteUrl}${routeHref("ja", page.id)}`);
    updateAlternate("x-default", `${siteUrl}${routeHref("en", page.id)}`);
    updateMeta('meta[name="description"]', description);
    updateMeta('meta[property="og:title"]', title);
    updateMeta('meta[property="og:description"]', description);
    updateMeta('meta[property="og:url"]', canonicalUrl);
    updateMeta('meta[name="twitter:title"]', title);
    updateMeta('meta[name="twitter:description"]', description);
  }, [locale, page]);

  useEffect(() => {
    const onRouteChange = () => {
      const route = readRoute();
      setLocale(route.locale ?? "en");
      setPageId(route.pageId ?? "overview");
    };
    addEventListener("popstate", onRouteChange);
    return () => removeEventListener("popstate", onRouteChange);
  }, []);

  const navigate = (id: string, targetLocale: Locale = locale) => {
    history.pushState(null, "", routeHref(targetLocale, id));
    setLocale(targetLocale);
    setPageId(id);
    setMobileOpen(false);
    scrollTo({ top: 0, behavior: "smooth" });
  };

  const needle = query.trim().toLowerCase();
  const matches = needle
    ? pages.filter((item) => [item.title[locale], item.summary[locale], ...item.sections.flatMap((section) => sectionText(section, locale))].join(" ").toLowerCase().includes(needle))
    : pages;

  return (
    <div className="min-h-screen bg-white text-slate-700 antialiased dark:bg-[#11161d] dark:text-slate-300">
      <header className="fixed inset-x-0 top-0 z-40 h-28 border-b border-slate-200 bg-white/95 backdrop-blur-sm lg:h-16 dark:border-slate-800 dark:bg-[#11161d]/95">
        <div className="flex h-full flex-wrap items-center px-4 lg:flex-nowrap lg:px-6">
          <button className="mr-2 p-1.5 text-slate-500 sm:mr-3 lg:hidden" onClick={() => setMobileOpen(true)} aria-label={t.menu}><Bars3Icon className="h-6 w-6" /></button>
          <a href={routeHref(locale, "overview")} onClick={(event) => { event.preventDefault(); navigate("overview"); }}><Logo /></a>
          <button className="order-3 mb-2 flex h-9 w-full items-center gap-2 border border-slate-300 bg-slate-50 px-3 text-sm text-slate-500 transition hover:border-slate-400 lg:order-none lg:mb-0 lg:ml-auto lg:w-64 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400" onClick={() => setSearchOpen(true)}>
            <MagnifyingGlassIcon className="h-4 w-4" /><span className="truncate">{t.search}</span>
          </button>
          <div className="ml-auto flex items-center border-l border-slate-200 pl-1 sm:pl-2 lg:ml-3 lg:pl-3 dark:border-slate-800">
            <LocaleMenu locale={locale} label={t.language} onSelect={(value) => navigate(page.id, value)} />
            <button className="icon-button" onClick={() => setDark(!dark)} aria-label={t.theme}>{dark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}</button>
            <a className="icon-button" href={repositoryUrl} aria-label="GitHub"><CodeBracketIcon className="h-5 w-5" /></a>
          </div>
        </div>
      </header>

      <aside className={`scrollbar-hidden fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto overscroll-y-contain border-r border-slate-200 bg-mist px-5 pb-8 pt-5 transition-transform dark:border-slate-800 dark:bg-[#151b23] lg:top-16 lg:z-30 lg:w-64 lg:translate-x-0 lg:pt-7 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-7 flex items-center justify-between lg:hidden"><Logo /><button className="icon-button" onClick={() => setMobileOpen(false)} aria-label={t.close}><XMarkIcon className="h-5 w-5" /></button></div>
        <nav className="space-y-7">
          {categories.map((category) => (
            <div key={category.id}>
              <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-500">{category.label[locale]}</p>
              <div className="space-y-0.5">
                {pages.filter((item) => item.category === category.id).map((item) => (
                  <a key={item.id} href={routeHref(locale, item.id)} onClick={(event) => { event.preventDefault(); navigate(item.id); }} className={`block w-full border-l-2 px-3 py-2 text-left text-sm transition ${item.id === page.id ? "border-signal bg-white font-semibold text-ink shadow-xs dark:bg-slate-900 dark:text-white" : "border-transparent text-slate-600 hover:border-slate-300 hover:text-ink dark:text-slate-400 dark:hover:text-white"}`}>{item.title[locale]}</a>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      {mobileOpen && <button className="fixed inset-0 z-40 bg-ink/50 lg:hidden" onClick={() => setMobileOpen(false)} aria-label={t.close} />}

      <main className="pt-28 lg:pl-64 lg:pt-16 xl:pr-60">
        <article className="mx-auto max-w-4xl px-6 py-12 sm:px-10 lg:py-16">
          <div className="mb-10 border-b border-slate-200 pb-9 dark:border-slate-800">
            <p className="mb-3 flex items-center gap-2 font-mono text-xs font-semibold uppercase text-leaf dark:text-blue-400"><PresentationChartBarIcon className="h-4 w-4" />{categories.find((category) => category.id === page.category)?.label[locale]}</p>
            <h1 className="text-4xl font-semibold text-ink dark:text-white sm:text-5xl">{page.heading?.[locale] ?? page.title[locale]}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-400">{page.summary[locale]}</p>
          </div>
          <div className="space-y-12">
            {page.sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <h2 className="mb-4 text-2xl font-semibold text-ink dark:text-white">{section.title[locale]}</h2>
                <SectionBody section={section} locale={locale} />
                {section.interfaces && <InterfaceOptions interfaces={section.interfaces} locale={locale} />}
                {section.table && <DataTable table={section.table} locale={locale} />}
                {section.images && <Screenshots images={section.images} locale={locale} />}
                {section.bullets && (
                  <ul className="mt-5 list-disc space-y-2 pl-6 leading-7 marker:text-leaf">
                    {section.bullets[locale].map((item) => <li key={item}>{item}</li>)}
                  </ul>
                )}
                {section.code && <CodeBlock code={section.code} copyLabel={t.copy} copiedLabel={t.copied} />}
                {section.links && <ResourceLinks links={section.links} locale={locale} />}
                {section.note && <div className="mt-5 border-l-4 border-leaf bg-blue-50 px-5 py-4 text-sm leading-6 text-blue-950 dark:bg-blue-950/30 dark:text-blue-100">{section.note[locale]}</div>}
              </section>
            ))}
          </div>
          <nav className="mt-16 grid grid-cols-2 gap-4 border-t border-slate-200 pt-8 dark:border-slate-800">
            {pageIndex > 0 ? <PageLink direction="previous" label={t.previous} title={pages[pageIndex - 1].title[locale]} href={routeHref(locale, pages[pageIndex - 1].id)} onClick={() => navigate(pages[pageIndex - 1].id)} /> : <span />}
            {pageIndex < pages.length - 1 && <PageLink direction="next" label={t.next} title={pages[pageIndex + 1].title[locale]} href={routeHref(locale, pages[pageIndex + 1].id)} onClick={() => navigate(pages[pageIndex + 1].id)} />}
          </nav>
        </article>
        <footer className="mx-auto flex max-w-4xl flex-wrap gap-x-5 gap-y-2 border-t border-slate-200 px-6 py-6 text-xs text-slate-500 sm:px-10 dark:border-slate-800 dark:text-slate-400">
          <a href={`${repositoryUrl}/blob/main/LICENSE`} target="_blank" rel="noreferrer" className="hover:text-ink dark:hover:text-white">{t.license}</a>
          <a href={`${repositoryUrl}/blob/main/THIRD_PARTY_NOTICES.md`} target="_blank" rel="noreferrer" className="hover:text-ink dark:hover:text-white">{t.notices}</a>
        </footer>
      </main>

      <aside className="fixed bottom-0 right-0 top-16 hidden w-60 border-l border-slate-200 px-7 py-12 dark:border-slate-800 xl:block">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{t.onPage}</p>
        <nav className="space-y-3 border-l border-slate-200 dark:border-slate-700">
          {page.sections.map((section) => <a key={section.id} href={`#${section.id}`} onClick={(event) => { event.preventDefault(); history.replaceState(null, "", `#${section.id}`); document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth" }); }} className="block border-l-2 border-transparent pl-4 text-sm text-slate-500 transition hover:border-signal hover:text-ink dark:hover:text-white">{section.title[locale]}</a>)}
        </nav>
      </aside>

      {searchOpen && <SearchDialog locale={locale} query={query} setQuery={setQuery} matches={matches} close={() => setSearchOpen(false)} navigate={navigate} />}
    </div>
  );
}

function LocaleMenu({ locale, label, onSelect }: { locale: Locale; label: string; onSelect: (value: Locale) => void }) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const current = localeOptions.find((option) => option.value === locale) ?? localeOptions[0];

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    addEventListener("pointerdown", onPointerDown);
    addEventListener("keydown", onKeyDown);
    return () => {
      removeEventListener("pointerdown", onPointerDown);
      removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={container}>
      <button type="button" className="icon-button" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <LanguageIcon className="h-5 w-5" />
        <span className="hidden text-xs font-semibold sm:block">{current.short}</span>
        <ChevronDownIcon className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="menu" aria-label={label} className="absolute right-0 top-full z-50 mt-1 w-44 border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-[#151b23]">
          {localeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={option.value === locale}
              lang={option.value}
              onClick={() => { setOpen(false); if (option.value !== locale) { onSelect(option.value); } }}
              className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800 ${option.value === locale ? "font-semibold text-ink dark:text-white" : "text-slate-600 dark:text-slate-400"}`}
            >
              {option.label}
              {option.value === locale && <CheckIcon className="h-4 w-4 shrink-0 text-leaf dark:text-blue-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionBody({ section, locale }: { section: Section; locale: Locale }) {
  const body = section.body[locale];
  const link = section.bodyLink;

  if (!link) {
    return <p className="leading-7">{body}</p>;
  }

  const [before, after] = body.split(link.label[locale]);
  return (
    <p className="leading-7">
      {before}
      <a href={link.href} target="_blank" rel="noreferrer" className="font-semibold text-leaf underline decoration-blue-300 underline-offset-4 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">{link.label[locale]}</a>
      {after}
    </p>
  );
}

function InterfaceOptions({ interfaces, locale }: { interfaces: NonNullable<Section["interfaces"]>; locale: Locale }) {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      {interfaces.map((item) => (
        <article key={item.title.en} className="flex min-w-0 flex-col border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/50">
          <p className="mb-2 font-mono text-[11px] font-semibold uppercase text-leaf dark:text-blue-400">{item.label[locale]}</p>
          <h3 className="text-lg font-semibold text-ink dark:text-white">{item.title[locale]}</h3>
          <p className="mt-3 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{item.body[locale]}</p>
          <code className="mt-5 block overflow-hidden text-ellipsis whitespace-nowrap border-t border-slate-200 pt-3 font-mono text-[11px] text-slate-600 dark:border-slate-700 dark:text-slate-300" title={item.example}>{item.example}</code>
        </article>
      ))}
    </div>
  );
}

function DataTable({ table, locale }: { table: NonNullable<Section["table"]>; locale: Locale }) {
  const headers = table.headers.map((header) => cellText(header, locale));
  return (
    <div className="mt-6 overflow-x-auto border border-slate-200 dark:border-slate-700">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{table.caption[locale]}</caption>
        <thead className="bg-ink text-white dark:bg-slate-800">
          <tr>{headers.map((header) => <th key={header} scope="col" className="border-r border-white/10 px-3 py-3 font-semibold last:border-r-0">{header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="align-top even:bg-slate-50 dark:even:bg-slate-900/50">
              {row.map((cell, index) => index === 0
                ? <th key={index} scope="row" className="whitespace-nowrap border-r border-slate-200 px-3 py-3 font-mono text-xs font-semibold text-ink dark:border-slate-700 dark:text-white">{cellText(cell, locale)}</th>
                : <td key={index} className={`border-r border-slate-200 px-3 py-3 leading-6 last:border-r-0 dark:border-slate-700 ${typeof cell === "string" ? "font-mono text-xs" : ""}`}>{cellText(cell, locale)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Screenshots({ images, locale }: { images: NonNullable<Section["images"]>; locale: Locale }) {
  return (
    <div className={`mt-6 grid gap-5 ${images.length > 1 ? "sm:grid-cols-2" : ""}`}>
      {images.map((image) => (
        <figure key={image.src} className={`min-w-0 ${image.narrow ? "max-w-52" : ""}`}>
          <a href={image.src} target="_blank" rel="noreferrer" className="block border border-slate-200 transition hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-500">
            <img src={image.src} alt={image.alt[locale]} loading="lazy" decoding="async" className="block h-auto w-full" />
          </a>
          {image.caption !== undefined && <figcaption className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{cellText(image.caption, locale)}</figcaption>}
        </figure>
      ))}
    </div>
  );
}

function CodeBlock({ code, copyLabel, copiedLabel }: { code: string; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return <div className="group relative mt-5 overflow-hidden border border-slate-800 bg-[#151b23]"><button onClick={copy} className="absolute right-2 top-2 flex items-center gap-1.5 border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 opacity-0 transition group-hover:opacity-100 focus:opacity-100"><ClipboardDocumentIcon className="h-4 w-4" />{copied ? copiedLabel : copyLabel}</button><pre className="overflow-x-auto p-5 font-mono text-[13px] leading-6 text-slate-200"><code>{code}</code></pre></div>;
}

function ResourceLinks({ links, locale }: { links: NonNullable<Section["links"]>; locale: Locale }) {
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      {links.map((link) => (
        <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 border border-slate-300 bg-white px-4 text-sm font-semibold text-ink transition hover:border-signal hover:text-leaf dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:border-blue-500 dark:hover:text-blue-400">
          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          {link.label[locale]}
        </a>
      ))}
    </div>
  );
}

function PageLink({ direction, label, title, href, onClick }: { direction: "previous" | "next"; label: string; title: string; href: string; onClick: () => void }) {
  return <a href={href} onClick={(event) => { event.preventDefault(); onClick(); }} className={`group flex min-w-0 items-center gap-3 border border-slate-200 p-4 text-left transition hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600 ${direction === "next" ? "justify-end text-right" : ""}`}>{direction === "previous" && <ChevronLeftIcon className="h-5 w-5 shrink-0" />}<span className="min-w-0"><span className="block text-xs text-slate-500">{label}</span><span className="mt-1 block truncate text-sm font-semibold text-ink dark:text-white">{title}</span></span>{direction === "next" && <ChevronRightIcon className="h-5 w-5 shrink-0" />}</a>;
}

function SearchDialog({ locale, query, setQuery, matches, close, navigate }: { locale: Locale; query: string; setQuery: (value: string) => void; matches: Page[]; close: () => void; navigate: (id: string) => void }) {
  const t = labels[locale];
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") { close(); } };
    addEventListener("keydown", onKeyDown);
    return () => removeEventListener("keydown", onKeyDown);
  }, [close]);
  return <div className="fixed inset-0 z-[60] flex items-start justify-center bg-ink/60 px-4 pt-[12vh] backdrop-blur-xs" onMouseDown={close}><div className="w-full max-w-2xl overflow-hidden border border-slate-300 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#151b23]" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={t.search}><div className="flex items-center border-b border-slate-200 px-4 dark:border-slate-700"><MagnifyingGlassIcon className="h-5 w-5 text-slate-400" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} className="h-14 flex-1 bg-transparent px-3 text-base text-ink outline-none placeholder:text-slate-400 dark:text-white" /><button className="icon-button" onClick={close} aria-label={t.close}><XMarkIcon className="h-5 w-5" /></button></div><div className="max-h-[55vh] overflow-y-auto p-2"><p className="px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{t.results}</p>{matches.length ? matches.map((item) => <a key={item.id} href={routeHref(locale, item.id)} onClick={(event) => { event.preventDefault(); navigate(item.id); close(); }} className="block w-full border-l-2 border-transparent px-3 py-3 text-left hover:border-signal hover:bg-slate-50 dark:hover:bg-slate-900"><span className="block font-semibold text-ink dark:text-white">{item.title[locale]}</span><span className="mt-1 block truncate text-sm text-slate-500">{item.summary[locale]}</span></a>) : <p className="px-3 py-8 text-center text-sm text-slate-500">{t.noResults}</p>}</div></div></div>;
}

export default App;
