import { LargePrefHelper } from "zotero-plugin-toolkit";
import { config } from "../../package.json";
import { CustomResolver, isCustomResolverEqual } from "./CustomResolver";

export class CustomResolverManager {
  private static _shared?: CustomResolverManager;
  private static zoteroCustomResolversPrefKey: Readonly<string> =
    "extensions.zotero.findPDFs.resolvers";
  private static customResolversPrefKey: Readonly<string> = "resolvers";
  private static customResolversLargerPrefKey: Readonly<string> =
    "userCustomResolvers";
  static get shared() {
    if (!this._shared) {
      this._shared = new CustomResolverManager();
    }
    return this._shared;
  }

  // user custom resolvers
  private prefs = new LargePrefHelper(
    CustomResolverManager.customResolversLargerPrefKey,
    config.prefsPrefix,
    "parser",
  );
  get customResolvers() {
    const resolvers = this.prefs.getValue(
      CustomResolverManager.customResolversPrefKey,
    );
    return Array.isArray(resolvers) ? (resolvers as CustomResolver[]) : [];
  }
  private set customResolvers(value: CustomResolver[]) {
    this.prefs.setValue(CustomResolverManager.customResolversPrefKey, value);
  }

  // system custom resolvers
  appendCustomResolversInZotero(
    resolvers: CustomResolver[] | Readonly<CustomResolver[]>,
  ) {
    const zoteroResolvers = this.customResolversInZotero;
    const trackedResolvers = this.customResolvers;
    this.customResolversInZotero = zoteroResolvers.concat(
      resolvers.filter(
        (value) =>
          zoteroResolvers.findIndex((existing) =>
            isCustomResolverEqual(existing, value),
          ) < 0,
      ),
    );
    this.customResolvers = trackedResolvers.concat(
      resolvers.filter(
        (value) =>
          trackedResolvers.findIndex((existing) =>
            isCustomResolverEqual(existing, value),
          ) < 0,
      ),
    );
  }
  removeCustomResolversInZotero(resolvers: CustomResolver[]) {
    this.customResolversInZotero = this.customResolversInZotero.filter(
      (value) => !resolvers.find((e) => isCustomResolverEqual(e, value)),
    );
    this.customResolvers = this.customResolvers.filter(
      (value) => !resolvers.find((e) => isCustomResolverEqual(e, value)),
    );
  }
  removeAllCustomResolversInZotero() {
    this.removeCustomResolversInZotero(this.customResolvers);
  }
  removeCustomResolversMatching(
    predicate: (resolver: CustomResolver) => boolean,
  ) {
    const trackedResolvers = this.customResolvers.filter(predicate);
    this.removeCustomResolversInZotero(trackedResolvers);
  }
  private get customResolversInZotero() {
    const values = Zotero.Prefs.get(
      CustomResolverManager.zoteroCustomResolversPrefKey,
      true,
    );
    if (typeof values !== "string") {
      return [];
    }
    try {
      const result = JSON.parse(values);
      if (Array.isArray(result)) {
        return result as CustomResolver[];
      }
      return result && typeof result === "object"
        ? [result as CustomResolver]
        : [];
    } catch (error) {
      Zotero.logError(
        error instanceof Error ? error : new Error(String(error)),
      );
      return [];
    }
  }
  private set customResolversInZotero(resolvers: CustomResolver[]) {
    Zotero.Prefs.set(
      CustomResolverManager.zoteroCustomResolversPrefKey,
      JSON.stringify(resolvers),
      true,
    );
  }
}
