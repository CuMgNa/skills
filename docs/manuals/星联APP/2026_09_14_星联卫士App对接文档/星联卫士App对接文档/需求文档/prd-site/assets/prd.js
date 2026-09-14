/**
 * Compiled-site PRD runtime: nav, cards, bidirectional anchor highlight, flows, rules, ops, stats.
 */
(function () {
  var curScreen = null;
  var activeModule = null;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function el(id) {
    return document.getElementById(id);
  }

  function cardHtml(item, kind, screenId) {
    var title = item.t || item.label || item.key || item.id;
    var body = item.d || item.note || "";
    return (
      '<div class="rq ' +
      kind +
      '" data-fr="' +
      esc(item.id) +
      '" data-anchor="' +
      esc(item.anchor || "") +
      '" data-screen="' +
      esc(screenId) +
      '" onclick="PRD.clickCard(this)">' +
      '<div class="rid">' +
      esc(item.id) +
      (item.anchor ? " · 可定位" : "") +
      "</div>" +
      "<h4>" +
      esc(title) +
      "</h4>" +
      (body ? "<p>" + esc(body) + "</p>" : "") +
      (item.acc ? '<div class="acc"><b>验收</b> · ' + esc(item.acc) + "</div>" : "") +
      "</div>"
    );
  }

  function renderNav() {
    var mods = window.MODULES || [];
    if (!mods.length) return;
    if (!activeModule) activeModule = mods[0].key;
    var mod = mods.filter(function (m) {
      return m.key === activeModule;
    })[0] || mods[0];
    var host = el("screenNav");
    if (!host) return;
    host.innerHTML =
      '<div class="mod">' +
      mods
        .map(function (m) {
          return (
            '<button type="button" class="' +
            (m.key === activeModule ? "on" : "") +
            '" data-mod="' +
            esc(m.key) +
            '">' +
            esc(m.name) +
            " <span>" +
            m.screens.length +
            "</span></button>"
          );
        })
        .join("") +
      '</div><div class="scr-list">' +
      mod.screens
        .map(function (s) {
          var r = (window.REQS && REQS[s]) || {};
          return (
            '<button type="button" class="' +
            (s === curScreen ? "on" : "") +
            '" data-scr="' +
            esc(s) +
            '">' +
            esc(r.title || s) +
            "</button>"
          );
        })
        .join("") +
      "</div>";
  }

  function renderCards() {
    var r = window.REQS && REQS[curScreen];
    if (!r) return;
    var left = el("colLeft");
    var right = el("colRight");
    if (left) {
      left.innerHTML =
        '<div class="col-head">功能需求 · ' +
        (r.fr || []).length +
        "</div><div class=\"col-cards\">" +
        (r.fr || [])
          .map(function (i) {
            return cardHtml(i, "fr", curScreen);
          })
          .join("") +
        "</div>" +
        ((r.layout || []).length
          ? '<div class="col-head" style="margin-top:14px">页面布局 · ' +
            r.layout.length +
            '</div><div class="col-cards">' +
            r.layout
              .map(function (i) {
                return cardHtml(i, "lay", curScreen);
              })
              .join("") +
            "</div>"
          : "");
    }
    if (right) {
      right.innerHTML =
        '<div class="col-head">交互说明 · ' +
        (r.ux || []).length +
        '</div><div class="col-cards">' +
        (r.ux || [])
          .map(function (i) {
            return cardHtml(i, "ux", curScreen);
          })
          .join("") +
        "</div>" +
        ((r.screenFields || []).length
          ? '<div class="col-head" style="margin-top:14px">字段 · ' +
            r.screenFields.length +
            '</div><div class="col-cards">' +
            r.screenFields
              .map(function (i) {
                return cardHtml(i, "fld", curScreen);
              })
              .join("") +
            "</div>"
          : "");
    }
  }

  function clearPulse() {
    [].forEach.call(document.querySelectorAll("[data-anchor].pulse"), function (n) {
      n.classList.remove("pulse");
    });
    [].forEach.call(document.querySelectorAll(".rq.hl,.rq.on"), function (n) {
      n.classList.remove("hl");
      n.classList.remove("on");
    });
  }

  function highlightAnchor(anchor) {
    if (!anchor) return;
    clearPulse();
    var root = el("screenRoot");
    if (root) {
      var node = root.querySelector('[data-anchor="' + anchor + '"]');
      if (node) {
        node.classList.add("pulse");
        if (node.scrollIntoView) node.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
    [].forEach.call(document.querySelectorAll('.rq[data-anchor="' + anchor + '"]'), function (n) {
      n.classList.add("hl");
      n.classList.add("on");
    });
  }

  function go(id) {
    curScreen = id;
    if (window.Router && Router.goto) Router.goto(id);
    renderNav();
    renderCards();
  }

  function pickModule(key) {
    activeModule = key;
    renderNav();
  }

  function clickCard(node) {
    var anchor = node.getAttribute("data-anchor");
    var screen = node.getAttribute("data-screen");
    if (screen && screen !== curScreen) go(screen);
    setTimeout(function () {
      highlightAnchor(anchor);
      node.classList.add("on");
    }, 40);
  }

  function renderRules() {
    var box = el("rulesBox");
    if (!box || !window.RULES) return;
    box.innerHTML = (RULES.topics || [])
      .map(function (t) {
        return (
          '<div class="rule-topic"><h3>' +
          esc(t.title) +
          "</h3>" +
          (t.summary ? '<div class="sum">' + esc(t.summary) + "</div>" : "") +
          "<ol>" +
          (t.rules || [])
            .map(function (r) {
              return (
                "<li><b>#" +
                esc(r.no) +
                "</b> 若 " +
                esc(r.cond) +
                " → " +
                esc(r.result) +
                "</li>"
              );
            })
            .join("") +
          "</ol></div>"
        );
      })
      .join("");
  }

  function renderOps() {
    var box = el("opsBox");
    if (!box || !window.OPS) return;
    var html = "";
    Object.keys(OPS.screens || {}).forEach(function (sid) {
      var block = OPS.screens[sid];
      html += "<h3 style=\"font-size:15px;margin:16px 0 8px\">" + esc(block.title || sid) + "</h3>";
      (block.operations || []).forEach(function (op) {
        html +=
          '<div class="op-card"><h4>' +
          esc(op.id) +
          " · " +
          esc(op.name) +
          "</h4><p style=\"font-size:13px;color:#465049;margin:0 0 6px\">触发：" +
          esc(op.trigger || "—") +
          "</p><ol style=\"margin:0;padding-left:18px;font-size:13px\">" +
          (op.steps || [])
            .map(function (st) {
              return (
                "<li>" +
                esc(st.actor || "") +
                " · " +
                esc(st.action) +
                (st.detail ? " — " + esc(st.detail) : "") +
                "</li>"
              );
            })
            .join("") +
          '</ol><div class="acc" style="margin-top:8px;font-size:12px">成功：' +
          esc((op.responses && op.responses.success) || "—") +
          "</div></div>";
      });
    });
    box.innerHTML = html || "<p>暂无操作规格</p>";
  }

  var flowIdx = 0;
  var stepIdx = 0;
  var timer = null;

  function currentFlow() {
    return (window.FLOWS || [])[flowIdx];
  }

  function renderFlowTabs() {
    var host = el("flowTabs");
    if (!host) return;
    host.innerHTML = (window.FLOWS || [])
      .map(function (f, i) {
        return (
          '<button type="button" class="' +
          (i === flowIdx ? "on" : "") +
          '" data-fi="' +
          i +
          '">' +
          esc(f.title) +
          "</button>"
        );
      })
      .join("");
  }

  function applyFlowDemo(demo) {
    if (!demo || !window.Router) return;
    var st = Router.state || (Router.state = {});
    if (demo.bleConnected != null) st.bleConnected = !!demo.bleConnected;
    if (demo.satUiState != null) st.satUiState = demo.satUiState;
    if (window.MOCK && MOCK.device) {
      if (demo.netStatus != null) MOCK.device.netStatus = demo.netStatus;
      if (demo.locStatus != null) MOCK.device.locStatus = demo.locStatus;
      if (demo.battery != null) MOCK.device.battery = demo.battery;
    }
  }

  function renderFlowDots(total) {
    var dots = el("flowDots");
    if (!dots) return;
    dots.innerHTML = Array.apply(null, Array(total || 0))
      .map(function (_, i) {
        return (
          '<i class="' +
          (i === stepIdx ? "on" : i < stepIdx ? "done" : "") +
          '" data-si="' +
          i +
          '"></i>'
        );
      })
      .join("");
  }

  var flowJumpArmed = false;

  function jumpToPrototype(screenId) {
    if (!screenId) return;
    go(screenId);
    var target =
      document.querySelector("#sec-app .phone-col") ||
      document.getElementById("sec-app");
    if (target && target.scrollIntoView) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    var phone = document.querySelector("#sec-app .phone");
    if (phone) {
      phone.classList.remove("flow-pulse");
      void phone.offsetWidth;
      phone.classList.add("flow-pulse");
      setTimeout(function () {
        phone.classList.remove("flow-pulse");
      }, 1600);
    }
  }

  function showFlowStep(opt) {
    opt = opt || {};
    var f = currentFlow();
    if (!f) return;
    var sum = el("flowSummary");
    if (sum) sum.textContent = f.summary || "";
    var steps = el("flowSteps");
    if (steps) {
      steps.innerHTML = (f.steps || [])
        .map(function (st, i) {
          return (
            '<div class="step' +
            (i === stepIdx ? " on" : "") +
            '" data-si="' +
            i +
            '"><b>' +
            (i + 1) +
            ".</b> " +
            esc(st.caption) +
            (st.fr ? ' <span class="fs-fr">' + esc(st.fr) + "</span>" : "") +
            (st.screen ? ' <span class="fs-scr">' + esc(st.screen) + "</span>" : "") +
            "</div>"
          );
        })
        .join("");
    }
    var st = (f.steps || [])[stepIdx];
    var cap = el("flowCaption");
    if (cap) {
      cap.innerHTML = st
        ? "<b>当前步</b> · " + esc(st.caption) + (st.screen ? " → 原型屏 「" + esc(st.screen) + "」" : "")
        : "";
    }
    renderFlowDots((f.steps || []).length);
    if (st) {
      applyFlowDemo(st.demo);
      if (st.screen && (opt.jump || flowJumpArmed)) {
        jumpToPrototype(st.screen);
      } else if (st.screen) {
        go(st.screen);
      }
    }
  }

  function flowPrev() {
    if (stepIdx > 0) {
      stepIdx--;
      flowJumpArmed = true;
      showFlowStep({ jump: true });
    }
  }
  function flowNext() {
    var f = currentFlow();
    if (!f) return;
    if (stepIdx < (f.steps || []).length - 1) {
      stepIdx++;
      flowJumpArmed = true;
      showFlowStep({ jump: true });
    }
  }
  function flowToggle() {
    if (timer) {
      clearInterval(timer);
      timer = null;
      var b = el("flowPlay");
      if (b) b.textContent = "播放";
      return;
    }
    var b2 = el("flowPlay");
    if (b2) b2.textContent = "暂停";
    flowJumpArmed = true;
    showFlowStep({ jump: true });
    timer = setInterval(function () {
      var f = currentFlow();
      if (!f) return;
      if (stepIdx >= (f.steps || []).length - 1) {
        flowToggle();
        return;
      }
      flowNext();
    }, 1800);
  }

  function stats() {
    var screens = Object.keys(window.REQS || {}).length;
    var flows = (window.FLOWS || []).length;
    var fr = 0;
    Object.keys(window.REQS || {}).forEach(function (id) {
      fr += ((REQS[id].fr || []).length);
    });
    var a = el("statScreens");
    var b = el("statFlows");
    var c = el("statFr");
    if (a) a.textContent = String(screens);
    if (b) b.textContent = String(flows);
    if (c) c.textContent = String(fr);
  }

  function bind() {
    document.addEventListener("click", function (e) {
      var mod = e.target.closest && e.target.closest("#screenNav [data-mod]");
      if (mod) {
        pickModule(mod.getAttribute("data-mod"));
        return;
      }
      var scr = e.target.closest && e.target.closest("#screenNav [data-scr]");
      if (scr) {
        go(scr.getAttribute("data-scr"));
        return;
      }
      var fi = e.target.closest && e.target.closest("#flowTabs [data-fi]");
      if (fi) {
        flowIdx = parseInt(fi.getAttribute("data-fi"), 10) || 0;
        stepIdx = 0;
        flowJumpArmed = true;
        renderFlowTabs();
        showFlowStep({ jump: true });
        return;
      }
      var si = e.target.closest && e.target.closest("#flowSteps [data-si], #flowDots [data-si]");
      if (si) {
        stepIdx = parseInt(si.getAttribute("data-si"), 10) || 0;
        flowJumpArmed = true;
        showFlowStep({ jump: true });
        return;
      }
      var node = e.target.closest && e.target.closest("#screenRoot [data-anchor]");
      if (node) {
        highlightAnchor(node.getAttribute("data-anchor"));
      }
    });
    var prev = el("flowPrev");
    var next = el("flowNext");
    var play = el("flowPlay");
    var jump = el("flowJump");
    if (prev) prev.onclick = flowPrev;
    if (next) next.onclick = flowNext;
    if (play) play.onclick = flowToggle;
    if (jump) {
      jump.onclick = function () {
        var f = currentFlow();
        var st = f && (f.steps || [])[stepIdx];
        if (!st) return;
        flowJumpArmed = true;
        applyFlowDemo(st.demo);
        jumpToPrototype(st.screen);
      };
    }
  }

  window.PRD = {
    go: go,
    pickModule: pickModule,
    clickCard: clickCard,
    highlightAnchor: highlightAnchor,
  };

  document.addEventListener("DOMContentLoaded", function () {
    bind();
    stats();
    renderRules();
    renderOps();
    renderFlowTabs();
    var mods = window.MODULES || [];
    if (mods[0] && mods[0].screens && mods[0].screens[0]) {
      activeModule = mods[0].key;
      go(mods[0].screens[0]);
    }
    if ((window.FLOWS || []).length) showFlowStep();
    if (window.Router && Router.on) {
      Router.on(function (id) {
        curScreen = id;
        renderNav();
        renderCards();
      });
    }
  });
})();
