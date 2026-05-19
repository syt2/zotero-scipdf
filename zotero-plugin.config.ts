import { defineConfig } from "zotero-plugin-scaffold";
import { resolve } from "node:path";
import pkg from "./package.json";

const srcEntry = resolve("src/index.ts").replace(/\\/g, "/");

export default defineConfig({
  source: ["src", "addon"],
  dist: ".scaffold/build",
  name: pkg.config.addonName,
  id: pkg.config.addonID,
  namespace: pkg.config.addonRef,
  updateURL: `https://github.com/{{owner}}/{{repo}}/releases/download/release/${
    pkg.version.includes("-") ? "update-beta.json" : "update.json"
  }`,
  xpiDownloadLink:
    "https://github.com/{{owner}}/{{repo}}/releases/download/v{{version}}/{{xpiName}}.xpi",

  build: {
    assets: ["addon/**/*.*"],
    define: {
      ...pkg.config,
      author: pkg.author,
      description: pkg.description,
      homepage: pkg.homepage,
      buildVersion: pkg.version,
      buildTime: "{{buildTime}}",
    },
    prefs: {
      prefix: pkg.config.prefsPrefix,
    },
    esbuildOptions: [
      {
        entryPoints: [srcEntry],
        define: {
          __env__: `"${process.env.NODE_ENV}"`,
        },
        bundle: true,
        target: "firefox140",
        outfile: `.scaffold/build/addon/content/scripts/${pkg.config.addonRef}.js`,
      },
    ],
  },
  release: {
    bumpp: {
      commit: "chore(publish): release V%s",
      tag: "V%s",
    },
  },

  test: {
    waitForPlugin: `() => Zotero.${pkg.config.addonInstance}.data.initialized`,
  },

  // If you need to see a more detailed log, uncomment the following line:
  // logLevel: "trace",
});
