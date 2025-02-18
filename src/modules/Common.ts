import { config } from "../../package.json";
import { getString } from "../utils/locale";

export class Common {
  static registerPrefs() {
    const prefOptions = {
      pluginID: config.addonID,
      src: rootURI + "content/preferences.xhtml",
      label: getString("prefs-title"),
      image: `chrome://${config.addonRef}/content/icons/sci-hub-logo.svg`,
      defaultXUL: true,
    };
    ztoolkit.getGlobal("Zotero").PreferencePanes.register(prefOptions);
  }
}
