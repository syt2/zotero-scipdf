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

/**
 * Raised when a Sci-Hub mirror answered with an anti-bot interstitial instead
 * of a document page.
 *
 * As of 2026 the mirrors serve these interstitials with HTTP 200 (Altcha on
 * `sci-hub.ru`) or 403 (DDoS-Guard on `sci-hub.st` / `sci-hub.box`), so the
 * response looks successful while never containing the `#pdf` element. Without
 * a distinct error the plugin walked every configured mirror and ended with a
 * generic "download failed" message, which made it look like a Zotero 10
 * incompatibility (see issue #85).
 */
class PDFBlockedError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "PdfBlockedError";
    this.status = status;
    Object.setPrototypeOf(this, PDFBlockedError.prototype);
  }
}

export class SciHubFetcher {
  private static readonly pdfNotAvailableRegexes = [
    /Please try to search again using DOI/im,
    /статья не найдена в базе/im,
  ];

  /**
   * Signatures of the anti-bot interstitials currently served by Sci-Hub
   * mirrors. All of them have been verified against live responses:
   * `sci-hub.ru` (Altcha widget, `/captcha/challenge/...`, "проверка на
   * робота"), `sci-hub.st` / `sci-hub.box` (DDoS-Guard `ddg-*` markup) and
   * `sci-hub.ee` (Cloudflare Turnstile, `/api/verify-turnstile`, served from a
   * page titled "Verification - Sci-Hub").
   */
  private static readonly antiBotRegexes = [
    /altcha/i,
    /captcha\/(challenge|solution)/i,
    /проверка\s+на\s+робота/i,
    /ddos-?guard|ddg-l10n|ddg-origin/i,
    /__cf_chl|cf-challenge|just a moment/i,
    // Any Turnstile/reCAPTCHA widget, however the host names it.
    /turnstile|g-recaptcha|h-captcha/i,
    /verify-turnstile|challenges\.cloudflare\.com/i,
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
    // Do not retry a throttled or anti-bot blocked host again in this batch.
    const throttledHosts = new Set<string>();
    const blockedHosts = new Set<string>();
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
      let allBlocked = true;
      let blockedURL: URL | undefined;
      let lastError: unknown;
      try {
        for (const [mirrorIndex, scihubUrl] of scihubUrls.entries()) {
          if (state.cancelled) break;
          if (
            throttledHosts.has(scihubUrl.host) ||
            blockedHosts.has(scihubUrl.host)
          ) {
            allNotFound = false;
            allBlocked = false;
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
            if (error instanceof PDFBlockedError) {
              // The whole host refuses automated requests, so don't spend the
              // remaining items of this batch on it.
              blockedHosts.add(scihubUrl.host);
              blockedURL ??= scihubUrl;
            }
            allNotFound &&= error instanceof PDFNotFoundError;
            allBlocked &&= error instanceof PDFBlockedError;
            lastError = error;
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
      if (success) {
        Utils.showPopWin(
          getString("popwin-fetchsuccess"),
          item.getDisplayTitle(),
          "success",
          5000,
        );
        continue;
      }
      if (allBlocked) {
        // Keep this visible until dismissed: it needs a manual action, so a
        // "failed" popup that disappears after 5s only hides the real cause.
        const blockedWin = Utils.showPopWin(
          getString("popwin-mirrorblocked"),
          item.getDisplayTitle(),
          "fail",
          0,
        );
        if (blockedURL) {
          blockedWin.addDescription(blockedURL.href);
        }
        continue;
      }
      if (allNotFound) {
        Utils.showPopWin(
          getString("popwin-pdfnotavaliable"),
          item.getDisplayTitle(),
          "fail",
          5000,
        );
        continue;
      }
      // Surface the underlying error. Without it a blocked PDF host (e.g. an
      // "HTTP 403" from the file CDN, or a proxy that cannot reach it) is
      // indistinguishable from a plain network outage, which is exactly how
      // this was misread as a Zotero 10 incompatibility.
      const failedWin = Utils.showPopWin(
        getString("popwin-fetchfailed"),
        item.getDisplayTitle(),
        "fail",
        5000,
      );
      if (lastError !== undefined) {
        failedWin.addDescription(
          lastError instanceof Error
            ? `${lastError.name}: ${lastError.message}`
            : String(lastError),
        );
      }
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

    const responseXML = xhr.responseXML;
    const rawPDFUrl = responseXML?.querySelector("#pdf")?.getAttribute("src");
    const body = responseXML?.querySelector("body");

    if (xhr.status === 200 && rawPDFUrl) {
      // new URL() handles absolute, protocol-relative, root-relative,
      // and relative paths correctly using scihubUrl as the base.
      const pdfUrl = new URL(rawPDFUrl, scihubUrl.href);
      pdfUrl.protocol = "https:";
      await Utils.attachRemotePDF(pdfUrl, item);
      return;
    }
    // Checked before the status branch: sci-hub.ru serves its robot check with
    // HTTP 200, and DDoS-Guard uses 403.
    if (xhr.status === 403 || this.blockedPage(responseXML)) {
      ztoolkit.log(
        `scihub: anti-bot interstitial from "${scihubUrl}" (HTTP ${xhr.status})`,
      );
      throw new PDFBlockedError(
        `Blocked by mirror anti-bot protection: ${scihubUrl}`,
        xhr.status,
      );
    }
    if (xhr.status !== 200) {
      throw Object.assign(new Error(`HTTP ${xhr.status} ${xhr.statusText}`), {
        status: xhr.status,
      });
    }
    if (this.pdfNotAvailable(body)) {
      ztoolkit.log(`scihub: PDF is not available at the moment "${scihubUrl}"`);
      throw new PDFNotFoundError(`PDF is not available: ${scihubUrl}`);
    }
    ztoolkit.log(`scihub: failed to fetch PDF from "${scihubUrl}"`);
    throw new Error(xhr.statusText);
  }

  private static pdfNotAvailable(body?: Element | null): boolean {
    const innerHTML = (body as HTMLElement)?.innerHTML as string | undefined;
    if (!innerHTML || innerHTML.trim() === "") {
      return true;
    }
    return this.pdfNotAvailableRegexes.some((regex) => regex.test(innerHTML));
  }

  /**
   * Detect an anti-bot interstitial. The whole document is inspected because
   * the markers are split between `<head>` (e.g. `/scripts/altcha.min.js`) and
   * `<body>` (e.g. `<altcha-widget>`), and mirrors differ in where they put
   * them.
   */
  private static blockedPage(responseXML?: unknown): boolean {
    const doc = responseXML as
      | {
          documentElement?: { innerHTML?: string };
          querySelector?: (selector: string) => { innerHTML?: string } | null;
        }
      | null
      | undefined;
    if (!doc) {
      return false;
    }
    const html =
      doc.documentElement?.innerHTML ||
      doc.querySelector?.("html")?.innerHTML ||
      doc.querySelector?.("body")?.innerHTML ||
      "";
    if (!html) {
      return false;
    }
    return this.antiBotRegexes.some((regex) => regex.test(html));
  }
}
