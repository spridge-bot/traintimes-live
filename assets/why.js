// The "i" on a train (Live tiles, the board, the map's departures): tap or click it for the reason.
// A cancelled train shows the reason Network Rail gave (its delay attribution code, in plain English: see
// nrfeeds/reasons.py); a late one shows what TrainTimes can see, such as the train that forms it running late
// or being held at a signal (the board's "cause", else its first warning).
//   whyIcon(d)   -> HTML for the icon, or "" when there's nothing to explain
(function () {
  const attr = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  let pop = null;
  function ensure() {
    if (!pop) { pop = document.createElement("div"); pop.id = "whypop"; pop.setAttribute("role", "status"); pop.hidden = true; document.body.appendChild(pop); }
    return pop;
  }
  window.whyIcon = function (d) {
    const why = d.cause || (d.warnings || [])[0];
    if (!why) return "";
    const cancelled = d.state === "cancelled";
    const text = (cancelled ? "Reason given: " : "Why: ") + why.charAt(0).toUpperCase() + why.slice(1) +
      (d.reason_code ? ` (Network Rail code ${d.reason_code})` : "");
    return `<span class="whyi${cancelled ? " whyi-c" : ""}" role="button" tabindex="0" aria-label="${attr(text)}" data-why="${attr(text)}">i</span>`;
  };
  function show(el) {
    const p = ensure();
    if (!p.hidden && p._for === el) { p.hidden = true; return; }
    p._for = el;
    p.textContent = el.dataset.why;
    p.hidden = false;
    const r = el.getBoundingClientRect(), w = Math.min(300, innerWidth - 24);
    p.style.width = w + "px";
    p.style.left = Math.max(12, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 12)) + "px";
    const below = r.bottom + 8 + p.offsetHeight < innerHeight;
    p.style.top = (below ? r.bottom + 8 : r.top - 8 - p.offsetHeight) + "px";
  }
  // capture phase: the icon sits inside tiles and rows that are links or open things themselves
  document.addEventListener("click", e => {
    const el = e.target.closest && e.target.closest(".whyi");
    if (el) { e.preventDefault(); e.stopPropagation(); show(el); }
    else if (pop && !pop.hidden && !e.target.closest("#whypop")) pop.hidden = true;
  }, true);
  document.addEventListener("keydown", e => {
    const el = e.target.closest && e.target.closest(".whyi");
    if (el && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); e.stopPropagation(); show(el); }
    if (e.key === "Escape" && pop) pop.hidden = true;
  }, true);
  addEventListener("scroll", () => { if (pop) pop.hidden = true; }, true);
})();
