/* Twig School widgets — interactive tools dropped into lessons with  ```widget <name>
   Add your own: TwigSchool.widgets.myname = function (box, id) { box.innerHTML = "..."; }  */
(function () {
  "use strict";
  var TS = window.TwigSchool, W = TS.widgets, esc = TS.esc;
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : null; }
  function fmt(n, unit) {
    if (n == null || !isFinite(n)) return "—";
    var a = Math.abs(n), p = [[1e9, "G"], [1e6, "M"], [1e3, "k"], [1, ""], [1e-3, "m"], [1e-6, "µ"], [1e-9, "n"], [1e-12, "p"]];
    for (var i = 0; i < p.length; i++) if (a >= p[i][0] || i === p.length - 1) return +(n / p[i][0]).toPrecision(4) + " " + p[i][1] + unit;
  }
  function form(box, title, fields, calc, note) {
    box.innerHTML = "<h4>" + esc(title) + '</h4><div class="w-row">' + fields.map(function (f) {
      return "<label>" + esc(f[1]) + '<input data-k="' + f[0] + '" type="text" inputmode="decimal" value="' + (f[2] == null ? "" : f[2]) + '" placeholder="' + (f[3] || "") + '"></label>';
    }).join("") + '</div><div class="w-out"></div>' + (note ? '<div style="font-size:.85rem;color:var(--muted)">' + note + "</div>" : "");
    function run() { var v = {}; box.querySelectorAll("input").forEach(function (i) { v[i.dataset.k] = num(i.value); }); box.querySelector(".w-out").textContent = calc(v); }
    box.addEventListener("input", run); run();
  }

  /* ===== General ===== */
  W.progress = function (box) {
    var p = TS.progress();
    box.innerHTML = "<h4>Your progress: " + p.done + " of " + p.total + " done</h4>" +
      '<div class="ts-prog" style="width:100%;height:18px"><div style="width:' + (p.total ? 100 * p.done / p.total : 0) + '%"></div></div><ul style="columns:2;margin-top:12px;list-style:none;padding-left:0">' +
      p.pages.map(function (pg) { return '<li><a href="#' + pg.id + '">' + (p.isDone(pg.id) ? "✓ " : "○ ") + esc(pg.title) + "</a></li>"; }).join("") + "</ul>" +
      '<div style="font-size:.85rem;color:var(--muted)">Tick pages off with “Mark complete” at the bottom of each week. Use Export (top bar) to back up your progress.</div>';
  };

  /* ===== Math ===== */
  function compile(expr) {
    var s = expr.toLowerCase().replace(/\s+/g, "").replace(/\^/g, "**").replace(/ln\(/g, "log(").replace(/log10\(/g, "L10(");
    s = s.replace(/(\d)(x|\()/g, "$1*$2").replace(/\)(x|\(|\d)/g, ")*$1").replace(/x\(/g, "x*(");
    var ok = s.replace(/sin|cos|tan|asin|acos|atan|sqrt|abs|log|exp|L10|pi|e|x|[\d.+\-*/()]/g, "");
    if (ok) throw new Error("I don't know: " + ok);
    s = s.replace(/\b(asin|acos|atan|sin|cos|tan|sqrt|abs|log|exp)\(/g, "Math.$1(").replace(/L10\(/g, "Math.log10(").replace(/\bpi\b/g, "Math.PI").replace(/\be\b/g, "Math.E");
    return new Function("x", "return " + s + ";");
  }
  W.plotter = function (box, id) {
    var saved = TS.store.get(id, { f: "x^2 - 2x - 3", g: "", xmin: -6, xmax: 6 });
    box.innerHTML = '<h4>Twig\'s Graph-o-Matic (offline Desmos stand-in)</h4><div class="w-row">' +
      '<label>f(x) =<input data-k="f" size="22" value="' + esc(saved.f) + '"></label><label>g(x) = (optional)<input data-k="g" size="18" value="' + esc(saved.g) + '"></label>' +
      '<label>x min<input data-k="xmin" size="5" value="' + saved.xmin + '"></label><label>x max<input data-k="xmax" size="5" value="' + saved.xmax + '"></label></div>' +
      '<canvas class="plot"></canvas><div class="w-out"></div><div style="font-size:.85rem;color:var(--muted)">Use x, ^, sin cos tan sqrt abs ln log10 exp pi e. Example: 2sin(x) + x/3</div>';
    var cv = box.querySelector("canvas"), out = box.querySelector(".w-out");
    function draw() {
      var v = {}; box.querySelectorAll("input").forEach(function (i) { v[i.dataset.k] = i.value; });
      var xmin = num(v.xmin), xmax = num(v.xmax); if (xmin == null || xmax == null || xmax <= xmin) return;
      TS.store.set(id, { f: v.f, g: v.g, xmin: xmin, xmax: xmax });
      var fs = [], msg = "";
      [[v.f, "#5aa52a"], [v.g, "#e6bf63"]].forEach(function (p) { if (p[0].trim()) try { fs.push([compile(p[0]), p[1]]); } catch (e) { msg += e.message + " "; } });
      var W_ = cv.width = cv.clientWidth * devicePixelRatio, H = cv.height = cv.clientHeight * devicePixelRatio, c = cv.getContext("2d");
      var ys = []; fs.forEach(function (f) { for (var k = 0; k <= 200; k++) { var y = f[0](xmin + (xmax - xmin) * k / 200); if (isFinite(y)) ys.push(y); } });
      ys.sort(function (a, b) { return a - b; });
      var ymin = ys.length ? ys[Math.floor(ys.length * .02)] : -5, ymax = ys.length ? ys[Math.ceil(ys.length * .98) - 1] : 5;
      if (ymax - ymin < 1e-9) { ymin -= 1; ymax += 1; } var pad = (ymax - ymin) * .1; ymin -= pad; ymax += pad;
      if (ymin > 0) ymin = Math.min(ymin, -pad); if (ymax < 0) ymax = Math.max(ymax, pad);
      var X = function (x) { return (x - xmin) / (xmax - xmin) * W_; }, Y = function (y) { return H - (y - ymin) / (ymax - ymin) * H; };
      var grid = getComputedStyle(document.body).getPropertyValue("--line"), ink = getComputedStyle(document.body).getPropertyValue("--muted");
      c.lineWidth = 1; c.strokeStyle = grid; c.fillStyle = ink; c.font = 11 * devicePixelRatio + "px sans-serif";
      var step = Math.pow(10, Math.floor(Math.log10((xmax - xmin) / 2))), ystep = Math.pow(10, Math.floor(Math.log10((ymax - ymin) / 2)));
      for (var gx = Math.ceil(xmin / step) * step; gx <= xmax; gx += step) { c.beginPath(); c.moveTo(X(gx), 0); c.lineTo(X(gx), H); c.stroke(); c.fillText(+gx.toPrecision(3), X(gx) + 2, Y(0) - 3); }
      for (var gy = Math.ceil(ymin / ystep) * ystep; gy <= ymax; gy += ystep) { c.beginPath(); c.moveTo(0, Y(gy)); c.lineTo(W_, Y(gy)); c.stroke(); c.fillText(+gy.toPrecision(3), X(0) + 3, Y(gy) - 2); }
      c.strokeStyle = ink; c.lineWidth = 2; c.beginPath(); c.moveTo(X(0), 0); c.lineTo(X(0), H); c.moveTo(0, Y(0)); c.lineTo(W_, Y(0)); c.stroke();
      fs.forEach(function (f) {
        c.strokeStyle = f[1]; c.lineWidth = 2.5 * devicePixelRatio; c.beginPath(); var pen = false;
        for (var px = 0; px <= W_; px++) { var x = xmin + (xmax - xmin) * px / W_, y = f[0](x); if (!isFinite(y) || Math.abs(Y(y)) > H * 4) { pen = false; continue; } pen ? c.lineTo(px, Y(y)) : c.moveTo(px, Y(y)); pen = true; }
        c.stroke();
      });
      out.textContent = msg || "Plotting x from " + xmin + " to " + xmax + ", y auto-scaled.";
    }
    box.addEventListener("input", draw); setTimeout(draw, 0);
  };
  W.quadratic = function (box) {
    form(box, "Quadratic solver: ax² + bx + c = 0", [["a", "a", 1], ["b", "b", -2], ["c", "c", -3]], function (v) {
      if (v.a == null || v.b == null || v.c == null) return "Fill in a, b and c.";
      if (v.a === 0) return v.b ? "Not quadratic. Linear root: x = " + (-v.c / v.b) : "No x to solve for.";
      var d = v.b * v.b - 4 * v.a * v.c, h = -v.b / (2 * v.a), r = function (n) { return +n.toFixed(6); };
      var s = "Discriminant b² − 4ac = " + r(d) + "\nVertex: (" + r(h) + ", " + r(v.a * h * h + v.b * h + v.c) + ")\n";
      if (d > 0) return s + "Two real roots: x = " + r(h + Math.sqrt(d) / (2 * v.a)) + " and x = " + r(h - Math.sqrt(d) / (2 * v.a));
      if (d === 0) return s + "One repeated root: x = " + r(h);
      return s + "Complex roots: x = " + r(h) + " ± " + r(Math.sqrt(-d) / Math.abs(2 * v.a)) + "i";
    }, "Solve it by hand first, then check here. Twig is watching.");
  };
  W.entropy = function (box) {
    form(box, "Password entropy + brute-force time", [["cs", "Charset size", 62, "26/52/62/94"], ["len", "Length", 12], ["rate", "Guesses per second", 1e10]], function (v) {
      if (!v.cs || !v.len || !v.rate) return "Fill in all three.";
      var bits = v.len * Math.log2(v.cs), secs = Math.pow(2, bits) / 2 / v.rate;
      var units = [[31557600e9, "billion years"], [31557600e6, "million years"], [31557600, "years"], [86400, "days"], [3600, "hours"], [60, "minutes"], [1, "seconds"]];
      for (var i = 0; i < units.length; i++) if (secs >= units[i][0] || i === units.length - 1) break;
      return "Entropy = " + v.len + " × log₂(" + v.cs + ") = " + bits.toFixed(1) + " bits\nKeyspace = 2^" + bits.toFixed(1) + "\nAverage time to crack (half the keyspace) ≈ " + +(secs / units[i][0]).toPrecision(3) + " " + units[i][1];
    }, "Charset sizes: lowercase 26, mixed case 52, + digits 62, + symbols 94. Assumes truly random passwords; human-picked ones are much weaker.");
  };
  W.derivative = function (box) {
    box.innerHTML = '<h4>Numerical derivative explorer</h4><div class="w-row"><label>f(x) =<input data-k="f" value="sin(x)"></label><label>at x =<input data-k="x" value="1"></label></div><div class="w-out"></div>';
    function run() {
      var o = box.querySelector(".w-out"), f, x = num(box.querySelector('[data-k="x"]').value);
      try { f = compile(box.querySelector('[data-k="f"]').value); } catch (e) { o.textContent = e.message; return; }
      var s = "   h          [f(x+h) − f(x)] / h\n";
      for (var k = 1; k <= 15; k += 2) { var h = Math.pow(10, -k); s += ("1e-" + k).padEnd(11) + (f(x + h) - f(x)) / h + "\n"; }
      o.textContent = s + "\nWatch it settle on the true slope, then go haywire at tiny h from floating-point round-off.";
    }
    box.addEventListener("input", run); run();
  };

  /* ===== Electronics ===== */
  var COL = [["black", "#111"], ["brown", "#7a4a1d"], ["red", "#d22"], ["orange", "#f80"], ["yellow", "#ee2"], ["green", "#2a2"], ["blue", "#26f"], ["violet", "#a3d"], ["grey", "#999"], ["white", "#fff"], ["gold", "#d4af37"], ["silver", "#c0c0c0"]];
  var MULT = { black: 1, brown: 10, red: 100, orange: 1e3, yellow: 1e4, green: 1e5, blue: 1e6, violet: 1e7, gold: .1, silver: .01 };
  var TOL = { brown: "±1%", red: "±2%", green: "±0.5%", blue: "±0.25%", violet: "±0.1%", grey: "±0.05%", gold: "±5%", silver: "±10%" };
  function sel(k, list, v) { return '<label>' + k + '<select data-k="' + k + '">' + list.map(function (c) { return "<option" + (c === v ? " selected" : "") + ">" + c + "</option>"; }).join("") + "</select></label>"; }
  W.resistor = function (box, id) {
    var digits = COL.slice(0, 10).map(function (c) { return c[0]; }), s = TS.store.get(id, { n: 4, b: ["yellow", "violet", "red", "gold"] });
    function draw() {
      var b = s.b, n = s.n, hex = function (c) { return (COL.find(function (x) { return x[0] === c; }) || [0, "#000"])[1]; };
      var xs = n === 4 ? [70, 100, 130, 190] : [65, 90, 115, 140, 190];
      var svg = '<svg viewBox="0 0 260 70" style="width:100%;max-width:420px"><line x1="0" y1="35" x2="260" y2="35" stroke="#aaa" stroke-width="4"/>' +
        '<rect x="45" y="12" width="170" height="46" rx="20" fill="#d9c19a" stroke="#6b5232" stroke-width="2"/>' +
        b.map(function (c, i) { return '<rect x="' + xs[i] + '" y="12" width="12" height="46" fill="' + hex(c) + '" stroke="#333" stroke-width=".5"/>'; }).join("") + "</svg>";
      var nd = n - 2, val = 0; for (var i = 0; i < nd; i++) val = val * 10 + digits.indexOf(b[i]);
      var m = MULT[b[nd]], r = val * m;
      return svg + '<div class="w-out">' + (m == null ? "Multiplier band can't be " + b[nd] : fmt(r, "Ω") + "  " + (TOL[b[n - 1]] || "(no valid tolerance color)")) + "</div>";
    }
    function ui() {
      var nd = s.n - 2, h = "<h4>Resistor color code decoder</h4>" + '<div class="w-row"><label>Bands<select data-bands><option' + (s.n === 4 ? " selected" : "") + '>4</option><option' + (s.n === 5 ? " selected" : "") + ">5</option></select></label>";
      for (var i = 0; i < nd; i++) h += sel("Digit " + (i + 1), digits, s.b[i]);
      h += sel("Multiplier", Object.keys(MULT), s.b[nd]) + sel("Tolerance", Object.keys(TOL), s.b[nd + 1]) + "</div><div data-pic></div>";
      h += '<h4 style="margin-top:1em">Value → bands</h4><div class="w-row"><label>Resistance (e.g. 4.7k, 220, 1M)<input data-rev value="10k"></label></div><div class="w-out" data-revout></div>';
      box.innerHTML = h; box.querySelector("[data-pic]").innerHTML = draw(); rev();
    }
    function rev() {
      var t = box.querySelector("[data-rev]").value.trim().toLowerCase(), m = t.match(/^([\d.]+)\s*([kmg]?)/), o = box.querySelector("[data-revout]");
      if (!m) { o.textContent = "Type a value like 4.7k"; return; }
      var r = parseFloat(m[1]) * ({ "": 1, k: 1e3, m: 1e6, g: 1e9 })[m[2]], e = Math.floor(Math.log10(r)) - 1, sig = Math.round(r / Math.pow(10, e));
      if (sig >= 100) { sig = Math.round(sig / 10); e++; }
      var mc = Object.keys(MULT).find(function (k) { return Math.abs(MULT[k] - Math.pow(10, e)) < 1e-9 * Math.pow(10, e); });
      o.textContent = mc ? "4-band: " + digits[Math.floor(sig / 10)] + ", " + digits[sig % 10] + ", " + mc + ", gold (±5%)" + (sig * Math.pow(10, e) !== r ? "  [rounded to " + fmt(sig * Math.pow(10, e), "Ω") + "]" : "") : "Out of range for 4-band.";
    }
    box.addEventListener("change", function (e) {
      if (e.target.hasAttribute("data-bands")) { s.n = +e.target.value; s.b = s.n === 4 ? ["brown", "black", "red", "gold"] : ["brown", "black", "black", "brown", "brown"]; }
      else if (e.target.tagName === "SELECT") s.b = [].map.call(box.querySelectorAll("select[data-k]"), function (x) { return x.value; });
      TS.store.set(id, s); ui();
    });
    box.addEventListener("input", function (e) { if (e.target.hasAttribute("data-rev")) rev(); });
    ui();
  };
  W.ohms = function (box) {
    form(box, "Ohm's law solver: fill any two", [["V", "Voltage (V)", 5], ["I", "Current (A)", ""], ["R", "Resistance (Ω)", 220]], function (v) {
      var V = v.V, I = v.I, R = v.R, n = [V, I, R].filter(function (x) { return x != null; }).length;
      if (n < 2) return "Give me two of the three.";
      if (V != null && R != null) I = V / R; else if (V != null && I != null) R = V / I; else V = I * R;
      return "V = " + fmt(V, "V") + "   I = " + fmt(I, "A") + "   R = " + fmt(R, "Ω") + "\nP = V × I = " + fmt(V * I, "W") + (V * I > .25 ? "   ⚠ over a 1/4 W resistor's rating" : "");
    }, "If all three are filled, Twig uses V and R.");
  };
  W.led = function (box) {
    form(box, "LED current-limiting resistor", [["vs", "Supply (V)", 5], ["vf", "LED forward (V)", 2], ["ma", "Target current (mA)", 15]], function (v) {
      if (v.vs == null || v.vf == null || !v.ma) return "Fill in all three.";
      if (v.vf >= v.vs) return "Supply must be higher than the LED's forward voltage.";
      var r = (v.vs - v.vf) / (v.ma / 1000), E12 = [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2], d = Math.pow(10, Math.floor(Math.log10(r)));
      var std = (E12.find(function (x) { return x * d >= r - 1e-9; }) || 10) * d, p = Math.pow(v.vs - v.vf, 2) / std;
      return "Exact: " + fmt(r, "Ω") + "\nNext standard (E12) up: " + fmt(std, "Ω") + " → " + fmt((v.vs - v.vf) / std * 1000, "mA") + "\nResistor power: " + fmt(p, "W") + (p > .25 ? "  ⚠ use a 1/2 W part" : "  (1/4 W is fine)");
    }, "Typical Vf: red ~2.0 V, yellow/green ~2.1 V, blue/white ~3.0–3.2 V.");
  };
  W.rc = function (box) {
    form(box, "RC time constant", [["R", "R (Ω)", 10000], ["C", "C (µF)", 470]], function (v) {
      if (!v.R || !v.C) return "Fill in R and C.";
      var t = v.R * v.C * 1e-6;
      return "τ = R × C = " + fmt(t, "s") + "\n63% charged at 1τ, 86% at 2τ, 95% at 3τ, ~99% at 5τ = " + fmt(5 * t, "s");
    });
  };
  W.timer555 = function (box) {
    form(box, "555 astable calculator", [["R1", "R1 (Ω)", 10000], ["R2", "R2 (Ω)", 68000], ["C", "C (µF)", 10]], function (v) {
      if (!v.R1 || !v.R2 || !v.C) return "Fill in R1, R2 and C.";
      var C = v.C * 1e-6, th = .693 * (v.R1 + v.R2) * C, tl = .693 * v.R2 * C;
      return "f ≈ 1.44 / ((R1 + 2R2) × C) = " + fmt(1.44 / ((v.R1 + 2 * v.R2) * C), "Hz") + "\nHigh time " + fmt(th, "s") + ", low time " + fmt(tl, "s") + ", duty cycle " + (100 * th / (th + tl)).toFixed(1) + "%";
    });
  };
  W.divider = function (box) {
    form(box, "Voltage divider", [["vin", "Vin (V)", 12], ["r1", "R1 (top, Ω)", 10000], ["r2", "R2 (bottom, Ω)", 4700]], function (v) {
      if (v.vin == null || !v.r1 || !v.r2) return "Fill in all three.";
      return "Vout = Vin × R2 / (R1 + R2) = " + fmt(v.vin * v.r2 / (v.r1 + v.r2), "V") + "\nDivider current: " + fmt(v.vin / (v.r1 + v.r2), "A");
    }, "Handy for reading a 12 V signal on a 3.3 V ESP32 pin (keep Vout under 3.3 V).");
  };
  W.regulator = function (box) {
    form(box, "Linear regulator heat check", [["vin", "Vin (V)", 12], ["vout", "Vout (V)", 5], ["i", "Load current (mA)", 500]], function (v) {
      if (v.vin == null || v.vout == null || v.i == null) return "Fill in all three.";
      var p = (v.vin - v.vout) * v.i / 1000;
      return "Heat to dump: (Vin − Vout) × I = " + fmt(p, "W") + "\n" + (p < 1 ? "A bare TO-220 can usually handle this." : p < 3 ? "Add a heatsink." : "Big heatsink, or switch to a buck converter. Twig recommends the buck.");
    });
  };

  /* Self-resetting routine checklists (house workshop). Put ```widget routine-daily``` (or -weekly / -monthly)
     directly above a "- [ ]" checklist; the widget unticks that list when the day, week (Monday) or month rolls over. */
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function periodKey(kind, d) {
    if (kind === "weekly") { var m = new Date(d); m.setDate(d.getDate() - ((d.getDay() + 6) % 7)); d = m; }
    if (kind === "monthly") return d.getFullYear() + "-" + pad(d.getMonth() + 1);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function routine(kind, label, when) {
    return function (box, id) {
      var list = box.nextElementSibling;
      if (!list || !list.querySelector("input[data-task]")) { box.textContent = "Routine widget: put a - [ ] checklist right below it."; return; }
      var boxes = list.querySelectorAll("input[data-task]");
      function wipe() {
        boxes.forEach(function (b) { if (b.checked) { b.checked = false; b.dispatchEvent(new Event("change", { bubbles: true })); } });
      }
      var key = id + ":period", now = periodKey(kind, new Date());
      if (TS.store.get(key, null) !== now) { wipe(); TS.store.set(key, now); }
      box.innerHTML = "<h4>" + label + "</h4><div data-out></div>" +
        '<p style="margin:.4em 0 0;font-size:.9em;opacity:.8">Wipes itself clean ' + when + '. No streaks, no score: tick what you did; the rest just waits.</p>' +
        '<button data-wipe style="margin-top:.6em">Wipe it now</button>';
      var out = box.querySelector("[data-out]");
      function count() {
        var n = 0; boxes.forEach(function (b) { if (b.checked) n++; });
        out.textContent = n ? n + " ticked. Every one counts." : "Nothing ticked yet. Any one counts.";
      }
      box.querySelector("[data-wipe]").addEventListener("click", function () { wipe(); count(); });
      list.addEventListener("change", count);
      count();
    };
  }
  W["routine-daily"] = routine("daily", "Today's card", "every day at midnight");
  W["routine-weekly"] = routine("weekly", "This week's card", "every Monday");
  W["routine-monthly"] = routine("monthly", "This month's card", "on the 1st of each month");
})();

/* ===== Animal care (Advanced Animal Care workshop) — added Nov 2026 ===== */
(function () {
  "use strict";
  var TS = window.TwigSchool, W = TS.widgets;
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : null; }
  function r(n, d) { return isFinite(n) ? +n.toFixed(d) : "—"; }
  function field(k, label, val, ph) {
    return "<label>" + label + '<input data-k="' + k + '" type="text" inputmode="decimal" value="' + (val == null ? "" : val) + '" placeholder="' + (ph || "") + '"></label>';
  }
  function read(box) {
    var v = {};
    box.querySelectorAll("input,select").forEach(function (i) { v[i.dataset.k] = i.tagName === "SELECT" ? i.value : num(i.value); });
    return v;
  }
  function save(box, id) { var s = {}; box.querySelectorAll("input,select").forEach(function (i) { s[i.dataset.k] = i.value; }); TS.store.set(id, s); }
  function restore(box, id) { var s = TS.store.get(id, null); if (!s) return; box.querySelectorAll("input,select").forEach(function (i) { if (s[i.dataset.k] != null) i.value = s[i.dataset.k]; }); }

  W.dose = function (box, id) {
    box.innerHTML = "<h4>Twig's Dose-o-Matic</h4><div class=\"w-row\">" +
      field("g", "Weight (g)", 2350, "grams") + field("mgkg", "Dose (mg/kg, from your vet)", 2, "") +
      field("mgml", "Strength (mg/mL)", "", "e.g. 20") + field("pct", "…or strength (%)", 2, "e.g. 2") +
      '</div><div class="w-out" style="white-space:pre-line"></div><div style="font-size:.85rem;color:var(--muted)">Weigh today, in grams (kg × 1000; lb × 454). If both strengths are filled, mg/mL wins. Check the answer by hand or with a second person, then write the mL in the binder.</div>';
    restore(box, id);
    var out = box.querySelector(".w-out");
    function run() {
      var v = read(box); save(box, id);
      var kg = v.g != null ? v.g / 1000 : null, conc = v.mgml != null ? v.mgml : (v.pct != null ? v.pct * 10 : null);
      if (kg == null || v.mgkg == null || conc == null || kg <= 0 || conc <= 0) { out.textContent = "Fill in the weight, the dose and one strength."; return; }
      var mg = kg * v.mgkg, ml = mg / conc, lines = [];
      lines.push("Weight: " + r(kg, 3) + " kg   Strength: " + r(conc, 2) + " mg/mL");
      lines.push("Total drug: " + r(kg, 3) + " × " + v.mgkg + " = " + r(mg, 3) + " mg");
      lines.push("Volume: " + r(mg, 3) + " ÷ " + r(conc, 2) + " = " + r(ml, 3) + " mL");
      if (ml < 0.1) lines.push("⚠ Under 0.1 mL: hard to measure. Ask your vet about diluting with sterile saline, and use a 1 mL or 0.5 mL syringe.");
      else if (ml <= 1) lines.push("Use a 1 mL syringe (marked in 0.01 mL).");
      else if (ml <= 3) lines.push("Use a 3 mL syringe.");
      if (ml > 20) lines.push("⚠ That's a big volume. Double-check the decimal point and the strength.");
      out.textContent = lines.join("\n");
    }
    box.addEventListener("input", run); run();
  };

  W.fluids = function (box, id) {
    box.innerHTML = "<h4>Twig's Fluid-o-Matic</h4><div class=\"w-row\">" +
      '<label>Patient<select data-k="sp"><option value="dog">Dog</option><option value="cat">Cat</option><option value="bird">Chicken or duck</option><option value="reptile">Tortoise or slider</option></select></label>' +
      field("g", "Weight (g)", 2000, "grams") + field("dehy", "Dehydration (%)", 6, "0–12") + field("loss", "Ongoing losses (mL/day)", 0, "") +
      '</div><div class="w-out" style="white-space:pre-line"></div><div style="font-size:.85rem;color:var(--muted)">Starting-point numbers for planning with your vet, not a prescription. Over 10% dehydrated, or any signs of shock: that patient needs IV or IO fluids at the vet.</div>';
    restore(box, id);
    var out = box.querySelector(".w-out");
    function run() {
      var v = read(box); save(box, id);
      if (v.g == null || v.g <= 0) { out.textContent = "Fill in the weight."; return; }
      var kg = v.g / 1000, d = v.dehy || 0, loss = v.loss || 0, maint, mtxt, sc;
      if (v.sp === "dog") { maint = 132 * Math.pow(kg, 0.75); mtxt = "132 × kg^0.75"; sc = [10, 20]; }
      else if (v.sp === "cat") { maint = 80 * Math.pow(kg, 0.75); mtxt = "80 × kg^0.75"; sc = [10, 20]; }
      else if (v.sp === "bird") { maint = 50 * kg; mtxt = "~50 mL/kg"; sc = [10, 10]; }
      else { maint = 15 * kg; mtxt = "~15 mL/kg (range 10–25)"; sc = [10, 10]; }
      var deficit = kg * d / 100 * 1000, total = maint + deficit + loss, lines = [];
      lines.push("Deficit: " + r(kg, 3) + " kg × " + d + "% = " + r(deficit, 0) + " mL");
      lines.push("Maintenance (" + mtxt + "): " + r(maint, 0) + " mL/day");
      if (loss) lines.push("Ongoing losses: " + r(loss, 0) + " mL/day");
      lines.push("First 24 h total: " + r(total, 0) + " mL");
      lines.push("SC per site: about " + r(kg * sc[0], 0) + (sc[1] !== sc[0] ? "–" + r(kg * sc[1], 0) : "") + " mL (split across sites if you need more)");
      if (v.sp === "reptile") lines.push("Shell crew: daily soaks do much of this. Keep them at the top of their temperature zone.");
      if (v.sp === "bird") lines.push("Birds: about half the deficit in the first 6–12 h. Crop tube feeds: " + r(kg * 20, 0) + "–" + r(kg * 30, 0) + " mL each.");
      if (d > 10) lines.push("⚠ Over 10%: go to the vet now.");
      out.textContent = lines.join("\n");
    }
    box.addEventListener("input", run); box.addEventListener("change", run); run();
  };
})();
