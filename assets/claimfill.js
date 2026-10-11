// TrainTimes: fill a Delay Repay claim form with a claim copied from the
// Delays page. Run as a bookmark on the operator's claim page (its security
// settings let a bookmark's own script run, but not fetch anything, so the
// claim comes from the clipboard, or is pasted in when asked).
//
// Fields are found by their labels (date of travel, from, to, times, delay),
// the way Angular Material and plain forms label them. Anything it can't find
// is listed at the end to fill in by hand. It never submits: you check the
// form and press the operator's own Submit.
(async () => {
  const say = text => alert("TrainTimes\n\n" + text);
  let raw = "";
  try { raw = await navigator.clipboard.readText(); } catch (e) { /* not allowed: ask */ }
  if (!/"tt":1/.test(raw)) raw = prompt("Paste the claim copied from TrainTimes (Delays → Claim):") || "";
  let t;
  try { t = JSON.parse(raw); } catch (e) { t = null; }
  if (!t || t.tt !== 1) return say("No claim to fill: on TrainTimes, open Delays and tap Claim first.");

  const labelOf = el => {
    const bits = [el.getAttribute("aria-label"), el.getAttribute("placeholder"), el.name, el.id];
    const field = el.closest("mat-form-field, .mat-mdc-form-field, .form-group, label, fieldset, div");
    const lab = field && field.querySelector("mat-label, label, legend");
    if (lab) bits.unshift(lab.textContent);
    if (el.id) { const l = document.querySelector(`label[for="${el.id}"]`); if (l) bits.unshift(l.textContent); }
    return bits.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  };
  const setValue = (el, value) => {
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
    for (const type of ["input", "change", "keyup"]) el.dispatchEvent(new Event(type, { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
  };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  // Autocompletes (stations): type, then pick the matching suggestion.
  const pickOption = async text => {
    await wait(900);
    const opts = [...document.querySelectorAll("mat-option, [role=option], .autocomplete-option, li[role=option]")];
    const best = opts.find(o => o.textContent.toLowerCase().includes(text.toLowerCase())) || opts[0];
    if (best) { best.click(); return true; }
    return false;
  };
  // Drop-downs (mat-select / select): choose the option matching a value.
  const choose = async (el, value) => {
    if (el.tagName === "SELECT") {
      const o = [...el.options].find(o => o.text.trim().startsWith(value) || o.value === value);
      if (!o) return false;
      el.value = o.value; el.dispatchEvent(new Event("change", { bubbles: true })); return true;
    }
    el.click(); await wait(500);
    const o = [...document.querySelectorAll("mat-option, [role=option]")].find(o => o.textContent.trim().startsWith(value));
    if (o) { o.click(); await wait(300); return true; }
    document.body.click();
    return false;
  };

  const me = t.me || {};
  const ukDate = iso => iso ? iso.split("-").reverse().join("/") : "";
  const rules = [
    // You (from your TrainTimes claim details)
    ["First name", /first name|forename|given name/i, me.first_name],
    ["Last name", /last name|surname|family name/i, me.last_name],
    ["Email", /e-?mail/i, me.email],
    ["Phone", /phone|mobile|telephone/i, me.phone],
    ["Address", /address( line)? ?1|^address\b|street|house/i, me.address1],
    ["Address line 2", /address( line)? ?2/i, me.address2],
    ["Town", /town|city/i, me.town],
    ["Postcode", /post ?code/i, me.postcode],
    ["Ticket type", /ticket type|type of ticket/i, me.ticket_type],
    ["Ticket number", /ticket (number|reference)|booking reference|smart ?card (number|id)|reference/i, me.ticket_number],
    ["Ticket price", /price|cost|amount paid|how much/i, me.ticket_price && me.ticket_price.replace(/^£/, "")],
    ["Railcard", /railcard/i, me.railcard],
    ["Season valid from", /valid from|start date/i, ukDate(me.valid_from)],
    ["Season valid until", /valid (until|to)|expiry|end date/i, ukDate(me.valid_until)],
    // The journey
    ["Date of travel", /date of (travel|journey)|travel date|journey date|date travelled|^date\b/i, t.date_uk],
    ["From", /\b(from|departure station|origin|station you (got on|boarded)|boarding)\b/i, t.from, "station"],
    ["To", /\b(to|destination|arrival station|station you (got off|alighted)|alighting)\b/i, t.to, "station"],
    ["Scheduled departure", /(scheduled|planned|timetabled)?.*depart(ure)? time|time of departure|departure time/i, t.dep, "time"],
    ["Scheduled arrival", /(scheduled|planned|timetabled).*arriv/i, t.arr_due, "time"],
    ["Actual arrival", /actual.*arriv|arrived at|time you arrived/i, t.arr_actual, "time"],
    ["Minutes delayed", /(length of|minutes?).*delay|how late|delay (in|length)/i, t.delay != null ? String(t.delay) : null],
  ];
  const done = [], missed = [];
  const inputs = [...document.querySelectorAll("input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), textarea, select, mat-select")]
    .filter(el => el.offsetParent !== null);
  const used = new Set();
  for (const [name, pattern, value, kind] of rules) {
    if (value == null || value === "") continue;
    const el = inputs.find(el => !used.has(el) && pattern.test(labelOf(el)));
    if (!el) { missed.push(`${name}: ${value}`); continue; }
    used.add(el);
    let ok = true;
    if (el.tagName === "SELECT" || el.tagName === "MAT-SELECT") ok = await choose(el, value);
    else {
      el.focus();
      setValue(el, value);
      if (kind === "station") ok = await pickOption(value);
    }
    (ok ? done : missed).push(`${name}: ${value}`);
  }
  say((done.length ? "Filled in:\n• " + done.join("\n• ") : "Couldn't find the fields on this page.") +
      (missed.length ? "\n\nPlease fill in yourself:\n• " + missed.join("\n• ") : "") +
      "\n\nCheck everything, add your ticket, then press Submit.");
})();
