import { Utils } from "../utils/utils";
import {
  getOpenAlexApiKeySetting,
  getOpenAlexEnabledSetting,
} from "./ResolverSettings";

interface OpenAlexLocation {
  is_oa?: boolean;
  landing_page_url?: string | null;
  pdf_url?: string | null;
}

interface OpenAlexWork {
  best_oa_location?: OpenAlexLocation | null;
  primary_location?: OpenAlexLocation | null;
  locations?: OpenAlexLocation[] | null;
}

interface OpenAlexURLResolver {
  accessMethod: string;
  pageURL?: string;
  url?: string;
}

export class OpenAlexFetcher {
  private static readonly accessMethod = "OpenAlex OA";

  static get isConfigured() {
    return getOpenAlexEnabledSetting() && this.apiKey.length > 0;
  }

  private static get apiKey() {
    return getOpenAlexApiKeySetting();
  }

  static async attachPDF(item: Zotero.Item, dois: string[]) {
    Utils.logTrace("openalex", "start", {
      title: item.getDisplayTitle(),
      dois,
    });

    const resolvers = await this.buildResolvers(dois);
    if (resolvers.length <= 0) {
      Utils.logTrace("openalex", "miss", {
        title: item.getDisplayTitle(),
        dois,
      });
      return false;
    }

    const attachments = Zotero.Attachments as typeof Zotero.Attachments & {
      addFileFromURLs?: (
        item: Zotero.Item,
        resolvers: OpenAlexURLResolver[],
      ) => Promise<unknown>;
    };

    if (typeof attachments.addFileFromURLs === "function") {
      const success = Boolean(
        await attachments.addFileFromURLs(item, resolvers),
      );
      Utils.logTrace("openalex", success ? "success" : "miss", {
        title: item.getDisplayTitle(),
        candidateURL: resolvers[0]?.url ?? resolvers[0]?.pageURL,
        resolverCount: resolvers.length,
      });
      return success;
    }

    const directPDF = resolvers.find((resolver) => resolver.url)?.url;
    if (!directPDF) {
      Utils.logTrace("openalex", "miss", {
        title: item.getDisplayTitle(),
        reason: "no-direct-pdf-url",
      });
      return false;
    }

    await Utils.attachRemotePDF(new URL(directPDF), item);
    Utils.logTrace("openalex", "success", {
      title: item.getDisplayTitle(),
      candidateURL: directPDF,
      resolverCount: resolvers.length,
    });
    return true;
  }

  private static async buildResolvers(dois: string[]) {
    if (!this.isConfigured || dois.length <= 0) {
      return [];
    }

    for (const doi of dois) {
      try {
        const work = await this.fetchWork(doi);
        const resolvers = this.extractResolvers(work);
        if (resolvers.length > 0) {
          Utils.logTrace("openalex", "resolved", {
            doi,
            candidateURL: resolvers[0]?.url ?? resolvers[0]?.pageURL,
            resolverCount: resolvers.length,
          });
          return resolvers;
        }
        Utils.logTrace("openalex", "no-oa-link", { doi });
      } catch (error) {
        Utils.logTrace("openalex", "error", {
          doi,
          message: error instanceof Error ? error.message : String(error),
        });
        ztoolkit.log(`openalex: failed to resolve "${doi}"`, error);
      }
    }

    return [];
  }

  private static async fetchWork(doi: string) {
    const requestURL = `https://api.openalex.org/works/${encodeURIComponent(`doi:${doi}`)}?select=best_oa_location,primary_location,locations&api_key=${encodeURIComponent(this.apiKey)}`;

    try {
      const xhr = await Zotero.HTTP.request("GET", requestURL, {
        headers: {
          Accept: "application/json",
        },
      });
      return JSON.parse(xhr.responseText as string) as OpenAlexWork;
    } catch (error) {
      const status =
        (error as { status?: number; xmlhttp?: { status?: number } }).status ??
        (error as { status?: number; xmlhttp?: { status?: number } }).xmlhttp
          ?.status;
      if (status === 404) {
        Utils.logTrace("openalex", "not-found", { doi });
        return null;
      }
      throw error;
    }
  }

  private static extractResolvers(work: OpenAlexWork | null) {
    if (!work) {
      return [];
    }

    const seen = new Set<string>();
    const resolvers: OpenAlexURLResolver[] = [];
    const candidates = [
      work.best_oa_location,
      ...(work.primary_location && work.primary_location.is_oa !== false
        ? [work.primary_location]
        : []),
      ...(work.locations ?? []).filter((location) => location?.is_oa !== false),
    ];

    for (const location of candidates) {
      if (!location) {
        continue;
      }

      const pageURL = location.landing_page_url?.trim();
      const url = location.pdf_url?.trim();
      if (!pageURL && !url) {
        continue;
      }

      const key = `${url ?? ""}|${pageURL ?? ""}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      resolvers.push({
        accessMethod: this.accessMethod,
        pageURL: pageURL || undefined,
        url: url || undefined,
      });
    }

    return resolvers;
  }
}
