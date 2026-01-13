import { CustomResolverManager } from "./CustomResolverManager";

/**
 * This module automatically triggers PDF retrieval for newly added items.
 *
 * The standard Zotero "automatic PDF download" only works when items are added
 * through the UI (drag-drop, browser connector, etc.). Items added via the API
 * (e.g., through sync from web library, third-party tools, or programmatic additions)
 * do not trigger automatic PDF download.
 *
 * This module listens for item 'add' events via Zotero.Notifier and triggers
 * PDF retrieval for eligible items, regardless of how they were added.
 */

let _notifierID: string | null = null;

// Debounce/batch processing to avoid hammering Sci-Hub with many requests at once
let _pendingItems: number[] = [];
let _processingTimeout: ReturnType<typeof setTimeout> | null = null;
const BATCH_DELAY_MS = 2000; // Wait 2 seconds to batch items together

/**
 * Check if automatic PDF download is enabled based on resolver settings
 */
function isAutoDownloadEnabled(): boolean {
  const resolvers = CustomResolverManager.shared.customResolvers;
  return resolvers.length > 0 && resolvers[0].automatic !== false;
}

/**
 * Check if an item is eligible for automatic PDF retrieval:
 * - Is a regular item (not attachment, note, or annotation)
 * - Has a DOI (required for Sci-Hub lookup)
 * - Doesn't already have a full-text attachment (PDF, EPUB, etc.)
 */
async function isEligibleForPDFRetrieval(itemID: number): Promise<boolean> {
  const item = await Zotero.Items.getAsync(itemID);
  if (!item) return false;

  // Must be a regular item (not attachment, note, annotation)
  if (!item.isRegularItem()) return false;

  // Check if we can find a file for this item (has DOI or URL, no existing attachment)
  // @ts-expect-error - Zotero.Attachments.canFindFileForItem exists but may not be typed
  if (!Zotero.Attachments.canFindFileForItem(item)) return false;

  return true;
}

/**
 * Process batched items - filter eligible ones and trigger PDF retrieval
 */
async function processPendingItems() {
  if (_pendingItems.length === 0) return;

  const itemsToProcess = [..._pendingItems];
  _pendingItems = [];
  _processingTimeout = null;

  // Filter to eligible items
  const eligibleItems: Zotero.Item[] = [];
  for (const itemID of itemsToProcess) {
    if (await isEligibleForPDFRetrieval(itemID)) {
      const item = await Zotero.Items.getAsync(itemID);
      if (item) eligibleItems.push(item);
    }
  }

  if (eligibleItems.length === 0) return;

  Zotero.debug(`[Sci-PDF] Auto-fetching PDFs for ${eligibleItems.length} newly added item(s)`);

  // Use Zotero's built-in addAvailableFiles which handles queuing, rate limiting, etc.
  try {
    await Zotero.Attachments.addAvailableFiles(eligibleItems);
  } catch (e) {
    Zotero.logError(e as Error);
  }
}

/**
 * Schedule processing of pending items (with debounce)
 */
function scheduleProcessing() {
  if (_processingTimeout) {
    clearTimeout(_processingTimeout);
  }
  _processingTimeout = setTimeout(processPendingItems, BATCH_DELAY_MS);
}

/**
 * Notifier callback for item events
 */
const notifierCallback = {
  notify: async (
    event: string,
    type: string,
    ids: number[],
    _extraData: Record<string, unknown>
  ) => {
    // Only handle 'add' events for items
    if (event !== 'add' || type !== 'item') return;

    // Check if auto-download is enabled
    if (!isAutoDownloadEnabled()) return;

    // Add to pending items for batch processing
    _pendingItems.push(...ids);
    scheduleProcessing();
  }
};

/**
 * Register the notifier to listen for new items
 */
export function register(): void {
  if (_notifierID) {
    Zotero.debug("[Sci-PDF] AutoFetchPDF notifier already registered");
    return;
  }

  // @ts-expect-error - Zotero.Notifier.registerObserver signature
  _notifierID = Zotero.Notifier.registerObserver(notifierCallback, ['item'], 'scipdf-autofetch');
  Zotero.debug("[Sci-PDF] AutoFetchPDF notifier registered");
}

/**
 * Unregister the notifier
 */
export function unregister(): void {
  if (_notifierID) {
    Zotero.Notifier.unregisterObserver(_notifierID);
    _notifierID = null;
    Zotero.debug("[Sci-PDF] AutoFetchPDF notifier unregistered");
  }

  // Clear any pending timeout
  if (_processingTimeout) {
    clearTimeout(_processingTimeout);
    _processingTimeout = null;
  }
  _pendingItems = [];
}
