// Theme toggle, shared by every page. The inline boot script in each <head> has already
// applied a saved choice before paint; this wires the button and keeps the browser chrome
// colour and the button label in step. Pages that draw with theme colours (the map's train
// icons) listen for the "tt-theme" event and redraw.
(function () {
  var root = document.documentElement;
  var mq = matchMedia("(prefers-color-scheme: dark)");
  function current() { return root.getAttribute("data-theme") || (mq.matches ? "dark" : "light"); }
  function sync() {
    var t = current();
    document.querySelectorAll(".theme-btn").forEach(function (b) {
      var label = t === "dark" ? "Switch to light theme" : "Switch to dark theme";
      b.setAttribute("aria-label", label); b.title = label;
    });
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) {
      m.setAttribute("content", t === "dark" ? "#0b0c0e" : "#f2f4f6");
    });
  }
  function changed() { sync(); window.dispatchEvent(new CustomEvent("tt-theme", { detail: current() })); }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".theme-btn");
    if (!b) return;
    var next = current() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("tt-theme", next); } catch (err) {}
    changed();
  });
  if (mq.addEventListener) mq.addEventListener("change", function () { if (!root.getAttribute("data-theme")) changed(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", sync); else sync();
})();
