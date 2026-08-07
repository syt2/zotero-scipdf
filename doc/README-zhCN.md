# SciPDF For Zotero

[![zotero target version](https://img.shields.io/badge/Zotero-9-green?style=flat-square&logo=zotero&logoColor=CC2936)](https://www.zotero.org)
[![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)

[English](../README.md) | 简体中文

# 介绍

这是一个适配 Zotero 9 的 Sci-Hub 插件。
此插件利用了 Zotero 内自带的 [PDF resolvers](https://www.zotero.org/support/kb/custom_pdf_resolvers)方案，将 Sci-Hub 的 resolver 自动填入 `extensions.zotero.findPDFs.resolvers` 字段，以实现在zotero内从sci-hub下载pdf。

> [Zotero代码](https://github.com/zotero/zotero/blob/5536f8d2bd08ddac9074b9df05b7d205273835e7/chrome/content/zotero/xpcom/attachments.js#L1350)  
> [自定义PDF resolvers](https://www.zotero.org/support/kb/custom_pdf_resolvers)  
> [Zotero中文社区相关信息](https://zotero-chinese.com/user-guide/plugins/Zotero-scihub.html#操作步骤)

# 使用

下载并安装[最新版插件](https://github.com/syt2/zotero-scipdf/releases/latest/download/zotero-scipdf.xpi)。

- 对缺少附件的一个或多个条目，右键点击`一键查找并下载可用 PDF`。插件会依次尝试 DOI 页面、条目 URL、开放获取来源和 PMCID，找到后自动保存为条目附件。单篇自动查找失败时，会继续打开 Google Scholar 作为人工兜底。
- 对于新增的带有`DOI`的条目，如果在首选项内勾选了`自动下载PDF`选项，则Zotero会自动尝试下载附件
- 如需通过浏览器查找可访问版本，请选择一个普通条目并点击`在 Google Scholar 中查找`。插件会优先使用 DOI，缺失 DOI 时使用完整标题进行精确检索。

### 增加/删除Sci-Hub站点

首次安装时插件会内置部分常用的Sci-Hub站点，若需要添加其他Sci-Hub站点，或删除已有Sci-Hub站点的，可以在插件的设置界面内编辑，不同的站点以`,`或`，`分割

# 常见问题

- 缺失`DOI`的条目没有`查找全文`选项，也无法通过scihub下载
- 已经关联了附件的条目没有`查找全文`选项
