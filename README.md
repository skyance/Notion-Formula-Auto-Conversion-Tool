
# Notion公式自动转换工具 ✨
![公式转换演示](https://github.com/user-attachments/assets/46c4177d-31cc-4c37-9a26-bbbff2195072)
新版：
![image](https://github.com/user-attachments/assets/18d0fa96-d56a-4b56-83ab-27b8e3a45b56)

## 🚀 核心价值
- **智能转换**：自动识别并转换 `$$` 包裹的数学公式
- **零配置**：安装即用，无需复杂设置
- **跨平台**：支持所有基于Chromium的现代浏览器
- **安全可靠**：开源MIT协议，代码透明可审计

## ⚡️ 即刻体验
### 环境准备
- [Tampermonkey](https://www.tampermonkey.net/) 扩展（[Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) | [Firefox](https://addons.mozilla.org/firefox/addon/tampermonkey/)）
- 最新版Notion工作区访问权限

### 🛠️ 一键安装
1. 点击安装脚本：[GreasyFork最新版本](https://greasyfork.org/zh-CN/scripts/525730-notion-%E5%85%AC%E5%BC%8F%E8%87%AA%E5%8A%A8%E8%BD%AC%E6%8D%A2%E5%B7%A5%E5%85%B7)
2. 刷新Notion页面即可生效

## 🎯 工作场景
需要提示大模型：
1. 你擅长强化学习。
2. 回答涉及的所有公式 字母都要符合notion的KaTeX语法，行内公式 是在公式代码块的前后均添加一个 $ ； 行间公式 则是在公式代码块的前后均添加两个 $$ ， 行间公式 的$$ 和公式之间不要换行。
3. 行间公式 的$$ 和公式之间不要换行
4. 用中文回答
5. 在Notion的KaTeX中，星号 * 会被默认解析为斜体标志。为了避免这种情况，使用 \ast 来表示星号

在notion中输入：
$$ \sqrt{a^2 + b^2} $$

自动转换为：
![image](https://github.com/user-attachments/assets/e7fea3e8-5ed2-4612-ae3e-f3f44ecfe7c0)


## 🤝 共建生态
[![GitHub Stars](https://img.shields.io/github/stars/skyance/Notion-Formula-Auto-Conversion-Tool?style=social)](https://github.com/skyance/Notion-Formula-Auto-Conversion-Tool)

参与方式：
- 📝 文档改进：完善使用案例和教程
- 🐞 问题追踪：提交可复现的BUG报告
- 💡 功能提案：在Discussions分享创意
- 🛠️ 代码贡献：遵循现有代码风格提交PR
