const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { runInNewContext } = require("node:vm");
const { URL } = require("node:url");
const ts = require("typescript");
function load(path, imports = {}, globals = {}) {
  const exports = {};
  runInNewContext(
    ts.transpileModule(readFileSync(require.resolve(path), "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    { exports, require: (id) => imports[id], URL, ...globals },
  );
  return exports;
}
const identifiers = load("../src/utils/identifierPatterns.ts");
const { Utils } = load("../src/utils/utils.ts", {
  "./identifierPatterns": identifiers,
});
const item = (doi = "10.1038/s41567-025-02822-y") => ({
  isRegularItem: () => true,
  getDisplayTitle: () => "Test article",
  getField: (field) => (field === "DOI" ? doi : "10.1016/j.scib.2023.01.001"),
  getBestAttachments: async () => [],
});
test("issue 85: full DOI, URL and DOI label never produce truncated candidates", () => {
  const doi = "10.1038/s41567-025-02822-y";
  for (const text of [
    doi,
    `http://dx.doi.org/${doi}`,
    `https://doi.org/${doi}`,
    `DOI: ${doi}`,
  ]) {
    assert.deepEqual(Array.from(identifiers.matchDOIs(text)), [doi]);
  }
});
test("explicit DOI wins over other identifiers and case variants deduplicate", async () => {
  assert.deepEqual(Array.from(await Utils.extractDOIs(item())), [
    "10.1038/s41567-025-02822-y",
  ]);
  assert.equal(
    identifiers.matchDOIs("10.48550/ARXIV.2205.11462 10.48550/arxiv.2205.11462")
      .length,
    1,
  );
});
test("missing DOI still falls back to URL and preserves complete letter suffixes", async () => {
  const doi = "10.1038/s41567-025-02822-y";
  const entry = item("");
  entry.getField = (field) => (field === "url" ? `https://doi.org/${doi}` : "");
  assert.deepEqual(Array.from(await Utils.extractDOIs(entry)), [doi]);
});
function harness(request, opts = {}) {
  const windows = [],
    calls = [],
    imports = [];
  const ui = {
    ...Utils,
    extractDOIs: Utils.extractDOIs,
    attachRemotePDF:
      opts.attachRemotePDF ??
      (async (url) => imports.push(url.href)),
    showPopWin: (title, text, type, closeTime) => {
      const w = {
        title,
        closeTime,
        closed: false,
        updates: [],
        descriptions: [],
        addDescription(description) {
          this.descriptions.push(description);
        },
        changeLine(line) {
          this.updates.push(line);
        },
      };
      w.win = {
        close() {
          w.closed = true;
        },
      };
      windows.push(w);
      return w;
    },
  };
  const { SciHubFetcher } = load(
    "../src/modules/SciHubFetcher.ts",
    {
      "../utils/locale": {
        getString: (key, options) =>
          options ? JSON.stringify(options.args) : key,
      },
      "../utils/utils": { Utils: ui },
      "./CustomResolverManager": {
        CustomResolverManager: {
          shared: {
            customResolvers: [
              { url: "https://a.example/{doi}" },
              { url: "https://b.example/{doi}" },
            ],
          },
        },
      },
    },
    {
      Zotero: {
        debug() {},
        HTTP: {
          request: async (method, url, options) => {
            calls.push({ url, options });
            return request({ url, options, windows, calls });
          },
        },
      },
      ztoolkit: { log() {} },
    },
  );
  return {
    run: (items) => SciHubFetcher.updateItems(items, false),
    windows,
    calls,
    imports,
  };
}
const page = (status, found = false) => ({
  status,
  statusText: String(status),
  responseXML: {
    querySelector: (selector) =>
      selector === "#pdf"
        ? found
          ? { getAttribute: () => "https://pdf.example/test.pdf" }
          : null
        : { innerHTML: "Please try to search again using DOI" },
  },
});
test("502 advances to the next mirror with bounded requests and persistent progress", async () => {
  const h = harness(({ calls, options }) => {
    assert.equal(options.timeout, 15000);
    assert.equal(options.errorDelayMax, 0);
    assert.equal(options.successCodes, false);
    return calls.length === 1 ? page(502) : page(200, true);
  });
  await h.run([item()]);
  assert.equal(h.calls.length, 2);
  assert.ok(h.calls.every((c) => c.url.endsWith("02822-y")));
  assert.equal(h.windows[0].closeTime, 0);
  assert.equal(h.windows[0].updates.length, 2);
  assert.equal(h.windows[0].closed, true);
  assert.equal(h.windows.at(-1).title, "popwin-fetchsuccess");
  assert.equal(h.imports.length, 1);
});
test("click cancellation aborts the request and stops remaining mirrors and items", async () => {
  let aborted = false;
  const h = harness(
    ({ options, windows }) =>
      new Promise((resolve, reject) => {
        options.cancellerReceiver(() => {
          aborted = true;
          reject(new Error("cancelled"));
        });
        windows[0].win.close();
      }),
  );
  await h.run([item(), item()]);
  assert.equal(aborted, true);
  assert.equal(h.calls.length, 1);
  assert.equal(h.imports.length, 0);
  assert.equal(h.windows.at(-1).title, "popwin-cancelled");
});
test("throttled hosts are not revisited for later items", async () => {
  const h = harness(() => page(429));
  await h.run([item(), item()]);
  assert.equal(h.calls.length, 2);
  assert.equal(h.windows.at(-1).title, "popwin-fetchfailed");
});
test("timeout does not block remaining mirrors and is not reported as PDF absent", async () => {
  const h = harness(({ calls }) => {
    if (calls.length === 1) throw new Error("timeout");
    return page(200);
  });
  await h.run([item()]);
  assert.equal(h.calls.length, 2);
  assert.equal(h.windows.at(-1).title, "popwin-fetchfailed");
});
test("normal progress cleanup does not cancel the next item", async () => {
  const h = harness(() => page(200, true));
  await h.run([item(), item()]);
  assert.equal(h.calls.length, 2);
  assert.equal(h.imports.length, 2);
  assert.equal(
    h.windows.filter((w) => w.title === "popwin-fetchsuccess").length,
    2,
  );
});
test("cancellation after response completion prevents attachment import", async () => {
  const h = harness(({ windows }) => {
    windows[0].win.close();
    return page(200, true);
  });
  await h.run([item(), item()]);
  assert.equal(h.calls.length, 1);
  assert.equal(h.imports.length, 0);
  assert.equal(h.windows.at(-1).title, "popwin-cancelled");
});
test("all mirrors explicitly missing the PDF produce the not-found result", async () => {
  const h = harness(() => page(200));
  await h.run([item()]);
  assert.equal(h.calls.length, 2);
  assert.equal(h.windows.at(-1).title, "popwin-pdfnotavaliable");
});

// Anti-bot interstitials, copied from live responses (Oct 2026):
// sci-hub.ru answers HTTP 200 with an Altcha robot check, sci-hub.st and
// sci-hub.box answer HTTP 403 with a DDoS-Guard challenge.
const captchaPage = () => ({
  status: 200,
  statusText: "OK",
  responseXML: {
    documentElement: {
      innerHTML:
        '<head><title translate="ru:title">Sci-Hub: проверка на робота</title>' +
        '<script async defer src="/scripts/altcha.min.js" type="module"></script></head>' +
        '<body><div class="question"><altcha-widget challengeurl="/captcha/challenge/82908121"></altcha-widget></div></body>',
    },
    querySelector: () => null,
  },
});
const ddosGuardPage = () => ({
  status: 403,
  statusText: "Forbidden",
  responseXML: {
    documentElement: {
      innerHTML:
        '<html><head><title>DDoS-Guard</title>' +
        '<script src="/.well-known/ddos-guard/js-challenge/index.js"></script></head>' +
        '<body data-ddg-origin="true"><h1 id="ddg-l10n-title">Checking your browser</h1></body></html>',
    },
    querySelector: () => null,
  },
});
test("a 200 robot-check page is reported as blocked, not as a generic failure", async () => {
  const h = harness(() => captchaPage());
  await h.run([item()]);
  assert.equal(h.calls.length, 2);
  assert.equal(h.imports.length, 0);
  const last = h.windows.at(-1);
  assert.equal(last.title, "popwin-mirrorblocked");
  // Stays on screen: passing the check needs a manual action.
  assert.equal(last.closeTime, 0);
  // Carries the mirror URL so it can be opened in a browser.
  assert.equal(last.descriptions.length, 1);
  assert.ok(last.descriptions[0].startsWith("https://"));
});
test("a blocked host is not revisited for the remaining items", async () => {
  const h = harness(() => captchaPage());
  await h.run([item(), item()]);
  // Both mirrors are probed once for the first item, then skipped entirely.
  assert.equal(h.calls.length, 2);
});
test("a DDoS-Guard 403 is treated as blocking rather than a plain HTTP error", async () => {
  const h = harness(() => ddosGuardPage());
  await h.run([item()]);
  assert.equal(h.windows.at(-1).title, "popwin-mirrorblocked");
});
// sci-hub.ee serves a Cloudflare Turnstile gate with HTTP 200 when the article
// has to be fetched on demand ("Verification - Sci-Hub").
const turnstilePage = () => ({
  status: 200,
  statusText: "OK",
  responseXML: {
    documentElement: {
      innerHTML:
        '<html><head><title>Verification - Sci-Hub</title></head><body>' +
        '<p>Please complete the check to continue.</p>' +
        '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>' +
        '<script>fetch("/api/verify-turnstile", { method: "POST" })</script>' +
        "</body></html>",
    },
    querySelector: () => null,
  },
});
test("a Turnstile verification page is reported as blocked", async () => {
  const h = harness(() => turnstilePage());
  await h.run([item()]);
  assert.equal(h.calls.length, 2);
  assert.equal(h.imports.length, 0);
  assert.equal(h.windows.at(-1).title, "popwin-mirrorblocked");
});
test("mixing blocking and missing PDFs is not reported as blocked", async () => {
  const h = harness(({ calls }) =>
    calls.length === 1 ? captchaPage() : page(200),
  );
  await h.run([item()]);
  // One mirror blocked and one reporting "not found" is ambiguous, so neither
  // the blocked nor the not-found wording is accurate.
  assert.equal(h.windows.at(-1).title, "popwin-fetchfailed");
});

test("a failing PDF download reports the underlying error, not a generic message", async () => {
  const h = harness(
    () => page(200, true),
    {
      attachRemotePDF: async () => {
        throw Object.assign(
          new Error(
            "HTTP GET https://pdf.example/test.pdf failed with status code 403",
          ),
          { status: 403 },
        );
      },
    },
  );
  await h.run([item()]);
  const last = h.windows.at(-1);
  assert.equal(last.title, "popwin-fetchfailed");
  assert.match(last.descriptions.join(" "), /403/);
});
test("issue 86: the .pdf extension is not duplicated in the attachment name", () => {
  assert.equal(Utils.pdfFileBaseName(new URL("https://x/paper.pdf")), "paper");
  assert.equal(Utils.pdfFileBaseName(new URL("https://x/a/b/2024.PDF")), "2024");
  // Only a trailing .pdf is stripped; dots inside the name are kept.
  assert.equal(Utils.pdfFileBaseName(new URL("https://x/v1.2.pdf")), "v1.2");
  assert.equal(Utils.pdfFileBaseName(new URL("https://x/download")), "download");
  // Nothing usable to name the file with: Zotero derives it from the URL.
  assert.equal(Utils.pdfFileBaseName(new URL("https://x/")), null);
});

test("DOIs followed by sentence punctuation are still extracted in full", () => {
  const doi = "10.1038/s41567-025-02822-y";
  for (const text of [
    `see ${doi}.`,
    `${doi}, and more`,
    `(${doi})`,
    `${doi};`,
    `"${doi}"`,
    `see ${doi} for details`,
    `[${doi}]`,
  ]) {
    assert.deepEqual(Array.from(identifiers.matchDOIs(text)), [doi], text);
  }
});

test("balanced parentheses inside a DOI suffix are preserved", () => {
  const doi = "10.1016/S0022-2836(02)00001-2";
  assert.deepEqual(
    Array.from(identifiers.matchDOIs(`ref ${doi}.`)),
    [doi],
  );
  assert.deepEqual(
    Array.from(identifiers.matchDOIs(`see (${doi})`)),
    [doi],
  );
});
