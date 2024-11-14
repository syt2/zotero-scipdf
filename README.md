# SciPDF For Zotero

[![zotero target version](https://img.shields.io/badge/Zotero-7-green?style=flat-square&logo=zotero&logoColor=CC2936)](https://www.zotero.org)
[![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)

English | [简体中文](doc/README-zhCN.md)


# Introduction
This is a Sci-Hub plugin designed for Zotero 7.  
This plugin utilizes Zotero's built-in [PDF resolvers](https://www.zotero.org/support/kb/custom_pdf_resolvers) feature.  
It automatically writes Sci-Hub's resolver into the `extensions.zotero.findPDFs.resolvers` field and enabling automatic PDF downloads from Sci-Hub within Zotero.

> [Detail code in Zotero](https://github.com/zotero/zotero/blob/5536f8d2bd08ddac9074b9df05b7d205273835e7/chrome/content/zotero/xpcom/attachments.js#L1350)  
> [Custom PDF resolvers](https://www.zotero.org/support/kb/custom_pdf_resolvers)  
> [Zotero Chinese user guide](https://zotero-chinese.com/user-guide/plugins/Zotero-scihub.html#操作步骤)  

# Usage
Download and install the [latest release xpi file](https://github.com/syt2/zotero-scipdf/releases/latest/download/sci-pdf.xpi).

- For items missing attachments prior to the installation of the plugin, right-click on the item and click on `Find Full Text`.
- For newly added items with a `DOI`, if the `Automatically download PDFs` option is enabled in the preferences, Zotero will attempt to download the attachments automatically.

### Add/Remove Sci-Hub Sites
Upon first installation, the plugin will come pre-configured with some common Sci-Hub sites. If you need to add other Sci-Hub sites or remove existing ones, you can edit them in the plugin's settings. Different sites can be separated by commas `,`.

# FAQs
- Items missing a `DOI` do not have the "Find Full Text" option and cannot be downloaded via Sci-Hub.
- Items that already have associated attachments do not have the `Find Full Text` option.
