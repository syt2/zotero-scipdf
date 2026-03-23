import { getPref, setPref } from "../utils/prefs";
import {
  CustomResolver,
  extractResolverBaseURL,
  isOpenAlexCustomResolver,
  isSciHubCustomResolver,
  openAlexCustomResolver,
  presetSciHubBaseURLs,
  sciHubCustomResolver,
} from "./CustomResolver";
import { CustomResolverManager } from "./CustomResolverManager";

const LEGACY_SCIHUB_URL_PREF = "zoteroscihub.scihub_url";
const LEGACY_AUTO_DOWNLOAD_PREF = "zoteroscihub.automatic_pdf_download";
const URL_SPLIT_REGEX = /\s*[;,，；、\s]\s*/;

interface ResolverSettings {
  automaticDownload: boolean;
  sciHubURLs: string[];
  enableOpenAlex: boolean;
  openAlexApiKey: string;
}

function uniqueNonEmpty(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function normalizeSciHubURLs(rawValue?: string | string[]): string[] {
  const values = Array.isArray(rawValue)
    ? rawValue
    : typeof rawValue === "string"
      ? rawValue.split(URL_SPLIT_REGEX)
      : [];
  return uniqueNonEmpty(values.map((value) => value.replace(/\{doi\}.*$/, "")));
}

function getLegacySciHubURLs(): string[] {
  const legacyValue = Zotero.Prefs.get(LEGACY_SCIHUB_URL_PREF);
  return typeof legacyValue === "string"
    ? normalizeSciHubURLs(legacyValue)
    : [];
}

function getLegacyAutomaticDownload(): boolean | undefined {
  const value = Zotero.Prefs.get(LEGACY_AUTO_DOWNLOAD_PREF);
  return typeof value === "boolean" ? value : undefined;
}

function extractOpenAlexApiKey(resolver?: CustomResolver): string {
  if (!resolver) {
    return "";
  }
  try {
    return new URL(resolver.url).searchParams.get("api_key")?.trim() ?? "";
  } catch {
    return "";
  }
}

export function getAutomaticDownloadSetting() {
  return getPref("automaticDownload") ?? true;
}

export function getSciHubURLsSetting() {
  const configuredURLs = getPref("sciHubURLs");
  return configuredURLs === undefined
    ? presetSciHubBaseURLs()
    : normalizeSciHubURLs(configuredURLs);
}

export function getOpenAlexEnabledSetting() {
  return getPref("enableOpenAlex") ?? false;
}

export function getOpenAlexApiKeySetting() {
  return (getPref("openAlexApiKey") ?? "").trim();
}

export function buildManagedResolvers(): CustomResolver[] {
  const automaticDownload = getAutomaticDownloadSetting();
  const resolvers: CustomResolver[] = [];
  const openAlexApiKey = getOpenAlexApiKeySetting();

  if (getOpenAlexEnabledSetting() && openAlexApiKey) {
    resolvers.push(openAlexCustomResolver(openAlexApiKey, automaticDownload));
  }

  for (const url of getSciHubURLsSetting()) {
    resolvers.push(sciHubCustomResolver(url, automaticDownload));
  }

  return resolvers;
}

export function syncManagedResolversFromPrefs() {
  CustomResolverManager.shared.replaceCustomResolversInZotero(
    buildManagedResolvers(),
  );
}

export function setResolverSettings(settings: ResolverSettings) {
  setPref("automaticDownload", settings.automaticDownload);
  setPref("sciHubURLs", normalizeSciHubURLs(settings.sciHubURLs).join(","));
  setPref("enableOpenAlex", settings.enableOpenAlex);
  setPref("openAlexApiKey", settings.openAlexApiKey.trim());
  syncManagedResolversFromPrefs();
}

export function ensureResolverSettingsInitialized() {
  const existingResolvers = CustomResolverManager.shared.customResolvers;
  const sciHubResolvers = existingResolvers.filter(isSciHubCustomResolver);
  const openAlexResolver = existingResolvers.find(isOpenAlexCustomResolver);

  if (getPref("automaticDownload") === undefined) {
    const automaticDownload =
      openAlexResolver?.automatic ??
      sciHubResolvers[0]?.automatic ??
      getLegacyAutomaticDownload() ??
      true;
    setPref("automaticDownload", automaticDownload !== false);
  }

  if (getPref("sciHubURLs") === undefined) {
    const sciHubURLs = normalizeSciHubURLs(
      sciHubResolvers.length > 0
        ? sciHubResolvers.map((resolver) => extractResolverBaseURL(resolver))
        : getLegacySciHubURLs(),
    );
    setPref(
      "sciHubURLs",
      (sciHubURLs.length > 0 ? sciHubURLs : presetSciHubBaseURLs()).join(","),
    );
  }

  if (getPref("enableOpenAlex") === undefined) {
    setPref("enableOpenAlex", Boolean(openAlexResolver));
  }

  if (getPref("openAlexApiKey") === undefined) {
    setPref("openAlexApiKey", extractOpenAlexApiKey(openAlexResolver));
  }
}
