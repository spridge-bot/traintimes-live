// Your settings on this device, shared by every page (see settings.html).
//
//   ttSettings.get("home")          -> "BCS" or null
//   ttSettings.set("map_focus", "mine")
//
// Kept in localStorage; home, work, location and theme use the keys the pages
// used before, so earlier choices carry over.
(function () {
  const DEFAULTS = {
    home: null, work: null,          // stations for the Next train page
    board_from: null, board_to: null,  // where Departures (and the map's panel) open
    use_location: false,             // Next train: pick the direction from where you are
    map_focus: "ahead",              // a train selected on the map: "ahead" (trains ahead on its line), "mine", "all"
    map_network: false,              // ...and still show the rest of the railway network
    share_position: true,            // on a train: share where it is (not who you are), so others see it
    theme: "system",                 // system, light, dark
  };
  const KEYS = { home: "tt_home", work: "tt_work", use_location: "tt_geo", theme: "tt-theme" };
  const read = () => { try { return JSON.parse(localStorage.getItem("tt_settings") || "{}"); } catch (e) { return {}; } };

  function get(key) {
    if (KEYS[key]) {
      const v = localStorage.getItem(KEYS[key]);
      if (key === "use_location") return v === "1";
      if (key === "theme") return v || "system";
      return v || DEFAULTS[key];
    }
    const saved = read();
    return key in saved ? saved[key] : DEFAULTS[key];
  }

  function set(key, value) {
    if (KEYS[key]) {
      const empty = value === null || value === "" || value === false || (key === "theme" && value === "system");
      if (empty) localStorage.removeItem(KEYS[key]);
      else localStorage.setItem(KEYS[key], key === "use_location" ? "1" : value);
      if (key === "theme") {
        const root = document.documentElement;
        empty ? root.removeAttribute("data-theme") : root.setAttribute("data-theme", value);
        window.dispatchEvent(new CustomEvent("tt-theme", { detail: value }));
      }
    } else {
      const saved = read();
      saved[key] = value;
      localStorage.setItem("tt_settings", JSON.stringify(saved));
    }
  }

  function reset() {
    ["tt_settings", "tt_home", "tt_work", "tt_geo", "tt-theme", "tt_sheet"].forEach(k => localStorage.removeItem(k));
    document.documentElement.removeAttribute("data-theme");
  }

  window.ttSettings = { get, set, reset, DEFAULTS };
})();
