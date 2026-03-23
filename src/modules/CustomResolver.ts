// https://www.zotero.org/support/kb/custom_pdf_resolvers
// https://github.com/zotero/zotero/blob/5536f8d2bd08ddac9074b9df05b7d205273835e7/chrome/content/zotero/xpcom/attachments.js#L1350
export interface CustomResolver {
  name: string;
  method: "GET" | "POST";
  url: string; // must include {doi}
  mode: "html" | "json";
  selector: string;
  automatic?: boolean;

  // HTML
  attribute?: string;
  index?: number;

  // JSON
  mappings?: {
    url?: string;
    pageURL?: string;
  };
}

export const SCI_HUB_RESOLVER_NAME = "Sci-Hub";
export const OPEN_ALEX_RESOLVER_NAME = "OpenAlex OA";

const presetSciHubBaseURLList = [
  "https://sci-hub.se/",
  "https://sci-hub.st/",
  "https://sci-hub.ru/",
  "https://sci-hub.box/",
  "https://sci-hub.red/",
  "https://sci-hub.ren/",
  "https://sci-hub.ee/",
] as const;

export function isCustomResolverEqual(a: CustomResolver, b: CustomResolver) {
  return (
    a.name === b.name &&
    a.method === b.method &&
    a.url === b.url &&
    a.mode === b.mode &&
    a.selector === b.selector &&
    a.automatic === b.automatic &&
    a.attribute === b.attribute &&
    a.index === b.index &&
    a.mappings?.url === b.mappings?.url &&
    a.mappings?.pageURL === b.mappings?.pageURL
  );
}

export function isSciHubCustomResolver(resolver: CustomResolver) {
  return resolver.name === SCI_HUB_RESOLVER_NAME;
}

export function isOpenAlexCustomResolver(resolver: CustomResolver) {
  return resolver.name === OPEN_ALEX_RESOLVER_NAME;
}

export function extractResolverBaseURL(resolver: Pick<CustomResolver, "url">) {
  return resolver.url.replace(/\{doi\}.*$/, "");
}

export function sciHubCustomResolver(
  url: string,
  automatic = true,
): CustomResolver {
  return {
    name: SCI_HUB_RESOLVER_NAME,
    method: "GET",
    url: url.includes("{doi}")
      ? url
      : url.endsWith("/")
        ? `${url}{doi}`
        : `${url}/{doi}`,
    mode: "html",
    selector: "#pdf",
    attribute: "src",
    automatic: automatic,
  };
}

export function openAlexCustomResolver(
  apiKey: string,
  automatic = true,
): CustomResolver {
  return {
    name: OPEN_ALEX_RESOLVER_NAME,
    method: "GET",
    url: `https://api.openalex.org/works/doi:{doi}?select=best_oa_location&api_key=${encodeURIComponent(apiKey.trim())}`,
    mode: "json",
    selector: ".best_oa_location",
    mappings: {
      url: "pdf_url",
      pageURL: "landing_page_url",
    },
    automatic: automatic,
  };
}

export function presetSciHubBaseURLs(): string[] {
  return [...presetSciHubBaseURLList];
}

export function presetSciHubCustomResolvers(
  automatic = true,
): Readonly<Readonly<CustomResolver>[]> {
  return presetSciHubBaseURLList.map((url) => {
    return {
      name: SCI_HUB_RESOLVER_NAME,
      method: "GET",
      url: `${url}{doi}`,
      mode: "html",
      selector: "#pdf",
      attribute: "src",
      automatic: automatic,
    };
  });
}
