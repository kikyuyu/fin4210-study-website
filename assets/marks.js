/* ============================================================
   FIN 4210 Study Site · 我的标记 (My Highlights & Notes)
   - 选中文字 → 弹出色板：高亮 / 高亮+备注
   - 右下角「我的标记」面板：按 Lecture 分组、跳转、删除
   - 数据存 localStorage（fin4210-marks-v1），按页面+章节定位
   ============================================================ */
(function () {
  "use strict";

  var STORE_KEY = "fin4210-marks-v1";
  var PAGE = location.pathname.split("/").pop() || "index.html";
  var COLORS = { y: "#fff3a3", b: "#cfe0ff", g: "#d3f5d3" };

  /* ---------------- storage ---------------- */
  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
    catch (e) { return []; }
  }
  function save(list) {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
    updateBadge();
  }

  /* ---------------- helpers ---------------- */
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function uid() { return "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function lectureOf(node) {
    var el = node && node.nodeType === 1 ? node : node && node.parentElement;
    var sec = el && el.closest ? el.closest("h2.sec, h3.sub") : null;
    var txt = sec ? sec.textContent : "";
    var m = txt.match(/Lecture[s]?\s*(\d+)(?:\s*[–-]\s*(\d+))?/i);
    if (m) return m[2] ? "L" + m[1] + "–" + m[2] : "L" + m[1];
    var tag = el && el.closest ? el.closest(".ex") : null;
    if (tag) {
      var t = tag.querySelector(".ex-tag");
      if (t) {
        var m2 = t.textContent.match(/L\s*(\d+)(?:\s*[–-]\s*(\d+))?/i);
        if (m2) return m2[2] ? "L" + m2[1] + "–" + m2[2] : "L" + m2[1];
      }
    }
    return "通用";
  }
  function headingIdOf(node) {
    var el = node && node.nodeType === 1 ? node : node && node.parentElement;
    var sec = el && el.closest ? el.closest("h2.sec, h3.sub") : null;
    if (sec) {
      if (!sec.id) sec.id = "s-" + Math.random().toString(36).slice(2, 8);
      return sec.id;
    }
    return "";
  }
  function pageShort(p) {
    if (p === "index.html") return "首页";
    var m = p.match(/part(\d+)/);
    return m ? "Part " + m[1] : p;
  }

  /* ---------------- range wrapping ---------------- */
  function wrapRange(range, mid, color) {
    var spans = [];
    if (range.startContainer === range.endContainer && range.startContainer.nodeType === 3) {
      var sp = document.createElement("mark");
      sp.className = "hlm";
      sp.dataset.mid = mid;
      sp.dataset.color = color;
      range.surroundContents(sp);
      spans.push(sp);
    } else {
      var root = range.commonAncestorContainer;
      if (root.nodeType === 3) root = root.parentNode;
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          var r = document.createRange();
          r.selectNodeContents(n);
          var cmpS = r.compareBoundaryPoints(Range.END_TO_START, range);
          var cmpE = r.compareBoundaryPoints(Range.START_TO_END, range);
          if (cmpS < 0 || cmpE > 0) return NodeFilter.FILTER_REJECT;
          if (n.parentElement.closest("mark.hlm, script, style")) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      var nodes = [], n;
      while ((n = walker.nextNode())) nodes.push(n);
      nodes.forEach(function (tn) {
        var r = document.createRange();
        r.selectNodeContents(tn);
        if (tn === range.startContainer) r.setStart(tn, range.startOffset);
        if (tn === range.endContainer) r.setEnd(tn, range.endOffset);
        var sp = document.createElement("mark");
        sp.className = "hlm";
        sp.dataset.mid = mid;
        sp.dataset.color = color;
        try { r.surroundContents(sp); spans.push(sp); } catch (e) { /* skip partial */ }
      });
    }
    return spans;
  }

  function unwrapMark(mid) {
    document.querySelectorAll('mark.hlm[data-mid="' + mid + '"]').forEach(function (sp) {
      var parent = sp.parentNode;
      while (sp.firstChild) parent.insertBefore(sp.firstChild, sp);
      parent.removeChild(sp);
      parent.normalize();
    });
  }

  /* find a text range inside container matching snippet */
  function findTextRange(container, text) {
    var t = (text || "").trim();
    if (!t) return null;
    var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        return n.parentElement.closest("mark.hlm, script, style") ? NodeFilter.FILTER_REJECT
          : (n.nodeValue.indexOf(t) !== -1 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP);
      }
    });
    var node;
    while ((node = walker.nextNode())) {
      var i = node.nodeValue.indexOf(t);
      if (i !== -1) {
        var r = document.createRange();
        r.setStart(node, i);
        r.setEnd(node, i + t.length);
        return r;
      }
    }
    return null;
  }

  /* ---------------- restore marks on this page ---------------- */
  function restore() {
    var marks = load().filter(function (m) { return m.page === PAGE; });
    var main = document.querySelector("main") || document.body;
    marks.forEach(function (m) {
      if (document.querySelector('mark.hlm[data-mid="' + m.id + '"]')) return;
      var container = m.hid ? document.getElementById(m.hid) : null;
      if (!container || !main.contains(container)) container = main;
      var range = findTextRange(container, m.text);
      if (range) wrapRange(range, m.id, m.color);
    });
  }

  /* ---------------- selection toolbar ---------------- */
  var tip = null;
  function hideTip() { if (tip) { tip.remove(); tip = null; } }

  function showTip(rect) {
    hideTip();
    tip = document.createElement("div");
    tip.id = "mkTip";
    tip.innerHTML =
      '<span class="mk-tip-lbl">标记</span>' +
      '<button data-c="y" style="background:' + COLORS.y + '" title="黄色高亮"></button>' +
      '<button data-c="b" style="background:' + COLORS.b + '" title="蓝色高亮"></button>' +
      '<button data-c="g" style="background:' + COLORS.g + '" title="绿色高亮"></button>' +
      '<button data-c="y" data-note="1" class="mk-note-btn">＋备注</button>';
    document.body.appendChild(tip);
    tip.addEventListener("mousedown", function (ev) {
      var b = ev.target.closest("button");
      if (!b) return;
      ev.preventDefault();
      addMark(b.dataset.c, !!b.dataset.note);
    });
    var pad = 6;
    var top = rect.top - tip.offsetHeight - pad;
    if (top < 60) top = rect.bottom + pad;
    var left = Math.max(8, Math.min(rect.left, window.innerWidth - tip.offsetWidth - 8));
    tip.style.top = top + "px";
    tip.style.left = left + "px";
  }

  function addMark(color, withNote) {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return hideTip();
    var text = sel.toString().trim();
    if (text.length < 2) return hideTip();
    var anchor = sel.getRangeAt(0).startContainer;
    if (anchor.nodeType === 1 && !anchor.childNodes.length) return hideTip();
    var mid = uid();
    var lecture = lectureOf(anchor);
    var hid = headingIdOf(anchor);

    var note = "";
    if (withNote) {
      note = window.prompt("为这段高亮写个备注（可留空）：", "");
      if (note === null) return hideTip();
    }
    wrapRange(sel.getRangeAt(0).cloneRange(), mid, color);
    sel.removeAllRanges();
    hideTip();

    var list = load();
    list.push({ id: mid, page: PAGE, lecture: lecture, color: color, text: text.slice(0, 200), note: note.trim(), hid: hid, ts: Date.now() });
    save(list);
  }

  /* ---------------- panel ---------------- */
  var panel = null, panelOpen = false;
  function buildPanel() {
    panel = document.createElement("div");
    panel.id = "mkPanel";
    panel.innerHTML =
      '<div class="mkp-head"><b>🖍 我的标记</b><span class="mkp-sub" id="mkpCount"></span>' +
      '<button id="mkpClear" title="清空全部标记">清空</button>' +
      '<button id="mkpClose" title="关闭">×</button></div>' +
      '<div class="mkp-body" id="mkpBody"></div>';
    document.body.appendChild(panel);
    document.getElementById("mkpClose").addEventListener("click", togglePanel);
    document.getElementById("mkpClear").addEventListener("click", function () {
      if (!confirm("确定清空所有标记？此操作不可恢复。")) return;
      load().forEach(function (m) { if (m.page === PAGE) unwrapMark(m.id); });
      save([]);
      renderPanel();
    });
    panel.addEventListener("click", function (ev) {
      var j = ev.target.closest("[data-jump]");
      var d = ev.target.closest("[data-del]");
      if (d) {
        var id = d.dataset.del;
        unwrapMark(id);
        save(load().filter(function (m) { return m.id !== id; }));
        renderPanel();
      } else if (j) {
        jumpTo(j.dataset.jump);
      }
    });
  }

  function renderPanel() {
    var body = document.getElementById("mkpBody");
    var list = load().sort(function (a, b) {
      return String(a.lecture).localeCompare(String(b.lecture)) || (a.ts - b.ts);
    });
    document.getElementById("mkpCount").textContent = list.length ? list.length + " 条" : "";
    if (!list.length) {
      body.innerHTML = '<p class="mkp-empty">还没有标记。<br>用鼠标选中页面文字，即可高亮或添加备注。</p>';
      return;
    }
    var groups = {}, order = [];
    list.forEach(function (m) {
      if (!groups[m.lecture]) { groups[m.lecture] = []; order.push(m.lecture); }
      groups[m.lecture].push(m);
    });
    var html = "";
    order.forEach(function (lec) {
      html += '<div class="mkp-group"><div class="mkp-lec">' + esc(lec) + ' <span class="mkp-n">' + groups[lec].length + '</span></div>';
      groups[lec].forEach(function (m) {
        var snippet = m.text.length > 46 ? m.text.slice(0, 46) + "…" : m.text;
        html += '<div class="mkp-item">' +
          '<span class="mkp-dot" style="background:' + (COLORS[m.color] || COLORS.y) + '"></span>' +
          '<div class="mkp-txt"><div class="mkp-snippet">' + esc(snippet) + '</div>' +
          (m.note ? '<div class="mkp-note">📝 ' + esc(m.note) + '</div>' : '') +
          '<div class="mkp-meta">' + esc(pageShort(m.page)) + ' · ' + new Date(m.ts).toLocaleDateString() + '</div></div>' +
          '<div class="mkp-ops"><button data-jump="' + m.id + '" title="跳转到此标记">跳转</button>' +
          '<button data-del="' + m.id + '" title="删除">×</button></div></div>';
      });
      html += '</div>';
    });
    body.innerHTML = html;
  }

  function jumpTo(id) {
    var m = load().filter(function (x) { return x.id === id; })[0];
    if (!m) return;
    var go = function () {
      var el = document.querySelector('mark.hlm[data-mid="' + id + '"]');
      if (!el && m.page !== PAGE) return; /* different page handled by reload */
      if (!el) { restore(); el = document.querySelector('mark.hlm[data-mid="' + id + '"]'); }
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("mk-flash");
        setTimeout(function () { el.classList.remove("mk-flash"); }, 1800);
        if (panelOpen) togglePanel();
      }
    };
    if (m.page !== PAGE) {
      var url = m.page + "?mark=" + id;
      if (m.hid) url += "#" + m.hid;
      location.href = url;
    } else {
      go();
    }
  }

  /* ---------------- floating button ---------------- */
  function buildBtn() {
    var btn = document.createElement("button");
    btn.id = "mkBtn";
    btn.title = "我的标记";
    btn.innerHTML = "🖍 <span id=\"mkCount\"></span>";
    document.body.appendChild(btn);
    btn.addEventListener("click", togglePanel);
    updateBadge();
  }
  function updateBadge() {
    var n = load().length;
    var c = document.getElementById("mkCount");
    if (c) c.textContent = n ? "我的标记 " + n : "我的标记";
  }
  function togglePanel() {
    if (!panel) buildPanel();
    panelOpen = !panelOpen;
    if (panelOpen) { renderPanel(); panel.classList.add("open"); }
    else panel.classList.remove("open");
  }

  /* ---------------- boot ---------------- */
  function boot() {
    buildBtn();
    restore();
    /* deep link: ?mark=<id> */
    var q = new URLSearchParams(location.search).get("mark");
    if (q) setTimeout(function () { jumpTo(q); }, 400);

    document.addEventListener("mouseup", function (ev) {
      if (ev.target.closest && ev.target.closest("#mkPanel, #mkBtn, #mkTip")) return;
      setTimeout(function () {
        var sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) return hideTip();
        var text = sel.toString().trim();
        if (text.length < 2) return hideTip();
        var node = sel.getRangeAt(0).startContainer;
        var el = node.nodeType === 1 ? node : node.parentElement;
        if (el.closest && el.closest("#mkPanel, #mkBtn, mark.hlm")) return hideTip();
        showTip(sel.getRangeAt(0).getBoundingClientRect());
      }, 10);
    });
    document.addEventListener("mousedown", function (ev) {
      if (tip && !ev.target.closest("#mkTip")) hideTip();
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") { hideTip(); if (panelOpen) togglePanel(); }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
