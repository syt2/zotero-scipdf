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

    const state = {
      cancelled: false,
      cancelRequest: undefined as (() => void) | undefined,
    };
    // Do not retry a throttled host again in this batch.
    const throttledHosts = new Set<string>();
    for (const [itemIndex, item] of filtered.entries()) {
      if (state.cancelled) break;
      const scihubUrls = await this.buildSciHubURLs(item);
      if (!scihubUrls.length) {
        Utils.showPopWin(
          getString("popwin-doimissing"),
          item.getDisplayTitle(),
          "fail",
        );
        continue;
      }
      const win = Utils.showPopWin(
        getString("popwin-fetching"),
        item.getDisplayTitle(),
        "default",
        0,
      );
      win.addDescription(getString("popwin-cancelhint"));
      const close = win.win.close.bind(win.win);
      // Zotero's close-on-click calls this method. Programmatic cleanup uses close directly.
      win.win.close = () => {
        state.cancelled = true;
        state.cancelRequest?.();
        close();
      };
      let success = false;
      let allNotFound = true;
      try {
        for (const [mirrorIndex, scihubUrl] of scihubUrls.entries()) {
          if (state.cancelled) break;
          if (throttledHosts.has(scihubUrl.host)) {
            allNotFound = false;
            continue;
          }
          win.changeLine({
            text: getString("popwin-fetchprogress", {
              args: {
                item: itemIndex + 1,
                items: filtered.length,
                mirror: mirrorIndex + 1,
                mirrors: scihubUrls.length,
                host: scihubUrl.host,
                title: item.getDisplayTitle(),
              },
            }),
            progress: (mirrorIndex / scihubUrls.length) * 100,
          });
          try {
            await this.fetchPDF(scihubUrl, item, state);
            success = !state.cancelled;
            break;
          } catch (error) {
            if (state.cancelled) break;
            const status = (error as { status?: number } | null)?.status;
            if (status === 429 || status === 503)
              throttledHosts.add(scihubUrl.host);
            allNotFound &&= error instanceof PDFNotFoundError;
            Zotero.debug(`[Sci-PDF] ${scihubUrl.href}: ${String(error)}`);
          } finally {
            state.cancelRequest = undefined;
          }
        }
      } finally {
        win.win.close = close;
        close();
      }
      if (state.cancelled) {
        Utils.showPopWin(getString("popwin-cancelled"), item.getDisplayTitle());
        break;
      }
      Utils.showPopWin(
        getString(
          success
            ? "popwin-fetchsuccess"
            : allNotFound
              ? "popwin-pdfnotavaliable"
              : "popwin-fetchfailed",
        ),
        item.getDisplayTitle(),
        success ? "success" : "fail",
        5000,
      );
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

  private static async fetchPDF(
    scihubUrl: URL,
    item: Zotero.Item,
    state: { cancelled: boolean; cancelRequest?: () => void },
  ) {
    const xhr = await Zotero.HTTP.request("GET", scihubUrl.href, {
      responseType: "document",
      timeout: 15000,
      errorDelayMax: 0,
      // Handle status codes ourselves, avoiding automatic Retry-After waits on Z7 too.
      successCodes: false,
      cancellerReceiver: (cancel: () => void) => {
        state.cancelRequest = cancel;
        if (state.cancelled) cancel();
      },
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 11_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1",
      },
    });
    state.cancelRequest = undefined;
    if (state.cancelled) return;
    if (xhr.status !== 200) {
      throw Object.assign(new Error(`HTTP ${xhr.status} ${xhr.statusText}`), {
        status: xhr.status,
      });
    }
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
