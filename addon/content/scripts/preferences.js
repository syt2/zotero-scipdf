globalThis.SciPDF_Preferences = {
  init(win) {
    return globalThis.Zotero.__addonInstance__.hooks.onPrefsEvent("load", {
      window: win || globalThis.window,
    });
  },
};
