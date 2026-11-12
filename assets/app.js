/* FIN 4210 Study Site — nav / toc / scroll-spy / MathJax loader / back-to-top */
(function () {
  "use strict";

  var PARTS = [
    { href: "index.html",              label: "首页",       en: "Home" },
    { href: "part1-asset-pricing.html",  label: "Part 1",     en: "资产定价" },
    { href: "part2-capital-structure.html", label: "Part 2",  en: "资本结构" },
    { href: "part3-payout-policy.html",  label: "Part 3",     en: "分配政策" },
    { href: "part4-capital-budgeting.html", label: "Part 4", en: "资本预算" },
    { href: "part5-governance-ma.html",  label: "Part 5",     en: "治理与并购" },
    { href: "part6-practice-exams.html", label: "Part 6",    en: "习题真题" }
  ];

  /* ---------- MathJax: primary CDN, then alternate CDNs ---------- */
  window.MathJax = {
    tex: {
      inlineMath: [["\\(", "\\)"], ["$", "$"]],
      displayMath: [["\\[", "\\]"], ["$$", "$$"]],
      processEscapes: true
    },
    svg: { fontCache: "global" },
    options: { skipHtmlTags: ["script", "noscript", "style", "textarea", "pre", "code"] }
  };

  function mjStarted() {
    var mj = window.MathJax;
    return !!(mj && mj.startup && mj.startup.document && mj.startup.document.state() >= 1);
  }
  var MJ_CDNS = [
    "https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-svg.js",
    "https://unpkg.com/mathjax@3.2.2/es5/tex-mml-svg.js",
    "https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-mml-svg.min.js"
  ];
  function loadMathJax(i) {
    i = i || 0;
    if (i >= MJ_CDNS.length) return; // all CDNs unreachable: leave raw TeX visible
    var s = document.createElement("script");
    s.src = MJ_CDNS[i];
    s.async = true;
    s.onerror = function () { loadMathJax(i + 1); };
    document.head.appendChild(s);
    // if this CDN is blocked/slow, try the next one after 5s
    setTimeout(function () {
      if (!mjStarted()) loadMathJax(i + 1);
    }, 5000 * (i + 1));
  }
  loadMathJax(0);

  /* ---------- boot after DOM ready ---------- */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  function boot() {
    var page = document.body.getAttribute("data-page") || "";
    var here = location.pathname.split("/").pop() || "index.html";

    /* top bar */
    var tb = document.getElementById("site-topbar");
    if (tb) {
      var inner = document.createElement("div");
      inner.className = "topbar-inner";
      var brand = document.createElement("a");
      brand.className = "brand";
      brand.href = "index.html";
      brand.innerHTML = "FIN 4210 <em>·</em> 公司金融学习站";
      inner.appendChild(brand);
      var nav = document.createElement("nav");
      nav.className = "nav";
      PARTS.forEach(function (p) {
        var a = document.createElement("a");
        a.href = p.href;
        a.textContent = p.label + " " + p.en;
        if (p.href === here || (p.href === "index.html" && here === "")) a.className = "active";
        nav.appendChild(a);
      });
      inner.appendChild(nav);
      tb.appendChild(inner);
    }

    /* TOC from headings */
    var tocEl = document.getElementById("site-toc");
    if (tocEl) {
      var heads = document.querySelectorAll("main h2.sec, main h3.sub");
      if (heads.length) {
        var title = document.createElement("p");
        title.className = "toc-title";
        title.textContent = "本页目录";
        tocEl.appendChild(title);
        heads.forEach(function (h) {
          if (!h.id) h.id = "s-" + Math.random().toString(36).slice(2, 8);
          var a = document.createElement("a");
          a.href = "#" + h.id;
          a.textContent = h.getAttribute("data-short") || h.textContent.trim();
          a.className = h.tagName === "H2" ? "lvl-2" : "lvl-3";
          a.setAttribute("data-target", h.id);
          tocEl.appendChild(a);
        });
      }
    }

    /* scroll-spy */
    var tocLinks = tocEl ? Array.prototype.slice.call(tocEl.querySelectorAll("a[data-target]")) : [];
    var spy = function () {
      var pos = window.scrollY + 90;
      var current = null;
      tocLinks.forEach(function (a) {
        var el = document.getElementById(a.getAttribute("data-target"));
        if (el && el.offsetTop <= pos) current = a;
      });
      tocLinks.forEach(function (a) { a.classList.toggle("active", a === current); });
    };

    /* reading progress bar */
    var bar = document.getElementById("readbar");
    var onScroll = function () {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      if (bar) bar.style.width = pct + "%";
      var btn = document.getElementById("toTop");
      if (btn) btn.classList.toggle("show", window.scrollY > 600);
      spy();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    /* back to top */
    var btn = document.getElementById("toTop");
    if (btn) btn.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });

    /* mark active nav link by position for single-page sections */
    if (page) { document.body.setAttribute("data-ready", "1"); }
  }
})();
