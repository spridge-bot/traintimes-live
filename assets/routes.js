// Journeys with changes (see nrfeeds/planner.py), shared by the map and the
// Next train page.
//
//   const list = await findRoutes("OXF", "BCS");   // [] if none (or not on this site)
//   routeLegsHtml(j, board)   // board: the origin's live departures, for the first train's running
(function () {
  const STATIC = document.documentElement.dataset.static === "1";
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const time = iso => iso ? new Date(iso).toLocaleTimeString("en-GB",
    { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }) : "";
  const mins = (a, b) => Math.round((new Date(b) - new Date(a)) / 60000);

  window.findRoutes = async function (from, to) {
    try {
      if (!STATIC) {
        const res = await fetch(`/api/plan?from=${from}&to=${to}`, { cache: "no-store" });
        return (await res.json()).journeys || [];
      }
      // The published site: planned live by the server when it's up, else
      // worked out ahead for a few destinations only.
      const live = window.liveJSON && await liveJSON(`/api/plan?from=${from}&to=${to}`);
      if (live) return live.journeys || [];
      const res = await fetch(`data/journeys-to-${to}.json`, { cache: "no-store" });
      if (!res.ok) return [];
      const now = Date.now();
      return ((await res.json()).from || {})[from]?.filter(j => new Date(j.departs) > now - 60e3) || [];
    } catch (e) { return []; }
  };

  // The first train's live running, from the origin's departure board.
  window.routeFirstTrain = function (j, board) {
    const leg = j.legs[0];
    return (board || []).find(d => d.planned === leg.departs) || null;
  };

  window.routeSummary = function (j) {
    const via = j.legs.slice(0, -1).map(l => l.to_name).join(" and ");
    return `${j.changes ? `Change at ${via}` : "Direct"} · ${j.minutes} min`;
  };

  window.routeLegsHtml = function (j, board) {
    const live = routeFirstTrain(j, board);
    const late = live && live.state !== "cancelled" && live.delay_minutes > 0 ? live.delay_minutes : 0;
    const parts = [];
    j.legs.forEach((leg, n) => {
      parts.push(`<div class="leg"><b>${time(leg.departs)}</b> ${esc(leg.from_name)} → ${esc(leg.to_name)} <b>${time(leg.arrives)}</b>` +
        `<small>${esc(leg.operator_name || leg.operator || "")}${leg.towards ? `, towards ${esc(leg.towards)}` : ""}</small></div>`);
      const next = j.legs[n + 1];
      if (next) {
        const gap = mins(leg.arrives, next.departs);
        const risky = n === 0 && late && late >= gap - 2;
        parts.push(`<div class="change${risky ? " risky" : ""}">Change at ${esc(leg.to_name)}: ${gap} min` +
          (risky ? ` · the first train is ${late} min late, so this may be missed` : "") + `</div>`);
      }
    });
    return parts.join("");
  };
})();
