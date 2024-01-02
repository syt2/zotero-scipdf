// https://www.zotero.org/support/kb/custom_pdf_resolvers
// https://github.com/zotero/zotero/blob/5536f8d2bd08ddac9074b9df05b7d205273835e7/chrome/content/zotero/xpcom/attachments.js#L1350
export interface CustomResolver {
  name: string,
  method: "GET" | "POST",
  url: string,  // must include {doi}
  mode: "html" | "json",
  selector: string,
  automatic?: boolean,

  // HTML
  attribute?: string,
  index?: number,

  // JSON
  mappings?: {
    url?: string,
    pageURL?: string,
  },
}

export function isCustomResolverEqual(a: CustomResolver, b: CustomResolver) {
  return a.name === b.name &&
    a.method === b.method &&
    a.url === b.url &&
    a.mode === b.mode &&
    a.selector === b.selector &&
    a.automatic === b.automatic &&
    a.attribute === b.attribute &&
    a.index === b.index &&
    a.mappings?.url === b.mappings?.url &&
    a.mappings?.pageURL === b.mappings?.pageURL;
}

export function sciHubCustomResolver(url: string, automatic = true): CustomResolver {
  return {
    name: "Sci-Hub",
    method: "GET",
    url: url.includes('{doi}') ? url : url.endsWith('/') ? `${url}{doi}` : `${url}/{doi}`,
    mode: "html",
    selector: "#pdf",
    attribute: "src",
    automatic: automatic,
  };
}

export function presetSciHubCustomResolvers(automatic = true): Readonly<Readonly<CustomResolver>[]> {
  const scihubURLs = [
    'https://sci-hub.ru/',
    'https://sci-hub.st/',
    'https://sci-hub.ren/',
    'https://sci-hub.se/',
  ]
  return scihubURLs.map(url => {
    return {
      name: "Sci-Hub",
      method: "GET",
      url: url,
      mode: "html",
      selector: "#pdf",
      attribute: "src",
      automatic: automatic,
    };
  });
}