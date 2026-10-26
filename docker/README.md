# Container image

The `gordonkit/slideforge` image runs the SlideForge CLI with Node.js 24, the
Chromium build pinned by `package-lock.json`, and the Noto CJK and Liberation
fonts. It replaces the local `npm ci`, `npx playwright install`, and font setup.
The Compose file provides one explicitly selected profile:

- `cli`: the `slideforge` command, with a host folder mounted at `/work`.

There is no HTTP API profile. The image is a packaged CLI, not an export
service; see [the trust model](../docs/limitations.md#browser-execution-is-privileged).

## CLI profile

Run these commands from the repository root in Bash or PowerShell. Compose
builds `gordonkit/slideforge:local` from the current source tree on first use;
`--build` rebuilds it after source changes. Arguments after `cli` are passed to
the CLI, and paths are container paths under `/work`:

```console
docker compose -f docker/compose.yaml --profile cli run --rm --build cli export /work/examples/basic/presentation.json --output /work/presentation.pptx
docker compose -f docker/compose.yaml --profile cli run --rm cli validate /work/presentation.pptx
```

By default `/work` is the repository root. To work on a deck elsewhere, set
`SLIDEFORGE_WORK` to an absolute host folder before running Compose:

```bash
SLIDEFORGE_WORK="$HOME/decks" docker compose -f docker/compose.yaml --profile cli run --rm cli init /work/deck.json
```

```powershell
$env:SLIDEFORGE_WORK = "$HOME\decks"
docker compose -f docker/compose.yaml --profile cli run --rm cli init /work/deck.json
```

Keep a deck's JSON and its asset folder inside the mounted folder; relative
images are resolved from the JSON's folder inside the container, and files
outside the mount do not exist there. The built-in templates (`corporate`,
`default`) are in the image; a local template folder must also be inside the
mount.

### Backgrounds

[Slide backgrounds](../docs/schema.md#backgrounds) work in the container,
including Math Background Studio share links, when the image is built from
source that includes them; pass `--build` if your local image is older.

- Image backgrounds follow the asset rule above: keep the files inside the
  mounted folder and reference them with paths relative to the JSON.
- `https://bg.gordonkit.com/studio#d=…` links load the studio's render page
  during export, so the container needs network access to `bg.gordonkit.com`.
  Compose's default network allows it. Without it, export fails with a message
  naming the slide whose background could not be drawn.
- A loopback studio link such as `http://localhost:5173/studio#d=…` points at
  the container itself, not at a dev server on the host, so it fails in the
  container. Use the `bg.gordonkit.com` link, or export on the host.

Without Compose:

```console
docker build -f docker/Dockerfile -t gordonkit/slideforge:local .
docker run --rm --read-only --tmpfs /tmp --volume "<host folder>:/work" gordonkit/slideforge:local export /work/deck.json --output /work/deck.pptx
```

## Behavior and limits

- `init`, `build`, `export`, and `validate` work as in [the CLI reference](../docs/cli.md).
  `preview` is not supported: it binds only to the container's loopback
  interface, and file watching across Docker Desktop bind mounts is unreliable.
  Preview on the host instead.
- The container runs as the image's non-root `node` user with a read-only root
  filesystem, a bounded `/tmp` tmpfs, and `no-new-privileges`. Only `/work` is
  writable. On Linux hosts, files are written as UID 1000; pass
  `--user "$(id -u):$(id -g)"` to `docker compose run` to match your own user.
- Export still runs page scripts and allows network access from the container.
  Export only trusted HTML and URLs, and do not mount folders with secrets.
- Chromium measures text with Liberation Sans (metric-compatible with Arial)
  and Noto Sans CJK instead of Arial and Microsoft JhengHei. On the bundled
  example the exported text boxes match a Windows export, but other content can
  wrap differently. PowerPoint's East Asian font remains Microsoft JhengHei,
  which the image does not include; no Microsoft fonts are bundled or embedded.
- The image is about 1.5 GB, mostly Chromium and the CJK fonts, and currently
  targets `linux/amd64`. No published image or registry release exists yet.

The project's `LICENSE` (Apache-2.0), `NOTICE`, and third-party notice files are
installed under `/usr/share/licenses/slideforge/`.
