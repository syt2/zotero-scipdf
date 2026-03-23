# SciPDF For Zotero

[![zotero target version](https://img.shields.io/badge/Zotero-7+-green?style=flat-square&logo=zotero&logoColor=CC2936)](https://www.zotero.org)
[![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)

English | [简体中文](doc/README-zhCN.md)


# Introduction
This is a PDF downloader plugin for Zotero 7 and Zotero 8.  
It utilizes Zotero's built-in [PDF resolvers](https://www.zotero.org/support/kb/custom_pdf_resolvers) feature and can now try OpenAlex open-access links before falling back to Sci-Hub.  
Automatic downloads use Zotero resolvers, while the plugin's manual fetch action follows the same order: OpenAlex first, Sci-Hub second.

OpenAlex does not host PDFs itself in this plugin. It is used as a metadata source for open-access `pdf_url` and landing-page links.

> [Detail code in Zotero](https://github.com/zotero/zotero/blob/5536f8d2bd08ddac9074b9df05b7d205273835e7/chrome/content/zotero/xpcom/attachments.js#L1350)  
> [Custom PDF resolvers](https://www.zotero.org/support/kb/custom_pdf_resolvers)  
> [Zotero Chinese user guide](https://zotero-chinese.com/user-guide/plugins/Zotero-scihub.html#操作步骤)  

# Usage
Download and install the [latest release xpi file](https://github.com/syt2/zotero-scipdf/releases/latest/download/sci-pdf.xpi).

- For items missing attachments prior to the installation of the plugin, right-click on the item and click on `Fetch PDF`, or use Zotero's built-in `Find Full Text`.
- For newly added items with a `DOI`, if `Automatic PDF Download` is enabled in the preferences, Zotero will attempt to download attachments automatically.
- If `Try OpenAlex open-access links before Sci-Hub` is enabled and an OpenAlex API key is configured, the plugin will prefer open-access links returned by OpenAlex.

### OpenAlex
- OpenAlex support is optional and requires an API key.
- Configure the key in the plugin preferences under `OpenAlex API Key`.
- If OpenAlex does not return a usable OA link, the plugin will continue with Sci-Hub resolvers.

### Add/Remove Sci-Hub Sites
Upon first installation, the plugin will come pre-configured with some common Sci-Hub sites. If you need to add other Sci-Hub sites or remove existing ones, you can edit them in the plugin's settings. Different sites can be separated by commas `,`.

# FAQs
- Items missing a `DOI` cannot be resolved by OpenAlex or Sci-Hub in this plugin.
- Items that already have associated attachments do not have the `Find Full Text` option.
