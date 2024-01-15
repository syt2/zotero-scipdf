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
1. Download and install the [latest release xpi file](https://github.com/syt2/zotero-scipdf/releases/latest/download/zotero-scipdf.xpi).
2. Usage
  - For items that were missing attachments before installing this plugin, right-click on the item and select `Find Available PDF` to initiate the download.
  - For newly added entries with a `DOI`, if the `Automatic PDF Download` option is selected in preferences, Zotero will attempt to automatically download the attachments.

# Others
## Some available Sci-Hub mirror sites.
- `https://sci-hub.ru/`
- `https://sci-hub.st/`
- `https://sci-hub.ren/`
- `https://sci-hub.se/`

