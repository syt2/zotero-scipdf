import { getString } from "../utils/locale";
import { Utils } from "../utils/utils";
import { CustomResolverManager } from "./CustomResolverManager";

class PDFNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfNotFoundError";
    Object.setPrototypeOf(this, PDFNotFoundError.prototype);
  }
}

export class SciHubFetcher {
  private static readonly pdfNotAvailableRegexes = [
    /Please try to search again using DOI/im,
    /статья не найдена в базе/im,
  ];

  static async updateItems(
    items: Zotero.Item[],
    skipIfExistPDF: boolean = true,
  ) {
    const filtered: Zotero.Item[] = [];
    for (const item of items) {
      if (!item.isRegularItem()) {
        continue;
      }
      if (!skipIfExistPDF) {
        filtered.push(item);
        continue;
      }
      const attachment = await item.getBestAttachment();
      if (!attachment || !attachment.isPDFAttachment()) {
        filtered.push(item);
      }
    }

    if (filtered.length <= 0) {
      return;
    }

    for (const item of filtered) {
      const scihubUrls = await this.buildSciHubURLs(item);
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

      let resultAction: (() => void) | undefined;
      for (const scihubUrl of scihubUrls) {
        try {
          await this.fetchPDF(scihubUrl, item);
          resultAction = () => {
            Utils.showPopWin(
              getString("popwin-fetchsuccess"),
              item.getDisplayTitle(),
              "success",
            );
          };
          break;
        } catch (error) {
          if (error instanceof PDFNotFoundError) {
            resultAction = () => {
              Utils.showPopWin(
                getString("popwin-pdfnotavaliable"),
                item.getDisplayTitle(),
                "fail",
              );
            };
          } else {
            resultAction = () => {
              Utils.showPopWin(
                getString("popwin-unknownerror"),
                item.getDisplayTitle(),
                "fail",
                5000,
              );
            };
          }
        }
      }
      win.close();
      resultAction?.();
    }
  }

  private static async buildSciHubURLs(item: Zotero.Item): Promise<URL[]> {
    const dois = await Utils.extractDOIs(item);
    const baseURLs = this.baseSciHubURLs;
    const urls: URL[] = [];
    for (const doi of dois) {
      for (const base of baseURLs) {
        try {
          urls.push(new URL(doi, base));
        } catch {
          // skip invalid URLs
        }
      }
    }
    return urls;
  }

  private static get baseSciHubURLs(): string[] {
    const resolvers = CustomResolverManager.shared.customResolvers;
    if (resolvers.length <= 0) {
      return ["https://sci-hub.se/"];
    }
    return resolvers.map((r) => {
      // resolver.url is like "https://sci-hub.se/{doi}", extract the base
      return r.url.replace(/\{doi\}.*$/, "");
    });
  }

  private static async fetchPDF(scihubUrl: URL, item: Zotero.Item) {
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
    const body = xhr.responseXML?.querySelector("body");

    if (xhr.status === 200 && rawPDFUrl) {
      // new URL() handles absolute, protocol-relative, root-relative,
      // and relative paths correctly using scihubUrl as the base.
      const pdfUrl = new URL(rawPDFUrl, scihubUrl.href);
      pdfUrl.protocol = "https:";
      await Utils.attachRemotePDF(pdfUrl, item);
    } else if (xhr.status === 200 && this.pdfNotAvailable(body)) {
      ztoolkit.log(`scihub: PDF is not available at the moment "${scihubUrl}"`);
      throw new PDFNotFoundError(`PDF is not available: ${scihubUrl}`);
    } else {
      ztoolkit.log(`scihub: failed to fetch PDF from "${scihubUrl}"`);
      throw new Error(xhr.statusText);
    }
  }

  private static pdfNotAvailable(body?: Element | null): boolean {
    const innerHTML = (body as HTMLElement)?.innerHTML as string | undefined;
    if (!innerHTML || innerHTML.trim() === "") {
      return true;
    }
    return this.pdfNotAvailableRegexes.some((regex) => regex.test(innerHTML));
  }
}
