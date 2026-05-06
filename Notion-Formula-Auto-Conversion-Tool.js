// ==UserScript==
// @name         Notion-Formula-Auto-Conversion-Tool
// @namespace    http://tampermonkey.net/
// @version      3.3.1
// @description  Notion 自动公式转换工具
// @author       skyance、0xstrid、fengjy73、Sparidae、ckrvxr
// @match        https://www.notion.so/*
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @github       https://github.com/skyance/Notion-Formula-Auto-Conversion-Tool
// @downloadURL https://update.greasyfork.org/scripts/525730/Notion-Formula-Auto-Conversion-Tool.user.js
// @updateURL https://update.greasyfork.org/scripts/525730/Notion-Formula-Auto-Conversion-Tool.meta.js
// ==/UserScript==

(function () {
  "use strict";

  GM_addStyle(`
    #formula-helper {
      position: absolute;
      bottom: 100px;
      right: 30px;
      z-index: 1;
      height: 40px;
      width: 40px;
      border-radius: 22px;
      background: #ffffff;
      box-shadow: 0px 6px 16px -4px rgba(0, 0, 0, 0.08),
                  0px 8px 12px 0px rgba(25,25,25,.027),
                  0px 2px 6px 0px rgba(25,25,25,.027),
                  0px 0px 0px 1px rgba(42,28,0,.10);
      display: flex;
      align-items: center;
      overflow: hidden;
      cursor: pointer;
      transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                  border-radius 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                  transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: 'Apple Chancery', 'Gabriola', 'Georgia', 'Times New Roman', serif;
      font-weight: 700;
      user-select: none;
    }
    #formula-helper.hover,
    #formula-helper.processing {
      width: 200px;
      border-radius: 22px;
      transform: scale(1.08);
    }
    #formula-helper > * {
      pointer-events: none;
    }
    .button-icon {
      width: 40px;
      height: 40px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Apple Chancery', 'Gabriola', 'Georgia', 'Times New Roman', serif;
      font-size: 19px;
      font-weight: 700;
      color: rgb(55, 53, 47);
      line-height: 1;
    }
    .progress-wrapper {
      display: flex;
      align-items: center;
      flex-grow: 1;
      overflow: hidden;
      padding-right: 12px;
      white-space: nowrap;
    }
    .progress-bar-container {
      flex-grow: 1;
      height: 4px;
      background: rgba(55, 53, 47, 0.09);
      border-radius: 2px;
      margin-right: 8px;
    }
    .progress-bar-fill {
      width: 0%;
      height: 100%;
      background: rgb(35, 131, 226);
      border-radius: 2px;
      transition: width 0.3s ease;
    }
    .progress-text {
      font-size: 14px;
      color: rgba(55, 53, 47, 0.7);
      font-variant-numeric: tabular-nums;
    }
    @media (prefers-color-scheme: dark) {
      #formula-helper {
        background: rgb(211, 211, 211);
      }
    }
    .notion-assistant-corner-origin-container > div[style*="display: flex"] {
      inset-inline-end: unset !important;
      right: 4px !important;
    }
  `);

  let panel, progressBar, progressText;
  let isProcessing = false;
  let shouldStop = false;
  let hoverTimer = null;
  const DEBUG_MODE = false;

  // ---------- 速度配置 ----------
  const SPEED_PRESETS = {
    slow:   { label: "慢速",   delay: 111 },
    normal: { label: "中速",   delay: 11 },
    fast:   { label: "快速",   delay: 1  },
    custom: { label: "自定义", delay: null },
  };

  const getDelay = () => {
    const speed = GM_getValue("speed", "normal");
    return speed === "custom" ? GM_getValue("customDelay", 30) : SPEED_PRESETS[speed].delay;
  };

  // ---------- 工具函数 ----------
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, getDelay()));

  // ---------- 菜单状态 ----------
  let totalConverted = GM_getValue("totalConverted", 0);
  let totalMenuId = null;
  let panelVisible = GM_getValue("panelVisible", true);

  function refreshTotalMenu() {
    if (totalMenuId !== null) GM_unregisterMenuCommand(totalMenuId);
    totalMenuId = GM_registerMenuCommand(
      `📊 累计转换: ${totalConverted} 个公式`,
      () => {}
    );
  }

  function updateProgress(current, total, textOverride = null) {
    const percent = total > 0 ? (current / total) * 100 : 0;
    progressBar.style.width = `${percent}%`;
    progressText.textContent = textOverride || `${current}/${total}`;
  }

  function createPanel() {
    panel = document.createElement("div");
    panel.id = "formula-helper";
    panel.innerHTML = `
        <span class="button-icon">M</span>
        <div class="progress-wrapper">
            <div class="progress-bar-container">
                <div class="progress-bar-fill"></div>
            </div>
            <span class="progress-text">0</span>
        </div>
    `;
    document.body.appendChild(panel);
    if (!panelVisible) panel.style.display = "none";

    progressBar = panel.querySelector(".progress-bar-fill");
    progressText = panel.querySelector(".progress-text");

    // 自动检测待处理个数
    let lastCount = -1;
    const updateCount = () => {
      if (isProcessing) return;
      let count = 0;
      for (const editor of getEditableEditors()) {
        count += findFormulas(editor.textContent).length;
      }
      if (count !== lastCount) {
        lastCount = count;
        progressText.textContent = count ? `${count}` : "0";
      }
    };

    // 初始检测
    updateCount();

    const observer = new MutationObserver(() => {
      // 仅用于其他 UI 变化检测（如侧边栏显隐），不再触发公式扫描
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // Hover 逻辑
    panel.addEventListener("mouseenter", () => {
      clearTimeout(hoverTimer);
      updateCount();
      hoverTimer = setTimeout(() => {
        if (!panel.classList.contains("hover")) {
          panel.classList.add("hover");
        }
      }, 150);
    });

    panel.addEventListener("mouseleave", () => {
      clearTimeout(hoverTimer);
      if (isProcessing) return;
      hoverTimer = setTimeout(() => {
        panel.classList.remove("hover");
      }, 800);
    });

    // 点击处理
    panel.addEventListener("click", (e) => {
      e.stopPropagation();
      if (isProcessing) {
        shouldStop = true;
        progressText.textContent = "Stopping…";
      } else {
        convertFormulas();
      }
    });
  }

  async function waitForCondition(
    checkFn,
    { timeout = 240, interval = 12 } = {},
  ) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const result = checkFn();
      if (result) {
        return result;
      }
      await sleep(interval);
    }
    return null;
  }

  function updateStatus(text, timeout = 0) {
    console.log("[状态]", text);
  }

  function describeElement(element) {
    if (!element) {
      return "[null]";
    }

    const tag = element.tagName ? element.tagName.toLowerCase() : "unknown";
    const id = element.id ? `#${element.id}` : "";
    const className =
      typeof element.className === "string"
        ? element.className
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 4)
          .join(".")
        : "";
    const classes = className ? `.${className}` : "";
    const role = element.getAttribute?.("role");
    const roleText = role ? `[role="${role}"]` : "";
    const aria =
      element.getAttribute?.("aria-roledescription") ||
      element.getAttribute?.("aria-label") ||
      "";
    const text = (element.textContent || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 40);
    return `${tag}${id}${classes}${roleText}${aria ? `("${aria}")` : ""}${text ? ` text="${text}"` : ""}`;
  }

  function debugLog(...args) {
    if (!DEBUG_MODE) {
      return;
    }
    console.log("[FormulaDebug]", ...args);
  }

  function isEscaped(text, index) {
    let slashCount = 0;
    for (let i = index - 1; i >= 0 && text[i] === "\\"; i--) {
      slashCount++;
    }
    return slashCount % 2 === 1;
  }

  function findLineBoundaries(text, start, end) {
    const lineStart = text.lastIndexOf("\n", start - 1) + 1;
    const lineEndIndex = text.indexOf("\n", end);
    const lineEnd = lineEndIndex === -1 ? text.length : lineEndIndex;
    const before = text.slice(lineStart, start).trim();
    const after = text.slice(end, lineEnd).trim();

    return {
      lineStart,
      lineEnd,
      standaloneBlock: before === "" && after === "",
    };
  }

  // 公式查找
  function findFormulas(text) {
    const formulas = [];
    const re = /(?:(\$\$)([\s\S]*?)\1)|(?:\\\[([\s\S]*?)\\\])|(?:\\\(([\s\S]*?)\\\))|(?<![\w\\$])(\$)(?!\d)([^\$\n]+?)\5(?![$\w])/g;

    let m;
    while ((m = re.exec(text)) !== null) {
      let content, type, syntax;
      if (m[1]) { content = m[2]; type = "block"; syntax = "$$"; }
      else if (m[3]) { content = m[3]; type = "block"; syntax = "\\[\\]"; }
      else if (m[4]) { content = m[4]; type = "inline"; syntax = "\\(\\)"; }
      else if (m[5]) { content = m[6]; type = "inline"; syntax = "$"; }
      if (!content || !content.trim()) continue;

      const start = m.index;
      const end = m.index + m[0].length;
      const b = findLineBoundaries(text, start, end);
      formulas.push({
        raw: m[0], start, end, type, syntax,
        content: content.trim(),
        lineStart: b.lineStart, lineEnd: b.lineEnd,
        standaloneBlock: type === "block" ? b.standaloneBlock : false,
      });
    }
    return formulas;
  }

  function getTextSegments(editor) {
    const segments = [];
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let currentOffset = 0;
    let node;

    while ((node = walker.nextNode())) {
      if (!node.textContent) {
        continue;
      }
      segments.push({
        node,
        start: currentOffset,
        end: currentOffset + node.textContent.length,
      });
      currentOffset += node.textContent.length;
    }

    return segments;
  }

  function resolveTextPosition(segments, offset, preferEnd = false) {
    if (!segments.length) {
      return null;
    }

    if (offset <= 0) {
      return { node: segments[0].node, offset: 0 };
    }

    for (const segment of segments) {
      const inSegment = preferEnd
        ? offset > segment.start && offset <= segment.end
        : offset >= segment.start && offset < segment.end;

      if (inSegment) {
        return {
          node: segment.node,
          offset: Math.min(
            segment.node.textContent.length,
            offset - segment.start,
          ),
        };
      }

      if (preferEnd && offset === segment.end) {
        return { node: segment.node, offset: segment.node.textContent.length };
      }
    }

    const lastSegment = segments[segments.length - 1];
    return {
      node: lastSegment.node,
      offset: lastSegment.node.textContent.length,
    };
  }

  function createRangeFromOffsets(editor, start, end) {
    const segments = getTextSegments(editor);
    if (!segments.length) {
      return null;
    }

    const startPos = resolveTextPosition(segments, start, false);
    const endPos = resolveTextPosition(segments, end, true);
    if (!startPos || !endPos) {
      return null;
    }

    const range = document.createRange();
    range.setStart(startPos.node, startPos.offset);
    range.setEnd(endPos.node, endPos.offset);
    return range;
  }

  async function focusEditor(editor) {
    if (!editor) return;
    await ensureFocus(editor);
    await sleep(10);
  }

  async function selectRange(editor, start, end) {
    const range = createRangeFromOffsets(editor, start, end);
    if (!range) {
      return null;
    }

    await focusEditor(editor);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    await sleep(10);
    return range;
  }

  function normalizeFormulaContent(content, { useDisplayStyle = false } = {}) {
    let normalized = content.trim();
    if (
      useDisplayStyle &&
      normalized &&
      !/^\\displaystyle\b/.test(normalized)
    ) {
      normalized = `\\displaystyle ${normalized}`;
    }
    return normalized;
  }

  function isSafeInlineInputElement(element, editor) {
    if (!element || element === editor) {
      return false;
    }

    if (element.closest("#formula-helper")) {
      return false;
    }

    if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
      return true;
    }

    if (!element.isContentEditable) {
      return false;
    }

    if (editor.contains(element)) {
      return true;
    }

    return !!element.closest(
      '.notion-overlay-container, [role="dialog"], .notion-modal',
    );
  }

  function selectElementContents(element) {
    if (!element) {
      return false;
    }

    element.focus();

    if (typeof element.select === "function") {
      element.select();
      return true;
    }

    if (element.isContentEditable) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(element);
      selection.removeAllRanges();
      selection.addRange(range);
      return true;
    }

    return false;
  }

  function isVisibleElement(element) {
    if (!element) {
      return false;
    }
    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") {
      return false;
    }
    return element.getClientRects().length > 0;
  }

  function findInlineInputCandidate(editor) {
    const localSelectors = 'input, textarea, [contenteditable="true"]';
    const globalSelectors = [
      ".notion-overlay-container input",
      ".notion-overlay-container textarea",
      '.notion-overlay-container [contenteditable="true"]',
      '[role="dialog"] input',
      '[role="dialog"] textarea',
      '[role="dialog"] [contenteditable="true"]',
      ".notion-modal input",
      ".notion-modal textarea",
      '.notion-modal [contenteditable="true"]',
    ];

    const candidates = [
      ...Array.from(editor.querySelectorAll(localSelectors)),
      ...Array.from(document.querySelectorAll(globalSelectors.join(","))),
    ];
    debugLog("inline input candidates", candidates.map(describeElement));
    return (
      candidates.find(
        (candidate) =>
          isVisibleElement(candidate) &&
          isSafeInlineInputElement(candidate, editor),
      ) || null
    );
  }

  async function waitForInlineInput(editor, attempts = 8, interval = 12) {
    for (let i = 0; i < attempts; i++) {
      const activeElement = document.activeElement;
      debugLog(`waitForInlineInput attempt ${i + 1}`, {
        activeElement: describeElement(activeElement),
        editor: describeElement(editor),
      });
      if (isSafeInlineInputElement(activeElement, editor)) {
        return activeElement;
      }

      const candidate = findInlineInputCandidate(editor);
      if (candidate) {
        return candidate;
      }

      await sleep(interval);
    }
    return null;
  }

  function isSimpleTableCellEditor(editor) {
    return (
      !!editor &&
      !!editor.closest("td, th") &&
      editor.matches(
        '.notion-table-cell-text[contenteditable="true"], [data-content-editable-leaf="true"][contenteditable="true"]',
      )
    );
  }

  function getEditableEditors() {
    return Array.from(
      document.querySelectorAll('[contenteditable="true"]'),
    ).filter((editor) => {
      const simpleTableCell = isSimpleTableCellEditor(editor);
      if (editor.closest("#formula-helper")) {
        return false;
      }
      if (editor.closest('.notion-table-view, [role="gridcell"], [role="cell"]')) {
        return false;
      }
      if (!simpleTableCell && editor.closest('.notion-simple-table-block, td, th')) {
        return false;
      }
      if (!editor.textContent || !editor.textContent.trim()) {
        return false;
      }
      if (editor.getClientRects().length === 0) {
        return false;
      }
      return !editor.querySelector('[contenteditable="true"]');
    });
  }

  function collectFormulaTasks(filterFn = () => true) {
    const tasks = [];

    for (const editor of getEditableEditors()) {
      const simpleTableCell = isSimpleTableCellEditor(editor);
      const formulas = findFormulas(editor.textContent).filter(
        (formula) => filterFn(formula) && (!simpleTableCell || formula.type === "inline"),
      );
      if (!formulas.length) {
        continue;
      }
      tasks.push({ editor, formulas });
    }

    return tasks;
  }

  function restoreSelection(range) {
    if (!range) {
      return;
    }
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    debugLog("selection restored", {
      text: selection.toString(),
      anchorNode: selection.anchorNode?.textContent?.slice(0, 60) || null,
    });
  }

  async function openInlineEquationEditor(editor, selectedRange = null) {
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    await ensureFocus(editor);
    await sleep(isSimpleTableCellEditor(editor) ? 16 : 8);
    restoreSelection(selectedRange);
    await sleep(isSimpleTableCellEditor(editor) ? 16 : 8);
    debugLog("openInlineEquationEditor shortcut mode", {
      editor: describeElement(editor),
      selectedText: selectedRange?.toString() || "",
      activeElement: describeElement(document.activeElement),
    });
    await simulateShortcut(isMac ? "Meta+Shift+E" : "Ctrl+Shift+E", document.activeElement || editor);
    await sleep(isSimpleTableCellEditor(editor) ? 20 : 10);
    return true;
  }

  // 文本输入模拟
  async function simulateTyping(text, quick = false) {
    const activeElement = document.activeElement;
    if (activeElement) {
      if (quick) {
        // 快速模式：直接插入整段文本 (模拟粘贴)
        const inputEvent = new InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data: text,
        });
        activeElement.dispatchEvent(inputEvent);

        document.execCommand("insertText", false, text);

        const inputEventAfter = new InputEvent("input", {
          bubbles: true,
          cancelable: false,
          inputType: "insertText",
          data: text,
        });
        activeElement.dispatchEvent(inputEventAfter);
      } else {
        // 普通模式：逐字输入 (用于触发命令菜单等)
        for (const char of text) {
          const inputEvent = new InputEvent("beforeinput", {
            bubbles: true,
            cancelable: true,
            inputType: "insertText",
            data: char,
          });
          activeElement.dispatchEvent(inputEvent);

          document.execCommand("insertText", false, char);

          const inputEventAfter = new InputEvent("input", {
            bubbles: true,
            cancelable: false,
            inputType: "insertText",
            data: char,
          });
          activeElement.dispatchEvent(inputEventAfter);

          await sleep(5);
        }
      }
    }
  }

  // 单个按键模拟
  async function simulateKey(keyName, target = null) {
    const keyInfo = getKeyCode(keyName);
    const eventTarget =
      target || document.activeElement || document.body || document;
    const keydownEvent = new KeyboardEvent("keydown", {
      key: keyInfo.key,
      code: keyInfo.code,
      keyCode: keyInfo.keyCode,
      bubbles: true,
    });
    const keyupEvent = new KeyboardEvent("keyup", {
      key: keyInfo.key,
      code: keyInfo.code,
      keyCode: keyInfo.keyCode,
      bubbles: true,
    });

    eventTarget.dispatchEvent(keydownEvent);
    await sleep(10);
    eventTarget.dispatchEvent(keyupEvent);
  }

  // 聚焦到目标元素，避免行顺序错位
  async function ensureFocus(element) {
    if (!element) return;

    // 表格单元格需要先激活 td 父元素，才能让内部编辑器真正进入编辑状态
    if (isSimpleTableCellEditor(element)) {
      const td = element.closest("td, th");
      if (td && document.activeElement !== element) {
        await simulateClick(td);
        await sleep(40);
      }
    }

    element.focus();
    await sleep(8);
    if (document.activeElement !== element) {
      await simulateClick(element);
    }
  }

  // 优化的公式转换
  async function convertFormula(editor, formulaObj) {
    try {
      let { type, content, start, end, lineStart, lineEnd, standaloneBlock } =
        formulaObj;
      let renderMode = type;
      let useDisplayStyle = false;

      debugLog("convertFormula start", {
        editor: describeElement(editor),
        type,
        syntax: formulaObj.syntax,
        start,
        end,
        content,
      });

      if (type === "block" && !standaloneBlock) {
        console.log("检测到非独立行块公式，自动降级为行内公式");
        renderMode = "inline";
        useDisplayStyle = true;
      }

      const rangeStart = renderMode === "block" ? lineStart : start;
      const rangeEnd = renderMode === "block" ? lineEnd : end;
      const range = await selectRange(editor, rangeStart, rangeEnd);
      if (!range) {
        console.warn("未找到匹配的文本范围");
        return false;
      }

      debugLog("convertFormula range selected", {
        renderMode,
        selectedText: range.toString(),
        activeElement: describeElement(document.activeElement),
      });

      const normalizedContent = normalizeFormulaContent(content, {
        useDisplayStyle,
      });

      if (renderMode === "block") {
        // 块公式：清空整行，再创建 block equation
        const originalText = editor.textContent;
        document.execCommand("delete");
        await waitForCondition(
          () =>
            editor.textContent !== originalText ||
            document.activeElement !== editor,
          {
            timeout: 120,
            interval: 10,
          },
        );

        // 重新焦点聚焦，确保光标留在当前块
        await ensureFocus(editor);
        await sleep(16);

        // 输入 /block equation 命令
        await simulateTyping("/block equation", true);
        await sleep(40);

        // 优先按 Enter 选择命令
        await simulateKey("Enter");
        const blockInput = await waitForInlineInput(editor, 10, 15);
        if (!blockInput) {
          updateStatus("块公式输入框未打开，已跳过当前公式", 4000);
          return false;
        }

        // 输入公式内容
        if (!selectElementContents(blockInput)) {
          updateStatus("无法安全选中块公式输入框，已跳过当前公式", 4000);
          return false;
        }
        await simulateTyping(normalizedContent, true);
        await sleep(16);

        // 按 Enter 完成编辑（而非 Escape），避免行序错乱
        await simulateKey("Enter", blockInput);
        await waitForCondition(() => document.activeElement !== blockInput, {
          timeout: 140,
          interval: 10,
        });

        // 再次焦点回到原编辑区域，稳定行顺序
        await ensureFocus(editor);
        await sleep(16);
      } else {
        const opened = await openInlineEquationEditor(editor, range);
        if (!opened) {
          return false;
        }

        // 仅在焦点进入独立公式输入框时继续，避免误伤正文
        const inlineInput = await waitForInlineInput(
          editor,
          isSimpleTableCellEditor(editor) ? 30 : 8,
          isSimpleTableCellEditor(editor) ? 25 : 12,
        );
        if (!inlineInput) {
          updateStatus(
            "行内公式输入框未打开，已跳过当前公式以避免误替换",
            4000,
          );
          return false;
        }

        if (!selectElementContents(inlineInput)) {
          updateStatus("无法安全选中行内公式输入框，已跳过当前公式", 4000);
          return false;
        }

        debugLog("inline input ready", {
          inlineInput: describeElement(inlineInput),
          activeElement: describeElement(document.activeElement),
          selectedText: window.getSelection()?.toString() || "",
        });

        await simulateTyping(normalizedContent, true);
        await sleep(10);

        debugLog("inline input typed", {
          activeElement: describeElement(document.activeElement),
          inlineInputText: inlineInput.value || inlineInput.textContent || "",
        });

        // 按 Enter 确认
        await simulateKey("Enter", inlineInput);
        await waitForCondition(() => document.activeElement !== inlineInput, {
          timeout: 140,
          interval: 10,
        });
        debugLog("inline input confirmed", {
          activeElement: describeElement(document.activeElement),
          editorText: editor.textContent,
        });
      }

      return renderMode;
    } catch (error) {
      console.error("转换公式时出错:", error);
      updateStatus(`错误: ${error.message}`);
      throw error;
    }
  }

  // ---------- 核心转换 ----------
  async function convertFormulas() {
    if (isProcessing) return;
    isProcessing = true; shouldStop = false;
    panel.classList.add("processing");
    try {
      // 扫描并获取总数
      const initialTasks = collectFormulaTasks();
      let totalFormulas = initialTasks.reduce((sum, item) => sum + item.formulas.length, 0);
      if (totalFormulas === 0) {
        progressText.textContent = "0";
        progressBar.style.width = "0%";
        return;
      }

      let formulaCount = 0;
      updateProgress(0, totalFormulas, "scanning");

      const phases = [
        { name: "Inline", getTasks: () => initialTasks.map(({ editor, formulas }) => ({ editor, formulas: formulas.filter(f => f.type === "inline") })).filter(item => item.formulas.length) },
        { name: "Block", getTasks: () => collectFormulaTasks(f => f.type === "block") }
      ];

      for (const phase of phases) {
        if (shouldStop) break;
        const phaseTasks = phase.getTasks();
        for (const { editor, formulas } of phaseTasks.slice().reverse()) {
          if (shouldStop) break;
          for (const formulaObj of formulas.slice().reverse()) {
            if (shouldStop) break;
            const result = await convertFormula(editor, formulaObj);
            if (result) {
              formulaCount++;
              totalConverted++;
              GM_setValue("totalConverted", totalConverted);
              updateProgress(formulaCount, totalFormulas, `${formulaCount}/${totalFormulas}`);
            }
          }
        }
      }

      updateProgress(totalFormulas, totalFormulas, shouldStop ? "Stopped" : "Done");
      refreshTotalMenu();
    } finally {
      isProcessing = false;
      panel.classList.remove("processing");
      if (!shouldStop) {
        setTimeout(() => {
          panel.classList.remove("hover");
        }, 1200);
      }
    }
  }

  // 点击事件模拟
  async function simulateClick(element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const events = [
      new MouseEvent("mousemove", {
        bubbles: true,
        clientX: centerX,
        clientY: centerY,
      }),
      new MouseEvent("mouseenter", {
        bubbles: true,
        clientX: centerX,
        clientY: centerY,
      }),
      new MouseEvent("mousedown", {
        bubbles: true,
        clientX: centerX,
        clientY: centerY,
      }),
      new MouseEvent("mouseup", {
        bubbles: true,
        clientX: centerX,
        clientY: centerY,
      }),
      new MouseEvent("click", {
        bubbles: true,
        clientX: centerX,
        clientY: centerY,
      }),
    ];

    for (const event of events) {
      element.dispatchEvent(event);
      await sleep(8);
    }
  }

  // 键盘快捷键模拟
  async function simulateShortcut(keyCombination, target = null) {
    const keys = keyCombination.split("+");
    const keyEvents = [];
    const eventTarget =
      target || document.activeElement || document.body || document;

    // 创建键盘事件
    for (const key of keys) {
      const keyCode = getKeyCode(key);

      keyEvents.push({
        key: keyCode.key,
        code: keyCode.code,
        keyCode: keyCode.keyCode,
        ctrlKey: keys.includes("Ctrl"),
        shiftKey: keys.includes("Shift"),
        altKey: keys.includes("Alt"),
        metaKey: keys.includes("Meta"),
        bubbles: true,
      });
    }

    // 先按下所有修饰键
    for (let i = 0; i < keyEvents.length - 1; i++) {
      const event = keyEvents[i];
      eventTarget.dispatchEvent(new KeyboardEvent("keydown", event));
    }

    // 按下最终按键
    const finalEvent = keyEvents[keyEvents.length - 1];
    eventTarget.dispatchEvent(new KeyboardEvent("keydown", finalEvent));
    eventTarget.dispatchEvent(new KeyboardEvent("keyup", finalEvent));

    // 释放所有修饰键
    for (let i = keyEvents.length - 2; i >= 0; i--) {
      const event = keyEvents[i];
      eventTarget.dispatchEvent(new KeyboardEvent("keyup", event));
    }

    await sleep(10);
  }

  // 获取键盘按键信息
  function getKeyCode(key) {
    const keyMap = {
      ctrl: { key: "Control", code: "ControlLeft", keyCode: 17 },
      shift: { key: "Shift", code: "ShiftLeft", keyCode: 16 },
      alt: { key: "Alt", code: "AltLeft", keyCode: 18 },
      meta: { key: "Meta", code: "MetaLeft", keyCode: 91 },
      enter: { key: "Enter", code: "Enter", keyCode: 13 },
      escape: { key: "Escape", code: "Escape", keyCode: 27 },
      e: { key: "e", code: "KeyE", keyCode: 69 },
    };

    return (
      keyMap[key.toLowerCase()] || {
        key: key,
        code: `Key${key.toUpperCase()}`,
        keyCode: key.toUpperCase().charCodeAt(0),
      }
    );
  }

  // 初始化
  createPanel();

  // ---------- 注册菜单 ----------
  const speedOrder = ["slow", "normal", "fast", "custom"];
  const menuIds = { toggle: null, speed: null };

  function refreshToggleMenu() {
    if (menuIds.toggle !== null) GM_unregisterMenuCommand(menuIds.toggle);
    menuIds.toggle = GM_registerMenuCommand(`👀 悬浮按钮: ${panelVisible ? "隐藏" : "显示"}`, () => {
      panelVisible = !panelVisible;
      GM_setValue("panelVisible", panelVisible);
      const helper = document.getElementById("formula-helper");
      if (helper) helper.style.display = panelVisible ? "" : "none";
      refreshToggleMenu();
    });
  }

  function refreshSpeedMenu() {
    if (menuIds.speed !== null) GM_unregisterMenuCommand(menuIds.speed);
    const speed = GM_getValue("speed", "normal");
    const label = speed === "custom"
      ? `自定义(${GM_getValue("customDelay", 30)}ms)`
      : SPEED_PRESETS[speed].label;
    menuIds.speed = GM_registerMenuCommand(`⚡ 转换速度: ${label}`, () => {
      const cur = GM_getValue("speed", "normal");
      const idx = speedOrder.indexOf(cur);
      const next = speedOrder[(idx + 1) % speedOrder.length];
      if (next === "custom") {
        const input = prompt("请输入自定义延迟(毫秒):", GM_getValue("customDelay", 30));
        const val = parseInt(input, 10);
        if (!isNaN(val) && val >= 0) GM_setValue("customDelay", val);
        else return;
      }
      GM_setValue("speed", next);
      refreshSpeedMenu();
    });
  }

  GM_registerMenuCommand("🔄 执行公式转换", () => { if (!isProcessing) convertFormulas(); });

  refreshToggleMenu();
  refreshSpeedMenu();

  GM_registerMenuCommand("🔗 反馈问题", () => window.open("https://github.com/skyance/Notion-Formula-Auto-Conversion-Tool/issues"));

  refreshTotalMenu();

  // ===== 检测 Notion 侧边栏/设置面板/对话框/其他页面，自动隐藏按钮 =====
  function shouldHide() {
    return (
      !document.querySelector('.notion-topbar-share-menu') ||
      document.querySelector('.chat_sidebar') ||
      document.querySelector('.notion-space-settings') ||
      document.querySelector('.notion-dialog')
    );
  }

  const sidebarObserver = new MutationObserver(() => {
    const helper = document.getElementById('formula-helper');
    if (!helper) return;

    if (!panelVisible) {
      if (helper.style.display !== 'none') {
        helper.style.display = 'none';
      }
      return;
    }

    if (shouldHide()) {
      if (helper.style.display !== 'none') {
        helper.style.display = 'none';
      }
    } else {
      if (helper.style.display !== '') {
        helper.style.display = '';
      }
    }
  });

  sidebarObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });

  // 监听ESC键取消
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isProcessing) {
      shouldStop = true;
      progressText.textContent = "Stopping…";
    }
  });

  console.log("Formula hover-to-convert tool loaded");
})();
