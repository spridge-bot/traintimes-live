// Station search boxes, shared by the departures page and the map panel.
// Tap the box to see every station (the current one stays as a faint
// placeholder), type to narrow it by name or code, tap one to choose it, or
// clear the box with the x button. Leaving the box without choosing puts the
// previous station back.
//
//   const from = stationPicker(inputEl, listEl, {
//     stations: () => [{crs, name}, ...],    // what to offer (may change)
//     onPick: crs => ...,                   // crs, or null when cleared
//     optional: true,                       // clearing means "anywhere"
//     emptyLabel: "Anywhere",
//   });
//   from.set("BCS");
(function () {
  const MAX = 5000;         // every station: typing narrows it
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  window.stationPicker = function (input, list, opts) {
    let crs = null, active = -1, shown = [];
    const nameOf = code => (opts.stations().find(s => s.crs === code) || {}).name || code || "";
    const wrap = document.createElement("span");
    wrap.className = "picker";
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "picker-clear";
    clear.setAttribute("aria-label", `Clear ${input.getAttribute("aria-label") || "station"}`);
    clear.innerHTML = '<i class="ph ph-x" aria-hidden="true"></i>';
    wrap.appendChild(clear);
    input.setAttribute("autocomplete", "off");
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("list");
    list.setAttribute("role", "listbox");
    list.hidden = true;

    function matches(text) {
      const t = text.trim().toLowerCase();
      const all = opts.stations();
      if (!t) return all.slice(0, MAX);
      const code = all.filter(s => s.crs.toLowerCase() === t);
      const starts = all.filter(s => s.name.toLowerCase().startsWith(t) && !code.includes(s));
      const inside = all.filter(s => !s.name.toLowerCase().startsWith(t) && s.name.toLowerCase().includes(t));
      return [...code, ...starts, ...inside].slice(0, MAX);
    }

    function render() {
      shown = matches(input.value);
      active = Math.min(active, shown.length - 1);
      const more = "";
      list.innerHTML = (opts.optional && !input.value
        ? `<li role="option" data-crs="">${esc(opts.emptyLabel || "Anywhere")}</li>` : "") +
        shown.map((s, i) => `<li role="option" data-crs="${s.crs}" aria-selected="${i === active}"` +
          `${s.crs === crs ? ' class="current"' : ""}><span>${esc(s.name)}</span><small>${s.crs}</small></li>`).join("") +
        (shown.length ? more : `<li class="picker-note">No station matches "${esc(input.value)}"</li>`);
      list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
    }

    function open() {
      input.placeholder = crs ? nameOf(crs) : (opts.emptyLabel || "Station name or code");
      input.value = "";
      active = -1;
      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
      render();
    }

    function close(restore = true) {
      list.hidden = true;
      input.setAttribute("aria-expanded", "false");
      if (restore) input.value = crs ? nameOf(crs) : "";
      input.placeholder = opts.optional ? (opts.emptyLabel || "Anywhere") : "Station name or code";
    }

    function pick(code) {
      crs = code || null;
      close();
      input.blur();
      opts.onPick(crs);
    }

    input.addEventListener("focus", open);
    input.addEventListener("input", () => { active = shown.length ? 0 : -1; render(); });
    input.addEventListener("keydown", e => {
      if (list.hidden) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        active = Math.max(0, Math.min(shown.length - 1, active + (e.key === "ArrowDown" ? 1 : -1)));
        render();
      } else if (e.key === "Enter") {
        e.preventDefault();
        const choice = shown[Math.max(active, 0)];
        if (choice) pick(choice.crs);
        else if (opts.optional && !input.value) pick(null);
      } else if (e.key === "Escape") {
        close();
        input.blur();
      }
    });
    // Choose on pointerdown, before the input's blur closes the list.
    list.addEventListener("pointerdown", e => {
      const li = e.target.closest("li[data-crs]");
      if (!li) return;
      e.preventDefault();
      pick(li.dataset.crs || null);
    });
    input.addEventListener("blur", () => setTimeout(() => { if (!list.hidden) close(); }, 150));
    clear.addEventListener("click", () => {
      if (opts.optional) {
        crs = null;
        input.value = "";
        opts.onPick(null);
      }
      input.focus();
    });

    return {
      set(code) { crs = code || null; if (document.activeElement !== input) input.value = crs ? nameOf(crs) : ""; },
      get value() { return crs; },
      refresh() { if (!list.hidden) render(); },
    };
  };
})();
