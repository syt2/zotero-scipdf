import { GoogleScholarLookup } from "./GoogleScholarLookup";

export class AvailablePDFDownloader {
  static async download(items: Zotero.Item[]): Promise<void> {
    const regularItems = items.filter((item) => item.isRegularItem());
    if (regularItems.length === 0) {
      return;
    }

    await Zotero.Attachments.addAvailableFiles(regularItems, {
      // The native Zotero lookup covers publisher DOI pages, item URLs,
      // open-access locations, and PMCID. Custom HTML resolvers are excluded
      // here because they can be blocked by CAPTCHAs; they remain available
      // through Zotero's automatic resolver preference.
      methods: ["doi", "url", "oa"],
    });

    // Avoid opening one browser tab per item for bulk operations. For a single
    // failed lookup, Google Scholar is a useful interactive final fallback.
    if (
      regularItems.length === 1 &&
      !(await this.hasPDF(regularItems[0])) &&
      GoogleScholarLookup.canOpen(regularItems[0])
    ) {
      GoogleScholarLookup.open(regularItems[0]);
    }
  }

  private static async hasPDF(item: Zotero.Item): Promise<boolean> {
    const attachments = await item.getBestAttachments();
    return attachments.some((attachment) => attachment.isPDFAttachment());
  }
}
