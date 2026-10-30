/* Classic ES5 script: static content remains usable if module support is absent. */
(function () {
  function showFailure() {
    if (window.__MAKAPLANET_CORE_READY__) return;
    var status = document.getElementById('static-load-status');
    if (status) {
      status.setAttribute('role', 'status');
      status.textContent = '交互指标尚未显示，可能是网络较慢、脚本被拦截或浏览器不支持。可刷新本页重试，或直接查看以下报告与数据；概要为同版总数据，不代表当前分组。';
    }
  }
  window.addEventListener('error', function (event) {
    if (event.target && event.target.tagName === 'SCRIPT' && event.target.type === 'module') showFailure();
  }, true);
  setTimeout(showFailure, 22000);
}());
