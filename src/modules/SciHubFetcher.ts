import { getString } from "../utils/locale";
import { Utils } from "../utils/utils";
import { isSciHubCustomResolver } from "./CustomResolver";
import { CustomResolverManager } from "./CustomResolverManager";
import { OpenAlexFetcher } from "./OpenAlexFetcher";

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
      const dois = await Utils.extractDOIs(item);
      if (dois.length <= 0) {
        Utils.logTrace("none", "no-doi", {
          title: item.getDisplayTitle(),
        });
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

      try {
        if (await OpenAlexFetcher.attachPDF(item, dois)) {
          win.close();
          Utils.showPopWin(
            getString("popwin-fetchsuccess"),
            item.getDisplayTitle(),
            "success",
          );
          continue;
        }
      } catch (error) {
        ztoolkit.log(
          `openalex: failed to attach PDF for "${item.getField("title")}"`,
          error,
        );
      }

      const scihubUrls = this.buildSciHubURLs(dois);
      Utils.logTrace("scihub", "fallback", {
        title: item.getDisplayTitle(),
        dois,
        candidateCount: scihubUrls.length,
      });
      let resultAction: (() => void) | undefined;
      if (scihubUrls.length <= 0) {
        Utils.logTrace("scihub", "miss", {
          title: item.getDisplayTitle(),
          reason: "no-scihub-resolver",
        });
        resultAction = () => {
          Utils.showPopWin(
            getString("popwin-pdfnotavaliable"),
            item.getDisplayTitle(),
            "fail",
          );
        };
      }

      for (const scihubUrl of scihubUrls) {
        try {
          Utils.logTrace("scihub", "try", {
            title: item.getDisplayTitle(),
            candidateURL: scihubUrl.href,
          });
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

  private static buildSciHubURLs(dois: string[]): URL[] {
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
    const resolvers = CustomResolverManager.shared.customResolvers.filter(
      isSciHubCustomResolver,
    );
    if (resolvers.length <= 0) {
      return [];
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
      Utils.logTrace("scihub", "success", {
        title: item.getDisplayTitle(),
        sourceURL: scihubUrl.href,
        pdfURL: pdfUrl.href,
      });
    } else if (xhr.status === 200 && this.pdfNotAvailable(body)) {
      Utils.logTrace("scihub", "miss", {
        title: item.getDisplayTitle(),
        sourceURL: scihubUrl.href,
        reason: "pdf-not-available",
      });
      ztoolkit.log(`scihub: PDF is not available at the moment "${scihubUrl}"`);
      throw new PDFNotFoundError(`PDF is not available: ${scihubUrl}`);
    } else {
      Utils.logTrace("scihub", "error", {
        title: item.getDisplayTitle(),
        sourceURL: scihubUrl.href,
        status: xhr.status,
        statusText: xhr.statusText,
      });
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
