import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { SciHubFetcher } from "./SciHubFetcher";

export class Common {
  private static readonly itemMenuID = "scipdf-itemmenu-scihub-fetch";

  private static applyMenuItemIcon(menuElem: XULElement, icon: string) {
    if (Zotero.isMac) {
      return;
    }
    menuElem.classList.add("menuitem-iconic");
    menuElem.setAttribute("image", icon);
    menuElem.style.setProperty("list-style-image", `url(${icon})`);
  }

  static async registerPrefs() {
    const prefOptions = {
      pluginID: config.addonID,
      src: "content/preferences.xhtml",
      label: getString("prefs-title"),
      image: "content/icons/sci-hub-logo.svg",
      scripts: ["content/scripts/preferences.js"],
      defaultXUL: true,
    };
    await ztoolkit.getGlobal("Zotero").PreferencePanes.register(prefOptions);
  }

  static registerRightClickMenuItem() {
    const menuIcon = `chrome://${config.addonRef}/content/icons/sci-hub-logo.svg`;
    if (Zotero.MenuManager) {
      if (addon.data.registeredMenuIDs.includes(this.itemMenuID)) {
        return;
      }
      const registeredMenuID = Zotero.MenuManager.registerMenu({
        menuID: this.itemMenuID,
        pluginID: config.addonID,
        target: "main/library/item",
        menus: [
          {
            menuType: "menuitem",
            icon: menuIcon,
            onShowing: (_event, context) => {
              context.menuElem.setAttribute(
                "label",
                getString("menuitem-fetch"),
              );
              context.setIcon(menuIcon);
              Common.applyMenuItemIcon(context.menuElem, menuIcon);
              const items =
                context.items ??
                Zotero.getActiveZoteroPane().getSelectedItems();
              context.setVisible(items.some((item) => item.isRegularItem()));
            },
            onCommand: (_event, context) => {
              const items =
                context.items ??
                Zotero.getActiveZoteroPane().getSelectedItems();
              SciHubFetcher.updateItems(items, false);
            },
          },
        ],
      });
      if (registeredMenuID) {
        addon.data.registeredMenuIDs.push(registeredMenuID);
      }
      return;
    }

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

  static unregisterMenus() {
    for (const menuID of addon.data.registeredMenuIDs) {
      Zotero.MenuManager?.unregisterMenu(menuID);
    }
    addon.data.registeredMenuIDs = [];
  }
}
