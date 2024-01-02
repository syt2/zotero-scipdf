import { config } from "../../package.json";
import { getString } from "../utils/locale";

export class Common {
  static registerPrefs() {
    const prefOptions = {
      pluginID: config.addonID,
      src: rootURI + "chrome/content/preferences.xhtml",
      label: getString("prefs-title"),
      image: `chrome://${config.addonRef}/content/icons/sci-hub-logo.svg`,
      defaultXUL: true,
    };
    ztoolkit.PreferencePane.register(prefOptions);
  }

  // // register an item in menu tools
  // static registerInMenuTool() {
  //   ztoolkit.Menu.register("menuTools", {
  //     tag: "menuseparator",
  //   });
  //   ztoolkit.Menu.register("menuTools", {
  //     tag: "menuitem",
  //     label: getString("menutoolsitem-fetchall"),
  //     commandListener: async (ev) => {
  //       let needHandleItems: Zotero.Item[] = [];
  //       for (const lib of Zotero.Libraries.getAll().filter((l) => l.editable)) {
  //         needHandleItems = needHandleItems
  //           .concat(await Zotero.Items.getAll(lib.id))
  //           .filter((item) => item.isRegularItem() && !item.isCollection());
  //       }
  //       Scihub.updateItems(needHandleItems);
  //     },
  //   });
  //   ztoolkit.Menu.register("menuTools", {
  //     tag: "menuseparator",
  //   });
  // }
}
