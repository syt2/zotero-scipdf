# SciPDF For Zotero

[![zotero target version](https://img.shields.io/badge/Zotero-7+-green?style=flat-square&logo=zotero&logoColor=CC2936)](https://www.zotero.org)
[![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)

[English](../README.md) | 简体中文

# 介绍
这是一个用于 Zotero7 和 Zotero8 的 Sci-Hub 插件。  
此插件利用了 Zotero 内自带的 [PDF resolvers](https://www.zotero.org/support/kb/custom_pdf_resolvers)方案，将 Sci-Hub 的 resolver 自动填入 `extensions.zotero.findPDFs.resolvers` 字段，以实现在zotero内从sci-hub下载pdf。

> [Zotero代码](https://github.com/zotero/zotero/blob/5536f8d2bd08ddac9074b9df05b7d205273835e7/chrome/content/zotero/xpcom/attachments.js#L1350)  
> [自定义PDF resolvers](https://www.zotero.org/support/kb/custom_pdf_resolvers)  
> [Zotero中文社区相关信息](https://zotero-chinese.com/user-guide/plugins/Zotero-scihub.html#操作步骤)  

# 使用
下载并安装[最新版插件](https://github.com/syt2/zotero-scipdf/releases/latest/download/zotero-scipdf.xpi)。

- 对于安装插件前已经缺失附件的item，右键该item，点击`查找全文`即可
- 对于新增的带有`DOI`的条目，如果在首选项内勾选了`自动下载PDF`选项，则Zotero会自动尝试下载附件

### 增加/删除Sci-Hub站点
首次安装时插件会内置部分常用的Sci-Hub站点，若需要添加其他Sci-Hub站点，或删除已有Sci-Hub站点的，可以在插件的设置界面内编辑，不同的站点以`,`或`，`分割

# 常见问题
- 缺失`DOI`的条目没有`查找全文`选项，也无法通过scihub下载
- 已经关联了附件的条目没有`查找全文`选项
