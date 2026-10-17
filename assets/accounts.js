// Accounts live on the TrainTimes server. On the published site (GitHub
// Pages) there's no server behind the page, so account calls go to the one
// named in data-api on <html> (set by nrfeeds.publish from PUBLIC_API).
//
//   ACCOUNTS                 true where accounts work (the server, or the published site with data-api)
//   accountJSON(path, body)  GET (or POST body) an account endpoint, e.g. "/api/account?token=..."
//   liveJSON(path)           on the published site, live data from the server (e.g. "/api/board?..."),
//                            or null if it can't be reached (then use the published snapshot; it's
//                            tried again after a minute)
//   liveUp()                 whether the server answered last time
(function () {
  const root = document.documentElement;
  const onStatic = root.dataset.static === "1";
  const base = onStatic ? (root.dataset.api || "") : "";
  window.ACCOUNTS = !onStatic || !!base;
  window.accountURL = path => base + path;
  let downUntil = 0;
  window.liveUp = () => !!base && Date.now() >= downUntil;
  window.liveJSON = async function (path) {
    if (!liveUp()) return null;
    const stop = new AbortController(), timer = setTimeout(() => stop.abort(), 10000);
    try {
      const res = await fetch(base + path, { cache: "no-store", signal: stop.signal });
      return res.ok ? await res.json() : null;       // it answered: up, just not for that
    } catch (e) {
      // Can't connect: down for a minute. Just slow for this one request: use
      // the snapshot for it, but keep asking the server for everything else.
      if (e.name !== "AbortError") downUntil = Date.now() + 60e3;
      return null;
    } finally { clearTimeout(timer); }
  };
  window.accountJSON = async function (path, body) {
    const res = await fetch(base + path, body ? {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    } : { cache: "no-store" });
    return res.json();
  };
})();
