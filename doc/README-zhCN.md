# SciPDF For Zotero

[![zotero target version](https://img.shields.io/badge/Zotero-7-green?style=flat-square&logo=zotero&logoColor=CC2936)](https://www.zotero.org)
[![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)

[English](../README.md) | 简体中文

# 介绍
这是一个用于 Zotero7 的 Sci-Hub 插件。  
此插件利用了 Zotero 内自带的 [pdf resolvers](https://www.zotero.org/support/kb/custom_pdf_resolvers)方案，将 Sci-Hub 的 resolver 自动填入 `extensions.zotero.findPDFs.resolvers` 字段，以实现在zotero内从sci-hub下载pdf。

> [Zotero代码细节](https://github.com/zotero/zotero/blob/5536f8d2bd08ddac9074b9df05b7d205273835e7/chrome/content/zotero/xpcom/attachments.js#L1350)


# 使用
1. 下载并安装[最新版插件](https://github.com/syt2/zotero-scipdf/releases/latest/download/zotero-scipdf.xpi)。
2. 使用
  - 对于安装插件前已经缺失附件的item，右键该item，点击`查找可用的 PDF`即可
  - 对于新增的带有`DOI`的条目，如果在首选项内勾选了`自动下载PDF`选项，则Zotero会自动尝试下载附件

# 其他
## 一些可用的Sci-Hub镜像站
- `https://sci-hub.ru/`
- `https://sci-hub.st/`
- `https://sci-hub.ren/`
- `https://sci-hub.se/`
