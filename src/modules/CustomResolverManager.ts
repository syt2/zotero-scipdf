import { LargePrefHelper } from "zotero-plugin-toolkit/dist/helpers/largePref";
import { config } from "../../package.json";
import { CustomResolver, isCustomResolverEqual } from "./CustomResolver";

export class CustomResolverManager {
  private static _shared?: CustomResolverManager;
  private static zoteroCustomResolversPrefKey: Readonly<string> = 'extensions.zotero.findPDFs.resolvers';
  private static customResolversPrefKey: Readonly<string> = 'resolvers';
  private static customResolversLargerPrefKey: Readonly<string> = 'userCustomResolvers';
  static get shared() {
    if (!this._shared) { this._shared = new CustomResolverManager(); }
    return this._shared;
  }

  // user custom resolvers
  private prefs = new LargePrefHelper(CustomResolverManager.customResolversLargerPrefKey, config.prefsPrefix, 'parser');
  get customResolvers() {
    return this.prefs.getValue(CustomResolverManager.customResolversPrefKey) as CustomResolver[] ?? [];
  }
  private set customResolvers(value: CustomResolver[]) {
    this.prefs.setValue(CustomResolverManager.customResolversPrefKey, value);
  }

  // system custom resolvers
  appendCustomResolversInZotero(resolvers: CustomResolver[]) {
    this.customResolversInZotero = this.customResolversInZotero.concat(resolvers.filter(value => this.customResolversInZotero.findIndex(e => isCustomResolverEqual(e, value)) < 0))
    this.customResolvers = this.customResolvers.concat(resolvers.filter(value => this.customResolvers.findIndex(e => isCustomResolverEqual(e, value)) < 0))
  }
  removeCustomResolversInZotero(resolvers: CustomResolver[]) {
    this.customResolversInZotero = this.customResolversInZotero.filter(value => !resolvers.find(e => isCustomResolverEqual(e, value)));
    this.customResolvers = this.customResolvers.filter(value => !resolvers.find(e => isCustomResolverEqual(e, value)));
  }
  removeAllCustomResolversInZotero() {
    this.removeCustomResolversInZotero(this.customResolvers);
  }
  private get customResolversInZotero() {
    const values = Zotero.Prefs.get(CustomResolverManager.zoteroCustomResolversPrefKey, true);
    return typeof values === 'string' ? JSON.parse(values) as CustomResolver[] ?? [] : [];
  }
  private set customResolversInZotero(resolvers: CustomResolver[]) {
    Zotero.Prefs.set(CustomResolverManager.zoteroCustomResolversPrefKey, JSON.stringify(resolvers), true);
  }


  private init() {
    this.customResolvers = this.customResolvers.filter(value => this.customResolversInZotero.findIndex(e => isCustomResolverEqual(e, value)));
  }



}