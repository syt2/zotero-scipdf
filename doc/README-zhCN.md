# SciPDF For Zotero

[![zotero target version](https://img.shields.io/badge/Zotero-7+-green?style=flat-square&logo=zotero&logoColor=CC2936)](https://www.zotero.org)
[![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)

[English](../README.md) | 简体中文

# 介绍
这是一个用于 Zotero7 和 Zotero8 的 PDF 下载插件。  
此插件利用了 Zotero 内自带的 [PDF resolvers](https://www.zotero.org/support/kb/custom_pdf_resolvers) 方案，现在可以先尝试 OpenAlex 提供的开放获取链接，再回退到 Sci-Hub。  
自动下载走 Zotero resolver，插件自己的手动“获取 PDF”也会按同样顺序执行。

这里的 OpenAlex 用途是提供开放获取 PDF 地址或落地页链接，并不是由 OpenAlex 自己托管 PDF 文件。

> [Zotero代码](https://github.com/zotero/zotero/blob/5536f8d2bd08ddac9074b9df05b7d205273835e7/chrome/content/zotero/xpcom/attachments.js#L1350)  
> [自定义PDF resolvers](https://www.zotero.org/support/kb/custom_pdf_resolvers)  
> [Zotero中文社区相关信息](https://zotero-chinese.com/user-guide/plugins/Zotero-scihub.html#操作步骤)  

# 使用
下载并安装[最新版插件](https://github.com/syt2/zotero-scipdf/releases/latest/download/zotero-scipdf.xpi)。

- 对于安装插件前已经缺失附件的 item，可以右键点击该 item，使用插件菜单里的`获取PDF`，也可以使用 Zotero 自带的`查找全文`
- 对于新增的带有 `DOI` 的条目，如果在首选项内勾选了`自动下载PDF`，Zotero 会自动尝试下载附件
- 如果启用了 `OpenAlex` 且配置了 API Key，插件会优先尝试 OpenAlex 返回的开放获取链接

### OpenAlex
- OpenAlex 支持是可选的，但当前需要 API Key
- 可以在插件首选项中的 `OpenAlex API Key` 中配置
- 如果 OpenAlex 没有返回可用的开放获取链接，插件会继续尝试 Sci-Hub

### 增加/删除 Sci-Hub 站点
首次安装时插件会内置部分常用的 Sci-Hub 站点，若需要添加其他 Sci-Hub 站点，或删除已有站点，可以在插件设置界面内编辑，不同站点以 `,` 或 `，` 分割

# 常见问题
- 缺失 `DOI` 的条目无法通过 OpenAlex 或 Sci-Hub 解析
- 已经关联了附件的条目没有 `查找全文` 选项
