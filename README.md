# Notion公式自动转换工具 

## 💻 演示

https://github.com/user-attachments/assets/b14c5afa-d8dc-4266-bc95-e6b8627f6643

## ✨ 特点

- **一键批量转换**：点击悬浮按钮即可扫描全文档并自动转换所有公式，解放双手。
- **实时进度反馈**：提供可视化的进度条和状态提示，实时显示转换进度和剩余数量。
- **悬浮球设计**：悬浮球设计，支持自动折叠，可以拖动，不遮挡内容。
- **多平台适配**：适配多个平台 ，已测试 Mac/Windows。

## 🛠️ 一键安装

1. 安装油猴插件: [Tampermonkey](https://www.tampermonkey.net/) 扩展（[Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) | [Firefox](https://addons.mozilla.org/firefox/addon/tampermonkey/)）
2. 点击安装脚本：[Notion-Formula-Auto-Conversion-Tool](https://greasyfork.org/zh-CN/scripts/525730-notion-%E5%85%AC%E5%BC%8F%E8%87%AA%E5%8A%A8%E8%BD%AC%E6%8D%A2%E5%B7%A5%E5%85%B7)
3. 刷新Notion页面即可生效

## 🎯 使用说明

需要提示大模型:
```

涉及的公式都用 katex格式,在Notion的KaTeX中，星号 * 会被默认解析为斜体标志。为了避免这种情况，使用 \ast 来表示星号

行内数学模式示例:$\text{Attention}(Q,K,V) = \text{softmax}\left(\frac{QK^{\top}}{\sqrt{d_k}}\right)V$

行间数学模式示例:

$$
\text{Attention}(Q,K,V) = \text{softmax}\left(\frac{QK^{\top}}{\sqrt{d_k}}\right)V
$$
```

### 💡 模型支持测试
经过测试，不同模型的复制粘贴行为略有差异：
- **Gemini 网页版**：完美支持。直接点击 "复制回答" 按钮，粘贴到 Notion 即可正常识别转换。
- **腾讯元宝网页版**：需要额外步骤。请手动选择 "复制为Markdown"，然后在 Notion 中使用 `Ctrl` + `Shift` + `V` (粘贴纯文本) 才能正常转换。

## 🤝 共建生态

[![GitHub Stars](https://img.shields.io/github/stars/skyance/Notion-Formula-Auto-Conversion-Tool?style=social)](https://github.com/skyance/Notion-Formula-Auto-Conversion-Tool)
