// Which platform to show for a train, and how sure we are:
//   live     reported by the train today
//   changed  reported today, and not the one in the timetable
//   likely   not in the timetable (or it usually uses another one): the one it
//            has used most on recent days like today
//   booked   the timetable's
//
//   platformHtml(d) -> '<span class="plat ...">Plat 3</span>' or ""
(function () {
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const SURE = 0.6;          // share of recent days before we call it likely

  window.platformInfo = function (d) {
    const booked = d.platform, u = d.platform_usual;
    if (d.platform_actual) {
      const changed = booked && booked !== d.platform_actual;
      return { platform: d.platform_actual, kind: changed ? "changed" : "live",
               label: changed ? `Now plat ${d.platform_actual}` : `Plat ${d.platform_actual}`,
               title: changed ? `Reported at platform ${d.platform_actual} today (timetabled ${booked})`
                              : `Reported at platform ${d.platform_actual} today` };
    }
    const usual = u && u.days / u.of >= SURE ? u : null;
    const history = u ? `platform ${u.platform} on ${u.days} of the last ${u.of} days recorded` : "";
    if (usual && usual.platform !== booked) {
      return { platform: usual.platform, kind: "likely", label: `Plat ${usual.platform}?`,
               title: `Likely platform ${usual.platform}: used ${history.replace(/^platform \S+ /, "")}` +
                      (booked ? `, though timetabled ${booked}` : "") };
    }
    if (booked) {
      return { platform: booked, kind: "booked", label: `Plat ${booked}`,
               title: `Timetabled platform ${booked}` + (u ? `; used ${history}` : "") };
    }
    return null;
  };

  window.platformHtml = function (d, extra = "") {
    const p = platformInfo(d);
    return p ? `<span class="plat plat-${p.kind} ${extra}" title="${esc(p.title)}" aria-label="${esc(p.title)}">${esc(p.label)}</span>` : "";
  };
})();
