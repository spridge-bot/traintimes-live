// Trains between updates, and which one you're on (needs whereami.js).
//
//   glidePosition(t)            -> {lat, lon, heading} where t is now, from t.move
//   spotTrain(fix, trains)      -> the train you're on, or null
//                                  (fix: {lat, lon, speed m/s, heading}; moving, near a train going your way)
//   tripBetween(route, a, b)    -> {on, off} call indexes: travelling from a to b (CRS) on this route,
//                                  whichever way round it runs, or null
//   sharePosition(trainId, fix) -> tell the server where the train you're on is (riders.py), at most
//                                  every 10 s, unless turned off in Settings
(function () {
  const MOVING_MS = 4;            // m/s (about 9 mph): faster than walking
  const NEAR_KM = 1.5;

  window.alongPath = function (pts, f) {
    const d = [0];
    for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(
      (pts[i][1] - pts[i - 1][1]) * Math.cos(pts[i][0] * Math.PI / 180), pts[i][0] - pts[i - 1][0]));
    const target = f * d[d.length - 1];
    let i = 1;
    while (i < pts.length - 1 && d[i] < target) i++;
    const seg = d[i] - d[i - 1] || 1, g = Math.max(0, Math.min(1, (target - d[i - 1]) / seg));
    const [y1, x1] = pts[i - 1], [y2, x2] = pts[i];
    const heading = (Math.atan2((x2 - x1) * Math.cos(y1 * Math.PI / 180), y2 - y1) * 180 / Math.PI + 360) % 360;
    return { lat: y1 + (y2 - y1) * g, lon: x1 + (x2 - x1) * g, heading };
  };

  const RIDER_FOR_S = 90, CARRY_ON_S = 20;
  window.glidePosition = function (t, now = Date.now()) {
    // Someone on it said where it is: from there, carrying on at their speed
    // and heading for a little while.
    if (t.gps) {
      const g = t.gps;
      g._at = g._at ?? now - g.age * 1000;
      const secs = (now - g._at) / 1000;
      if (secs < RIDER_FOR_S) {
        const go = (g.speed || 0) * Math.min(secs, CARRY_ON_S) / 1000, h = (g.heading ?? 0) * Math.PI / 180;
        if (!go || g.heading == null) return { lat: g.lat, lon: g.lon, heading: g.heading ?? t.heading };
        return { lat: g.lat + go * Math.cos(h) / 111.32,
                 lon: g.lon + go * Math.sin(h) / (111.32 * Math.cos(g.lat * Math.PI / 180)), heading: g.heading };
      }
    }
    const m = t.move;
    if (!m || !m.pts || m.pts.length < 2) return null;
    const t0 = Date.parse(m.t0), t1 = Date.parse(m.t1);
    if (!(t1 > t0)) return null;
    const f = Math.max(0, Math.min((now - t0) / (t1 - t0), m.hold ?? 1));
    return alongPath(m.pts, f);
  };

  window.spotTrain = function (fix, trains) {
    if (!fix || Date.now() - fix.at > 60e3 || !((fix.speed ?? 0) > MOVING_MS)) return null;
    let best = null, bestKm = NEAR_KM;
    for (const t of trains) {
      const p = t._shown || glidePosition(t) || t;
      const km = kmBetween(fix, p);
      if (km >= bestKm) continue;
      if (fix.heading != null && t.heading != null &&
          Math.abs(((fix.heading - t.heading) + 540) % 360 - 180) > 70) continue;
      best = t; bestKm = km;
    }
    return best;
  };

  // A fix with speed and direction, worked out from the previous one where
  // the phone doesn't say.
  window.nextFix = function (before, c) {
    const now = Date.now();
    const fix = { lat: c.latitude, lon: c.longitude, at: now, speed: c.speed, heading: c.heading, accuracy: c.accuracy };
    if (before && now - before.at > 3000) {
      const km = kmBetween(before, fix), secs = (now - before.at) / 1000;
      if (fix.speed == null) fix.speed = km * 1000 / secs;
      if (fix.heading == null && km > 0.05) fix.heading = (Math.atan2(
        (fix.lon - before.lon) * Math.cos(fix.lat * Math.PI / 180), fix.lat - before.lat) * 180 / Math.PI + 360) % 360;
    } else if (before) { fix.speed ??= before.speed; fix.heading ??= before.heading; }
    return fix;
  };

  let sharedAt = 0;
  window.sharePosition = function (trainId, fix) {
    if (!trainId || !fix || !window.ACCOUNTS || ttSettings.get("share_position") === false) return;
    if (Date.now() - sharedAt < 10e3 || Date.now() - fix.at > 60e3) return;
    if (fix.accuracy != null && fix.accuracy > 100) return;
    sharedAt = Date.now();
    fetch(accountURL("/api/position"), { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ train_id: trainId, lat: fix.lat, lon: fix.lon, accuracy: fix.accuracy,
                             speed: fix.speed, heading: fix.heading }) }).catch(() => {});
  };

  window.tripBetween = function (route, a, b) {
    const calls = route.calls || [];
    const ia = calls.findIndex(c => c.crs === a), ib = calls.findIndex(c => c.crs === b);
    if (ia < 0 || ib < 0) return null;
    return ia < ib ? { on: ia, off: ib } : { on: ib, off: ia };
  };
})();
