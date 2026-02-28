import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { SciHubFetcher } from "./SciHubFetcher";

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

  static registerRightClickMenuItem() {
    const menuIcon = `chrome://${config.addonRef}/content/icons/sci-hub-logo.svg`;
    ztoolkit.Menu.register("item", {
      tag: "menuitem",
      id: "zotero-itemmenu-scihub-fetch",
      label: getString("menuitem-fetch"),
      isHidden: () => {
        const items = Zotero.getActiveZoteroPane().getSelectedItems();
        return !items.some((item) => item.isRegularItem());
      },
      commandListener: () => {
        const zoteroPane = Zotero.getActiveZoteroPane();
        SciHubFetcher.updateItems(zoteroPane.getSelectedItems(), false);
      },
      icon: menuIcon,
    });
  }
}
