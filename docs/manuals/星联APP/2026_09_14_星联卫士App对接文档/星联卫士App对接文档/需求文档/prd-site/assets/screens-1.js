(function () {
  window.Screens = window.Screens || {};
  var SL = window.SL || window.ScreensLib || {};
  var esc = SL.esc || function (s) {
    return String(s == null ? "" : s);
  };

  Screens.splash = function () {
    return (
      '<div class="scr splash" onclick="Router.goto(\'perm_guide\')">' +
      SL.sb(true) +
      '<div class="splash-sky" aria-hidden="true">' +
      '<div class="splash-stars"></div>' +
      '<div class="splash-horizon"></div>' +
      '<div class="splash-orbit splash-orbit--a"></div>' +
      '<div class="splash-orbit splash-orbit--b"></div>' +
      '<div class="splash-orbit splash-orbit--c"></div>' +
      "</div>" +
      '<div class="splash-core">' +
      '<div class="splash-mark-wrap" data-anchor="splashLogo">' +
      '<div class="splash-mark">' +
      Ico.s("satellite", 52, 1.5) +
      "</div>" +
      "</div>" +
      '<div class="splash-name" data-anchor="splashLogo">星联卫士</div>' +
      '<div class="splash-tag" data-anchor="splashTagline">卫星应急通信</div>' +
      '<div class="splash-cta">点击继续</div>' +
      "</div>" +
      '<div class="splash-hint">点击任意处继续</div>' +
      "</div>"
    );
  };

  Screens.perm_guide = function () {
    return (
      '<div class="scr">' +
      SL.sb() +
      SL.nav("权限说明", { back: false }) +
      '<div class="body flat">' +
      '<div style="padding:18px 16px 6px;font-size:17px;font-weight:700;color:var(--ink)" data-anchor="permTitle">需要以下权限</div>' +
      '<div class="card flush" data-anchor="permList">' +
      SL.lrow({ icon: "bluetooth", label: "蓝牙", sub: "连接星联卫士 S1 终端", plain: true, chev: false }) +
      SL.lrow({ icon: "mic", label: "麦克风", sub: "录制卫星语音消息", plain: true, chev: false }) +
      SL.lrow({ icon: "camera", label: "相机 / 相册", sub: "选择并发送图片", plain: true, chev: false }) +
      SL.lrow({
        icon: "globe",
        label: "地图用终端定位",
        sub: "位置来自 $TOLOC，不申请手机 GPS",
        plain: true,
        chev: false,
      }) +
      "</div></div>" +
      '<div class="actionbar">' +
      '<button type="button" class="btn btn-p" data-anchor="permContinueBtn" onclick="Router.goto(\'device_scan\')">继续</button>' +
      "</div></div>"
    );
  };

  Screens.device_scan = function (ctx) {
    var st = (ctx && ctx.state) || (Router && Router.state) || {};
    var connecting = st.connecting;
    return (
      '<div class="scr">' +
      SL.sb() +
      SL.nav("连接设备", { back: true, anchor: "scanTitle" }) +
      '<div class="body flat flex1">' +
      (connecting
        ? SL.empty("refresh", "连接中…\n等待 $TOSTA+$TOLOC+$TOSIG", "scanSpinner")
        : '<div data-anchor="scanList">' +
          '<div class="dev-pick on" onclick="Toast.show(\'已选择星联卫士 S1\')">' +
          '<div class="dp-icon">' +
          Ico.s("devicePhone", 24) +
          "</div>" +
          '<div class="dp-main"><div class="dp-name">星联卫士 S1</div><div class="dp-sub">ID ···9012 · -62 dBm</div></div>' +
          '<div class="dp-check">' +
          Ico.s("check", 14) +
          "</div></div></div>") +
      "</div>" +
      '<div class="actionbar">' +
      '<button type="button" class="btn btn-p" data-anchor="scanConnectBtn" onclick="Router.state.connecting=true;Router.state.bleConnected=true;Router.state.satUiState=\'connected\';Router.state.connectedSeconds=5;Router.replace(\'device_scan\');setTimeout(function(){Router.state.connecting=false;Router.goto(\'messages\')},1200)"' +
      (connecting ? " disabled" : "") +
      ">连接</button></div></div>"
    );
  };

  function statusClass(s) {
    if (s === "success") return "ok";
    if (s === "failed") return "fail";
    if (s === "sending") return "send";
    if (s === "ack_wait") return "ack";
    return "wait";
  }

  function cycleBubbleStatus(idx) {
    var order = ["waiting", "sending", "failed", "ack_wait", "success"];
    var chat = (MOCK.chat || [])[idx];
    if (!chat || chat.dir !== "out") return;
    if (chat.uiStatus === "sending" && chat.pktTotal && chat.pktDone < chat.pktTotal) {
      chat.pktDone = (chat.pktDone || 0) + 1;
      Router.replace("messages");
      return;
    }
    var i = order.indexOf(chat.uiStatus || "sending");
    chat.uiStatus = order[(i + 1) % order.length];
    if (chat.uiStatus === "sending") {
      if (chat.type === "text") {
        chat.pktDone = 1;
        chat.pktTotal = 1;
      } else {
        chat.pktDone = chat.pktDone || 1;
        chat.pktTotal = chat.pktTotal || (chat.type === "image" ? 5 : 3);
      }
    }
    if (chat.uiStatus === "failed" && !chat.failReason) {
      chat.failReason = "本包发送失败已满 3 次";
    }
    Router.replace("messages");
  }
  function pickPhrase(pi) {
    var phrases = (window.MOCK && MOCK.phrases) || [];
    Router.state.draftText = phrases[pi] || "";
    Router.state.phrasesOpen = false;
    Router.replace("messages");
    Toast.show("已填入常用语");
  }
  function showFailReason(idx) {
    Router.state.failSheetIdx = idx;
    Router.replace("messages");
  }
  function closeFailReason() {
    Router.state.failSheetIdx = null;
    Router.replace("messages");
  }
  function sendDemoImage() {
    if (!SL.canSend()) {
      Toast.show("暂不可发送");
      return;
    }
    MOCK.chat = MOCK.chat || [];
    MOCK.chat.push({
      dir: "out",
      type: "image",
      uiStatus: "sending",
      pktDone: 1,
      pktTotal: 5,
      ts: "15:35",
    });
    Toast.show("选图后发 $TIIMG");
    Router.replace("messages");
  }
  function sendDemoVoice() {
    if (!SL.canSend()) {
      Toast.show("暂不可发送");
      return;
    }
    MOCK.chat = MOCK.chat || [];
    MOCK.chat.push({
      dir: "out",
      type: "voice",
      duration: 3,
      uiStatus: "sending",
      pktDone: 1,
      pktTotal: 3,
      ts: "15:37",
    });
    Toast.show("已发 $TIVOI");
    Router.replace("messages");
  }
  function sendDemoText() {
    if (!SL.canSend()) {
      Toast.show("暂不可发送");
      return;
    }
    var text = Router.state.draftText || "请输入发送内容";
    MOCK.chat = MOCK.chat || [];
    MOCK.chat.push({
      dir: "out",
      type: "text",
      text: text,
      uiStatus: "sending",
      pktDone: 1,
      pktTotal: 1,
      ts: "15:36",
    });
    Router.state.draftText = "";
    Toast.show("已发 $TITXT");
    Router.replace("messages");
  }
  function mapSetLayer(layer) {
    Router.state.mapLayer = layer;
    Router.state.mapLayerOpen = false;
    Router.state.mapDlOpen = false;
    Router.state.mapListOpen = false;
    Toast.show("已切换 · " + SL.mapLayerLabel(layer) + "（本地）");
    Router.replace("map");
  }
  function mapOpenSheet(kind) {
    Router.state.mapLayerOpen = kind === "layer";
    Router.state.mapDlOpen = kind === "download";
    Router.state.mapListOpen = false;
    Router.replace("map");
  }
  function mapCloseSheets() {
    Router.state.mapListOpen = false;
    Router.state.mapLayerOpen = false;
    Router.state.mapDlOpen = false;
    Router.replace("map");
  }
  function mapStartDownload() {
    var st = Router.state;
    if (st.mapOffline === "ready") {
      Toast.show("离线底图已就绪");
      st.mapDlOpen = true;
      Router.replace("map");
      return;
    }
    if (st.mapOffline === "downloading") return;
    st.mapOffline = "downloading";
    st.mapOfflinePct = 0;
    st.mapDlOpen = true;
    st.mapListOpen = false;
    st.mapLayerOpen = false;
    Router.replace("map");
    if (window._mapDlTimer) clearInterval(window._mapDlTimer);
    window._mapDlTimer = setInterval(function () {
      st.mapOfflinePct = Math.min(100, (st.mapOfflinePct || 0) + 20);
      if (st.mapOfflinePct >= 100) {
        clearInterval(window._mapDlTimer);
        window._mapDlTimer = null;
        st.mapOffline = "ready";
        Toast.show("离线底图已就绪 · 不占卫星带宽");
      }
      if (Router.current() === "map") Router.replace("map");
    }, 400);
  }
  function authAction(type, action) {
    var names = { voice: "语音库", image: "图像库", app: "APP" };
    var name = names[type] || type;
    if (action === "authorize") {
      Toast.show(name + " · 演示立即授权");
      return;
    }
    if (confirm("确认解绑" + name + "授权？")) {
      Toast.show(name + "授权已解绑（演示）");
    }
  }
  function authUnbindAll() {
    if (confirm("一键解绑会解绑 APP、语音、图像授权。确认继续？")) {
      Toast.show("已一键解绑全部授权（演示）");
    }
  }
  function cmdNow() {
    var d = new Date();
    function p(n) {
      return n < 10 ? "0" + n : "" + n;
    }
    return p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
  }
  function cmdPush(dir, frame) {
    MOCK.cmdLog = MOCK.cmdLog || [];
    MOCK.cmdLog.unshift({ dir: dir, frame: frame, ts: cmdNow() });
    if (MOCK.cmdLog.length > 80) MOCK.cmdLog.length = 80;
  }
  function cmdMockReply(tx) {
    var d = SL.device();
    var upper = String(tx || "").toUpperCase();
    var rx = null;
    if (upper.indexOf("$TIQRY") === 0) {
      rx = SL.frameWithXor(
        "TOSTA," +
          (d.deviceId || "123456789012") +
          "," +
          (d.battery != null ? d.battery : 85) +
          "," +
          (d.sosStatus != null ? d.sosStatus : 0) +
          "," +
          (d.ttMod != null ? d.ttMod : 1) +
          "," +
          (d.netStatus != null ? d.netStatus : 2)
      );
    } else if (upper.indexOf("$TILOC") === 0) {
      rx =
        d.locStatus === 1
          ? SL.frameWithXor("TOLOC,1," + d.lat + "," + d.lon + ",1724572800")
          : SL.frameWithXor("TOLOC,0,,,0");
    } else if (upper.indexOf("$TISIG") === 0) {
      rx = SL.frameWithXor("TOSIG,-70,1,12345,25");
    } else if (upper.indexOf("$TIDSQ") === 0) {
      rx = SL.frameWithXor("TODST,2,4");
    } else if (upper.indexOf("$TITXT") === 0 || upper.indexOf("$TIVOI") === 0 || upper.indexOf("$TIIMG") === 0) {
      rx = SL.frameWithXor("TODST,1,1");
      setTimeout(function () {
        cmdPush("RX", SL.frameWithXor("TOACK,1,9001,1"));
        cmdPush("RX", SL.frameWithXor("TODST,1,4"));
        if (Router.current() === "cmd_debug") Router.replace("cmd_debug");
      }, 600);
    }
    if (rx) {
      setTimeout(function () {
        cmdPush("RX", rx);
        if (Router.current() === "cmd_debug") Router.replace("cmd_debug");
      }, 300);
    }
  }
  function cmdSend(frame) {
    if (!SL.isBleConnected()) {
      Toast.show("请先连接蓝牙");
      return;
    }
    frame = String(frame || "").trim();
    if (!/^\$[A-Z]{2,8},/.test(frame.toUpperCase()) && !/^\$[A-Z]{2,8}\*/.test(frame.toUpperCase())) {
      if (!frame) {
        Toast.show("请输入指令帧");
        return;
      }
    }
    if (frame.charAt(0) !== "$") frame = "$" + frame;
    if (frame.indexOf("*") < 0) {
      var body = frame.slice(1);
      frame = "$" + body + "*" + SL.xorChecksum(body);
    }
    cmdPush("TX", frame);
    Toast.show("已发送（演示）");
    Router.state.cmdDraft = frame;
    cmdMockReply(frame);
    Router.replace("cmd_debug");
  }
  function cmdQuick(kind) {
    var map = {
      TIQRY: "$TIQRY,0",
      TILOC: "$TILOC,0",
      TISIG: "$TISIG,0",
      TITXT: "$TITXT,1,4,D6D0CEC4",
      TIDSQ: "$TIDSQ,2",
    };
    var body = map[kind];
    if (!body) return;
    cmdSend(SL.frameWithXor(body.replace(/^\$/, "")));
  }
  function cmdClearLog() {
    MOCK.cmdLog = [];
    Toast.show("日志已清空");
    Router.replace("cmd_debug");
  }
  window._cycleBubbleStatus = cycleBubbleStatus;
  window._pickPhrase = pickPhrase;
  window._showFailReason = showFailReason;
  window._closeFailReason = closeFailReason;
  window._sendDemoImage = sendDemoImage;
  window._sendDemoVoice = sendDemoVoice;
  window._sendDemoText = sendDemoText;
  window._mapSetLayer = mapSetLayer;
  window._mapOpenSheet = mapOpenSheet;
  window._mapCloseSheets = mapCloseSheets;
  window._mapStartDownload = mapStartDownload;
  window._authAction = authAction;
  window._authUnbindAll = authUnbindAll;
  window._cmdSend = cmdSend;
  window._cmdQuick = cmdQuick;
  window._cmdClearLog = cmdClearLog;

  Screens.messages = function () {
    var chat = (window.MOCK && MOCK.chat) || [];
    var phrases = (window.MOCK && MOCK.phrases) || [];
    var st = (Router && Router.state) || {};
    var phrasesOpen = !!st.phrasesOpen;
    var can = SL.canSend();
    var failIdx = st.failSheetIdx;
    var failMsg = failIdx != null ? chat[failIdx] : null;

    var bubbles = chat
      .map(function (m, i) {
        var side = m.dir === "in" ? "in" : "out";
        var body;
        if (m.type === "voice") {
          body =
            '<div class="vbub"><span class="vb-ico">' +
            Ico.s("mic", 16) +
            "</span><span>" +
            esc(m.duration || 3) +
            "″</span></div>";
        } else if (m.type === "image") {
          body =
            '<div class="ibub" title="发出图片">' +
            Ico.s("image", 28) +
            "<span>图片</span></div>";
        } else {
          body = '<div class="tbub">' + esc(m.text || "") + "</div>";
        }
        var status = "";
        if (side === "out") {
          status =
            '<div class="msg-st-row">' +
            '<button type="button" class="msg-st s-' +
            statusClass(m.uiStatus) +
            '" onclick="_cycleBubbleStatus(' +
            i +
            ')" title="点击切换发送五态/推进分包">' +
            esc(SL.msgStatusText(m)) +
            "</button>" +
            (m.uiStatus === "failed"
              ? '<button type="button" class="msg-fail-hint" data-anchor="msgFailHint" onclick="event.stopPropagation();_showFailReason(' +
                i +
                ')" title="查看失败原因">!</button>'
              : "") +
            "</div>";
        }
        var clickIn =
          side === "in"
            ? ' onclick="Toast.show(\'本机已展示；已读回执由终端 UDP 0x05，APP 不发 $TIRD\');if(MOCK.messages&&MOCK.messages[0])MOCK.messages[0].read=true"'
            : "";
        return (
          '<div class="msg-row ' +
          side +
          '"' +
          clickIn +
          ">" +
          '<div class="msg-avatar">' +
          Ico.s("user", 18) +
          "</div>" +
          '<div class="msg-col">' +
          (m.ts ? '<div class="msg-time">' + esc(m.ts) + "</div>" : "") +
          body +
          status +
          "</div></div>"
        );
      })
      .join("");

    var phrasePanel =
      '<div class="phrase-panel' +
      (phrasesOpen ? " open" : "") +
      '" data-anchor="msgPhrases">' +
      '<button type="button" class="phrase-hd" onclick="Router.state.phrasesOpen=!Router.state.phrasesOpen;Router.replace(\'messages\')">' +
      "常用语 " +
      Ico.s(phrasesOpen ? "chevronDown" : "chevronRight", 16) +
      "</button>" +
      (phrasesOpen
        ? '<div class="phrase-list">' +
          phrases
            .map(function (p, pi) {
              return (
                '<button type="button" class="phrase-item" onclick="_pickPhrase(' +
                pi +
                ')">' +
                esc(p) +
                "</button>"
              );
            })
            .join("") +
          "</div>"
        : "") +
      "</div>";

    var draft = st.draftText || "";
    var failSheet =
      failMsg && failMsg.uiStatus === "failed"
        ? '<div class="fail-sheet" data-anchor="msgFailSheet">' +
          '<div class="fail-mask" onclick="_closeFailReason()"></div>' +
          '<div class="fail-card">' +
          '<div class="fail-ttl">发送失败</div>' +
          '<p class="fail-body">' +
          esc(failMsg.failReason || "本包发送失败已满 3 次") +
          "</p>" +
          '<p class="fail-note">原因由 APP 按 $TODST / 超时规则归纳，协议无独立失败原因码</p>' +
          '<button type="button" class="btn btn-o" onclick="_closeFailReason()">关闭</button>' +
          "</div></div>"
        : "";

    return (
      '<div class="scr">' +
      SL.sb() +
      SL.nav("消息", { back: false, anchor: "msgTitle" }) +
      SL.satBanner({ anchor: "satBanner" }) +
      '<div class="body flat flex1 chat-body">' +
      '<div class="chat-list" data-anchor="msgChatList">' +
      (bubbles || SL.empty("message", "暂无消息", "msgChatList")) +
      "</div>" +
      phrasePanel +
      "</div>" +
      '<div class="msg-inputbar" data-anchor="msgInputBar">' +
      '<button type="button" class="ib-btn" data-anchor="msgVoiceBtn" onclick="' +
      (can ? "_sendDemoVoice()" : "Toast.show('暂不可发送')") +
      '">' +
      Ico.s("mic", 22) +
      "</button>" +
      '<input class="ib-input" data-anchor="msgInput" placeholder="请输入发送内容" value="' +
      esc(draft) +
      '" readonly onclick="Toast.show(\'演示：可改用常用语\')" />' +
      '<button type="button" class="ib-btn" data-anchor="msgCameraBtn" onclick="_sendDemoImage()">' +
      Ico.s("camera", 22) +
      "</button>" +
      '<button type="button" class="ib-send' +
      (can ? "" : " disabled") +
      '" data-anchor="msgSendBtn" onclick="_sendDemoText()">' +
      Ico.s("send", 18) +
      "</button>" +
      "</div>" +
      failSheet +
      SL.bleDisconnectSheet() +
      SL.tabs("messages") +
      "</div>"
    );
  };

  Screens.map = function () {
    var d = SL.device();
    var st = (Router && Router.state) || {};
    var layerOpen = !!st.mapLayerOpen;
    var dlOpen = !!st.mapDlOpen;
    var layer = st.mapLayer || "satellite";
    var offline = st.mapOffline || "idle";
    var pct = st.mapOfflinePct || 0;
    var located = d.locStatus === 1;
    var pinStyle = located ? "left:58%;top:42%" : "display:none";
    var coordText = located ? SL.formatCoord(d.lat, d.lon) : "";

    var overlays = "";
    if (located) {
      overlays +=
        '<div class="map-pin" style="' +
        pinStyle +
        '" data-anchor="mapSelfPin" title="终端">' +
        Ico.s("satellite", 14) +
        "</div>" +
        '<div class="map-pin-tag" style="' +
        pinStyle +
        '">终端</div>' +
        '<div class="map-coord-bar" data-anchor="mapCoordBar">' +
        '<div class="mc-title">终端</div>' +
        '<div class="mc-latlon" data-anchor="mapLat">' +
        esc(coordText) +
        "</div></div>";
    } else {
      overlays +=
        '<div class="map-loc-hint">' +
        esc(SL.locLabel(d.locStatus)) +
        " · 不造假点</div>";
    }

    var sheets = "";
    if (layerOpen) {
      sheets +=
        '<div class="map-layer-sheet" data-anchor="mapLayerSheet">' +
        '<div class="mls-hd">切换图层 · 本地能力</div>' +
        '<button type="button" class="layer-opt' +
        (layer === "satellite" ? " on" : "") +
        '" onclick="_mapSetLayer(\'satellite\')">卫星图' +
        (layer === "satellite" ? '<span class="chk">' + Ico.s("check", 16) + "</span>" : "") +
        "</button>" +
        '<button type="button" class="layer-opt' +
        (layer === "standard" ? " on" : "") +
        '" onclick="_mapSetLayer(\'standard\')">标准地图' +
        (layer === "standard" ? '<span class="chk">' + Ico.s("check", 16) + "</span>" : "") +
        "</button>" +
        '<button type="button" class="btn btn-o" onclick="_mapCloseSheets()">关闭</button>' +
        "</div>";
    }
    if (dlOpen) {
      sheets +=
        '<div class="map-dl-sheet" data-anchor="mapDownloadSheet">' +
        '<div class="mls-hd">下载离线地图</div>' +
        '<p class="dl-note">本地 Wi‑Fi / 存储下载，不走 $xxxx 卫星指令，不占卫星带宽。</p>' +
        (offline === "downloading"
          ? '<div class="dl-progress"><i style="width:' +
            pct +
            '%"></i></div><div class="dl-pct">下载中 ' +
            pct +
            "%</div>"
          : offline === "ready"
            ? '<div class="dl-pct">离线底图已就绪</div>'
            : "") +
        (offline === "ready"
          ? '<button type="button" class="btn btn-o" onclick="_mapCloseSheets()">关闭</button>'
          : offline === "downloading"
            ? '<button type="button" class="btn btn-o" disabled>下载中…</button>'
            : '<button type="button" class="btn btn-p" data-anchor="mapDownloadStartBtn" onclick="_mapStartDownload()">开始下载</button>' +
              '<button type="button" class="btn btn-o" style="margin-top:8px" onclick="_mapCloseSheets()">取消</button>') +
        "</div>";
    }

    return (
      '<div class="scr">' +
      SL.sb() +
      SL.nav("地图", { back: false, anchor: "mapTitle" }) +
      SL.satBanner({ anchor: "satBanner" }) +
      '<div class="map-stage flex1" data-anchor="mapCanvas">' +
      '<div class="map-bg layer-' +
      esc(layer) +
      '" aria-hidden="true"></div>' +
      overlays +
      '<div class="map-toolbar" data-anchor="mapToolbar">' +
      '<button type="button" class="mt-btn" data-anchor="mapDownloadBtn" onclick="_mapOpenSheet(\'download\')">' +
      '<span class="mt-ico">⬇</span><span>下载</span>' +
      (offline === "ready" ? '<span class="mt-badge">已下载</span>' : "") +
      "</button>" +
      '<button type="button" class="mt-btn" data-anchor="mapLayerBtn" onclick="_mapOpenSheet(\'layer\')"><span class="mt-ico">▣</span><span>图层</span></button>' +
      "</div>" +
      '<div class="map-zoom" data-anchor="mapZoom">' +
      '<button type="button" class="map-locate-btn" data-anchor="mapLocateBtn" onclick="Toast.show(\'' +
      (located ? "已回到终端位置 · $TOLOC" : "暂无有效坐标") +
      "')\" title=\"定位到终端\">◎</button>" +
      '<button type="button" onclick="Toast.show(\'放大 · 本地\')">+</button>' +
      '<button type="button" onclick="Toast.show(\'缩小 · 本地\')">−</button>' +
      "</div>" +
      sheets +
      "</div>" +
      SL.bleDisconnectSheet() +
      SL.tabs("map") +
      "</div>"
    );
  };

  Screens.settings = function () {
    var d = SL.device();
    var ver = (window.MOCK && MOCK.appVersion) || "V1.2.1";
    var waitMin =
      (window.MOCK && MOCK.waitTimeoutMinutes != null
        ? MOCK.waitTimeoutMinutes
        : 10) || 10;
    var waitOpen = !!(Router.state && Router.state.waitTimeoutOpen);
    var opts = (window.MOCK && MOCK.waitTimeoutOptions) || [5, 10, 15, 30, 60];
    var sheet = "";
    if (waitOpen) {
      sheet =
        '<div class="map-layer-sheet" data-anchor="setWaitTimeoutSheet">' +
        '<div class="mls-hd">等待发送超时</div>' +
        '<p class="dl-note">消息一直处于「等待」时，超过此时长整条失败。默认 10 分钟，仅改本机，不走卫星指令。</p>' +
        opts
          .map(function (m) {
            return (
              '<button type="button" class="layer-opt' +
              (m === waitMin ? " on" : "") +
              '" onclick="_setWaitTimeout(' +
              m +
              ')">' +
              m +
              " 分钟" +
              (m === waitMin ? '<span class="chk">' + Ico.s("check", 16) + "</span>" : "") +
              "</button>"
            );
          })
          .join("") +
        '<button type="button" class="btn btn-o" onclick="_closeWaitTimeout()">关闭</button>' +
        "</div>";
    }
    return (
      '<div class="scr">' +
      SL.sb() +
      SL.nav("设置", { back: false, anchor: "setTitle" }) +
      '<div class="body flat flex1">' +
      '<div class="set-profile" data-anchor="setDeviceInfo">' +
      '<div class="sp-avatar">' +
      Ico.s("user", 36) +
      "</div>" +
      '<div class="sp-id">' +
      esc(d.deviceId) +
      "</div>" +
      '<div class="sp-sub">$TOSTA.deviceId</div></div>' +
      '<div class="card flush">' +
      '<div class="lrow" data-anchor="setAuthRow" onclick="Router.push(\'auth_info\')">' +
      '<div class="lbl">授权信息</div>' +
      '<div class="chev">' +
      Ico.s("chevronRight", 17) +
      "</div></div>" +
      '<div class="lrow" data-anchor="setCmdDebugRow" onclick="Router.push(\'cmd_debug\')">' +
      '<div class="lbl">指令调试</div>' +
      '<div class="chev">' +
      Ico.s("chevronRight", 17) +
      "</div></div>" +
      '<div class="lrow" data-anchor="setWaitTimeoutRow" onclick="_openWaitTimeout()">' +
      '<div class="lbl">等待发送超时</div>' +
      '<div class="val muted">' +
      waitMin +
      " 分钟</div>" +
      '<div class="chev">' +
      Ico.s("chevronRight", 17) +
      "</div></div>" +
      '<div class="lrow" data-anchor="setVersionRow" onclick="Toast.show(\'检测 APP 更新… 当前 ' +
      esc(ver) +
      "')\">" +
      '<div class="lbl">版本检测更新</div>' +
      '<div class="val muted">' +
      esc(ver) +
      '</div><div class="chev">' +
      Ico.s("chevronRight", 17) +
      "</div></div></div>" +
      '<div style="padding:16px;font-size:12px;color:var(--ink-4);line-height:1.5">本期不做固件版本查询 · 等待超时为 APP 本地策略</div>' +
      "</div>" +
      sheet +
      '<div class="actionbar">' +
      '<button type="button" class="btn btn-d" data-anchor="setDisconnectBtn" onclick="if(confirm(\'确认断开蓝牙？\')){SL.disconnectBle();Router.goto(\'state_error\')}">断开连接</button>' +
      "</div>" +
      SL.tabs("settings") +
      "</div>"
    );
  };

  window._openWaitTimeout = function () {
    Router.state.waitTimeoutOpen = true;
    Router.replace("settings");
  };
  window._closeWaitTimeout = function () {
    Router.state.waitTimeoutOpen = false;
    Router.replace("settings");
  };
  window._setWaitTimeout = function (min) {
    if (!window.MOCK) window.MOCK = {};
    MOCK.waitTimeoutMinutes = min;
    Router.state.waitTimeoutOpen = false;
    Toast.show("已设为 " + min + " 分钟");
    Router.replace("settings");
  };

  Screens.auth_info = function () {
    var licenses = (window.MOCK && MOCK.authLicenses) || {};
    var order = [
      { key: "voice", title: "语音库授权信息", icon: "mic", periodLabel: "语音库授权有效期" },
      { key: "image", title: "图像库授权信息", icon: "image", periodLabel: "图像库授权有效期" },
      { key: "app", title: "APP 授权信息", icon: "shield", periodLabel: "APP 授权有效期" },
    ];
    var cards = order
      .map(function (it) {
        var lic = licenses[it.key] || {};
        var expired = lic.status === "expired";
        var expireShow = lic.expireDate || (expired ? "—" : "永久有效");
        var hint = lic.hint || (expired ? "授权已超过有效期" : "授权永久有效");
        var btn = expired
          ? '<button type="button" class="auth-action-p" onclick="event.stopPropagation();_authAction(\'' +
            it.key +
            "','authorize')\">立即授权</button>"
          : '<button type="button" class="auth-action-d" onclick="event.stopPropagation();_authAction(\'' +
            it.key +
            "','unbind')\">解绑授权</button>";
        return (
          '<div class="auth-card" data-anchor="authCard_' +
          it.key +
          '">' +
          '<div class="auth-card-hd" onclick="Router.push(\'auth_detail\',{type:\'' +
          it.key +
          "'})\">" +
          '<div class="auth-card-ico">' +
          Ico.s(it.icon, 20) +
          "</div>" +
          '<div class="auth-card-main">' +
          '<div class="auth-card-title">' +
          esc(it.title) +
          "</div>" +
          '<div class="auth-card-meta">' +
          esc(it.periodLabel) +
          " · <b class=\"" +
          (expired ? "expired" : "") +
          '">' +
          esc(expireShow) +
          "</b></div></div>" +
          '<div class="chev">' +
          Ico.s("chevronRight", 17) +
          "</div></div>" +
          '<div class="auth-hint ' +
          (expired ? "auth-hint-expired" : "auth-hint-ok") +
          '">*' +
          esc(hint) +
          "</div>" +
          btn +
          "</div>"
        );
      })
      .join("");

    return (
      '<div class="scr">' +
      SL.sb() +
      SL.nav("授权信息", { anchor: "authTitle" }) +
      '<div class="body flat flex1 auth-body" data-anchor="authList">' +
      cards +
      '<div class="auth-warn">注意：一键解绑会解绑 APP、语音、图像授权。</div>' +
      '<button type="button" class="auth-action-d" data-anchor="authUnbindAllBtn" onclick="_authUnbindAll()">一键解绑授权</button>' +
      "</div></div>"
    );
  };

  Screens.auth_detail = function (ctx) {
    var type = (ctx && ctx.params && ctx.params.type) || "voice";
    var titles = {
      voice: "语音库授权详情",
      image: "图像库授权详情",
      app: "APP 授权详情",
    };
    var licenses = (window.MOCK && MOCK.authLicenses) || {};
    var lic = licenses[type] || {};
    var records = lic.records || [];
    var blocks =
      records
        .map(function (r) {
          return (
            '<div class="auth-detail-block">' +
            SL.krow("设备 ID", r.deviceId || "—") +
            SL.krow("生效时间", r.effectiveAt || "—") +
            SL.krow("到期时间", r.expireAt || "—") +
            SL.krow("总调用次数", String(r.totalCalls != null ? r.totalCalls : "—")) +
            SL.krow("已调用次数", String(r.usedCalls != null ? r.usedCalls : "—")) +
            SL.krow("剩余调用次数", String(r.remainCalls != null ? r.remainCalls : "—")) +
            "</div>"
          );
        })
        .join("") ||
      '<div class="auth-detail-block"><div style="color:var(--ink-4);font-size:13px">暂无授权明细</div></div>';

    return (
      '<div class="scr">' +
      SL.sb() +
      SL.nav(titles[type] || "授权信息", { anchor: "authDetailTitle" }) +
      '<div class="body flat flex1 auth-body" data-anchor="authDetailList">' +
      blocks +
      "</div></div>"
    );
  };

  Screens.cmd_debug = function () {
    var st = (Router && Router.state) || {};
    var draft = st.cmdDraft || "$TIQRY,0*5B";
    var log = (window.MOCK && MOCK.cmdLog) || [];
    var chips = [
      ["TIQRY", "$TIQRY"],
      ["TILOC", "$TILOC"],
      ["TISIG", "$TISIG"],
      ["TITXT", "$TITXT"],
      ["TIDSQ", "$TIDSQ"],
    ]
      .map(function (c) {
        return (
          '<button type="button" class="cmd-chip" data-anchor="cmdChip_' +
          c[0] +
          '" onclick="_cmdQuick(\'' +
          c[0] +
          "')\">" +
          esc(c[1]) +
          "</button>"
        );
      })
      .join("");
    var rows = log.length
      ? log
          .map(function (e) {
            return (
              '<div class="cmd-row ' +
              (e.dir === "TX" ? "tx" : "rx") +
              '"><span class="cmd-dir">' +
              esc(e.dir) +
              '</span><span class="cmd-ts">' +
              esc(e.ts) +
              '</span><code class="cmd-frame">' +
              esc(e.frame) +
              "</code></div>"
            );
          })
          .join("")
      : '<div class="cmd-empty">暂无交互日志 · 发送指令后显示</div>';

    return (
      '<div class="scr">' +
      SL.sb() +
      SL.nav("指令调试", { anchor: "cmdDebugTitle" }) +
      '<div class="body flat flex1 cmd-body">' +
      '<div class="cmd-sec" data-anchor="cmdQuickBar">' +
      '<div class="cmd-sec-hd">快捷发送</div>' +
      '<div class="cmd-chips">' +
      chips +
      "</div></div>" +
      '<div class="cmd-sec" data-anchor="cmdCustom">' +
      '<div class="cmd-sec-hd">自定义发送</div>' +
      '<div class="cmd-input-row">' +
      '<input class="cmd-input" id="cmdDraftInput" data-anchor="cmdDraftInput" value="' +
      esc(draft) +
      '" onchange="Router.state.cmdDraft=this.value" />' +
      '<button type="button" class="btn btn-p cmd-send" data-anchor="cmdSendBtn" onclick="_cmdSend((document.getElementById(\'cmdDraftInput\')||{}).value||Router.state.cmdDraft)">发送</button>' +
      "</div></div>" +
      '<div class="cmd-sec flex1" data-anchor="cmdLog">' +
      '<div class="cmd-sec-hd">交互日志</div>' +
      '<div class="cmd-log">' +
      rows +
      "</div>" +
      '<button type="button" class="btn btn-o" data-anchor="cmdClearBtn" onclick="_cmdClearLog()">清空日志</button>' +
      "</div></div></div>"
    );
  };

  Screens.state_error = function (ctx) {
    var code = (ctx && ctx.params && ctx.params.code) || "ble_off";
    var msg =
      code === "busy"
        ? "设备已被其他手机连接"
        : code === "net"
          ? "卫星未联网，请至空旷处重试"
          : "蓝牙已断开，请重新连接";
    return (
      '<div class="scr">' +
      SL.sb() +
      SL.nav("连接异常", { back: false }) +
      '<div class="body flat flex1">' +
      '<div class="empty" data-anchor="errIcon"><div class="ei">' +
      Ico.s("wifiOff", 44, 1.4) +
      '</div></div><p style="text-align:center;padding:0 24px 40px;font-size:15px;color:var(--ink-3);line-height:1.65" data-anchor="errMessage">' +
      esc(msg) +
      "</p></div>" +
      '<div class="actionbar">' +
      '<button type="button" class="btn btn-p" data-anchor="errRetryBtn" onclick="Router.goto(\'device_scan\')">重新连接</button>' +
      "</div></div>"
    );
  };
})();
