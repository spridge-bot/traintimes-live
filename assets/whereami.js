// Where you are, and the trip you're most likely about to make, shared by
// the map and the departure board (needs settings.js).
//
//   likelyTrip({lat, lon}, stations) -> {from, to, why} or null
//     at your home or work station: towards the other
//     at another station: from there, to anywhere (just what's leaving)
//     near work: from work, towards home
//     near home: from home, towards work on a weekday morning, otherwise anywhere
//     elsewhere: the nearest station (within 30 km), towards home
//   locationAllowed() -> Promise<bool>: on in Settings, or already granted
(function () {
  const AT_STATION_KM = 0.4;
  window.kmBetween = function (a, b) {
    const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  };

  window.likelyTrip = function (here, stations) {
    const byCrs = crs => stations.find(st => st.crs === crs);
    let nearest = null, best = Infinity;
    for (const st of stations) {
      const d = kmBetween(here, st);
      if (d < best) { best = d; nearest = st; }
    }
    if (!nearest || best > 30) return null;
    const home = byCrs(ttSettings.get("home")), work = byCrs(ttSettings.get("work"));
    if (best < AT_STATION_KM) {
      // At home or work: the next trains to the other. Anywhere else: everything leaving.
      if (home && work && nearest.crs === home.crs) return { from: home.crs, to: work.crs, why: `You're at ${home.name}: trains to work` };
      if (home && work && nearest.crs === work.crs) return { from: work.crs, to: home.crs, why: `You're at ${work.name}: trains home` };
      return { from: nearest.crs, to: null, why: `You're at ${nearest.name}` };
    }
    const near = st => st && kmBetween(here, st) < 3;
    if (near(work) && home) return { from: work.crs, to: home.crs, why: `You're near ${work.name}: trains home` };
    if (near(home)) {
      const now = new Date(), day = now.toLocaleString("en-GB", { weekday: "short", timeZone: "Europe/London" });
      const hour = Number(now.toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Europe/London" }));
      const morning = !["Sat", "Sun"].includes(day) && hour >= 3 && hour < 12;
      return { from: home.crs, to: morning && work ? work.crs : null,
               why: `You're near ${home.name}` + (morning && work ? ": trains to work" : "") };
    }
    return { from: nearest.crs, to: home && home.crs !== nearest.crs ? home.crs : null,
             why: `Nearest station to you, ${best < 1 ? "under 1" : best.toFixed(best < 10 ? 1 : 0)} km` };
  };

  window.locationAllowed = async function () {
    if (!navigator.geolocation || !window.isSecureContext) return false;
    if (ttSettings.get("use_location")) return true;
    try { return (await navigator.permissions?.query({ name: "geolocation" }))?.state === "granted"; }
    catch (e) { return false; }
  };
})();
