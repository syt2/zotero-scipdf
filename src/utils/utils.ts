import { matchDOIs } from "./identifierPatterns";

export class Utils {
  static async extractDOIs(item: Zotero.Item): Promise<string[]> {
    // A valid explicit DOI takes precedence over references in title/extra.
    const explicitDOI = item.getField("DOI");
    if (typeof explicitDOI === "string") {
      const matches = matchDOIs(explicitDOI.trim());
      if (matches.length) return matches;
    }
    const dois: string[] = [];

    const extract = (text: string) => {
      for (const doi of matchDOIs(text)) {
        if (!dois.some((value) => value.toLowerCase() === doi.toLowerCase())) {
          dois.push(doi);
        }
      }
    };

    const extractFromItem = (it: Zotero.Item) => {
      for (const field of ["DOI", "url", "title", "extra"] as const) {
        const value = it.getField(field);
        if (value && typeof value === "string") {
          extract(value);
        }
      }
    };

    extractFromItem(item);
    for (const attachment of await item.getBestAttachments()) {
      extractFromItem(attachment);
    }
    return dois;
  }

  static async attachRemotePDF(pdfURL: URL, item: Zotero.Item) {
    const filename = pdfURL.pathname.split("/").pop() || null;
    const importOptions = {
      libraryID: item.libraryID,
      url: pdfURL.href,
      parentItemID: item.id,
      title: item.getField("title"),
      fileBaseName: filename,
      contentType: "application/pdf",
      referrer: "",
      cookieSandbox: null,
    };
    ztoolkit.log(
      `Import Options: ${JSON.stringify(importOptions, null, "\t")}`,
    );
    await Zotero.Attachments.importFromURL(importOptions);
  }

  static showPopWin(
    title: string,
    message: string,
    type?: "fail" | "success" | "default",
    closeTime: number = 3000,
  ) {
    const win = new ztoolkit.ProgressWindow(title, {
      closeOnClick: true,
      closeTime: closeTime,
    }).createLine({
      text: message,
      type: type,
      progress: 0,
    });
    win.show(closeTime);
    return win;
  }
}
