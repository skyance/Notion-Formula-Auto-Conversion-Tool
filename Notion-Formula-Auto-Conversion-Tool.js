// ==UserScript==
// @name         Notion-Formula-Auto-Conversion-Tool
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  自动公式转换工具
// @author       skyance、0xstride
// @match        https://www.notion.so/*
// @grant        GM_addStyle
// @github       https://github.com/skyance/Notion-Formula-Auto-Conversion-Tool
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js
// @downloadURL https://update.greasyfork.org/scripts/525730/Notion-Formula-Auto-Conversion-Tool.user.js
// @updateURL https://update.greasyfork.org/scripts/525730/Notion-Formula-Auto-Conversion-Tool.meta.js
// ==/UserScript==

(function () {
  "use strict";

  GM_addStyle(`
        /* 基础样式 */
        #formula-helper {
            position: fixed;
            bottom: 90px;
            right: 20px;
            z-index: 9999;
            background: white;
            padding: 0;
            border-radius: 12px;
            box-shadow: rgba(0, 0, 0, 0.1) 0px 10px 30px,
                       rgba(0, 0, 0, 0.1) 0px 1px 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            min-width: 200px;
            transform-origin: center;
            will-change: transform;
            overflow: hidden;
        }

        .content-wrapper {
            padding: 16px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            transform-origin: center;
        }

        /* 收起状态 */
        #formula-helper.collapsed {
            width: 48px;
            min-width: 48px;
            height: 48px;
            padding: 12px;
            opacity: 0.9;
            transform: scale(0.98);
            border-radius: 50%;
        }

        #formula-helper.collapsed .content-wrapper {
            opacity: 0;
            transform: scale(0.8);
            pointer-events: none;
            transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        }

        #formula-helper #convert-btn,
        #formula-helper #progress-container,
        #formula-helper #status-text {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            opacity: 1;
            transform: translateY(0);
            transform-origin: center;
        }

        /* 收起按钮样式 */
        #collapse-btn {
            position: absolute;
            top: 8px;
            right: 8px;
            width: 24px;
            height: 24px;
            border: none;
            background: transparent;
            cursor: pointer;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            transform-origin: center;
            z-index: 2;
        }

        #collapse-btn:hover {
            transform: scale(1.1);
        }

        #collapse-btn:active {
            transform: scale(0.95);
        }

        #collapse-btn svg {
            width: 16px;
            height: 16px;
            fill: #4b5563;
            transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        #formula-helper.collapsed #collapse-btn {
            position: static;
            width: 100%;
            height: 100%;
        }

        #formula-helper.collapsed #collapse-btn svg {
            transform: rotate(180deg);
        }

        @media (hover: hover) {
            #formula-helper:not(.collapsed):hover {
                transform: translateY(-2px);
                box-shadow: rgba(0, 0, 0, 0.15) 0px 15px 35px,
                           rgba(0, 0, 0, 0.12) 0px 3px 10px;
            }

            #formula-helper.collapsed:hover {
                opacity: 1;
                transform: scale(1.05);
            }
        }

        /* 按钮样式 */
        #convert-btn {
            background: #2563eb;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            margin-top: 20px;
            margin-bottom: 12px;
            width: 100%;
            font-weight: 500;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            position: relative;
            overflow: hidden;
        }

        #convert-btn::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.1);
            opacity: 0;
            transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        #convert-btn:hover {
            background: #1d4ed8;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
        }

        #convert-btn:hover::after {
            opacity: 1;
        }

        #convert-btn:active {
            transform: translateY(1px);
            box-shadow: 0 2px 6px rgba(37, 99, 235, 0.15);
        }

        #convert-btn.processing {
            background: #ef4444;
            cursor: pointer;
            transform: scale(0.98);
            box-shadow: none;
        }

        /* 状态和进度显示 */
        #status-text {
            font-size: 13px;
            color: #4b5563;
            margin-bottom: 10px;
            line-height: 1.5;
        }

        #progress-container {
            background: #e5e7eb;
            height: 4px;
            border-radius: 2px;
            overflow: hidden;
            margin-bottom: 15px;
            transform-origin: center;
        }

        #progress-bar {
            background: #2563eb;
            height: 100%;
            width: 0%;
            transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }

        #progress-bar::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(
                90deg,
                transparent,
                rgba(255, 255, 255, 0.3),
                transparent
            );
            animation: progress-shine 1.5s linear infinite;
        }

        @keyframes progress-shine {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }

        /* 动画效果 */
        @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(0.98); }
            100% { opacity: 1; transform: scale(1); }
        }

        .processing #status-text {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
    `);

  // 缓存DOM元素
  let panel,
    statusText,
    convertBtn,
    progressBar,
    progressContainer,
    collapseBtn;
  let isProcessing = false;
  let shouldStop = false;
  let formulaCount = 0;
  let isCollapsed = true;
  let hoverTimer = null;
  const DEBUG_MODE = false;
  function createPanel() {
    panel = document.createElement("div");
    panel.id = "formula-helper";
    panel.classList.add("collapsed");
    panel.innerHTML = `
            <button id="collapse-btn">
                <svg viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
            </button>
            <div class="content-wrapper">
                <button id="convert-btn">🔄 (0)</button>
                <div id="progress-container">
                    <div id="progress-bar"></div>
                </div>
                <div id="status-text">就绪</div>
            </div>
        `;
    document.body.appendChild(panel);

    statusText = panel.querySelector("#status-text");
    convertBtn = panel.querySelector("#convert-btn");
    progressBar = panel.querySelector("#progress-bar");
    progressContainer = panel.querySelector("#progress-container");
    collapseBtn = panel.querySelector("#collapse-btn");

    // 添加收起按钮事件
    collapseBtn.addEventListener("click", toggleCollapse);

    // 添加鼠标悬停事件
    panel.addEventListener("mouseenter", () => {
      clearTimeout(hoverTimer);
      if (isCollapsed) {
        hoverTimer = setTimeout(() => {
          panel.classList.remove("collapsed");
          isCollapsed = false;
        }, 150); // 减少展开延迟时间
      }
    });

    panel.addEventListener("mouseleave", () => {
      clearTimeout(hoverTimer);
      if (!isCollapsed && !isProcessing) {
        // 添加处理中状态判断
        hoverTimer = setTimeout(() => {
          panel.classList.add("collapsed");
          isCollapsed = true;
        }, 800); // 适当减少收起延迟
      }
    });
  }

  function toggleCollapse() {
    isCollapsed = !isCollapsed;
    panel.classList.toggle("collapsed");
  }

  function updateProgress(current, total) {
    const percentage = total > 0 ? (current / total) * 100 : 0;
    progressBar.style.width = `${percentage}%`;
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
    statusText.textContent = text;
    if (timeout) {
      setTimeout(() => (statusText.textContent = "就绪"), timeout);
    }
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

  function findClosingSingleDollar(text, startIndex) {
    for (let i = startIndex; i < text.length; i++) {
      if (text[i] === "\n") {
        return -1;
      }
      if (text[i] !== "$" || isEscaped(text, i) || text[i + 1] === "$") {
        continue;
      }
      return i;
    }
    return -1;
  }

  function findClosingDoubleDollar(text, startIndex) {
    for (let i = startIndex; i < text.length - 1; i++) {
      if (text[i] === "$" && text[i + 1] === "$" && !isEscaped(text, i)) {
        return i;
      }
    }
    return -1;
  }

  function findClosingLatex(text, startIndex, closeChar) {
    for (let i = startIndex; i < text.length - 1; i++) {
      if (
        text[i] === "\\" &&
        text[i + 1] === closeChar &&
        !isEscaped(text, i)
      ) {
        return i;
      }
    }
    return -1;
  }

  function isValidInlineDollar(text, start, end) {
    const content = text.slice(start + 1, end);
    if (!content.trim() || /\n/.test(content)) {
      return false;
    }

    const firstChar = text[start + 1];
    const lastChar = text[end - 1];
    if (
      !firstChar ||
      !lastChar ||
      /\s/.test(firstChar) ||
      /\s/.test(lastChar)
    ) {
      return false;
    }

    return true;
  }

  function buildFormulaToken(
    text,
    start,
    end,
    openLength,
    closeLength,
    type,
    syntax,
  ) {
    const boundaries = findLineBoundaries(text, start, end);
    return {
      raw: text.slice(start, end),
      start,
      end,
      type,
      syntax,
      content: text.slice(start + openLength, end - closeLength),
      lineStart: boundaries.lineStart,
      lineEnd: boundaries.lineEnd,
      standaloneBlock: type === "block" ? boundaries.standaloneBlock : false,
    };
  }

  // 公式查找
  function findFormulas(text) {
    const formulas = [];

    for (let i = 0; i < text.length; i++) {
      if (text[i] === "$" && !isEscaped(text, i)) {
        if (text[i + 1] === "$") {
          const closeIndex = findClosingDoubleDollar(text, i + 2);
          if (closeIndex !== -1) {
            const end = closeIndex + 2;
            const token = buildFormulaToken(text, i, end, 2, 2, "block", "$$");
            if (token.content.trim()) {
              formulas.push(token);
            }
            i = end - 1;
            continue;
          }
        } else {
          const closeIndex = findClosingSingleDollar(text, i + 1);
          if (closeIndex !== -1 && isValidInlineDollar(text, i, closeIndex)) {
            const end = closeIndex + 1;
            formulas.push(buildFormulaToken(text, i, end, 1, 1, "inline", "$"));
            i = end - 1;
            continue;
          }
        }
      }

      if (text[i] === "\\" && !isEscaped(text, i)) {
        if (text[i + 1] === "(") {
          const closeIndex = findClosingLatex(text, i + 2, ")");
          if (closeIndex !== -1) {
            const end = closeIndex + 2;
            const token = buildFormulaToken(
              text,
              i,
              end,
              2,
              2,
              "inline",
              "\\(\\)",
            );
            if (token.content.trim()) {
              formulas.push(token);
            }
            i = end - 1;
            continue;
          }
        }

        if (text[i + 1] === "[") {
          const closeIndex = findClosingLatex(text, i + 2, "]");
          if (closeIndex !== -1) {
            const end = closeIndex + 2;
            const token = buildFormulaToken(
              text,
              i,
              end,
              2,
              2,
              "block",
              "\\[\\]",
            );
            if (token.content.trim()) {
              formulas.push(token);
            }
            i = end - 1;
            continue;
          }
        }
      }
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
    editor.focus();
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

  function getEditableEditors() {
    return Array.from(
      document.querySelectorAll('[contenteditable="true"]'),
    ).filter((editor) => {
      if (editor.closest("#formula-helper")) {
        return false;
      }
      if (
        editor.closest(
          '.notion-simple-table-block, .notion-table-view, [role="gridcell"], [role="cell"], td, th',
        )
      ) {
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
      const formulas = findFormulas(editor.textContent).filter(filterFn);
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
    restoreSelection(selectedRange);
    debugLog("openInlineEquationEditor shortcut mode", {
      editor: describeElement(editor),
      selectedText: selectedRange?.toString() || "",
      activeElement: describeElement(document.activeElement),
    });
    await simulateShortcut(isMac ? "Meta+Shift+E" : "Ctrl+Shift+E", editor);
    await sleep(10);
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
        const inlineInput = await waitForInlineInput(editor);
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

  // 优化的主转换函数
  async function convertFormulas() {
    if (isProcessing) return;
    isProcessing = true;
    shouldStop = false;
    convertBtn.classList.add("processing");
    convertBtn.textContent = "取消";

    try {
      formulaCount = 0;
      updateStatus("开始扫描文档... (按ESC取消)");

      const initialTasks = collectFormulaTasks();
      const totalFormulas = initialTasks.reduce(
        (sum, item) => sum + item.formulas.length,
        0,
      );

      if (totalFormulas === 0) {
        updateStatus("未找到需要转换的公式", 3000);
        updateProgress(0, 0);
        convertBtn.classList.remove("processing");
        isProcessing = false;
        return;
      }

      updateStatus(`找到 ${totalFormulas} 个公式，开始转换...`);

      const phases = [
        {
          name: "行内公式",
          getTasks: () =>
            initialTasks
              .map(({ editor, formulas }) => ({
                editor,
                formulas: formulas.filter(
                  (formula) => formula.type === "inline",
                ),
              }))
              .filter((item) => item.formulas.length),
        },
        {
          name: "块公式",
          getTasks: () =>
            collectFormulaTasks((formula) => formula.type === "block"),
        },
      ];

      for (const phase of phases) {
        if (shouldStop) break;
        const phaseTasks = phase.getTasks();
        if (!phaseTasks.length) {
          continue;
        }

        updateStatus(
          `开始转换${phase.name}... (${formulaCount}/${totalFormulas})`,
        );

        // 每个阶段独立处理，避免块级转换破坏后续行内公式定位
        for (const { editor, formulas } of phaseTasks.slice().reverse()) {
          if (shouldStop) break;
          for (const formulaObj of formulas.slice().reverse()) {
            if (shouldStop) break;
            const result = await convertFormula(editor, formulaObj);
            if (!result) {
              continue;
            }
            const renderMode = result;
            formulaCount++;
            updateProgress(formulaCount, totalFormulas);
            if (
              formulaCount === 1 ||
              formulaCount === totalFormulas ||
              formulaCount % 5 === 0 ||
              renderMode === "block"
            ) {
              updateStatus(
                `正在转换... (${formulaCount}/${totalFormulas}) [${formulaObj.syntax} -> ${renderMode}]`,
              );
            }
            if (renderMode === "block") {
              await sleep(24);
            }
          }
        }
      }

      if (shouldStop) {
        updateStatus(`已取消。已完成: ${formulaCount}`, 3000);
      } else {
        updateStatus(`Done:${formulaCount}`, 3000);
      }

      convertBtn.textContent = `🔄 (${formulaCount})`;

      // 转换完成后自动收起面板
      setTimeout(() => {
        if (!panel.classList.contains("collapsed")) {
          panel.classList.add("collapsed");
          isCollapsed = true;
        }
      }, 1000);
    } catch (error) {
      console.error("转换过程出错:", error);
      updateStatus(`发生错误: ${error.message}`, 5000);
      updateProgress(0, 0);
    } finally {
      isProcessing = false;
      convertBtn.classList.remove("processing");

      setTimeout(() => {
        if (!isProcessing) {
          updateProgress(0, 0);
        }
      }, 1000);
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
  convertBtn.addEventListener("click", () => {
    if (isProcessing) {
      shouldStop = true;
      updateStatus("正在取消...");
    } else {
      convertFormulas();
    }
  });

  // 监听ESC键取消
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isProcessing) {
      shouldStop = true;
      updateStatus("正在取消...");
    }
  });

  // 页面加载完成后检查公式数量
  setTimeout(() => {
    const formulas = findFormulas(document.body.textContent);
    if (formulas.length > 0) {
      convertBtn.textContent = `🔄(${formulas.length})`;
    }
  }, 1000);

  console.log("公式转换工具已加载");
})();
