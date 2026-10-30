/**
 * Browser scripts for presenting a rendered deck: presentation mode (one slide at a time, keyboard
 * navigation, fullscreen) and the speaker notes panel. Both return early when `navigator.webdriver`
 * is set, and all their CSS hangs off classes they add under `@media screen`, so export, print, and a
 * page whose scripts did not run keep the stacked layout. They never move, copy, or remove slides or
 * their `[data-pptx-notes]` elements, and their own elements sit outside every slide.
 */

/** Ignore keys that belong to the browser, an IME, or an editable element. */
const keyFilter = `const ignored = event => event.defaultPrevented || event.isComposing || event.ctrlKey || event.altKey || event.metaKey
    || (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])'));`;

/**
 * Presentation mode. The current slide is kept in the URL hash as a 1-based number; changing it
 * dispatches `sf-slidechange` on the document so the notes panel can follow.
 */
export const presentationScript = `<style>@media screen {
  html.sf-presenting, html.sf-presenting body { height: 100%; overflow: hidden; background: #000; }
  html.sf-presenting .sf-presentation { display: block; padding: 0; }
  html.sf-presenting .sf-slide:not(.sf-current) { display: none; }
  html.sf-presenting .sf-slide.sf-current { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%) scale(var(--sf-present-scale, 1)); }
  .sf-present-status { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
}</style>
<script>(() => {
  if (navigator.webdriver) return;
  const slides = Array.from(document.querySelectorAll('.sf-presentation .sf-slide'));
  if (!slides.length) return;
  document.documentElement.classList.add('sf-presenting');
  const status = document.createElement('div');
  status.className = 'sf-present-status';
  status.setAttribute('aria-live', 'polite');
  document.body.append(status);
  ${keyFilter}
  const fit = () => {
    const style = getComputedStyle(document.body);
    const scale = Math.min(innerWidth / parseFloat(style.getPropertyValue('--slide-width')),
      innerHeight / parseFloat(style.getPropertyValue('--slide-height')));
    document.body.style.setProperty('--sf-present-scale', String(scale));
  };
  const fromHash = () => {
    const number = Number.parseInt(location.hash.slice(1), 10);
    return Number.isNaN(number) ? 0 : Math.min(Math.max(number, 1), slides.length) - 1;
  };
  let current = -1;
  const show = index => {
    index = Math.min(Math.max(index, 0), slides.length - 1);
    // Built files carry a <base href>, so a bare "#n" would resolve against the JSON's folder.
    if (location.hash !== '#' + (index + 1)) history.replaceState(null, '', location.href.split('#')[0] + '#' + (index + 1));
    if (index === current) return;
    slides[current]?.classList.remove('sf-current');
    current = index;
    slides[current].classList.add('sf-current');
    status.textContent = slides[current].getAttribute('aria-label') ?? '';
    document.dispatchEvent(new CustomEvent('sf-slidechange', { detail: { slide: slides[current] } }));
  };
  addEventListener('keydown', event => {
    if (ignored(event)) return;
    const key = event.key;
    if (key === ' ') show(current + (event.shiftKey ? -1 : 1));
    else if (['ArrowRight', 'ArrowDown', 'PageDown'].includes(key)) show(current + 1);
    else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(key)) show(current - 1);
    else if (key === 'Home') show(0);
    else if (key === 'End') show(slides.length - 1);
    else if (key.toLowerCase() === 'f' && !event.shiftKey) {
      (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {});
    } else return;
    event.preventDefault();
  });
  addEventListener('hashchange', () => show(fromHash()));
  addEventListener('resize', fit);
  fit();
  show(fromHash());
})();</script>`;

/**
 * Speaker notes panel, toggled with N and closed with Escape. The current slide is the presented
 * one (\`.sf-current\`), else the slide nearest the middle of the viewport.
 */
export const notesScript = `<style>@media screen {
  .sf-notes-panel { position: fixed; left: 0; right: 0; bottom: 0; z-index: 2147483647; max-height: 40vh; overflow: auto; box-sizing: border-box; padding: 16px 24px; background: #111827; color: #f9fafb; font: 20px/1.5 system-ui, sans-serif; }
  .sf-notes-panel h2 { margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #d1d5db; }
  .sf-notes-panel p { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
  .sf-notes-panel p.sf-notes-empty { color: #9ca3af; font-style: italic; }
}</style>
<script>(() => {
  if (navigator.webdriver) return;
  const slides = Array.from(document.querySelectorAll('.sf-presentation .sf-slide'));
  if (!slides.length) return;
  const panel = document.createElement('section');
  panel.className = 'sf-notes-panel';
  panel.setAttribute('aria-label', 'Speaker notes');
  panel.hidden = true;
  const heading = document.createElement('h2');
  const text = document.createElement('p');
  panel.append(heading, text);
  document.body.append(panel);
  ${keyFilter}
  const currentSlide = () => {
    const presented = slides.find(slide => slide.classList.contains('sf-current'));
    if (presented) return presented;
    const middle = innerHeight / 2;
    const distance = slide => {
      const bounds = slide.getBoundingClientRect();
      return bounds.top > middle ? bounds.top - middle : bounds.bottom < middle ? middle - bounds.bottom : 0;
    };
    return slides.reduce((best, slide) => distance(slide) < distance(best) ? slide : best);
  };
  const update = () => {
    if (panel.hidden) return;
    const slide = currentSlide();
    const notes = slide.querySelector(':scope > [data-pptx-notes]')?.textContent ?? '';
    heading.textContent = 'Notes · ' + (slide.getAttribute('aria-label') ?? '');
    text.textContent = notes.trim() ? notes : 'No notes';
    text.classList.toggle('sf-notes-empty', !notes.trim());
  };
  addEventListener('keydown', event => {
    if (ignored(event)) return;
    if (event.key.toLowerCase() === 'n' && !event.shiftKey) panel.hidden = !panel.hidden;
    else if (event.key === 'Escape' && !panel.hidden) panel.hidden = true;
    else return;
    event.preventDefault();
    update();
  });
  document.addEventListener('sf-slidechange', update);
  let pending = 0;
  addEventListener('scroll', () => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(update);
  }, { passive: true });
  addEventListener('resize', update);
})();</script>`;

/** Insert scripts before the document's closing body tag. */
export function injectBeforeBodyEnd(html: string, ...snippets: string[]): string {
  const end = html.lastIndexOf('</body>');
  if (end < 0) throw new Error('The rendered document has no closing body tag');
  return html.slice(0, end) + snippets.join('') + html.slice(end);
}
