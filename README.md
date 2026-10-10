# Fangcan Chi: design portfolio

Interfaces for people with slow connections and small screens. Live at **https://alkalimiu.github.io**.

Every page is one hand-written HTML file with no framework, no build step, no web fonts and no trackers. All data is sample data for a fictional region.

## What is here

| Page | Path | What it shows |
| --- | --- | --- |
| Home | [`index.html`](index.html) | Introduction, projects, where to find each skill, About |
| Classroom Signal | [`projects/classroom-signal/`](projects/classroom-signal/) | A bilingual, low-bandwidth dashboard of school connectivity: summary sentence, SVG district map, school list, speed history ([case study](projects/classroom-signal/case-study.html)) |
| Signal Setup | [`projects/signal-setup/`](projects/signal-setup/) | A clickable mobile prototype that lets school staff set up a speed-test box, designed for low literacy, low bandwidth and cheap Android phones ([case study](projects/signal-setup/case-study.html) with hypothetical personas, journey, sketches, screens and a usability-test plan) |
| Design system | [`design-system/`](design-system/) | Colour tokens with live contrast ratios, type scale, status shapes, buttons, chips, form fields, notices and focus styles |

## Folder structure

```
index.html                      home page
design-system/
  ds.css                        tokens and components: the source for every page
  site.css                      page shell for the portfolio pages (header, long text, cards, tables)
  index.html                    the design-system documentation page
projects/
  classroom-signal/             dashboard (index.html), case study, screenshots
  signal-setup/                 prototype (index.html), case study, screens/*.webp
tools/
  sync-ds.mjs                   copies ds.css and site.css into every page
  page-weight.mjs               prints page sizes and checks the size each page states
  a11y-audit.mjs                runs axe-core on every page in 190 states
.nojekyll                       tells GitHub Pages to serve the files as they are
```

## Preview locally

No build is needed. Serve the folder with any static server and open it:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

Before pushing, look at every changed page at desktop width and at phone width (375 px and 320 px), in light and dark mode, and check for console errors and sideways scrolling.

## The shared design system

`design-system/ds.css` is the only place where colours, the type scale and shared components are defined. Pages do not link to it: `tools/sync-ds.mjs` copies a compact version into each page between these markers, so every page stays a single file that loads with one request and works offline.

```css
/* ds:start */ ... /* ds:end */      every page
/* site:start */ ... /* site:end */  home, case studies and the design-system page
```

After editing `ds.css` or `site.css`:

```sh
node tools/sync-ds.mjs      # or: npm run sync
```

Never edit the copied block inside a page; the next sync replaces it.

## Checks

```sh
npm run check     # copied CSS is up to date, and stated page sizes are correct
npm run audit     # axe-core on 190 states (needs: npm install)
```

- **Page weight.** Classroom Signal and the Signal Setup prototype state their own size in a constant, `const PAGE={kb:'60',gz:'19'};`. When a file changes size, `npm run weight` prints the new numbers. Update the constant, and the numbers written in the case studies and on the home page.
- **Accessibility.** `npm run audit` serves the site itself and runs axe-core (WCAG 2.0 to 2.2 A and AA, plus best practices). It covers light and dark themes, phone and desktop widths, both languages, dashboard states and every prototype screen, and fails if anything is found. It uses the Playwright Chromium browser; run `npx playwright install chromium` once if it is missing. For Lighthouse, run `npx lighthouse http://localhost:8000/ --view` while the local server is running.

The results of the last audit are written up in both case studies.

## Rules for this repository

- All data is sample data for a fictional region, and every page says so.
- No branding, logos or names of real organisations.
- Research that has not happened is written as a plan, not as results. Personas are marked as hypothetical.
- Every page aims for WCAG 2.2 AA, works at 320 px wide, has a working dark mode and uses system fonts only.
- Status is never shown by colour alone: each status has a shape, a colour and words.

## Credits

Design and code by Fangcan Chi, 2026. Built with an AI coding assistant.

Released under the [MIT License](LICENSE): anyone may reuse, change and share the code, keeping the copyright notice.
