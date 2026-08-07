# Zotero 9 migration notes

This branch targets Zotero 9 (`strict_min_version: 9.0`,
`strict_max_version: 9.*`) and Firefox 140, the Mozilla platform used by
Zotero 9.

## Upstream baseline

- [Zotero 9 release notice for plugin developers](https://groups.google.com/g/zotero-dev/c/QrwXJseBzuA)
- [Zotero 8/Firefox 140 migration guide](https://www.zotero.org/support/dev/zotero_8_for_developers)
- [Zotero 7 plugin lifecycle and manifest guide](https://www.zotero.org/support/dev/zotero_7_for_developers)
- [Zotero 9.0.6 source](https://github.com/zotero/zotero/tree/9.0.6)

Zotero 9 is a rapid release on the same Firefox 140 platform as Zotero 8.
The Zotero team states that most Zotero 8-compatible plugins need no code
changes for Zotero 9, but they must still be tested and declare an appropriate
maximum version.

## Changes made

- The manifest now declares Zotero 9 as the supported runtime.
- The bundle target is Firefox 140.
- The bootstrap script uses the canonical `rootURI` concatenation and retains
  Zotero's startup, shutdown, main-window-load, and main-window-unload hooks.
- The item context-menu entry uses Zotero's official `MenuManager` API and is
  registered once per plugin lifecycle instead of once per window.
- Menu and preference-pane registrations are explicitly removed on shutdown.
- The preference pane is registered with its own script. This avoids relying
  on variables from another preference pane's global scope, which is no longer
  shared on Firefox 140.
- PDF imports continue to use `Zotero.Attachments.importFromURL()`. Document
  responses now use the standard `response` property, resolve relative PDF
  URLs against the final response URL, and preserve the Sci-Hub page as the
  referrer.
- Custom resolver JSON is parsed defensively. Obsolete plugin-managed default
  resolvers are removed without deleting matching resolvers that were not
  tracked by this plugin.
- `zotero-plugin-toolkit`, `zotero-plugin-scaffold`, `zotero-types`, and the
  Zotero ESLint configuration were upgraded from beta/older versions to their
  current stable releases at the time of migration.
- CI linting was re-enabled.
- The generated update manifest now uses the repository's uppercase `V` tag
  convention. The previous lowercase `v` URL returned HTTP 404 for the current
  release.

The project has no shortcut registration and no reader-window UI injection.
The audited reader/PDF surface is therefore limited to item attachment lookup,
custom file resolvers, HTTP document parsing, and PDF attachment import.

## Verification completed

```text
npm run build       PASS
npm run lint:check  PASS
npx tsc --noEmit    PASS
git diff --check    PASS
npm audit --omit=dev PASS (0 production vulnerabilities)
```

The built XPI contains the resolved Zotero 9 manifest, preference script,
localized resources, bundled plugin script, and bootstrap script. The generated
stable and beta update manifests contain the Zotero 9 version range and an
uppercase `V<version>` download URL.

The scaffold startup test could not run in this environment because no Zotero
application binary is installed. It successfully reached the runner after the
local test port was permitted and then stopped with `No Zotero Found.`

## Manual test matrix

Use a separate Zotero 9 profile and a backed-up test library.

1. Install the built `sci-pdf.xpi` and confirm it appears enabled without a
   compatibility warning.
2. Restart Zotero and confirm there are no bootstrap errors in Help → Debug
   Output Logging → View Output.
3. Open Settings → Sci-PDF. Confirm the checkbox and resolver URL field load,
   edit the URLs, close Settings, reopen it, and confirm the values persist.
4. Right-click a regular library item and confirm “Find and Download Available
   PDF” is present. Confirm a discoverable PDF is attached automatically. For a
   failed single-item lookup, confirm Google Scholar opens a DOI search or an
   exact-title search when the DOI is absent. Right-click multiple items, notes,
   or attachments and confirm the separate Scholar command is hidden.
5. Test one item with a DOI and no attachment. Confirm the progress state, PDF
   import, parent linkage, filename, and PDF reader opening.
6. Test an item that already has a PDF, with both the manual command and Zotero's
   automatic “Find Full Text” flow.
7. Test missing DOI, unavailable PDF, invalid resolver URL, redirecting resolver,
   CAPTCHA/network failure, and a group library with and without file-edit
   permission.
8. Open and close the main window repeatedly on macOS. Confirm the menu is not
   duplicated and no stale-window errors appear.
9. Disable and re-enable the plugin without restarting Zotero. Confirm the menu
   and preference pane disappear and return exactly once.
10. Check light and dark modes on macOS, Windows, and Linux, particularly the
    menu icon and preference layout.

## Remaining risks

- Sci-Hub domains, HTML structure (`#pdf`), redirects, anti-bot measures, and
  availability are external and can change independently of Zotero.
- `Zotero.Attachments`, `Zotero.HTTP`, and custom resolver preferences are
  internal Zotero APIs. They match Zotero 9.0.6 source but are not a stable
  cross-major public API contract.
- The manual fetch path sends a mobile User-Agent. Firefox or the destination
  site may ignore or reject that header.
- The menu icon was not redesigned for Zotero's recommended 16×16
  `context-fill` SVG convention, so visual review in dark mode remains needed.
- A full `npm audit` reports 10 development-only transitive advisories (1 low,
  2 moderate, 7 high), including `adm-zip` below the current scaffold package.
  No production/runtime dependency advisory is reported. Avoid processing
  untrusted archives in the build environment and update when upstream releases
  patched dependency ranges.
- Before publishing, bump the plugin version; the workspace intentionally
  retains `8.0.4` so this migration does not create a release or tag implicitly.
