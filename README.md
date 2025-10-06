
# Notion公式自动转换工具 ✨
## Demo
![公式转换演示](https://github.com/user-attachments/assets/46c4177d-31cc-4c37-9a26-bbbff2195072)

## 新版本UI：

<div style="display: flex; gap: 10px; align-items: flex-start;">
  <div>
    <p style="text-align: center; font-weight: bold;">转换前:</p>
    <img style="max-width: 100%; height: auto;" src="https://github.com/user-attachments/assets/a5bee541-11e8-4bac-9f10-3900f437e8db" />
  </div>
  <div>
    <p style="text-align: center; font-weight: bold;">转换中:</p>
    <img style="max-width: 100%; height: auto;" src="https://github.com/user-attachments/assets/c41be7e9-c4e9-43ae-b9db-e6409a0a5f00" />
  </div>
  <div>
    <p style="text-align: center; font-weight: bold;">转换后:</p>
    <img style="max-width: 100%; height: auto;" src="https://github.com/user-attachments/assets/d982b1f1-5c77-45ee-8f63-4e5496556af1" />
  </div>
</div>



## 🛠️ 一键安装
1. 安装油猴插件: [Tampermonkey](https://www.tampermonkey.net/) 扩展（[Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) | [Firefox](https://addons.mozilla.org/firefox/addon/tampermonkey/)）
2. 点击安装脚本：[Notion-Formula-Auto-Conversion-Tool](https://greasyfork.org/zh-CN/scripts/525730-notion-%E5%85%AC%E5%BC%8F%E8%87%AA%E5%8A%A8%E8%BD%AC%E6%8D%A2%E5%B7%A5%E5%85%B7)
3. 刷新Notion页面即可生效

## 🎯 使用说明
需要提示大模型:
涉及的公式都用 katex格式(具体参考https://katex.org/docs/supported.html)
行内数学模式（单个 $）:$\text{Attention}(Q,K,V) = \text{softmax}\left(\frac{QK^{\top}}{\sqrt{d_k}}\right)V$
行间数学模式（独立的一行,双 $$与公式在一行,$$和公式之间不要换行）：$$\text{Attention}(Q,K,V) = \text{softmax}\left(\frac{QK^{\top}}{\sqrt{d_k}}\right)V$$

## 🤝 共建生态
[![GitHub Stars](https://img.shields.io/github/stars/skyance/Notion-Formula-Auto-Conversion-Tool?style=social)](https://github.com/skyance/Notion-Formula-Auto-Conversion-Tool)
