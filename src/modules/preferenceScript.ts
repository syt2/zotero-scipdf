import { config } from "../../package.json";
import {
  getAutomaticDownloadSetting,
  getOpenAlexApiKeySetting,
  getOpenAlexEnabledSetting,
  getSciHubURLsSetting,
  normalizeSciHubURLs,
  setResolverSettings,
} from "./ResolverSettings";

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
  const autoDownloadCheckbox = _window.document.querySelector(
    `#zotero-prefpane-${config.addonRef}-autoDownload`,
  ) as XUL.Checkbox;
  const openAlexCheckbox = _window.document.querySelector(
    `#zotero-prefpane-${config.addonRef}-enableOpenAlex`,
  ) as XUL.Checkbox;
  const openAlexApiKeyInput = _window.document.querySelector(
    `#zotero-prefpane-${config.addonRef}-openAlexApiKey`,
  ) as HTMLInputElement;
  const urlInput = _window.document.querySelector(
    `#zotero-prefpane-${config.addonRef}-scihubUrl`,
  ) as HTMLInputElement;

  autoDownloadCheckbox.checked = getAutomaticDownloadSetting();
  openAlexCheckbox.checked = getOpenAlexEnabledSetting();
  openAlexApiKeyInput.value = getOpenAlexApiKeySetting();
  urlInput.value = getSciHubURLsSetting().join(",");

  const updateResolver = () => {
    const normalizedSciHubURLs = normalizeSciHubURLs(urlInput.value);
    setResolverSettings({
      automaticDownload: autoDownloadCheckbox.checked,
      sciHubURLs: normalizedSciHubURLs,
      enableOpenAlex: openAlexCheckbox.checked,
      openAlexApiKey: openAlexApiKeyInput.value,
    });
    openAlexApiKeyInput.value = getOpenAlexApiKeySetting();
    urlInput.value = getSciHubURLsSetting().join(",");
  };
  autoDownloadCheckbox.addEventListener("command", () => {
    updateResolver();
  });

  openAlexCheckbox.addEventListener("command", () => {
    updateResolver();
  });

  openAlexApiKeyInput.addEventListener("change", () => {
    updateResolver();
  });

  urlInput.addEventListener("change", () => {
    updateResolver();
  });
}
