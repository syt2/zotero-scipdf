import { Common } from "./modules/Common";
import { config } from "../package.json";
import { initLocale } from "./utils/locale";
import { registerPrefsScripts } from "./modules/preferenceScript";
import { createZToolkit } from "./utils/ztoolkit";
import { Scihub } from "./modules/fetchers/scihub";
import { getPref, setPref } from "./utils/prefs";

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);
  initLocale();

  Common.registerPrefs();

  Common.registerNotifier();

  await onMainWindowLoad(window);
}

async function onMainWindowLoad(win: Window): Promise<void> {
  // Create ztoolkit for every window
  addon.data.ztoolkit = createZToolkit();

  Common.registerRightClickMenuItem();

  Common.registerRightClickCollectionMenuItem();

  Common.registerInMenuTool();

  if (!getPref("firstInstall")) {
    setPref("firstInstall", true);
    if (Zotero.Prefs.get("zoteroscihub.scihub_url")) {
      setPref(
        "scihubUrl",
        Zotero.Prefs.get("zoteroscihub.scihub_url") as string,
      );
    }
    if (Zotero.Prefs.get("zoteroscihub.automatic_pdf_download")) {
      setPref(
        "autoDownload",
        Zotero.Prefs.get("zoteroscihub.automatic_pdf_download") as boolean,
      );
    }
  }
}

async function onMainWindowUnload(win: Window): Promise<void> {
  ztoolkit.unregisterAll();
}

function onShutdown(): void {
  ztoolkit.unregisterAll();
  // Remove addon object
  addon.data.alive = false;
  delete Zotero[config.addonInstance];
}

/**
 * This function is just an example of dispatcher for Notify events.
 * Any operations should be placed in a function to keep this funcion clear.
 */
async function onNotify(
  event: string,
  type: string,
  ids: Array<string | number>,
  extraData: { [key: string]: any },
) {
  // You can add your code to the corresponding notify type
  if (event === "add" && Scihub.autoDownload) {
    const items = await Zotero.Items.getAsync(ids.map((e) => e.toString()));
    await Scihub.updateItems(items);
  }
}

/**
 * This function is just an example of dispatcher for Preference UI events.
 * Any operations should be placed in a function to keep this funcion clear.
 * @param type event type
 * @param data event data
 */
async function onPrefsEvent(type: string, data: { [key: string]: any }) {
  switch (type) {
    case "load":
      registerPrefsScripts(data.window);
      break;
    default:
      return;
  }
}

// Add your hooks here. For element click, etc.
// Keep in mind hooks only do dispatch. Don't add code that does real jobs in hooks.
// Otherwise the code would be hard to read and maintian.

export default {
  onStartup,
  onShutdown,
  onMainWindowLoad,
  onMainWindowUnload,
  onNotify,
  onPrefsEvent,
};
