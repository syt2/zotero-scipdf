const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { dirname } = require("node:path");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");

function loadModule(file, imports, globals = {}) {
  const exports = {};
  const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  runInNewContext(outputText, {
    exports,
    require(id) {
      assert.ok(Object.hasOwn(imports, id), `Unexpected import: ${id}`);
      return imports[id];
    },
    ...globals,
  });
  return exports;
}

const root = dirname(require.resolve("../package.json"));
const resolvers = loadModule(`${root}/src/modules/CustomResolver.ts`, {});

async function start({ installed = true, saved = [], legacy = {} } = {}) {
  const appended = [];
  const prefs = { firstInstall: installed };
  const addon = { data: {} };
  const hooks = loadModule(
    `${root}/src/hooks.ts`,
    {
      "./utils/locale": { initLocale() {} },
      "./modules/preferenceScript": {},
      "./utils/ztoolkit": {},
      "./utils/prefs": {
        getPref: (key) => prefs[key],
        setPref: (key, value) => (prefs[key] = value),
      },
      "./modules/CustomResolver": resolvers,
      "./modules/CustomResolverManager": {
        CustomResolverManager: {
          shared: {
            customResolvers: saved,
            appendCustomResolversInZotero: (values) => appended.push(...values),
          },
        },
      },
      "./modules/Common": { Common: { async registerPrefs() {} } },
    },
    {
      addon,
      Zotero: {
        Prefs: { get: (key) => legacy[key] },
        getMainWindows: () => [],
      },
    },
  ).default;
  await hooks.onStartup();
  assert.equal(addon.data.initialized, true);
  return JSON.parse(JSON.stringify(appended));
}

test("restart restores only saved URLs and keeps automatic download disabled", async () => {
  const saved = [resolvers.sciHubCustomResolver("https://example.org", false)];
  assert.deepEqual(await start({ saved }), JSON.parse(JSON.stringify(saved)));
});

test("restart preserves an intentionally empty resolver list", async () => {
  assert.deepEqual(await start({ saved: [] }), []);
});

test("first installation still initializes the preset resolvers", async () => {
  assert.deepEqual(
    await start({ installed: false }),
    JSON.parse(JSON.stringify(resolvers.presetSciHubCustomResolvers(true))),
  );
});

test("first installation still migrates the legacy URL and disabled setting", async () => {
  assert.deepEqual(
    await start({
      installed: false,
      legacy: { "zoteroscihub.scihub_url": "https://example.net" },
    }),
    [
      JSON.parse(
        JSON.stringify(
          resolvers.sciHubCustomResolver("https://example.net", false),
        ),
      ),
    ],
  );
});
