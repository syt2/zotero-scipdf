import { clickableProgressWindow } from "../../utils/clickableProgressWindow";
import { getString } from "../../utils/locale";
import { getPref } from "../../utils/prefs";
import { Utils } from "../../utils/utils";

class PDFNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfNotFoundError";
    Object.setPrototypeOf(this, PDFNotFoundError.prototype);
  }
}

export class Scihub {
  private static readonly pdfNotAvaliableRegexs = [
    /Please try to search again using DOI/im,
    /статья не найдена в базе/im,
  ];

  static async updateItems(
    items: Zotero.Item[],
    skipIfExistPDF: boolean = true,
  ) {
    items = items.filter(async (item) => {
      if (!item.isRegularItem() || item.isCollection()) {
        return false;
      }
      if (!skipIfExistPDF) {
        return true;
      }
      const attachment = await item.getBestAttachment();
      if (!attachment) {
        return true;
      }
      return !attachment.isPDFAttachment();
    });
    if (items.length <= 0) {
      return;
    }

    for (const item of items) {
      const scihubUrls = await this.scihubURLs(item);
      if (scihubUrls.length <= 0) {
        Utils.showPopWin(
          getString("popwin-doimissing"),
          item.getDisplayTitle(),
          "fail",
        );
        ztoolkit.log(`DOI Not Found for "${item.getField("title")}"`);
        continue;
      }
      const win = Utils.showPopWin(
        getString("popwin-fetching"),
        item.getDisplayTitle(),
      );
      let blk: (() => void) | undefined = undefined;
      for (const scihubUrl of scihubUrls) {
        try {
          await this.updateItem(scihubUrl, item);
          blk = () => {
            Utils.showPopWin(
              getString("popwin-fetchsuccess"),
              item.getDisplayTitle(),
              "success",
            );
          };
          break;
        } catch (error) {
          if (error instanceof PDFNotFoundError) {
            blk = () => {
              Utils.showPopWin(
                getString("popwin-pdfnotavaliable"),
                item.getDisplayTitle(),
                "fail",
              );
            };
          } else {
            blk = () => {
              Utils.showPopWin(
                getString("popwin-unknownerror"),
                item.getDisplayTitle(),
                "fail",
                5000,
                getString("popwin-unknownerrorclick"),
                () => {
                  Zotero.launchURL(scihubUrl.href);
                },
              );
            };
          }
        }
      }
      win.close();
      blk?.();
    }
  }

  private static async scihubURLs(item: Zotero.Item) {
    const info = await Utils.searchableInfo(item);
    return info.DOIs.map((e) => new URL(e, this.baseScihubURL));
  }

  private static async updateItem(scihubUrl: URL, item: Zotero.Item) {
    const xhr = await Zotero.HTTP.request("GET", scihubUrl.href, {
      responseType: "document",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 11_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1",
      },
    });
    const rawPDFUrl = xhr.responseXML
      ?.querySelector("#pdf")
      ?.getAttribute("src");
    let pdfUrl = rawPDFUrl;
    if (
      rawPDFUrl !== undefined &&
      !rawPDFUrl?.startsWith("http") &&
      !rawPDFUrl?.startsWith("//")
    ) {
      pdfUrl = `${this.baseScihubURL}${rawPDFUrl}`;
    }

    const body = xhr.responseXML?.querySelector("body");

    if (xhr.status === 200 && pdfUrl) {
      const httpsUrl = Utils.urlToHttpsURL(pdfUrl);
      await Utils.attachRemotePDF(httpsUrl, item);
    } else if (xhr.status === 200 && this.pdfNotAvaliable(body)) {
      ztoolkit.log(`scihub: PDF is not available at the moment "${scihubUrl}"`);
      throw new PDFNotFoundError(`PDF is not available: ${scihubUrl}`);
    } else {
      ztoolkit.log(`scihub: failed to fetch PDF from "${scihubUrl}"`);
      throw new Error(xhr.statusText);
    }
  }

  static get baseScihubURL() {
    return getPref("scihubUrl") as string;
  }

  static get autoDownload() {
    return getPref("autoDownload") as boolean;
  }

  private static pdfNotAvaliable(body?: HTMLBodyElement) {
    const innerHTML = body?.innerHTML;
    if (!innerHTML || innerHTML.trim() === "") {
      return true;
    }
    return this.pdfNotAvaliableRegexs.reduce((pre, cur) => {
      if (pre) {
        return pre;
      }
      if (innerHTML.match(cur)) {
        return true;
      }
      return false;
    }, false);
  }
}
