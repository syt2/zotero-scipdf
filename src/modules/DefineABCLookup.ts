const defineABCSearchURL = "https://www.defineabc.com/scholar";

export function buildDefineABCURL(
  doi: string,
  title: string,
): string | undefined {
  const normalizedDOI = doi.trim();
  const normalizedTitle = title
    .replace(/["“”]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const query =
    normalizedDOI || (normalizedTitle ? `"${normalizedTitle}"` : undefined);

  if (!query) {
    return undefined;
  }

  const url = new URL(defineABCSearchURL);
  url.searchParams.set("q", query);
  return url.href;
}

export class DefineABCLookup {
  static getURL(item: Zotero.Item): string | undefined {
    const rawDOI = item.getField("DOI") || item.getExtraField("DOI") || "";
    const doi = Zotero.Utilities.cleanDOI(String(rawDOI)) || "";
    const title = String(item.getField("title") || "");
    return buildDefineABCURL(doi, title);
  }

  static canOpen(item: Zotero.Item): boolean {
    return item.isRegularItem() && Boolean(this.getURL(item));
  }

  static open(item: Zotero.Item): void {
    const url = this.getURL(item);
    if (!url) {
      throw new Error("The selected item has no DOI or title");
    }
    Zotero.launchURL(url);
  }
}
