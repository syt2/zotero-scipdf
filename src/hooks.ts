import { Common } from "./modules/Common";
import { config } from "../package.json";
import { initLocale } from "./utils/locale";
import { registerPrefsScripts } from "./modules/preferenceScript";
import { createZToolkit } from "./utils/ztoolkit";
import { getPref, setPref } from "./utils/prefs";
import { CustomResolverManager } from "./modules/CustomResolverManager";
import { sciHubCustomResolver } from "./modules/CustomResolver";

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);
  initLocale();

  if (!getPref("firstInstall")) {
    setPref("firstInstall", true);
    const url = Zotero.Prefs.get("zoteroscihub.scihub_url");
    let autoDownload = false;
    if (Zotero.Prefs.get("zoteroscihub.automatic_pdf_download")) {
      autoDownload = true;
    }
    if (url && typeof url === 'string') {
      const resolver = sciHubCustomResolver(url, autoDownload);
      CustomResolverManager.shared.appendCustomResolversInZotero([resolver]);
    } else {
      CustomResolverManager.shared.appendCustomResolversInZotero([sciHubCustomResolver("https://sci-hub.ru/", true)]);
    }
  } else {
    CustomResolverManager.shared.appendCustomResolversInZotero([sciHubCustomResolver("https://sci-hub.ru/", true)]);
  }

  Common.registerPrefs();

  await onMainWindowLoad(window);
}

async function onMainWindowLoad(win: Window): Promise<void> {
  // Create ztoolkit for every window
  addon.data.ztoolkit = createZToolkit();
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
  onPrefsEvent,
};
