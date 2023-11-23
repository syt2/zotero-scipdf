import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { Scihub } from "./fetchers/scihub";

export class Common {
  static registerNotifier() {
    const callback = {
      notify: async (
        event: string,
        type: string,
        ids: number[] | string[],
        extraData: { [key: string]: any },
      ) => {
        if (!addon?.data.alive) {
          this.unregisterNotifier(notifierID);
          return;
        }
        addon.hooks.onNotify(event, type, ids, extraData);
      },
    };

    // Register the callback in Zotero as an item observer
    const notifierID = Zotero.Notifier.registerObserver(callback, ["item"]);

    // Unregister callback when the window closes (important to avoid a memory leak)
    window.addEventListener(
      "unload",
      (e: Event) => {
        this.unregisterNotifier(notifierID);
      },
      false,
    );
  }

  private static unregisterNotifier(notifierID: string) {
    Zotero.Notifier.unregisterObserver(notifierID);
  }

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

  static registerRightClickMenuItem() {
    const menuIcon = `chrome://${config.addonRef}/content/icons/sci-hub-logo.svg`;
    // item menuitem with icon
    ztoolkit.Menu.register("item", {
      tag: "menuitem",
      id: "zotero-itemmenu-pdfautofetcher",
      label: getString("menuitem-fetch"),
      commandListener: (ev) => {
        Scihub.updateItems(ZoteroPane.getSelectedItems(), false);
      },
      icon: menuIcon,
    });
  }

  static registerRightClickCollectionMenuItem() {
    const menuIcon = `chrome://${config.addonRef}/content/icons/sci-hub-logo.svg`;
    ztoolkit.Menu.register("collection", {
      tag: "menuitem",
      id: "zotero-collectionmenu-pdfautofetcher",
      label: getString("collectionmenuitem-fetch"),
      commandListener: (ev) => {
        if (!ZoteroPane.canEdit()) {
          ZoteroPane.displayCannotEditLibraryMessage();
          return;
        }
        Scihub.updateItems(
          ZoteroPane.getSelectedCollection(false)?.getChildItems(
            false,
            false,
          ) ?? [],
        );
      },
      icon: menuIcon,
    });
  }

  // register an item in menu tools
  static registerInMenuTool() {
    ztoolkit.Menu.register("menuTools", {
      tag: "menuseparator",
    });
    ztoolkit.Menu.register("menuTools", {
      tag: "menuitem",
      label: getString("menutoolsitem-fetchall"),
      commandListener: async (ev) => {
        let needHandleItems: Zotero.Item[] = [];
        for (const lib of Zotero.Libraries.getAll().filter((l) => l.editable)) {
          needHandleItems = needHandleItems
            .concat(await Zotero.Items.getAll(lib.id))
            .filter((item) => item.isRegularItem() && !item.isCollection());
        }
        Scihub.updateItems(needHandleItems);
      },
    });
    ztoolkit.Menu.register("menuTools", {
      tag: "menuseparator",
    });
  }
}
