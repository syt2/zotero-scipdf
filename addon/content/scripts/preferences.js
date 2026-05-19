var SciPDF_Preferences = {
  init(win) {
    return Zotero.__addonInstance__.hooks.onPrefsEvent("load", {
      window: win || window,
    });
  },
};
