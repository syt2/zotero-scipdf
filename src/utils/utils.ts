import { clickableProgressWindow } from "./clickableProgressWindow";
import { Source, matchedIdentifiers } from "./identifierMatch";

type ItemSearchableInfo = {
  titles: string[];
  DOIs: string[];
  arxivIDs: string[];
};

export class Utils {
  static async searchableInfo(item: Zotero.Item) {
    const result: ItemSearchableInfo = {
      titles: [],
      DOIs: [],
      arxivIDs: [],
    };

    const extractIds = (text: string) => {
      for (const [sourceKey, values] of Object.entries(
        matchedIdentifiers(text),
      )) {
        const source: Source = parseInt(sourceKey);
        for (const id of values) {
          if (source === Source.Arxiv && !result.arxivIDs.includes(id)) {
            result.arxivIDs.push(id);
          } else if (source === Source.Doi && !result.DOIs.includes(id)) {
            result.DOIs.push(id);
          }
        }
      }
    };

    const extractInfos = async (item: Zotero.Item) => {
      const doi = item.getField("DOI");
      if (doi && typeof doi === "string") {
        extractIds(doi);
      }
      const link = item.getField("url");
      if (link && typeof link === "string") {
        extractIds(link);
      }
      const title = item.getDisplayTitle();
      if (title && typeof title === "string") {
        extractIds(title);
        result.titles.push(title);
      }
      const titleFiled = item.getField("title");
      if (
        titleFiled &&
        typeof titleFiled === "string" &&
        titleFiled !== title
      ) {
        extractIds(titleFiled);
        result.titles.push(titleFiled);
      }
      const extra = item.getField("extra");
      if (extra && typeof extra === "string") {
        extractIds(extra);
      }
    };

    extractInfos(item);
    for (const attachment of await item.getBestAttachments()) {
      extractInfos(attachment);
    }
    return result;
  }

  static async attachRemotePDF(pdfURL: URL, item: Zotero.Item) {
    const filename = this.filenameFromURL(pdfURL);
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
    const result = await Zotero.Attachments.importFromURL(importOptions);
    ztoolkit.log(`Import result: ${JSON.stringify(result)}`);
  }

  static urlToHttpsURL(url: string) {
    const httpsURL = new URL(url.replace(/^\/\//, "https://"));
    httpsURL.protocol = "https";
    return httpsURL;
  }

  static filenameFromURL(url: URL) {
    return url.pathname.split("/").pop() || null;
  }

  static showPopWin(
    title: string,
    message: string,
    type?: "fail" | "success" | "default",
    closeTime: number = 3000,
    description?: string,
    click?: VoidFunction,
  ) {
    if (!click) {
      const win = new ztoolkit.ProgressWindow(title, {
        closeOnClick: true,
        closeTime: closeTime,
      }).createLine({
        text: message,
        type: type,
        progress: 0,
      });
      if (description) {
        win.addDescription(description);
      }
      win.show(closeTime);
      return win;
    } else {
      const clickWin = new clickableProgressWindow(
        title,
        {
          text: message,
          type: type,
          progress: 0,
        },
        () => {
          click();
        },
      );
      if (description) {
        clickWin.window.addDescription(description);
      }
      clickWin.show();
      (async () => {
        await Zotero.Promise.delay(closeTime);
        clickWin.close();
      })();
      return clickWin.window;
    }
  }
}
