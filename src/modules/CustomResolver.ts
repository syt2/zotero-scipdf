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

export const defaultSciHubURLs = [
  "https://sci-hub.ru/",
  "https://sci-hub.st/",
  "https://sci-hub.su/",
  "https://sci-hub.box/",
  "https://sci-hub.red/",
] as const;

const obsoleteDefaultSciHubURLs = [
  "https://sci-hub.se/",
  "https://sci-hub.ren/",
  "https://sci-hub.ee/",
] as const;

export function isObsoleteDefaultSciHubResolver(resolver: CustomResolver) {
  return (
    resolver.name === "Sci-Hub" &&
    resolver.method === "GET" &&
    resolver.mode === "html" &&
    resolver.selector === "#pdf" &&
    resolver.attribute === "src" &&
    obsoleteDefaultSciHubURLs.some((url) => resolver.url === `${url}{doi}`)
  );
}

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

export function sciHubCustomResolver(
  url: string,
  automatic = true,
): CustomResolver {
  return {
    name: "Sci-Hub",
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

export function presetSciHubCustomResolvers(
  automatic = true,
): Readonly<Readonly<CustomResolver>[]> {
  return defaultSciHubURLs.map((url) => {
    return {
      name: "Sci-Hub",
      method: "GET",
      url: `${url}{doi}`,
      mode: "html",
      selector: "#pdf",
      attribute: "src",
      automatic: automatic,
    };
  });
}
