import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Plugin } from "vite";
import { categories, cellText, type Locale, type Page, pages, repositoryUrl } from "./src/content.ts";
import { parentOrganization, parentSiteLabel, parentSiteUrl } from "./src/parent.ts";

const siteUrl = "https://slideforge.gordonkit.com";
/** The same `@id` gordonkit.com uses for this site in its own JSON-LD. */
const websiteId = `${siteUrl}/#website`;
const locales: Locale[] = ["en", "zh-TW", "zh-CN", "ja"];
const hreflang: Record<Locale, string> = { en: "en", "zh-TW": "zh-Hant-TW", "zh-CN": "zh-Hans-CN", ja: "ja" };
const openGraphLocale: Record<Locale, string> = { en: "en_US", "zh-TW": "zh_TW", "zh-CN": "zh_CN", ja: "ja_JP" };
const socialImage = { url: `${siteUrl}/screenshots/layout-cover.png`, width: 960, height: 540, alt: "SlideForge cover slide: Ideas into slides" };
const notFound: Record<Locale, { title: string; body: string; link: string }> = {
  en: { title: "Page not found", body: "This page does not exist or has moved.", link: "Go to the SlideForge documentation" },
  "zh-TW": { title: "找不到頁面", body: "這個頁面不存在或已經移動。", link: "前往 SlideForge 文件" },
  "zh-CN": { title: "找不到页面", body: "此页面不存在或已移动。", link: "前往 SlideForge 文档" },
  ja: { title: "ページが見つかりません", body: "このページは存在しないか、移動しました。", link: "SlideForge ドキュメントへ" },
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function pageUrl(locale: Locale, page: Page): string {
  return `${siteUrl}/${locale}/${page.id}/`;
}

function pageTitle(page: Page, locale: Locale): string {
  return `${page.heading?.[locale] ?? page.title[locale]} | SlideForge Docs`;
}

function renderSections(page: Page, locale: Locale): string {
  return page.sections.map((section) => {
    const interfaces = section.interfaces?.map((item) => `
      <section><h3>${escapeHtml(item.title[locale])}</h3><p>${escapeHtml(item.body[locale])}</p><code>${escapeHtml(item.example)}</code></section>`).join("") ?? "";
    const table = section.table ? `
      <table><caption>${escapeHtml(section.table.caption[locale])}</caption>
        <thead><tr>${section.table.headers.map((header) => `<th>${escapeHtml(cellText(header, locale))}</th>`).join("")}</tr></thead>
        <tbody>${section.table.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cellText(cell, locale))}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>` : "";
    const bullets = section.bullets ? `<ul>${section.bullets[locale].map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "";
    const links = section.links?.map((link) => `<a href="${escapeHtml(link.href)}">${escapeHtml(link.label[locale])}</a>`).join(" ") ?? "";
    return `<section id="${escapeHtml(section.id)}">
      <h2>${escapeHtml(section.title[locale])}</h2>
      <p>${escapeHtml(section.body[locale])}</p>
      ${interfaces}${table}${bullets}${section.code ? `<pre><code>${escapeHtml(section.code)}</code></pre>` : ""}${links}${section.note ? `<aside>${escapeHtml(section.note[locale])}</aside>` : ""}
    </section>`;
  }).join("");
}

function renderContent(page: Page, locale: Locale): string {
  const category = categories.find((item) => item.id === page.category);
  const navigation = pages.map((item) => `<a href="/${locale}/${item.id}/">${escapeHtml(item.title[locale])}</a>`).join(" ");
  return `<header><a href="/${locale}/overview/">SlideForge</a><nav aria-label="Documentation">${navigation}</nav></header>
    <main><article>
      <p>${escapeHtml(category?.label[locale] ?? "")}</p>
      <h1>${escapeHtml(page.heading?.[locale] ?? page.title[locale])}</h1>
      <p>${escapeHtml(page.summary[locale])}</p>
      ${renderSections(page, locale)}
    </article></main>
    <footer><a href="${repositoryUrl}">GitHub</a> ${renderParentLink(locale)}</footer>`;
}

/** Visible in the served HTML, so the JSON-LD publisher is backed by a link a crawler can follow. */
function renderParentLink(locale: Locale): string {
  return `<span>${escapeHtml(parentSiteLabel[locale])}<a href="${parentSiteUrl(locale)}">gordonkit.com</a></span>`;
}

function renderMetadata(page: Page, locale: Locale): string {
  const title = pageTitle(page, locale);
  const description = page.summary[locale];
  const url = pageUrl(locale, page);
  const alternateLocales = locales.filter((item) => item !== locale);
  const publisher = { "@id": parentOrganization.id };
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": parentOrganization.id, name: parentOrganization.name, url: parentOrganization.url },
      { "@type": "WebSite", "@id": websiteId, name: "SlideForge Documentation", url: `${siteUrl}/`, publisher },
      {
        "@type": "TechArticle",
        headline: page.heading?.[locale] ?? page.title[locale],
        description,
        inLanguage: locale,
        url,
        isPartOf: { "@id": websiteId },
        publisher,
        about: {
          "@type": "SoftwareApplication",
          name: "SlideForge",
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Windows, Linux, macOS",
          codeRepository: repositoryUrl,
          publisher,
        },
      },
    ],
  }).replaceAll("<", "\\u003c");

  return `<link rel="canonical" href="${url}" />
    ${locales.map((item) => `<link rel="alternate" hreflang="${hreflang[item]}" href="${pageUrl(item, page)}" />`).join("\n    ")}
    <link rel="alternate" hreflang="x-default" href="${pageUrl("en", page)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="SlideForge Docs" />
    <meta property="og:locale" content="${openGraphLocale[locale]}" />
    ${alternateLocales.map((item) => `<meta property="og:locale:alternate" content="${openGraphLocale[item]}" />`).join("\n    ")}
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${socialImage.url}" />
    <meta property="og:image:width" content="${socialImage.width}" />
    <meta property="og:image:height" content="${socialImage.height}" />
    <meta property="og:image:alt" content="${escapeHtml(socialImage.alt)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${socialImage.url}" />
    <meta name="twitter:image:alt" content="${escapeHtml(socialImage.alt)}" />
    <script type="application/ld+json">${structuredData}</script>`;
}

function renderPage(template: string, page: Page, locale: Locale): string {
  return template
    .replaceAll("\r\n", "\n")
    .replace('<html lang="en">', `<html lang="${locale}">`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeHtml(page.summary[locale])}" />`)
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(pageTitle(page, locale))}</title>`)
    .replace("</head>", `    ${renderMetadata(page, locale)}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${renderContent(page, locale)}</div>`)
    .replace(/[ \t]+(?=\r?$)/gm, "");
}

/** A static not-found page without the app script, which would otherwise render the overview at any path. */
function renderNotFound(template: string): string {
  const messages = locales.map((locale) => `<section lang="${locale}" class="mt-10">
        <h2 class="text-xl font-semibold text-ink">${escapeHtml(notFound[locale].title)}</h2>
        <p class="mt-2">${escapeHtml(notFound[locale].body)}</p>
        <a class="mt-2 inline-block text-signal hover:underline" href="/${locale}/overview/">${escapeHtml(notFound[locale].link)}</a>
      </section>`).join("\n      ");
  return template
    .replaceAll("\r\n", "\n")
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeHtml(notFound.en.body)}" />`)
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(notFound.en.title)} | SlideForge Docs</title>`)
    .replace(/\s*<script type="module"[^>]*><\/script>/, "")
    .replace("</head>", `    <meta name="robots" content="noindex" />\n  </head>`)
    .replace('<div id="root"></div>', `<main class="mx-auto max-w-2xl px-6 py-20 text-slate-700">
      <a class="text-sm text-slate-500 hover:text-ink" href="/en/overview/">SlideForge Docs</a>
      <h1 class="mt-6 text-4xl font-bold text-ink">404</h1>
      ${messages}
      <p class="mt-10 text-sm text-slate-500">${renderParentLink("en")}</p>
    </main>`)
    .replace(/[ \t]+(?=\r?$)/gm, "");
}

const localeNames: Record<Locale, { native: string; english: string }> = {
  en: { native: "English", english: "English" },
  "zh-TW": { native: "繁體中文", english: "Traditional Chinese" },
  "zh-CN": { native: "简体中文", english: "Simplified Chinese" },
  ja: { native: "日本語", english: "Japanese" },
};

/**
 * `/llms.txt` in the llmstxt.org format: one Markdown file that tells a language model what this
 * site documents and where each page is. It is written in English, with the other languages named
 * at the end, and every line reuses the page's own heading and summary, so it cannot describe a
 * page differently from the page. The opening links to the GordonKit list, so a model that only
 * reaches this site still learns who publishes it and what else they publish.
 */
function renderLlmsText(): string {
  const overview = pages[0];
  const item = (page: Page) => `- [${page.heading?.en ?? page.title.en}](${pageUrl("en", page)}): ${page.summary.en}`;
  const sections = categories.flatMap((category) => {
    const members = pages.filter((page) => page.category === category.id);
    return members.length === 0 ? [] : [`## ${category.label.en}`, "", ...members.map(item), ""];
  });
  const otherLocales = locales
    .filter((locale) => locale !== "en")
    .map((locale) => `- [${localeNames[locale].native}](${pageUrl(locale, overview)}): The same documentation in ${localeNames[locale].english}, under /${locale}/.`);
  return [
    "# SlideForge",
    "",
    `> ${overview.summary.en}`,
    "",
    `This is the documentation of SlideForge, an open-source project published by ${parentOrganization.name}. The [source code](${repositoryUrl}) is on GitHub. ${parentOrganization.name} lists all of its sites in [gordonkit.com/llms.txt](${parentOrganization.url}llms.txt).`,
    "",
    ...sections,
    "## Optional",
    "",
    ...otherLocales,
    `- [${parentOrganization.name}](${parentOrganization.url}llms.txt): Every site ${parentOrganization.name} publishes.`,
    "",
  ].join("\n");
}

/** Write a static, crawlable page per locale and page, plus the not-found page, redirects, sitemap, robots file, and llms.txt. */
export function seoPagesPlugin(outputDirectory: string): Plugin {
  return {
    name: "slideforge-seo-pages",
    apply: "build",
    async closeBundle() {
      const templatePath = join(outputDirectory, "index.html");
      const template = await readFile(templatePath, "utf8");
      for (const locale of locales) {
        for (const page of pages) {
          const pageDirectory = join(outputDirectory, locale, page.id);
          await mkdir(pageDirectory, { recursive: true });
          await writeFile(join(pageDirectory, "index.html"), renderPage(template, page, locale), "utf8");
        }
      }

      await writeFile(join(outputDirectory, "404.html"), renderNotFound(template), "utf8");
      // A locale root names no page of its own, but it is the address a reader or an AI assistant
      // guesses from the URL pattern, so it is redirected to that locale's overview instead of 404.
      const redirects = locales.flatMap((locale) => [`/${locale} /${locale}/overview/ 301`, `/${locale}/ /${locale}/overview/ 301`]);
      await writeFile(join(outputDirectory, "_redirects"), `${redirects.join("\n")}\n`, "utf8");
      await writeFile(templatePath, renderPage(template, pages[0], "en"), "utf8");
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${pages.flatMap((page) => locales.map((locale) => `  <url><loc>${pageUrl(locale, page)}</loc>${locales.map((item) => `<xhtml:link rel="alternate" hreflang="${hreflang[item]}" href="${pageUrl(item, page)}"/>`).join("")}</url>`)).join("\n")}\n</urlset>\n`;
      await writeFile(join(outputDirectory, "sitemap.xml"), sitemap, "utf8");
      await writeFile(join(outputDirectory, "llms.txt"), renderLlmsText(), "utf8");
      await writeFile(join(outputDirectory, "robots.txt"), `User-agent: *\nContent-Signal: search=yes,ai-input=yes,ai-train=yes\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`, "utf8");
    },
  };
}
