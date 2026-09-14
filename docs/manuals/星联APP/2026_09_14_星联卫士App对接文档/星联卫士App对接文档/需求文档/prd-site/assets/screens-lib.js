(function () {
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function a(id) {
    return id ? ' data-anchor="' + id + '"' : "";
  }

  function nav(title, opt) {
    opt = opt || {};
    var left =
      opt.back === false
        ? '<div class="nb-btn"></div>'
        : '<button type="button" class="nb-btn" onclick="' +
          (opt.onBack || "Router.back()") +
          '">' +
          Ico.s("back", 22) +
          "</button>";
    var right = opt.right || '<div class="nb-btn"></div>';
    return (
      '<div class="nbar"' +
      a(opt.anchor) +
      ">" +
      left +
      '<div class="nb-title">' +
      esc(title) +
      "</div>" +
      '<div class="nb-sp"></div>' +
      right +
      "</div>"
    );
  }

  function navBtn(icon, onclick, anchor, accent) {
    return (
      '<button type="button" class="nb-btn' +
      (accent ? " g" : "") +
      '" onclick="' +
      onclick +
      '"' +
      a(anchor) +
      ">" +
      Ico.s(icon, 21) +
      "</button>"
    );
  }

  function tabs(cur) {
    var list = [
      ["messages", "消息", "message"],
      ["map", "地图", "globe"],
      ["settings", "设置", "user"],
    ];
    return (
      '<div class="tbar"' +
      a("tabbar") +
      ">" +
      list
        .map(function (tab) {
          var on = cur === tab[0];
          return (
            '<button type="button" class="t-item' +
            (on ? " on" : "") +
            '" onclick="Router.goto(\'' +
            tab[0] +
            "')\">" +
            Ico.s(tab[2], 22) +
            "<span>" +
            esc(tab[1]) +
            "</span></button>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function signalBars(n) {
    n = Math.max(0, Math.min(4, n == null ? 4 : n));
    var html = '<span class="sig-bars" aria-hidden="true">';
    for (var i = 1; i <= 4; i++) {
      html += '<i class="' + (i <= n ? "on" : "") + '"></i>';
    }
    return html + "</span>";
  }

  function fmtMmSs(sec) {
    sec = Math.max(0, sec | 0);
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  function isBleConnected() {
    var st = (Router && Router.state) || {};
    return !!st.bleConnected;
  }

  function promptBleDisconnect() {
    var st = (Router && Router.state) || {};
    st.bleDisconnectOpen = true;
    Router.replace(Router.current());
  }

  function cancelBleDisconnect() {
    var st = (Router && Router.state) || {};
    st.bleDisconnectOpen = false;
    Router.replace(Router.current());
  }

  function disconnectBle() {
    var st = (Router && Router.state) || {};
    st.bleConnected = false;
    st.bleDisconnectOpen = false;
    st.satUiState = null;
    st.connecting = false;
    Toast.show("蓝牙已断开");
    Router.replace(Router.current());
  }

  function confirmBleDisconnect() {
    disconnectBle();
  }

  function bleDisconnectSheet() {
    var st = (Router && Router.state) || {};
    if (!st.bleDisconnectOpen) return "";
    return (
      '<div class="fail-sheet ble-disc-sheet" data-anchor="satDisconnectSheet">' +
      '<div class="fail-mask" onclick="SL.cancelBleDisconnect()"></div>' +
      '<div class="fail-card">' +
      '<div class="fail-ttl">断开蓝牙</div>' +
      '<p class="fail-body">是否断开蓝牙连接？</p>' +
      '<div class="ble-disc-actions">' +
      '<button type="button" class="btn btn-o" onclick="SL.cancelBleDisconnect()">取消</button>' +
      '<button type="button" class="btn btn-d" onclick="SL.confirmBleDisconnect()">断开</button>' +
      "</div></div></div>"
    );
  }

  function satBanner(opt) {
    opt = opt || {};
    var st = (Router && Router.state) || {};
    if (!st.bleConnected) {
      return (
        '<button type="button" class="sat-banner sat-ble-off"' +
        a("satBleEntry") +
        ' onclick="Router.push(\'device_scan\')" title="点击连接蓝牙">' +
        '<span class="sat-left">' +
        Ico.s("bluetooth", 18) +
        "<span>未连接蓝牙 · <span class=\"sat-ble-cta\">点击连接</span></span></span></button>"
      );
    }
    var d = device();
    var state = st.satUiState;
    if (!state) {
      if (d.netStatus === 0) state = "offline";
      else if (d.netStatus === 2) state = "connected";
      else state = "connecting";
    }
    var bars = d.signalBars != null ? d.signalBars : 4;
    var battery = d.battery != null ? d.battery : 85;
    var cls = "sat-banner sat-" + state;
    var label = "联网中…";
    var icon = Ico.s("satellite", 18);
    if (state === "connected") {
      label = "联网成功";
      cls += " sat-ok";
    } else if (state === "login_fail" || state === "offline") {
      label = "联网失败";
      cls += " sat-fail";
    } else {
      cls += " sat-wait";
      label =
        '<span class="sat-spin" aria-hidden="true"></span>联网中…';
    }
    var deviceId = d.deviceId || "";
    return (
      '<button type="button" class="' +
      cls +
      '"' +
      a(opt.anchor || "satBanner") +
      ' onclick="SL.promptBleDisconnect()" title="点击断开蓝牙">' +
      '<span class="sat-left">' +
      icon +
      "<span>" +
      label +
      (deviceId
        ? ' <span class="sat-id" data-anchor="satDeviceId">· ' + esc(deviceId) + "</span>"
        : "") +
      "</span></span>" +
      '<span class="sat-right">' +
      '<span class="sat-bat" data-anchor="satBattery">' +
      esc(battery) +
      "%</span>" +
      signalBars(bars) +
      "</span></button>"
    );
  }

  function formatCoord(lat, lon) {
    var la = Number(lat);
    var lo = Number(lon);
    if (!isFinite(la) || !isFinite(lo)) return "";
    var ns = la >= 0 ? "北纬" : "南纬";
    var ew = lo >= 0 ? "东经" : "西经";
    return (
      ns +
      " " +
      Math.abs(la).toFixed(6) +
      "°  " +
      ew +
      " " +
      Math.abs(lo).toFixed(6) +
      "°"
    );
  }

  function mapLayerLabel(id) {
    return id === "standard" ? "标准地图" : "卫星图";
  }

  function canSend() {
    var st = (Router && Router.state) || {};
    if (!st.bleConnected) return false;
    var d = device();
    var ttMod = d.ttMod != null ? d.ttMod : 0;
    if (ttMod !== 1) return false;
    var state = st.satUiState;
    if (state) return state === "connected";
    return d.netStatus === 2;
  }

  function xorChecksum(body) {
    var x = 0;
    for (var i = 0; i < body.length; i++) x ^= body.charCodeAt(i);
    var h = x.toString(16).toUpperCase();
    return h.length < 2 ? "0" + h : h;
  }

  function frameWithXor(cmdBody) {
    var body = String(cmdBody || "").replace(/^\$/, "").replace(/\*.*$/, "");
    return "$" + body + "*" + xorChecksum(body);
  }

  function chip(state, label) {
    var cls = state === "on" ? "on" : state === "alert" ? "alert" : state === "warn" ? "warn" : "off";
    return '<span class="chip s-' + cls + '">' + esc(label) + "</span>";
  }

  function lrow(opt) {
    return (
      '<div class="lrow' +
      (opt.plain ? " plain" : "") +
      '"' +
      (opt.onclick ? ' onclick="' + opt.onclick + '"' : "") +
      a(opt.anchor) +
      ">" +
      (opt.icon ? '<div class="icap">' + Ico.s(opt.icon, 17) + "</div>" : "") +
      '<div class="lbl">' +
      esc(opt.label) +
      (opt.sub ? "<small>" + esc(opt.sub) + "</small>" : "") +
      "</div>" +
      (opt.value != null ? '<div class="val' + (opt.muted ? " muted" : "") + '">' + esc(opt.value) + "</div>" : "") +
      (opt.chev === false ? "" : '<div class="chev">' + Ico.s("chevronRight", 17) + "</div>") +
      "</div>"
    );
  }

  function krow(k, v, opt) {
    opt = opt || {};
    return (
      '<div class="krow"' +
      a(opt.anchor) +
      '><div class="k">' +
      esc(k) +
      "</div>" +
      '<div class="v' +
      (v === "-" ? " dash" : "") +
      '">' +
      esc(v) +
      "</div></div>"
    );
  }

  function seg(items, cur, onclick, opt) {
    opt = opt || {};
    var out = [];
    items.forEach(function (it, i) {
      if (i) out.push('<div class="sep"></div>');
      out.push(
        '<button type="button" class="pill' +
          (cur === it.key ? " on" : "") +
          '" onclick="' +
          onclick.replace("{k}", it.key) +
          '">' +
          esc(it.label) +
          "</button>"
      );
    });
    return '<div class="seg' + (opt.grow ? " grow" : "") + '"' + a(opt.anchor) + ">" + out.join("") + "</div>";
  }

  function empty(icon, text, anchor) {
    return (
      '<div class="empty"' +
      a(anchor) +
      '><div class="ei">' +
      Ico.s(icon, 44, 1.4) +
      "</div>" +
      esc(text) +
      "</div>"
    );
  }

  function sectionTitle(t, right) {
    return (
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 16px 8px;">' +
      '<div style="font-size:13px;font-weight:700;color:#8A9199;letter-spacing:.4px;text-transform:uppercase;">' +
      esc(t) +
      "</div>" +
      (right || "") +
      "</div>"
    );
  }

  function brandLogo(px, anchor) {
    px = px || 120;
    return (
      '<div class="brand-mark"' +
      a(anchor) +
      ' style="width:' +
      px +
      "px;height:" +
      px +
      'px">' +
      Ico.s("satellite", Math.round(px * 0.46), 1.6) +
      "</div>"
    );
  }

  function statCard(icon, label, value, anchor) {
    return (
      '<div class="stat-card"' +
      a(anchor) +
      '><div class="sc-icon">' +
      Ico.s(icon, 22) +
      '</div><div class="sc-lbl">' +
      esc(label) +
      '</div><div class="sc-val">' +
      esc(value) +
      "</div></div>"
    );
  }

  function device() {
    return (window.MOCK && MOCK.device) || {};
  }
  function netLabel(n) {
    return n === 2 ? "已联网" : n === 1 ? "搜星中" : "已断网";
  }
  function locLabel(n) {
    return n === 1 ? "已定位" : n === 0 ? "搜星中" : "无效";
  }
  function loginLabel(n) {
    /* legacy helper: protocol v1.5 已无 loginStatus，按 netStatus 语义展示 */
    return n === 2 ? "已联网(含登录)" : n === 1 ? "搜星中" : "已断网";
  }
  function sosLabel(n) {
    return n === 0 ? "SOS 未激活" : "SOS 中";
  }
  function msgStatusLabel(s) {
    return (
      {
        waiting: "等待",
        sending: "发送中",
        failed: "发送失败",
        ack_wait: "成功等待回执",
        success: "发送成功",
      }[s] || s
    );
  }

  function msgStatusText(m) {
    m = m || {};
    if (m.uiStatus === "sending") {
      var done = m.pktDone != null ? m.pktDone : 1;
      var total = m.pktTotal != null ? m.pktTotal : 1;
      return "发送中 " + done + "/" + total;
    }
    return msgStatusLabel(m.uiStatus);
  }

  var SL = {
    esc: esc,
    a: a,
    nav: nav,
    navBtn: navBtn,
    tabs: tabs,
    satBanner: satBanner,
    bleDisconnectSheet: bleDisconnectSheet,
    isBleConnected: isBleConnected,
    promptBleDisconnect: promptBleDisconnect,
    cancelBleDisconnect: cancelBleDisconnect,
    confirmBleDisconnect: confirmBleDisconnect,
    disconnectBle: disconnectBle,
    canSend: canSend,
    signalBars: signalBars,
    chip: chip,
    lrow: lrow,
    krow: krow,
    seg: seg,
    empty: empty,
    sectionTitle: sectionTitle,
    brandLogo: brandLogo,
    statCard: statCard,
    sb: Ico.statusBar,
    device: device,
    netLabel: netLabel,
    locLabel: locLabel,
    loginLabel: loginLabel,
    sosLabel: sosLabel,
    msgStatusLabel: msgStatusLabel,
    msgStatusText: msgStatusText,
    formatCoord: formatCoord,
    mapLayerLabel: mapLayerLabel,
    xorChecksum: xorChecksum,
    frameWithXor: frameWithXor,
  };

  window.SL = SL;
  window.ScreensLib = SL;
})();
