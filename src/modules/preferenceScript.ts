import { config } from "../../package.json";
import { sciHubCustomResolver } from "./CustomResolver";
import { CustomResolverManager } from "./CustomResolverManager";

export async function registerPrefsScripts(_window: Window) {
  // This function is called when the prefs window is opened
  // See addon/content/preferences.xhtml onpaneload
  if (!addon.data.prefs) {
    addon.data.prefs = {
      window: _window,
    };
  } else {
    addon.data.prefs.window = _window;
  }
  const autoDownloadCheckbox = _window.document.querySelector(`#zotero-prefpane-${config.addonRef}-autoDownload`) as XUL.Checkbox;
  const urlInput = _window.document.querySelector(`#zotero-prefpane-${config.addonRef}-scihubUrl`) as HTMLInputElement;

  const resolver = CustomResolverManager.shared.customResolvers;
  autoDownloadCheckbox.checked = resolver.length > 0 && resolver[0].automatic !== false;
  urlInput.value = resolver.map((e) => e.url).join(';');

  const validURL = (url?: string) => {
    return url && url.length > 0;
  };
  const updateResolver = () => {
    CustomResolverManager.shared.removeAllCustomResolversInZotero();
    const urls = urlInput.value.split(/\s*[;,，；、\s]\s*/);
    const setedURLs: string[] = [];
    for (const url of new Set(urls)) {
      if (validURL(url.trim())) {
        const resolver = sciHubCustomResolver(url.trim(), autoDownloadCheckbox.checked);
        CustomResolverManager.shared.appendCustomResolversInZotero([resolver]);
        setedURLs.push(resolver.url);
      } else {
        new ztoolkit.ProgressWindow(config.addonName, {
          closeOnClick: true,
          closeTime: 3000,
        }).createLine({
          text: `URL Error`,
          type: 'fail',
          progress: 0
        }).show();
      }
    }
    urlInput.value = setedURLs.join(',');
  }
  autoDownloadCheckbox.addEventListener("command", () => {
    updateResolver();
  });

  urlInput.addEventListener("change", () => {
    updateResolver();
  });
}
