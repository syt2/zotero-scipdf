import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { SciHubFetcher } from "./SciHubFetcher";

export class Common {
  private static preferencePaneID?: string;
  private static menuRegistrationID?: string;

  static async registerPrefs() {
    if (this.preferencePaneID) {
      return;
    }

    const prefOptions = {
      pluginID: config.addonID,
      id: `${config.addonRef}-preferences`,
      src: "content/preferences.xhtml",
      label: getString("prefs-title"),
      image: "content/icons/sci-hub-logo.svg",
      scripts: ["content/scripts/preferences.js"],
    };
    this.preferencePaneID = await Zotero.PreferencePanes.register(prefOptions);
  }

  static registerRightClickMenuItem() {
    if (this.menuRegistrationID) {
      return;
    }

    const menuIcon = `chrome://${config.addonRef}/content/icons/sci-hub-logo.svg`;

    const registeredID = Zotero.MenuManager.registerMenu({
      menuID: `${config.addonRef}-fetch-pdf`,
      pluginID: config.addonID,
      target: "main/library/item",
      menus: [
        {
          menuType: "menuitem",
          icon: menuIcon,
          onShowing: (_event, context) => {
            (context.menuElem as XULMenuItemElement).label =
              getString("menuitem-fetch");
            context.setVisible(
              context.items?.some((item) => item.isRegularItem()) ?? false,
            );
          },
          onCommand: (_event, context) => {
            void SciHubFetcher.updateItems(
              context.items?.filter((item) => item.isRegularItem()) ?? [],
              false,
            ).catch(logError);
          },
        },
      ],
    });

    if (!registeredID) {
      throw new Error("Failed to register the Sci-PDF item menu");
    }
    this.menuRegistrationID = registeredID;
  }

  static unregister() {
    if (this.menuRegistrationID) {
      Zotero.MenuManager?.unregisterMenu(this.menuRegistrationID);
      this.menuRegistrationID = undefined;
    }
    if (this.preferencePaneID) {
      Zotero.PreferencePanes.unregister(this.preferencePaneID);
      this.preferencePaneID = undefined;
    }
  }
}

function logError(error: unknown) {
  Zotero.logError(error instanceof Error ? error : new Error(String(error)));
}
