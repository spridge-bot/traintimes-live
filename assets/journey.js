// A train's whole journey, shared by the departures page and the map panel:
// every stop from first to last, ticked off as it's passed, with where the
// train is now and expected times for the rest. Uses the page's getJSON().
(function () {
  const VERY_LATE_MINUTES = 10;
  const time = iso => iso ? new Date(iso).toLocaleTimeString("en-GB",
    { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }) : "-";
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const colour = name => `var(--st-${{ ontime: "ok", late: "late", verylate: "bad" }[name] || "none"})`;

  // Whole journeys, from /api/route, kept for a little while.
const journeys = new Map();
window.journeyFor = async function journeyFor(trainId) {
  const kept = journeys.get(trainId);
  if (kept && Date.now() - kept.at < 25000) return kept.route;
  try {
    const route = await getJSON(`/api/route?train_id=${encodeURIComponent(trainId)}`);
    if (!route.error && route.calls) journeys.set(trainId, { at: Date.now(), route });
    return route.error ? null : route;
  } catch (err) { return kept?.route || null; }
}

const lateClass = m => m == null ? "" : m <= 0 ? "ok" : m < VERY_LATE_MINUTES ? "late" : "bad";

// A train's whole journey: stops passed (with actual times), where it is now,
// and stops to come (with expected times). `mine` marks the board's station.
window.journeyHtml = function journeyHtml(r, mine) {
  const rows = [];
  const moving = !r.calls.some(c => c.here);
  const dot = colour(r.delay_minutes > 0 ? (r.delay_minutes < VERY_LATE_MINUTES ? "late" : "verylate") : "ontime");
  r.calls.forEach((c, i) => {
    // The moving train sits between the last stop passed and the next one.
    if (moving && !c.passed && i > 0 && r.calls[i - 1].passed) {
      rows.push(`<li class="now" style="--c:${dot}"><span></span></li>`);
    }
    const cls = [c.here ? "here" : c.passed ? "passed" : "upcoming", c.crs && c.crs === mine ? "mine" : ""].join(" ");
    let tm;
    if (c.actual) {
      const d = c.delay_minutes;
      tm = `<span class="${lateClass(d)}">${time(c.actual)}</span>` +
           (d ? ` <small>${Math.abs(d)} ${d < 0 ? "early" : "late"}</small>` : "");
    } else if (c.passed) {
      tm = `<small>passed</small>`;
    } else if (c.expected && time(c.expected) !== time(c.planned)) {
      tm = `<s>${time(c.planned)}</s><span class="${lateClass(r.delay_minutes)}">${time(c.expected)}</span>`;
    } else {
      tm = time(c.planned);
    }
    rows.push(`<li class="${cls}"><span>${esc(c.name)}${c.platform ? `<span class="jplat">Plat ${esc(c.platform)}</span>` : ""}</span>` +
              `<span class="tm">${tm}</span></li>`);
  });
  const head = [r.operator, r.where].filter(Boolean).map(esc).join(". ");
  return `<div class="journey">${head ? `<div class="where">${head}</div>` : ""}` +
    (r.cancelled ? `<div class="note">Cancelled</div>` : "") + `<ol class="stops">${rows.join("")}</ol></div>`;
}

// Before a train has been reported: its planned stops, from the board.
window.plannedJourneyHtml = function plannedJourneyHtml(d, station) {
  const late = d.state !== "cancelled" && d.delay_minutes > 0 ? d.delay_minutes : 0;
  const calls = [
    ...d.calls.map((c, i) => ({ name: c.name, planned: c.planned, actual: c.actual, delay_minutes: c.delay_minutes,
      passed: !!c.actual, here: false, crs: i === d.calls.length - 1 ? station : null })),
    ...d.calls_after.map(c => ({ name: c.name, planned: c.planned, crs: c.crs, passed: false, here: false,
      expected: late ? new Date(new Date(c.planned).getTime() + late * 60000).toISOString() : null })),
  ];
  const info = [d.status_text, d.last_report].filter(Boolean).map(esc).join(". ");
  return (info ? `<div class="note">${info}</div>` : "") +
    d.warnings.map(w => `<div class="warn">${esc(w)}</div>`).join("") +
    journeyHtml({ calls, operator: d.operator, delay_minutes: d.delay_minutes, where: null }, station);
}

})();
