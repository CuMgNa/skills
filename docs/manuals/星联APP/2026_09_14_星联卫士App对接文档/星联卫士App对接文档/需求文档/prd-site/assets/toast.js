(function () {
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  var Toast = {
    show: function (msg, ms) {
      var layer = document.getElementById("toastLayer");
      if (!layer) return;
      layer.innerHTML = '<div class="toast">' + esc(msg) + "</div>";
      clearTimeout(Toast._t);
      Toast._t = setTimeout(function () {
        layer.innerHTML = "";
      }, ms || 1600);
    },
  };

  var Loading = {
    show: function (msg, ms, doneToast, cb) {
      var layer = document.getElementById("loadingLayer");
      if (!layer) return;
      layer.innerHTML =
        '<div style="position:absolute;inset:0;background:rgba(20,26,22,.32);display:grid;place-items:center;pointer-events:auto;">' +
        '<div style="background:rgba(26,31,28,.9);color:#fff;border-radius:14px;padding:20px 26px;text-align:center;min-width:150px;">' +
        '<div class="spin"></div><div style="font-size:13px;">' +
        esc(msg || "加载中…") +
        "</div></div></div>";
      setTimeout(function () {
        layer.innerHTML = "";
        if (doneToast) Toast.show(doneToast);
        if (cb) cb();
      }, ms || 1200);
    },
    hide: function () {
      var layer = document.getElementById("loadingLayer");
      if (layer) layer.innerHTML = "";
    },
  };

  window.Toast = Toast;
  window.Loading = Loading;
})();
