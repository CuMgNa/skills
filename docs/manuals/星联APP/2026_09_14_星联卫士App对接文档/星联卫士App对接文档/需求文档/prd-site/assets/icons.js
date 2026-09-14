(function () {
  var S = {};
  var F = {};

  S.back = '<path d="M15 4.8 7.6 12 15 19.2"/>';
  S.chevronRight = '<path d="M9 5.6 15.4 12 9 18.4"/>';
  S.chevronDown = '<path d="M5.8 9 12 15.2 18.2 9"/>';
  S.check = '<path d="M4.6 12.6 9.4 17.4 19.4 6.6"/>';
  S.close = '<path d="M6 6l12 12M18 6 6 18"/>';
  S.refresh = '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20.4 3.6v4.2h-4.2"/>';
  S.info = '<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.4M12 7.8h.01"/>';
  S.battery =
    '<rect x="2.6" y="7.4" width="16.4" height="9.2" rx="2.4"/><path d="M21.4 10.6v2.8"/><rect x="5" y="9.8" width="9" height="4.4" rx="1.2" fill="currentColor" stroke="none"/>';
  S.batteryLow =
    '<rect x="2.6" y="7.4" width="16.4" height="9.2" rx="2.4"/><path d="M21.4 10.6v2.8"/><rect x="5" y="9.8" width="2.6" height="4.4" rx="1" fill="currentColor" stroke="none"/>';
  S.bluetooth =
    '<path d="M7 7.2 12 3.6v6.8l4-3.2-4-3.2 5-4v16.8l-5-4 4-3.2-4-3.2z"/>';
  S.satellite =
    '<path d="M4.6 4.6 9.4 9.4M14.6 4.6 9.8 9.4"/><circle cx="12" cy="12" r="3.2"/><path d="M12 2.6v2.4M12 19v2.4M2.6 12h2.4M19 12h2.4M5.8 5.8l1.7 1.7M16.5 16.5l1.7 1.7M5.8 18.2l1.7-1.7M16.5 7.5l1.7-1.7"/>';
  S.message =
    '<path d="M3.4 5.6a2 2 0 0 1 2-2h10.2a2 2 0 0 1 2 2v6.6a2 2 0 0 1-2 2H8.4L4.4 17.4a.6.6 0 0 1-1-.5z"/><path d="M7 7.4h7M7 10.2h4.4"/>';
  S.mic =
    '<rect x="9.4" y="2.6" width="5.2" height="10.4" rx="2.6"/><path d="M5.6 11.4a6.4 6.4 0 0 0 12.8 0M12 17.8v3.6M8.6 21.4h6.8"/>';
  S.camera =
    '<path d="M3.4 8.6a2 2 0 0 1 2-2h2l1.4-2.2h6.4L16.6 6.6h2a2 2 0 0 1 2 2v8.8a2 2 0 0 1-2 2H5.4a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.4"/>';
  S.image =
    '<rect x="3.4" y="4.6" width="17.2" height="14.8" rx="2.4"/><circle cx="8.6" cy="9.6" r="1.8"/><path d="M3.8 17 9 12l3.4 3 3-2.4 4.8 4.4"/>';
  S.send = '<path d="M20.4 3.6 3.6 10.4l7 2.6 2.6 7z"/>';
  S.settings =
    '<circle cx="12" cy="12" r="3"/><path d="M19.6 14.2a1.4 1.4 0 0 0 .3 1.5l.1.1a1.7 1.7 0 1 1-2.4 2.4l-.1-.1a1.4 1.4 0 0 0-2.4 1v.3a1.7 1.7 0 1 1-3.4 0v-.2a1.4 1.4 0 0 0-2.4-1l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1a1.4 1.4 0 0 0-1-2.4H5.4a1.7 1.7 0 1 1 0-3.4h.2a1.4 1.4 0 0 0 1-2.4l-.1-.1A1.7 1.7 0 1 1 8.9 5.5l.1.1a1.4 1.4 0 0 0 2.4-1V4.4a1.7 1.7 0 1 1 3.4 0v.2a1.4 1.4 0 0 0 2.4 1l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1a1.4 1.4 0 0 0 1 2.4h.3a1.7 1.7 0 1 1 0 3.4h-.2a1.4 1.4 0 0 0-1.1.4z"/>';
  S.user =
    '<circle cx="12" cy="8.4" r="4"/><path d="M4.6 20.4c0-4.1 3.3-6.6 7.4-6.6s7.4 2.5 7.4 6.6"/>';
  S.bell =
    '<path d="M17.4 10.4a5.4 5.4 0 1 0-10.8 0c0 4-1.8 5.4-1.8 5.4h14.4s-1.8-1.4-1.8-5.4z"/><path d="M13.6 19a1.9 1.9 0 0 1-3.2 0"/>';
  S.wifiOff =
    '<path d="M2.6 8.6a15 15 0 0 1 6-3.4M21.4 8.6a15 15 0 0 0-5-3.2M5.8 12.2a10 10 0 0 1 3-1.8M18.2 12.2a10 10 0 0 0-2.6-1.7M9.4 15.6a5 5 0 0 1 5.2 0M12 19h.01M3.4 3.4 20.6 20.6"/>';
  S.devicePhone =
    '<rect x="6.4" y="2.8" width="11.2" height="18.4" rx="2.6"/><path d="M10.6 18.4h2.8"/>';
  S.shield =
    '<path d="M12 3.4 5 6v5.4c0 4.6 3 7.8 7 9.2 4-1.4 7-4.6 7-9.2V6z"/><path d="M9 12.2 11.4 14.6 15.4 10"/>';
  S.globe =
    '<circle cx="12" cy="12" r="8.6"/><path d="M3.4 12h17.2M12 3.4a13 13 0 0 1 0 17.2 13 13 0 0 1 0-17.2z"/>';

  F.signal =
    '<rect x="1" y="10" width="3" height="5" rx="1"/><rect x="5.6" y="7.4" width="3" height="7.6" rx="1"/><rect x="10.2" y="4.6" width="3" height="10.4" rx="1"/><rect x="14.8" y="2" width="3" height="13" rx="1"/>';
  F.wifi =
    '<path d="M9 14.4 12 18l3-3.6a4.6 4.6 0 0 0-6 0z"/><path d="M5.4 10.4a10 10 0 0 1 13.2 0l-1.9 2.2a7.2 7.2 0 0 0-9.4 0z"/><path d="M2.2 6.6a14.6 14.6 0 0 1 19.6 0l-1.9 2.2a11.8 11.8 0 0 0-15.8 0z"/>';
  F.batteryFull =
    '<rect x="1" y="6" width="20" height="11" rx="3"/><rect x="22" y="9.4" width="1.8" height="4.2" rx=".9"/>';

  function stroke(name, size, sw) {
    var d = S[name];
    if (!d) return "";
    return (
      '<svg width="' +
      size +
      '" height="' +
      size +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' +
      (sw || 1.9) +
      '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      d +
      "</svg>"
    );
  }

  function fill(name, w, h) {
    var d = F[name];
    if (!d) return "";
    return (
      '<svg width="' +
      w +
      '" height="' +
      (h || w) +
      '" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      d +
      "</svg>"
    );
  }

  function brandMark(size) {
    size = size || 120;
    return (
      '<div class="brand-mark" style="width:' +
      size +
      "px;height:" +
      size +
      'px">' +
      stroke("satellite", Math.round(size * 0.46), 1.6) +
      "</div>"
    );
  }

  window.Ico = {
    s: stroke,
    f: fill,
    brandMark: brandMark,
    statusBar: function (dark) {
      return (
        '<div class="sbar' +
        (dark ? " on-dark" : "") +
        '"><span>12:00</span><span class="sb-right">' +
        fill("signal", 17, 15) +
        fill("wifi", 16, 16) +
        fill("batteryFull", 24, 12) +
        "</span></div>"
      );
    },
  };
})();
