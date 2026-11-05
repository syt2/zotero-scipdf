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

  /**
   * Basename of a URL path with a trailing `.pdf` removed.
   *
   * `Zotero.Attachments.importFromURL()` appends the extension it detects to
   * `fileBaseName`, so passing the full URL basename produced `paper.pdf.pdf`
   * and defeated Zotero's automatic renaming (issue #86).
   */
  static pdfFileBaseName(pdfURL: URL): string | null {
    const basename = pdfURL.pathname.split("/").pop() || "";
    let name = basename;
    try {
      name = decodeURIComponent(basename);
    } catch {
      // Keep the raw (possibly percent-encoded) name if it is malformed.
    }
    const withoutExtension = name
      .replace(/\.pdf$/i, "")
      // Decoding may reintroduce path separators, which are not valid in a
      // filename (Zotero 10 rejects them outright).
      .replace(/[/\\]/g, "_")
      .trim();
    return withoutExtension || null;
  }

  static async attachRemotePDF(pdfURL: URL, item: Zotero.Item) {
    const fileBaseName = Utils.pdfFileBaseName(pdfURL);
    const importOptions = {
      libraryID: item.libraryID,
      url: pdfURL.href,
      parentItemID: item.id,
      title: item.getField("title"),
      // Omitted when the URL yields nothing usable, so Zotero falls back to
      // deriving the name from the URL itself.
      ...(fileBaseName ? { fileBaseName } : {}),
      contentType: "application/pdf",
      referrer: "",
      // Zotero 10 removed `Zotero.CookieSandbox`, and `importFromURL()` no
      // longer reads a `cookieSandbox` option. Isolated cookies are now set up
      // with `Zotero.HTTP.newCookieContext()` and passed as `userContextId`.
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
