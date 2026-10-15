(function () {
  "use strict";

  var script = document.currentScript;
  if (!script) return;

  var rootHref = new URL(script.dataset.root || "./", document.baseURI).href;
  var section = script.dataset.section || "overview";
  var label = script.dataset.label || "当前页面";

  function href(path) {
    return new URL(path, rootHref).href;
  }

  function current(name) {
    return section === name ? ' aria-current="page"' : "";
  }

  function submenuLink(path, text, note) {
    var target = new URL(path, rootHref);
    var samePath = window.location.pathname.replace(/\/+$/, "") === target.pathname.replace(/\/+$/, "");
    var active = samePath && (target.hash ? window.location.hash === target.hash : !window.location.hash);
    return '<a href="' + href(path) + '"' + (active ? ' aria-current="page"' : "") + '><span>' + text + '</span><small>' + note + '</small></a>';
  }

  var host = document.getElementById("geo-shell-root");
  if (!host) {
    host = document.createElement("div");
    host.id = "geo-shell-root";
    document.body.insertBefore(host, document.body.firstChild);
  }

  host.className = "geo-shell-root";
  host.innerHTML = "<div class=\"geo-shell-inner\"><a class=\"geo-shell-brand\" href=\"./\" aria-label=\"玛卡星球 GEO 首页\"><span class=\"geo-shell-mark\" aria-hidden=\"true\"><img style=\"display:block;width:100%;height:100%;object-fit:contain\" src=\"./favicon.png\" alt=\"\"></span><span class=\"geo-shell-brand-text\">玛卡星球 <span>GEO</span></span></a><button class=\"geo-shell-mobile-toggle\" type=\"button\" aria-expanded=\"false\" aria-controls=\"geo-shell-nav\" aria-label=\"打开导航\">☰</button><nav class=\"geo-shell-nav\" id=\"geo-shell-nav\" aria-label=\"项目导航\"><a href=\"./\">项目首页</a><details data-active=\"sampling\"><summary>采样数据</summary><div class=\"geo-shell-submenu\"><a href=\"./round1/data/\"><span>第一轮数据</span><small>424条有效回答</small></a><a href=\"./round2/data/\"><span>第二轮数据</span><small>424条有效回答 · 采集完成</small></a></div></details><details data-active=\"citation\"><summary>引用源</summary><div class=\"geo-shell-submenu\"><a href=\"./round1/citation/\"><span>第一轮引用源</span><small>历史原引用保留</small></a><a href=\"./round2/citation/\"><span>第二轮引用源</span><small>全部网址与域名</small></a></div></details><details data-active=\"comparison\"><summary>对比仪表盘</summary><div class=\"geo-shell-submenu\"><a href=\"./compare/data/\"><span>两轮数据对比</span><small>各轮独立分母</small></a><a href=\"./compare/citation/\"><span>两轮引用源对比</span><small>同版规范化引用</small></a></div></details></nav></div>";
  host.querySelectorAll("[href],[src]").forEach(function(element){["href","src"].forEach(function(attr){if(element.hasAttribute(attr))element.setAttribute(attr,href(element.getAttribute(attr)));});});
  host.querySelectorAll("details[data-active]").forEach(function(menu){menu.dataset.active=String(menu.dataset.active===section);});
  document.body.classList.add("geo-shell-present");

  if (section !== "overview") {
    var context = document.createElement("div");
    context.className = "geo-shell-context";
    context.innerHTML = '<div class="geo-shell-context-inner"><a href="' + href("./") + '">GEO 工作台</a><span aria-hidden="true">/</span><span>' + label + '</span></div>';
    host.insertAdjacentElement("afterend", context);
  }

  var toggle = host.querySelector(".geo-shell-mobile-toggle");
  var nav = host.querySelector(".geo-shell-nav");
  var menus = Array.from(nav.querySelectorAll("details"));

  function closeMenu() {
    host.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "打开导航");
    toggle.textContent = "☰";
  }

  function closeSubmenus(except) {
    menus.forEach(function (menu) {
      if (menu !== except) menu.removeAttribute("open");
    });
  }

  toggle.addEventListener("click", function () {
    var open = !host.classList.contains("is-open");
    host.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "关闭导航" : "打开导航");
    toggle.textContent = open ? "×" : "☰";
  });

  menus.forEach(function (menu) {
    menu.addEventListener("toggle", function () {
      if (menu.open) closeSubmenus(menu);
    });
  });

  nav.addEventListener("click", function (event) {
    if (event.target.closest("a") && window.matchMedia("(max-width: 900px)").matches) closeMenu();
  });

  document.addEventListener("click", function (event) {
    if (!host.contains(event.target)) {
      closeSubmenus();
      closeMenu();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    closeSubmenus();
    closeMenu();
    toggle.focus();
  });

  window.addEventListener("resize", function () {
    if (!window.matchMedia("(max-width: 900px)").matches) closeMenu();
  });
}());
