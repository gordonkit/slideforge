# Layouts: flows and diagrams

Slides that show order, dependence, or a central idea. See the [layout gallery](layouts.md) for every layout.

### `process`

Numbered steps in order, joined by arrows: two to six steps, each with a `title` and an optional `text`. Use it for a flow or
a procedure; use [timeline](#timeline) when the steps have dates.

| `process` (`default`) | `process/vertical` |
| --- | --- |
| ![Four steps in a row joined by arrows](../site/public/screenshots/layout-process.png) | ![Three steps stacked and joined by down arrows](../site/public/screenshots/layout-process-vertical.png) |

- **Variants:** `default` places the steps in a row, and `vertical` stacks them with the title and text on one line. Five or six
  steps in a row are narrow, so keep their text short.

The slide in JSON:

```json
{
  "layout": "process",
  "title": "How it works",
  "steps": [
    { "title": "Write", "text": "JSON content" },
    { "title": "Build", "text": "HTML slides" },
    { "title": "Export" }
  ]
}
```

### `hub`

A central idea with three to six items around it. The `center` is an accent circle; the `items` are cards, the first half
on the left and the rest on the right, each joined to the center by a line.

![A central circle with five items joined to it by lines](../site/public/screenshots/layout-hub.png)

```json
{
  "layout": "hub",
  "title": "The platform",
  "center": "SlideForge",
  "items": [{ "title": "Layouts" }, { "title": "Templates" }, { "title": "Export" }]
}
```

### `timeline`

![Timeline slide with four steps on a horizontal rail](../site/public/screenshots/layout-timeline.png)

The slide in JSON:

```json
{
  "layout": "timeline",
  "title": "From idea to deck",
  "events": [
    {
      "date": "Step 1",
      "title": "Outline",
      "text": "One idea per slide."
    },
    { "date": "Step 2", "title": "Write JSON" },
    { "date": "Step 3", "title": "Export" }
  ]
}
```

### `gantt`

A project schedule: tasks as bars over labeled periods, with optional progress.

![Gantt slide with five tasks over eight months, four with progress](../site/public/screenshots/layout-gantt.png)

The slide in JSON:

```json
{
  "layout": "gantt",
  "title": "Project schedule",
  "barRadius": 12,
  "periods": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  "tasks": [
    { "label": "Research", "start": 1, "end": 2 },
    { "label": "Design", "start": 2, "end": 4, "progress": 60 },
    { "label": "Launch", "start": 6, "end": 6 }
  ]
}
```

Optional `barRadius` sets this slide's bar and track corner radius in CSS pixels
(finite 0–120, decimals accepted). Omit it to keep the template's shared
`tokens.border.radius`; `0` explicitly restores square corners. It does not
change the template or other layouts. Progress fill is clipped inside the bar,
so 0%, partial, and 100% progress keep their existing behavior.
