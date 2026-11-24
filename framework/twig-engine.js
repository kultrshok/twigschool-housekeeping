/* Twig School engine — offline training framework (kultrshok x Twig).
   Runs from file:// in Chrome or Firefox. No network, no build step at runtime.
   A course page loads: twig-theme.css, twig-engine.js, twig-widgets.js, course.js, then calls TwigSchool.boot().
   Progress lives in localStorage under "twigschool:<courseId>"; use Export/Import to back it up. */
(function () {
  "use strict";
  var BASE = (document.currentScript && document.currentScript.src || "").replace(/[^/]*$/, "");
  var ASSET = function (f) { return BASE + "assets/" + f; };
  // v2.3: brass steampunk icon for buttons (pre-tinted PNG, so it works off disk)
  var ICO = function (n) { return '<img class="ico" src="' + ASSET("icons/brass/" + n + ".png") + '" alt="" aria-hidden="true">'; };
  var TS = window.TwigSchool = { widgets: {}, asset: ASSET };

  /* ---------- storage ---------- */
  var KEY, state;
  function load() {
    try { state = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { state = {}; }
    state.done = state.done || {}; state.checks = state.checks || {}; state.notes = state.notes || {};
    state.quiz = state.quiz || {}; state.logs = state.logs || {}; state.w = state.w || {};
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { toast("Couldn't save progress: browser storage is blocked. Use Export to keep a copy."); } }
  TS.store = {
    get: function (k, d) { return k in state.w ? state.w[k] : d; },
    set: function (k, v) { state.w[k] = v; save(); }
  };

  /* ---------- helpers ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function el(tag, attrs, html) { var e = document.createElement(tag); for (var k in attrs || {}) e.setAttribute(k, attrs[k]); if (html != null) e.innerHTML = html; return e; }
  TS.el = el; TS.esc = esc;

  function inline(s) {
    var codes = [];
    s = s.replace(/`([^`]+)`/g, function (m, c) { codes.push(c); return "\u0000" + (codes.length - 1) + "\u0000"; });
    s = esc(s);
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (m, t, u) {
      var ext = /^https?:/.test(u);
      return '<a href="' + u + '"' + (ext ? ' class="ext" target="_blank" rel="noopener" title="Needs internet"' : "") + ">" + t + "</a>";
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<i>$2</i>");
    s = s.replace(/⚠/g, '<span class="hz" title="Safety item">⚠</span>');
    s = s.replace(/\u0000(\d+)\u0000/g, function (m, i) { return "<code>" + esc(codes[i]) + "</code>"; });
    return s;
  }

  /* ---------- markdown subset ---------- */
  // Supports: # headings, paragraphs, - / 1. lists (one nested level), - [ ] tasks, | tables |,
  // > quotes, Twig quotes (*"..."* — Twig), fenced ```quiz ```widget ```log ```tip ```lab ```lvl ```stop ```yield ```code blocks.
  // A paragraph that starts with ⚠ is shown as a YIELD sign callout; ⚠ anywhere gets the safety style.
  function render(md, pageId) {
    var lines = md.replace(/\r/g, "").split("\n"), out = [], i = 0, taskN = 0, blockN = 0;
    function flushPara(buf) { if (buf.length) out.push(para(buf.join(" "))); buf.length = 0; }
    function para(t) {
      var m = t.match(/^\*"([\s\S]+)"\*\s*—\s*Twig$/);
      if (m) return '<div class="twig-says"><img src="' + ASSET("twig_bob.webp") + '" alt="Twig"><div class="bubble"><b class="who">Twig says</b>“' + inline(m[1]) + '”</div></div>';
      if (/^(\*\*)?(\d+\.\s*)?⚠/.test(t)) return signCallout("yield", "<p>" + inline(t) + "</p>");   // safety paragraph: Twig holds up YIELD
      return "<p>" + inline(t) + "</p>";
    }
    var buf = [];
    while (i < lines.length) {
      var L = lines[i];
      var fence = L.match(/^```(\w+)?\s*(.*)$/);
      if (fence) {
        flushPara(buf); var kind = fence[1] || "code", arg = fence[2], body = []; i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) body.push(lines[i++]);
        i++; blockN++;
        out.push(block(kind, arg, body, pageId + ":" + blockN));
        continue;
      }
      var h = L.match(/^(#{1,4})\s+(.*)$/);
      if (h) { flushPara(buf); var n = Math.min(h[1].length + 1, 5); out.push("<h" + n + ">" + inline(h[2]) + "</h" + n + ">"); i++; continue; }
      if (/^\s*\|/.test(L)) {
        flushPara(buf); var rows = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(lines[i++]);
        out.push(table(rows)); continue;
      }
      if (/^\s*([-*]|\d+\.)\s+/.test(L)) {
        flushPara(buf); var items = [];
        while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) items.push(lines[i++]);
        var ordered = /^\s*\d+\./.test(items[0]), html = ordered ? "<ol>" : "<ul>", nest = false;
        items.forEach(function (it) {
          var ind = it.match(/^\s*/)[0].length >= 2, txt = it.replace(/^\s*([-*]|\d+\.)\s+/, "");
          if (ind && !nest) { html += "<ul>"; nest = true; } else if (!ind && nest) { html += "</ul>"; nest = false; }
          var t = txt.match(/^\[( |x)\]\s+(.*)$/i);
          if (t) {
            var id = pageId + "#t" + (taskN++), on = state.checks[id] != null ? state.checks[id] : t[1] !== " ";
            html += '<li class="task' + (on ? " checked" : "") + '"><label><input type="checkbox" data-task="' + id + '"' + (on ? " checked" : "") + "><span>" + inline(t[2]) + "</span></label></li>";
          } else html += "<li>" + inline(txt) + "</li>";
        });
        if (nest) html += "</ul>";
        out.push(html + (ordered ? "</ol>" : "</ul>")); continue;
      }
      if (/^>\s?/.test(L)) {
        flushPara(buf); var q = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ""));
        out.push('<div class="callout"><img src="' + ASSET("sign_tip.webp") + '" alt="Tip"><div>' + inline(q.join(" ")) + "</div></div>"); continue;
      }
      if (!L.trim()) { flushPara(buf); i++; continue; }
      buf.push(L.trim()); i++;
    }
    flushPara(buf);
    return out.join("\n");
  }
  TS.render = render; TS.inline = inline;

  function cells(r) { return r.trim().replace(/^\||\|$/g, "").split("|").map(function (c) { return c.trim(); }); }
  function table(rows) {
    var head = cells(rows[0]), body = rows.slice(2).map(cells);
    return "<table><thead><tr>" + head.map(function (c) { return "<th>" + inline(c) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      body.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + inline(c) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table>";
  }

  /* ---------- Twig's STOP / YIELD signs (safety) ---------- */
  // ```stop Title   = real hazard, act on it.   ```yield Title = caution, ease off.   A paragraph starting with ⚠ gets YIELD.
  function signCallout(kind, html, title) {
    var label = title && title.trim() ? esc(title.trim()) : (kind === "stop" ? "Stop: safety" : "Yield: careful here");
    return '<div class="callout sign ' + kind + '"><img src="' + ASSET("sign_" + kind + ".webp") + '" alt="Twig holding a ' + kind.toUpperCase() + ' sign">' +
      '<div><b class="sign-t">' + label + "</b>" + html + "</div></div>";
  }

  /* ---------- special blocks ---------- */
  function block(kind, arg, body, id) {
    if (kind === "quiz") return quizHTML(body, id, arg);
    if (kind === "widget") return '<div class="box widget" data-widget="' + esc(arg.trim()) + '" data-id="' + id + '"></div>';
    if (kind === "log") return logHTML(arg, id);
    if (kind === "stop" || kind === "yield") return signCallout(kind, render(body.join("\n"), id), arg);
    if (kind === "tip" || kind === "lab" || kind === "lvl") {
      return '<div class="callout"><img src="' + ASSET("sign_" + kind + ".webp") + '" alt="' + kind + '"><div>' + render(body.join("\n"), id) + "</div></div>";
    }
    return "<pre><code>" + esc(body.join("\n")) + "</code></pre>";
  }

  // Quiz syntax:  Q: question   then options "- wrong" / "* right"   then optional "> why"
  function parseQuiz(body) {
    var qs = [], q = null;
    body.forEach(function (l) {
      var t = l.trim(); if (!t) return;
      if (/^Q:/.test(t)) { q = { q: t.slice(2).trim(), opts: [], why: "" }; qs.push(q); }
      else if (q && /^[-*]\s/.test(t)) q.opts.push({ t: t.slice(2), ok: t[0] === "*" });
      else if (q && /^>/.test(t)) q.why += t.replace(/^>\s?/, "") + " ";
    });
    return qs;
  }
  function quizHTML(body, id, title) {
    var qs = parseQuiz(body), best = state.quiz[id];
    var h = '<div class="box quiz" data-quiz="' + id + '"><div class="quiz-head"><img src="' + ASSET("sign_quiz.webp") + '" alt="Quiz"><h4>' + esc(title || "Pop quiz!") + "</h4>" +
      (best != null ? '<span class="score">Best: ' + best + "/" + qs.length + "</span>" : "") + "</div>";
    qs.forEach(function (q, qi) {
      h += '<div class="q" data-n="' + qi + '"><p>' + (qi + 1) + ". " + inline(q.q) + "</p>";
      q.opts.forEach(function (o, oi) {
        h += '<label data-ok="' + (o.ok ? 1 : 0) + '"><input type="radio" name="' + id + "_" + qi + '" value="' + oi + '"> ' + inline(o.t) + "</label>";
      });
      if (q.why) h += '<div class="why">' + inline(q.why.trim()) + "</div>";
      h += "</div>";
    });
    return h + '<button class="primary" data-grade>Check answers</button> <button data-retry>Reset</button><span class="score" data-out></span></div>';
  }
  var CHEERS = ["Great Scott, a perfect run! Hang that on the fridge, apprentice.", "Flawless! The gears are meshing beautifully.", "Every one! Somebody fetch this genius a wrench of honor."];
  var GOOD = ["Not bad! A couple of loose bolts. Tighten 'em and run it again.", "Close! The machine runs, but it's making a funny noise. Review and retry."];
  var MEH = ["#@$%! The contraption's smoking. Back to the lesson, then try again. Heh.", "Rough run, apprentice. That's tuition. Re-read and re-run."];
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function gradeQuiz(box) {
    var qsEls = box.querySelectorAll(".q"), right = 0;
    qsEls.forEach(function (q) {
      q.querySelectorAll("label").forEach(function (l) {
        l.classList.remove("right", "wrong");
        var inp = l.querySelector("input");
        if (l.dataset.ok === "1") l.classList.add("right");
        else if (inp.checked) l.classList.add("wrong");
        if (inp.checked && l.dataset.ok === "1") right++;
      });
    });
    box.classList.add("graded");
    var id = box.dataset.quiz, n = qsEls.length;
    state.quiz[id] = Math.max(state.quiz[id] || 0, right); save();
    box.querySelector("[data-out]").textContent = right + " / " + n;
    var pct = right / n;
    toast(pct === 1 ? pick(CHEERS) : pct >= 0.8 ? pick(GOOD) : pick(MEH), pct >= 0.8 ? "sign_lvl.webp" : "twig.webp");
    if (pct === 1) flash(pick(["NAILED IT!", "GREAT SCOTT!", "100%!", "SMARTY BEARD"]));
  }

  // Editable log table:  ```log Week|Topic|Fix
  function logHTML(arg, id) {
    var head = arg.split("|").map(function (s) { return s.trim(); }), rows = state.logs[id] || [new Array(head.length).fill("")];
    var h = '<table class="log" data-log="' + id + '"><thead><tr>' + head.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "<th></th></tr></thead><tbody>";
    rows.forEach(function (r) { h += "<tr>" + r.map(function (c) { return '<td contenteditable="true">' + esc(c) + "</td>"; }).join("") + '<td><button data-delrow title="Remove row">✕</button></td></tr>'; });
    return h + '</tbody></table><button data-addrow="' + id + '">+ Add row</button>';
  }
  function saveLog(t) {
    var rows = [].map.call(t.tBodies[0].rows, function (r) { return [].slice.call(r.cells, 0, -1).map(function (c) { return c.textContent; }); });
    state.logs[t.dataset.log] = rows; save();
  }

  /* ---------- toast ---------- */
  var toastEl, toastT;
  function toast(msg, img) {
    if (!toastEl) { toastEl = el("div", { class: "toast" }); document.body.appendChild(toastEl); }
    toastEl.innerHTML = '<img src="' + ASSET(img || "twig.webp") + '" alt=""><div>' + esc(msg) + "</div>";
    toastEl.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove("show"); }, 4200);
  }
  TS.toast = toast;

  /* ---------- flash card: Twig pops up and slams a card (big moments only) ---------- */
  var flashBusy = false;
  function flash(text) {
    if (flashBusy) return; flashBusy = true;
    var f = el("div", { class: "flash", "aria-hidden": "true" },
      '<div class="burst"></div><div class="tw"><img src="' + ASSET("flash_blank.webp") + '" alt=""><div class="txt">' + esc(text) + "</div></div>");
    document.body.appendChild(f);
    requestAnimationFrame(function () { f.classList.add("go"); });
    setTimeout(function () { f.remove(); flashBusy = false; }, 3000);
  }
  TS.flash = flash;

  /* ---------- app ---------- */
  var C, pages, nav, page, cur = 0;
  function tracked() { return pages.filter(function (p) { return p.track; }); }
  TS.progress = function () { var t = tracked(); return { done: t.filter(function (p) { return state.done[p.id]; }).length, total: t.length, pages: t, isDone: function (id) { return !!state.done[id]; } }; };
  function updateProg() {
    var p = TS.progress(), pct = p.total ? Math.round(100 * p.done / p.total) : 0;
    document.querySelector(".ts-prog>div").style.width = pct + "%";
    document.querySelector(".ts-progtxt").textContent = pct + "%";
  }

  function buildNav() {
    var h = '<input type="search" placeholder="Search the workshop…" id="ts-q">', g = null;
    pages.forEach(function (p, i) {
      if (p.group !== g) { g = p.group; if (g) h += '<div class="grp">' + esc(g) + "</div>"; }
      h += '<a href="#' + p.id + '" data-i="' + i + '" class="' + (p.track ? "" : "ref ") + (state.done[p.id] ? "done" : "") + '"><span class="dot"></span>' + esc(p.title) + "</a>";
    });
    nav.innerHTML = h;
    nav.querySelector("#ts-q").addEventListener("input", function () {
      var q = this.value.toLowerCase();
      nav.querySelectorAll("a").forEach(function (a) { var p = pages[a.dataset.i]; a.style.display = !q || (p.title + " " + p.md).toLowerCase().indexOf(q) >= 0 ? "" : "none"; });
    });
  }

  function show(i) {
    cur = Math.max(0, Math.min(pages.length - 1, i));
    var p = pages[cur];
    nav.querySelectorAll("a").forEach(function (a) { a.classList.toggle("cur", +a.dataset.i === cur); a.classList.toggle("done", !!state.done[pages[a.dataset.i].id]); });
    var prev = pages[cur - 1], next = pages[cur + 1];
    page.innerHTML = "<article>" + (p.group ? '<div style="color:var(--brass);font-size:.8rem;text-transform:uppercase;letter-spacing:.08em">' + esc(p.group) + "</div>" : "") +
      "<h1>" + inline(p.title) + "</h1>" + render(p.md, p.id) +
      '<div class="box"><h4>Shop notes</h4><textarea class="notes" placeholder="Scribble here. Saved automatically on this computer.">' + esc(state.notes[p.id] || "") + "</textarea></div>" +
      '<div class="ts-foot">' + (prev ? '<button data-go="' + (cur - 1) + '">← ' + esc(prev.title) + "</button>" : "<span></span>") +
      '<span class="mid">' + (p.track ? '<button class="primary" data-done>' + (state.done[p.id] ? "✓ Done (undo)" : "Mark complete") + "</button>" : "") + "</span>" +
      (next ? '<button data-go="' + (cur + 1) + '">' + esc(next.title) + " →</button>" : "<span></span>") + "</div></article>";
    page.scrollTop = 0;
    page.querySelectorAll(".widget").forEach(function (w) {
      var fn = TS.widgets[w.dataset.widget];
      if (fn) try { fn(w, w.dataset.id); } catch (e) { w.textContent = "Widget error: " + e.message; }
      else w.textContent = "Unknown widget: " + w.dataset.widget;
    });
    document.title = p.title + " · " + C.title;
    if (location.hash.slice(1) !== p.id) history.replaceState(null, "", "#" + p.id);
    state.last = p.id; save();
  }
  TS.go = function (id) { var i = pages.findIndex(function (p) { return p.id === id; }); if (i >= 0) show(i); };

  function events() {
    page.addEventListener("click", function (e) {
      var t = e.target;
      if (t.dataset.go) show(+t.dataset.go);
      else if (t.hasAttribute("data-done")) {
        var p = pages[cur]; state.done[p.id] = !state.done[p.id]; save(); updateProg();
        if (state.done[p.id]) {
          var pr = TS.progress();
          toast(pr.done === pr.total ? "Great Scott, you finished the whole " + (C.kind || "course") + "! Diploma's in the mail. Heh." : p.title + " is in the books! Onward, apprentice.", "sign_lvl.webp");
          flash(pr.done === pr.total ? "GREAT SCOTT! ALL DONE!" : "LEVEL UP!");
        }
        show(cur);
      }
      else if (t.hasAttribute("data-grade")) gradeQuiz(t.closest(".quiz"));
      else if (t.hasAttribute("data-retry")) { var b = t.closest(".quiz"); b.classList.remove("graded"); b.querySelectorAll("input").forEach(function (x) { x.checked = false; }); b.querySelectorAll("label").forEach(function (l) { l.classList.remove("right", "wrong"); }); b.querySelector("[data-out]").textContent = ""; }
      else if (t.dataset.addrow) { var tb = document.querySelector('table[data-log="' + t.dataset.addrow + '"]'); var r = tb.tBodies[0].insertRow(); for (var k = 0; k < tb.tHead.rows[0].cells.length - 1; k++) { var c = r.insertCell(); c.contentEditable = "true"; } r.insertCell().innerHTML = '<button data-delrow title="Remove row">✕</button>'; saveLog(tb); }
      else if (t.hasAttribute("data-delrow")) { var tbl = t.closest("table"); t.closest("tr").remove(); saveLog(tbl); }
    });
    page.addEventListener("change", function (e) {
      var t = e.target;
      if (t.dataset.task) { state.checks[t.dataset.task] = t.checked; t.closest("li").classList.toggle("checked", t.checked); save(); }
    });
    page.addEventListener("input", function (e) {
      if (e.target.classList.contains("notes")) { state.notes[pages[cur].id] = e.target.value; save(); }
      var lg = e.target.closest && e.target.closest("table.log"); if (lg) saveLog(lg);
    });
    window.addEventListener("hashchange", function () { TS.go(location.hash.slice(1)); });
    document.addEventListener("keydown", function (e) {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable) return;
      if (e.key === "ArrowRight") show(cur + 1); if (e.key === "ArrowLeft") show(cur - 1);
    });
  }

  function exportProgress() {
    var blob = new Blob([JSON.stringify({ course: C.id, saved: new Date().toISOString().slice(0, 10), state: state }, null, 1)], { type: "application/json" });
    var a = el("a", { href: URL.createObjectURL(blob), download: C.id + "-progress.json" }); document.body.appendChild(a); a.click(); a.remove();
  }
  function importProgress() {
    var inp = el("input", { type: "file", accept: ".json" });
    inp.onchange = function () {
      var r = new FileReader();
      r.onload = function () {
        try { var d = JSON.parse(r.result); if (d.course !== C.id) throw new Error("That file is for " + d.course); state = d.state; save(); load(); buildNav(); updateProg(); show(cur); toast("Progress restored. Right where you left it!"); }
        catch (e) { toast("Import failed: " + e.message); }
      };
      r.readAsText(inp.files[0]);
    };
    inp.click();
  }

  TS.boot = function (course) {
    C = course || window.TWIG_COURSE; pages = C.pages; KEY = "twigschool:" + C.id; load();
    var theme = 0; try { theme = parseInt(localStorage.getItem("twigschool:theme"), 10) || 0; } catch (e) {}
    if (theme < 0 || theme > 2) theme = 0;
    function applyTheme() { document.body.classList.toggle("parchment", theme === 1); document.body.classList.toggle("slate", theme === 2); }
    document.body.innerHTML =
      '<header class="ts-top"><button id="ts-menu" title="Weeks and pages" aria-label="Weeks and pages">' + ICO("clock-gear") + '<span class="lbl">Weeks</span></button><img src="' + ASSET("twig.webp") + '" alt="Twig"><h1>' + esc(C.title) + "<small>" + esc(C.subtitle || "") + "</small></h1>" +
      '<div class="ts-prog" title="Weeks and checkpoints completed"><div></div></div><span class="ts-progtxt"></span>' +
      '<button id="ts-theme" title="Cycle theme: workshop / parchment / slate" aria-label="Theme">' + ICO("goggles") + '</button>' +
      '<button id="ts-exp" title="Save progress to a file" aria-label="Export progress">' + ICO("sky-ship") + '<span class="lbl">Export</span></button>' +
      '<button id="ts-imp" title="Load progress from a file" aria-label="Import progress">' + ICO("airship") + '<span class="lbl">Import</span></button>' +
      (C.home ? '<a class="btn" href="' + C.home + '" title="Back to Twig School" aria-label="Back to Twig School">' + ICO("top-hat") + '</a>' : "") + "</header>" +
      '<div class="ts-main"><nav class="ts-nav"></nav><main class="ts-page"></main></div>';
    applyTheme();
    nav = document.querySelector(".ts-nav"); page = document.querySelector(".ts-page");
    document.getElementById("ts-theme").onclick = function () { theme = (theme + 1) % 3; applyTheme(); try { localStorage.setItem("twigschool:theme", String(theme)); } catch (e) {} };
    document.getElementById("ts-exp").onclick = exportProgress;
    document.getElementById("ts-imp").onclick = importProgress;
    document.getElementById("ts-menu").onclick = function () { nav.classList.toggle("open"); };
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) nav.classList.remove("open"); });
    buildNav(); events(); updateProg();
    var start = location.hash.slice(1) || state.last;
    var idx = pages.findIndex(function (p) { return p.id === start; });
    show(idx >= 0 ? idx : 0);
  };
})();
