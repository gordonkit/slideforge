# Container image

The `gordonkit/slideforge` image runs the SlideForge CLI with Node.js 24, the
Chromium build pinned by `package-lock.json`, and the Noto CJK and Liberation
fonts. It replaces the local `npm ci`, `npx playwright install`, and font setup.
The Compose file provides one explicitly selected profile:

- `cli`: the `slideforge` command, with a host folder mounted at `/work`.

There is no HTTP API profile. The image is a packaged CLI, not an export
service; see [the trust model](../docs/limitations.md#browser-execution-is-privileged).

## Published image

Release tags after 0.1.1 publish the image to Docker Hub as
[`gordonkit/slideforge`](https://hub.docker.com/r/gordonkit/slideforge), and
from 0.3.0 also to GitHub Container Registry as
[`ghcr.io/gordonkit/slideforge`](https://github.com/gordonkit/slideforge/pkgs/container/slideforge).
Both receive the same image. A tag such as `v0.3.0` publishes the image tags
`0.3.0`, `0.3`, and `latest`; the image tag matches the npm package version. The
image targets `linux/amd64`. Either name works in the commands below.

To use it without cloning this repository, mount the folder that holds the deck
at `/work`:

```bash
docker run --rm --read-only --tmpfs /tmp --shm-size 256m --security-opt no-new-privileges \
  --user "$(id -u):$(id -g)" --volume "$PWD:/work" \
  gordonkit/slideforge:latest export /work/deck.json --output /work/deck.pptx
```

```powershell
docker run --rm --read-only --tmpfs /tmp --shm-size 256m --security-opt no-new-privileges `
  --volume "${PWD}:/work" `
  gordonkit/slideforge:latest export /work/deck.json --output /work/deck.pptx
```

In Git Bash on Windows, set `MSYS_NO_PATHCONV=1` first; otherwise Git Bash
rewrites container paths such as `/work/deck.json` into Windows paths.

Use a version tag instead of `latest` when exports must be reproducible. The
Compose file below always builds `gordonkit/slideforge:local` from the current
source tree and does not pull the published image.

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
  `preview` and `present` are not supported: they bind only to the container's
  loopback interface, and file watching across Docker Desktop bind mounts is
  unreliable. Preview and present on the host instead, or present a
  `build --present` file.
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
  targets `linux/amd64`.

The project's `LICENSE` (Apache-2.0), `NOTICE`, and third-party notice files are
installed under `/usr/share/licenses/slideforge/`. Published images also carry a
Buildx SBOM attestation and build provenance.

## Registry release setup

Create the `slideforge` repository in the Docker Hub user or organization that
will own it, and create a Docker Hub access token with read and write
permission. Then configure these settings under **Settings > Secrets and
variables > Actions** in the GitHub repository:

| Kind | Name | Value |
| --- | --- | --- |
| Variable | `DOCKERHUB_NAMESPACE` | Docker Hub user or organization that owns the repository |
| Secret | `DOCKERHUB_USERNAME` | Docker Hub user that can push to the namespace |
| Secret | `DOCKERHUB_TOKEN` | Docker Hub access token; do not use the account password |

Pushing a release tag runs `.github/workflows/release.yml`:

1. `container-smoke` checks that the three settings exist, builds the image with
   Compose, exports `examples/basic/presentation.json` in the container, and
   validates the result.
2. `publish` runs the npm release checks and tests, then publishes to npm and
   creates the GitHub release.
3. `publish-container` builds the image with Buildx and pushes it to
   `<namespace>/slideforge` and `ghcr.io/<owner>/<repository>` with an SBOM
   attestation and build provenance.

GitHub Container Registry needs no secret: the job signs in with the workflow's
`GITHUB_TOKEN` and the `packages: write` permission. The first push creates the
package as private; make it public once under the package's **Package settings**
so `docker pull` works without signing in.

npm and the container registries are independent, so `publish-container` can fail
after the npm package is published. Check every release job before announcing
a release. Re-running the failed job for the same tag pushes the image tags
again from the same source.
