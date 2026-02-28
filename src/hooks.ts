import { getString, initLocale } from "./utils/locale";
import { registerPrefsScripts } from "./modules/preferenceScript";
import { createZToolkit } from "./utils/ztoolkit";
import { getPref, setPref } from "./utils/prefs";
import { sciHubCustomResolver, presetSciHubCustomResolvers } from "./modules/CustomResolver";
import { CustomResolverManager } from "./modules/CustomResolverManager";
import { Common } from "./modules/Common";

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
      CustomResolverManager.shared.appendCustomResolversInZotero(presetSciHubCustomResolvers(true));
    }
  } else {
    CustomResolverManager.shared.appendCustomResolversInZotero(presetSciHubCustomResolvers(true));
  }

  Common.registerPrefs();

  await Promise.all(
    Zotero.getMainWindows().map((win) => onMainWindowLoad(win)),
  );

  // Mark initialized as true to confirm plugin loading status
  // outside of the plugin (e.g. scaffold testing process)
  addon.data.initialized = true;
}

async function onMainWindowLoad(win: _ZoteroTypes.MainWindow): Promise<void> {
  // Create ztoolkit for every window
  addon.data.ztoolkit = createZToolkit();

  Common.registerRightClickMenuItem();
}

async function onMainWindowUnload(win: Window): Promise<void> {
  ztoolkit.unregisterAll();
  addon.data.dialog?.window?.close();
}

function onShutdown(): void {
  ztoolkit.unregisterAll();
  addon.data.dialog?.window?.close();
  // Remove addon object
  addon.data.alive = false;
  // @ts-expect-error - Plugin instance is not typed
  delete Zotero[addon.data.config.addonInstance];
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

export default {
  onStartup,
  onShutdown,
  onMainWindowLoad,
  onMainWindowUnload,
  onPrefsEvent,
};
