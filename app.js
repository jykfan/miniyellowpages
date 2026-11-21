/* Mini Yellow Pages: neighborhood directory & emergency-prep organizer.
   All data lives in this browser's localStorage. Use Settings → Export to back up. */
(() => {
  "use strict";

  const STORE_KEY = "myp:data:v1";
  const KITS_KEY = "myp:kits:v1"; // which go bag / stay kit items are packed (this device only)
  const PRINT_KEY = "myp:print:v1";
  const SHARE_FIELDS = [
    ["phone", "Phone"],
    ["email", "Email"],
    ["occupation", "Occupation"],
    ["skills", "Skills"],
    ["resources", "Equipment & resources"],
    ["members", "Children"],
    ["needs", "Special needs"],
    ["pets", "Pets"],
  ];

  // ---------- utilities ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const today = () => new Date().toISOString().slice(0, 10);
  const splitList = (s) => String(s || "").split(",").map((x) => x.trim()).filter(Boolean);
  const uniq = (arr) => [...new Set(arr)];
  const fmtDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso + (iso.length === 10 ? "T12:00:00" : ""));
    return isNaN(d) ? iso : d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  };

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2600);
  }

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  function safeSet(key, val) {
    try { localStorage.setItem(key, val); return true; } catch { return false; }
  }

  // ---------- people ----------
  // A household holds a list of people. Adults: name, contact, work, skills, needs.
  // Children: optional first name, optional age, needs.
  function toCount(v) {
    if (v === null || v === undefined || String(v).trim() === "") return null;
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }
  const listOf = (v) => (Array.isArray(v) ? v : String(v || "").split(/[;,]/)).map((x) => String(x).trim()).filter(Boolean);

  function normalizePerson(p = {}) {
    const str = (v) => String(v ?? "").trim();
    const child = p.kind === "child";
    return {
      kind: child ? "child" : "adult",
      first: str(p.first),
      last: child ? "" : str(p.last),
      age: child ? toCount(p.age) : null,
      phone: child ? "" : str(p.phone),
      email: child ? "" : str(p.email),
      occupation: child ? "" : str(p.occupation),
      skills: child ? [] : uniq(listOf(p.skills)),
      needs: str(p.needs),
    };
  }

  // Fields households had before people were tracked one by one
  const LEGACY_PERSON_FIELDS = ["phone", "phone2", "email", "occupation", "skills", "needs", "adults", "children"];
  // Turn an older household's combined fields into people
  function peopleFromLegacy(h) {
    const adults = toCount(h.adults), children = toCount(h.children);
    const skills = listOf(h.skills);
    const hasDetails = h.phone || h.phone2 || h.email || h.occupation || skills.length || h.needs;
    const people = [];
    if (hasDetails || adults) {
      // Use the listing name as the person's name only when it looks like one person ("Ruth Goldberg")
      const nm = String(h.names || "").trim();
      const single = (adults ?? 1) <= 1 && nm && !/&|\band\b|family|^the\s/i.test(nm);
      const [first, ...rest] = single ? nm.split(/\s+/) : [""];
      people.push(normalizePerson({
        kind: "adult", first, last: rest.join(" "),
        phone: [h.phone, h.phone2].filter(Boolean).join(" / "), email: h.email, occupation: h.occupation, skills, needs: h.needs,
      }));
    }
    while (people.length < (adults || 0)) people.push(normalizePerson({ kind: "adult" }));
    for (let i = 0; i < (children || 0); i++) people.push(normalizePerson({ kind: "child" }));
    return people;
  }

  const adultsOf = (h) => h.people.filter((p) => p.kind === "adult");
  const childrenOf = (h) => h.people.filter((p) => p.kind === "child");
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const firstPhone = (h) => adultsOf(h).map((p) => p.phone).find(Boolean) || "";
  const hasNeeds = (h) => h.people.some((p) => p.needs);

  // A person's name as shown inside their household's listing ("Maria", or "Wei Chen" if the surname differs)
  function personName(p, h) {
    if (!p.first) return p.kind === "child" ? "Child" : "Adult";
    const showLast = p.last && !String(h?.names || "").toLowerCase().includes(p.last.toLowerCase());
    return showLast ? `${p.first} ${p.last}` : p.first;
  }
  function childLabel(k) {
    const age = k.age != null ? ` (${k.age})` : "";
    return k.first ? `${k.first}${age}` : `child${age}`;
  }
  // "Children: Sofia (6), Leo (9)" when names are known, otherwise "2 children (ages 6, 9)"
  function childrenText(h) {
    const kids = childrenOf(h);
    if (!kids.length) return "";
    if (kids.some((k) => k.first)) return `Children: ${kids.map(childLabel).join(", ")}`;
    const ages = kids.map((k) => k.age).filter((a) => a != null);
    let detail = "";
    if (ages.length === kids.length) detail = ` (age${ages.length === 1 ? "" : "s"} ${ages.join(", ")})`;
    else if (ages.length) detail = ` (${ages.length === 1 ? "one" : ages.length} aged ${ages.join(", ")})`;
    return plural(kids.length, "child", "children") + detail;
  }
  // "4 people (2 adults, 2 children)"
  function peopleCountText(h) {
    const a = adultsOf(h).length, c = childrenOf(h).length;
    if (!a && !c) return "";
    return plural(a + c, "person", "people") + (c ? ` (${plural(a, "adult", "adults")}, ${plural(c, "child", "children")})` : "");
  }
  // Who to account for at a check-in: "Maria, Tom · 2 children (ages 6, 9)"
  function membersLine(h) {
    const adults = adultsOf(h);
    const named = adults.filter((p) => p.first).map((p) => personName(p, h));
    const unnamed = adults.length - named.length;
    const who = [named.join(", "), unnamed ? plural(unnamed, "adult", "adults") : ""].filter(Boolean).join(" + ");
    let line = [who, childrenText(h)].filter(Boolean).join(" · ");
    if (h.household) line += line ? ` (${h.household})` : h.household;
    return line;
  }
  // Special needs, labeled by person: "Leo (9): severe peanut allergy" (no label in one-person households)
  function needsList(h) {
    return h.people.filter((p) => p.needs).map((p) => {
      if (h.people.length === 1) return p.needs;
      const who = p.kind === "child" ? childLabel(p).replace(/^child/, "Child") : personName(p, h);
      return `${who}: ${p.needs}`;
    });
  }
  // Listing name suggested from the adults: "Maria & Tom Alvarez", or "Mei Chen & Wei Lin"
  function suggestListing(people) {
    const adults = people.filter((p) => p.kind === "adult" && p.first);
    if (!adults.length) return "";
    const lasts = uniq(adults.map((p) => p.last).filter(Boolean));
    const joinNames = (xs) => (xs.length > 2 ? `${xs.slice(0, -1).join(", ")} & ${xs[xs.length - 1]}` : xs.join(" & "));
    if (lasts.length <= 1) return [joinNames(adults.map((p) => p.first)), lasts[0]].filter(Boolean).join(" ");
    return joinNames(adults.map((p) => [p.first, p.last].filter(Boolean).join(" ")));
  }
  // Headcount for a group of households; "at least" when some households haven't listed everyone
  function headcount(list) {
    const known = list.filter((h) => h.people.length);
    if (!known.length) return "";
    const total = known.reduce((n, h) => n + h.people.length, 0);
    const kids = known.reduce((n, h) => n + childrenOf(h).length, 0);
    const atLeast = known.length < list.length || list.some((h) => h._kidsHidden) ? "at least " : "";
    return `${atLeast}${plural(total, "person", "people")}${kids ? `, ${plural(kids, "child", "children")}` : ""}`;
  }

  // ---------- state ----------
  function blankState() {
    return {
      version: 1,
      settings: {
        name: "",
        organizer: "",
        organizerContact: "",
        meetingPoint: "",
        radio: "", // local emergency radio stations, e.g. "KCBS 740 AM, KQED 88.5 FM"
        podSize: 5,
        numbers: DEFAULT_NUMBERS.map((n) => ({ ...n })),
      },
      households: [],
      pods: [],
    };
  }

  function normalizeHousehold(h) {
    const saved = h.consent?.share || {};
    // "pets" used to share one checkbox with special needs, so older data inherits that choice
    const share = Object.fromEntries(SHARE_FIELDS.map(([k]) => [k, saved[k] ?? (k === "pets" ? saved.needs : undefined) ?? true]));
    return {
      id: h.id || uid(),
      names: h.names || "", // listing name, e.g. "Maria & Tom Alvarez"
      address: h.address || "",
      unit: h.unit || "",
      people: Array.isArray(h.people) ? h.people.map(normalizePerson) : peopleFromLegacy(h),
      household: h.household || "", // other details about the household
      resources: listOf(h.resources),
      pets: h.pets || "",
      notes: h.notes || "",
      consent: {
        given: !!h.consent?.given,
        date: h.consent?.date || "",
        signedBy: h.consent?.signedBy || "",
        share,
      },
      podId: h.podId || null,
      updatedAt: h.updatedAt || new Date().toISOString(),
    };
  }

  function load() {
    const raw = safeGet(STORE_KEY);
    if (!raw) return blankState();
    try {
      return migrate(JSON.parse(raw));
    } catch {
      return blankState();
    }
  }

  function migrate(data) {
    const base = blankState();
    const s = { ...base, ...data };
    s.settings = { ...base.settings, ...(data.settings || {}) };
    delete s.settings.formReturn; // removed setting (sign-up form return instructions)
    if (!Array.isArray(s.settings.numbers)) s.settings.numbers = base.settings.numbers;
    // Former defaults that aren't about emergency prep; removed only if left exactly as shipped
    const retired = ["Poison Control|1-800-222-1222", "988 Suicide & Crisis Lifeline|988"];
    s.settings.numbers = s.settings.numbers.filter((n) => !retired.includes(`${n.label}|${n.number}`));
    s.households = (data.households || []).map(normalizeHousehold);
    s.pods = (data.pods || []).map((p) => ({ id: p.id || uid(), name: p.name || "", captainId: p.captainId || null }));
    // drop dangling pod references
    const podIds = new Set(s.pods.map((p) => p.id));
    s.households.forEach((h) => { if (h.podId && !podIds.has(h.podId)) h.podId = null; });
    return s;
  }

  let state = load();
  function save() {
    if (!safeSet(STORE_KEY, JSON.stringify(state))) {
      toast("Couldn't save. Browser storage is unavailable. Export a backup!");
    }
  }

  // ---------- address helpers ----------
  function parseAddress(addr) {
    const m = String(addr || "").trim().match(/^(\d+)\s*[-A-Za-z]?\s+(.*)$/);
    if (!m) return { num: Infinity, street: String(addr || "").trim().toLowerCase() };
    return { num: parseInt(m[1], 10), street: m[2].trim().toLowerCase().replace(/\./g, "") };
  }
  function byAddress(a, b) {
    const pa = parseAddress(a.address), pb = parseAddress(b.address);
    return pa.street.localeCompare(pb.street) || pa.num - pb.num || (a.unit || "").localeCompare(b.unit || "");
  }
  function byName(a, b) { return a.names.localeCompare(b.names, undefined, { sensitivity: "base" }); }
  const fullAddress = (h) => h.address + (h.unit ? `, ${h.unit}` : "");

  // ---------- routing ----------
  const routes = { directory: renderDirectory, signup: renderSignup, pods: renderPods, prepare: renderPrepare, print: renderPrint, settings: renderSettings };
  function currentRoute() {
    const r = location.hash.replace(/^#\/?/, "").split("/")[0];
    return routes[r] ? r : "directory";
  }
  function render() {
    const r = currentRoute();
    const tab = r === "signup" ? "directory" : r; // sign-up forms live under the Directory tab
    $$("#tabs a").forEach((a) => a.classList.toggle("active", a.dataset.route === tab));
    $("#hood-name").textContent = state.settings.name || "Your neighborhood";
    document.title = (state.settings.name ? state.settings.name + " · " : "") + "Mini Yellow Pages";
    routes[r]();
  }
  window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });

  // ---------- Directory ----------
  const dirUI = { q: "", skill: "", show: "all", sort: "address" };

  function renderDirectory() {
    const hs = state.households;
    const allSkills = uniq(hs.flatMap((h) => [...h.people.flatMap((p) => p.skills), ...h.resources])).sort();
    if (dirUI.skill && !allSkills.includes(dirUI.skill)) dirUI.skill = "";
    const consented = hs.filter((h) => h.consent.given).length;

    $("#view").innerHTML = `
      <section class="page-head">
        <div>
          <h1>Directory</h1>
          <p class="muted">${hs.length} household${hs.length === 1 ? "" : "s"} · ${consented} consented to be listed</p>
        </div>
        <div class="btn-row">
          <a class="btn" href="#/signup">Print sign-up forms</a>
          <label class="btn" title="Restore a .json backup, or add/update households from a .csv spreadsheet">Import…<input type="file" class="import-file" accept=".csv,.json,text/csv,application/json" hidden></label>
          ${hs.length ? `<button class="btn" data-act="export-csv">Export .csv</button>
          <button class="btn" data-act="export-json">Export backup .json</button>` : ""}
          <button class="btn primary" data-act="add">+ Add household</button>
        </div>
      </section>
      ${hs.length === 0 ? emptyDirectory() : `
      <section class="toolbar">
        <input type="search" id="q" placeholder="Search names, streets, skills…" value="${esc(dirUI.q)}" aria-label="Search">
        <select id="skill" aria-label="Filter by skill or resource">
          <option value="">All skills &amp; resources</option>
          ${allSkills.map((s) => `<option ${s === dirUI.skill ? "selected" : ""}>${esc(s)}</option>`).join("")}
        </select>
        <select id="show" aria-label="Filter by consent">
          <option value="all" ${dirUI.show === "all" ? "selected" : ""}>Everyone</option>
          <option value="yes" ${dirUI.show === "yes" ? "selected" : ""}>Consented</option>
          <option value="no" ${dirUI.show === "no" ? "selected" : ""}>Needs consent</option>
        </select>
        <select id="sort" aria-label="Sort">
          <option value="address" ${dirUI.sort === "address" ? "selected" : ""}>Sort by street</option>
          <option value="name" ${dirUI.sort === "name" ? "selected" : ""}>Sort by name</option>
        </select>
      </section>
      <section class="cards" id="cards"></section>`}
    `;
    if (hs.length) {
      drawCards();
      $("#q").addEventListener("input", (e) => { dirUI.q = e.target.value; drawCards(); });
      $("#skill").addEventListener("change", (e) => { dirUI.skill = e.target.value; drawCards(); });
      $("#show").addEventListener("change", (e) => { dirUI.show = e.target.value; drawCards(); });
      $("#sort").addEventListener("change", (e) => { dirUI.sort = e.target.value; drawCards(); });
    }
  }

  function emptyDirectory() {
    return `
      <div class="empty">
        <h2>Start your neighborhood directory</h2>
        <ol>
          <li><a href="#/signup"><strong>Print sign-up forms</strong></a> and hand one to each household, door to door.</li>
          <li>Collect the filled-in forms.</li>
          <li>Enter each returned form here with <strong>+ Add household</strong>.</li>
          <li>Group households into check-in <a href="#/pods">pods</a> of about 5.</li>
          <li>Print the finished booklet for every household that took part.</li>
        </ol>
        <p>Already have data? Use <strong>Import…</strong> above to restore a <code>.json</code> backup or load a <code>.csv</code> spreadsheet you exported earlier.</p>
        <p><button class="btn" data-act="sample">Load 12 sample neighbors to try it out</button></p>
      </div>`;
  }

  function matches(h) {
    if (dirUI.show === "yes" && !h.consent.given) return false;
    if (dirUI.show === "no" && h.consent.given) return false;
    if (dirUI.skill && !h.people.some((p) => p.skills.includes(dirUI.skill)) && !h.resources.includes(dirUI.skill)) return false;
    const q = dirUI.q.trim().toLowerCase();
    if (!q) return true;
    return [h.names, h.address, h.unit, h.household, h.pets, ...h.resources,
      ...h.people.flatMap((p) => [p.first, p.last, p.phone, p.email, p.occupation, p.needs, ...p.skills])]
      .join(" ").toLowerCase().includes(q);
  }

  function drawCards() {
    const list = state.households.filter(matches).sort(dirUI.sort === "name" ? byName : byAddress);
    const podName = (id) => state.pods.find((p) => p.id === id)?.name;
    const tags = (xs, cls = "") => xs.map((x) => `<span class="tag ${cls}">${esc(x)}</span>`).join("");
    $("#cards").innerHTML = list.length ? list.map((h) => {
      const kids = childrenOf(h);
      return `
      <article class="card ${h.consent.given ? "" : "pending"}">
        <header>
          <div>
            <h3>${esc(h.names) || "<em>Unnamed</em>"}</h3>
            <div class="addr">${esc(fullAddress(h))}${peopleCountText(h) ? ` · ${esc(peopleCountText(h))}` : ""}</div>
          </div>
          <button class="btn small" data-act="edit" data-id="${h.id}">Edit</button>
        </header>
        ${h.people.length ? `<ul class="who">
          ${adultsOf(h).map((p) => `<li>
            <b>${esc(personName(p, h))}</b>${p.phone ? ` · <a href="tel:${esc(p.phone)}">${esc(p.phone)}</a>` : ""}${p.email ? ` · <a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : ""}${p.occupation ? ` · ${esc(p.occupation)}` : ""}
            ${p.skills.length ? `<div class="tags">${tags(p.skills)}</div>` : ""}
            ${p.needs ? `<div class="needs">⚠ ${esc(p.needs)}</div>` : ""}
          </li>`).join("")}
          ${kids.length ? `<li>${esc(childrenText(h))}
            ${kids.filter((k) => k.needs).map((k) => `<div class="needs">⚠ ${esc(childLabel(k).replace(/^child/, "Child"))}: ${esc(k.needs)}</div>`).join("")}</li>` : ""}
        </ul>` : ""}
        ${h.household ? `<p class="small muted">${esc(h.household)}</p>` : ""}
        ${h.resources.length || h.pets ? `<div class="tags">${tags(h.resources, "res")}${h.pets ? `<span class="muted small">${h.resources.length ? "· " : ""}${esc(h.pets)}</span>` : ""}</div>` : ""}
        <footer>
          ${h.consent.given
            ? `<span class="badge ok">Consented${h.consent.date ? " " + esc(fmtDate(h.consent.date)) : ""}</span>`
            : `<span class="badge warn">No consent yet. Won't be printed</span>`}
          ${h.podId ? `<span class="badge">${esc(podName(h.podId) || "Pod")}</span>` : ""}
        </footer>
      </article>`;
    }).join("") : `<p class="muted">No households match.</p>`;
  }

  // ---------- Household editor ----------
  function chipGroup(name, suggestions, selected) {
    const all = uniq([...suggestions, ...selected]);
    return `<div class="chips">${all.map((s) => `
      <label class="chip"><input type="checkbox" name="${name}" value="${esc(s)}" ${selected.includes(s) ? "checked" : ""}><span>${esc(s)}</span></label>`).join("")}
    </div>`;
  }

  function personSummary(p) {
    const bits = p.kind === "child"
      ? [p.age != null ? `age ${p.age}` : "", p.needs ? `⚠ ${p.needs}` : ""]
      : [p.phone, p.occupation, p.skills.join(", "), p.needs ? `⚠ ${p.needs}` : ""];
    return bits.filter(Boolean).join(" · ") || "No details yet";
  }
  const personTitle = (p) => [p.first, p.last].filter(Boolean).join(" ") || (p.kind === "child" ? "Child" : "Adult");
  const isBlankPerson = (p) => !p.first && !p.last && !p.phone && !p.email && !p.occupation && !p.skills.length &&
    !p.needs && !String(p.skillsOther || "").trim() && p.age == null;

  // One collapsible card per person, like passengers on a ticket booking
  function personCardHTML(p, i, badge) {
    const f = (field, label, attrs = "", cls = "") =>
      `<label class="${cls}">${label}<input data-p="${i}" data-f="${field}" value="${esc(p[field] ?? "")}" ${attrs}></label>`;
    const body = p.kind === "child" ? `
        ${f("first", 'First name <span class="hint">optional</span>')}
        ${f("age", 'Age <span class="hint">optional</span>', 'type="number" min="0" max="17" inputmode="numeric"')}
        ${f("needs", "Special needs / allergies", 'placeholder="e.g. severe peanut allergy, uses a wheelchair"', "wide")}`
      : `
        ${f("first", "First name")}
        ${f("last", "Last name")}
        ${f("phone", "Phone", 'type="tel"')}
        ${f("email", "Email", 'type="email"')}
        ${f("occupation", "Occupation", "", "wide")}
        <div class="wide"><p class="hint">Skills they can offer in an emergency</p>
          <div class="chips">${uniq([...SKILL_SUGGESTIONS, ...p.skills]).map((s) => `
            <label class="chip"><input type="checkbox" data-p="${i}" data-skill="${esc(s)}" ${p.skills.includes(s) ? "checked" : ""}><span>${esc(s)}</span></label>`).join("")}
          </div></div>
        ${f("skillsOther", "Other skills (comma-separated)", 'placeholder="e.g. Beekeeper, Arabic"', "wide")}
        ${f("needs", "Special needs", `placeholder="${esc(NEEDS_HINT)}"`, "wide")}`;
    return `
      <div class="person ${p.open ? "open" : ""}">
        <div class="p-head" data-toggle-person="${i}" role="button" tabindex="0" aria-expanded="${p.open ? "true" : "false"}">
          <span class="p-num ${p.kind}">${badge}</span>
          <span class="p-sum"><strong>${esc(personTitle(p))}</strong><span>${esc(personSummary(p))}</span></span>
          <span class="kind ${p.kind}">${p.kind}</span>
          <button type="button" class="icon-btn" data-remove-person="${i}" aria-label="Remove ${esc(personTitle(p))}">✕</button>
        </div>
        <div class="p-body">${body}</div>
      </div>`;
  }

  function openEditor(id) {
    const existing = state.households.find((h) => h.id === id);
    const h = normalizeHousehold(existing || {});
    // Working copy of the people; saved only when the form is saved
    const draft = h.people.map((p) => ({ ...p, skills: [...p.skills], skillsOther: "", open: h.people.length === 1 }));
    if (!existing) draft.push({ ...normalizePerson({ kind: "adult" }), skillsOther: "", open: true, auto: true });
    const dlg = $("#editor");
    dlg.innerHTML = `
      <form method="dialog" id="hh-form">
        <header class="dlg-head">
          <h2>${existing ? "Edit household" : "Add household"}</h2>
          <button type="button" class="icon-btn" data-close aria-label="Close">✕</button>
        </header>
        <div class="dlg-body">
          <fieldset>
            <legend>Household</legend>
            <label>Street address<input name="address" required value="${esc(h.address)}" placeholder="112 Oak St"></label>
            <label>Unit / apt<input name="unit" value="${esc(h.unit)}"></label>
            <label class="wide">Listing name <span class="hint">How the household appears in the directory. Leave blank to use the adults' names below.</span>
              <input name="names" value="${esc(h.names)}"></label>
          </fieldset>
          <fieldset>
            <legend>People in this household</legend>
            <div class="wide people" id="people"></div>
            <div class="wide add-row">
              <button type="button" class="btn small ghost" data-add-person="adult">+ Add adult</button>
              <button type="button" class="btn small ghost" data-add-person="child">+ Add child</button>
            </div>
            <p class="wide hint" id="people-count"></p>
          </fieldset>
          <fieldset>
            <legend>Shared by the household</legend>
            <div class="wide"><p class="hint">Equipment &amp; resources they could share</p>
              ${chipGroup("resources", RESOURCE_SUGGESTIONS, h.resources)}</div>
            <label class="wide">Other resources (comma-separated)<input name="resourcesOther"></label>
            <label>Pets<input name="pets" value="${esc(h.pets)}" placeholder="e.g. 2 dogs, 1 cat"></label>
            <label>Other household details<input name="household" value="${esc(h.household)}" placeholder="e.g. spare key with #118"></label>
          </fieldset>
          <fieldset class="consent">
            <legend>Consent</legend>
            <label class="check wide"><input type="checkbox" name="consentGiven" ${h.consent.given ? "checked" : ""}>
              <span><strong>This household agreed to be listed</strong> in the printed directory and assigned to a pod.</span></label>
            <label>Date of consent<input type="date" name="consentDate" value="${esc(h.consent.date || (existing ? "" : today()))}"></label>
            <label>Given by<input name="signedBy" value="${esc(h.consent.signedBy)}" placeholder="Who signed / said yes"></label>
            <div class="wide">
              <p class="hint">The listing name, address and adults' first names are always printed for consenting households.
              Check what else they're OK having printed:</p>
              <div class="share-grid">
                ${SHARE_FIELDS.map(([k, label]) => `<label class="check"><input type="checkbox" name="share_${k}" ${h.consent.share[k] ? "checked" : ""}><span>${label}</span></label>`).join("")}
              </div>
            </div>
          </fieldset>
          <fieldset>
            <legend>Organizer notes (never printed)</legend>
            <label class="wide"><textarea name="notes" rows="2">${esc(h.notes)}</textarea></label>
          </fieldset>
        </div>
        <footer class="dlg-foot">
          ${existing ? `<button type="button" class="btn danger" data-del>Delete</button>` : "<span></span>"}
          <div>
            <button type="button" class="btn" data-close>Cancel</button>
            <button type="submit" class="btn primary">Save</button>
          </div>
        </footer>
      </form>`;

    const form = $("#hh-form", dlg);
    const peopleEl = $("#people", dlg);
    const listingInput = $("input[name=names]", dlg);
    const refreshListing = () => {
      listingInput.placeholder = suggestListing(draft) || "e.g. The Alvarez family";
      listingInput.setCustomValidity("");
    };
    const drawPeople = () => {
      let a = 0, c = 0;
      peopleEl.innerHTML = draft.length
        ? draft.map((p, i) => personCardHTML(p, i, p.kind === "child" ? `C${++c}` : `${++a}`)).join("")
        : `<p class="muted small">No one added yet.</p>`;
      const ad = draft.filter((p) => p.kind === "adult").length, ch = draft.length - ad;
      $("#people-count", dlg).textContent = draft.length
        ? `${plural(draft.length, "person", "people")}: ${plural(ad, "adult", "adults")}, ${plural(ch, "child", "children")}. Counted automatically for pod headcounts.`
        : "";
      refreshListing();
    };
    // Typing updates the working copy and the card's summary line without redrawing (keeps focus)
    const onPersonInput = (e) => {
      const t = e.target, i = +t.dataset.p, p = draft[i];
      if (!p) return;
      if (t.dataset.f) p[t.dataset.f] = t.dataset.f === "age" ? toCount(t.value) : t.value;
      if (t.dataset.skill) p.skills = t.checked ? uniq([...p.skills, t.dataset.skill]) : p.skills.filter((x) => x !== t.dataset.skill);
      p.auto = false;
      const card = peopleEl.children[i];
      if (card) {
        card.querySelector(".p-sum strong").textContent = personTitle(p);
        card.querySelector(".p-sum span").textContent = personSummary({ ...p, skills: uniq([...p.skills, ...listOf(p.skillsOther)]) });
      }
      refreshListing();
    };
    peopleEl.addEventListener("input", onPersonInput);
    peopleEl.addEventListener("change", onPersonInput);
    const toggle = (head) => {
      const p = draft[+head.dataset.togglePerson];
      p.open = !p.open;
      head.parentElement.classList.toggle("open", p.open);
      head.setAttribute("aria-expanded", p.open ? "true" : "false");
    };
    peopleEl.addEventListener("click", (e) => {
      const rm = e.target.closest("[data-remove-person]");
      if (rm) { draft.splice(+rm.dataset.removePerson, 1); drawPeople(); return; }
      const head = e.target.closest("[data-toggle-person]");
      if (head) toggle(head);
    });
    peopleEl.addEventListener("keydown", (e) => {
      const head = e.target.closest("[data-toggle-person]");
      if (head && e.target === head && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); toggle(head); }
    });
    $$("[data-add-person]", dlg).forEach((b) => b.addEventListener("click", () => {
      draft.forEach((p) => (p.open = false));
      draft.push({ ...normalizePerson({ kind: b.dataset.addPerson }), skillsOther: "", open: true });
      drawPeople();
      peopleEl.lastElementChild?.querySelector("input")?.focus();
    }));
    listingInput.addEventListener("input", () => listingInput.setCustomValidity(""));
    drawPeople();

    $$("[data-close]", dlg).forEach((b) => b.addEventListener("click", () => dlg.close()));
    $("[data-del]", dlg)?.addEventListener("click", () => {
      if (!confirm(`Delete ${h.names || "this household"}? This can't be undone.`)) return;
      state.households = state.households.filter((x) => x.id !== h.id);
      state.pods.forEach((p) => { if (p.captainId === h.id) p.captainId = null; });
      save(); dlg.close(); render(); toast("Household deleted");
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const get = (k) => (fd.get(k) || "").toString().trim();
      const people = draft
        .filter((p) => !(p.auto && isBlankPerson(p))) // drop the starter card if it was never filled in
        .map((p) => normalizePerson({ ...p, skills: [...p.skills, ...listOf(p.skillsOther)] }));
      const names = get("names") || suggestListing(people);
      if (!names) {
        listingInput.setCustomValidity("Add a listing name, or a first name for at least one adult.");
        listingInput.reportValidity();
        return;
      }
      const updated = normalizeHousehold({
        ...h,
        names,
        address: get("address"),
        unit: get("unit"),
        people,
        household: get("household"),
        resources: uniq([...fd.getAll("resources"), ...listOf(get("resourcesOther"))]),
        pets: get("pets"),
        notes: get("notes"),
        consent: {
          given: fd.has("consentGiven"),
          date: get("consentDate"),
          signedBy: get("signedBy"),
          share: Object.fromEntries(SHARE_FIELDS.map(([k]) => [k, fd.has("share_" + k)])),
        },
        updatedAt: new Date().toISOString(),
      });
      if (!updated.consent.given) updated.podId = null;
      if (existing) Object.assign(existing, updated);
      else state.households.push(updated);
      save(); dlg.close(); render();
      toast(existing ? "Saved" : "Household added");
    });
    dlg.showModal();
    $("input[name=address]", dlg).focus();
  }

  // ---------- Pods ----------
  function autoAssignPods() {
    const size = Math.max(2, Math.min(12, parseInt(state.settings.podSize, 10) || 5));
    const list = state.households.filter((h) => h.consent.given).sort(byAddress);
    if (!list.length) return 0;
    const count = Math.max(1, Math.ceil(list.length / size)); // no pod larger than the chosen size
    // Keep any existing pod names/captains where possible
    const pods = [];
    for (let i = 0; i < count; i++) {
      pods.push(state.pods[i] ? { ...state.pods[i], captainId: null } : { id: uid(), name: "", captainId: null });
    }
    state.households.forEach((h) => (h.podId = null));
    // Distribute contiguous runs of neighbors as evenly as possible
    let idx = 0;
    pods.forEach((p, i) => {
      const n = Math.floor(list.length / count) + (i < list.length % count ? 1 : 0);
      const members = list.slice(idx, idx + n);
      idx += n;
      members.forEach((h) => (h.podId = p.id));
      if (!p.name) {
        const streets = uniq(members.map((h) => h.address.replace(/^\s*\d+\S*\s*/, "")));
        p.name = `Pod ${i + 1}` + (streets.length ? ` · ${streets.slice(0, 2).join(" / ")}` : "");
      }
      // Default captain: first member without listed special needs (organizer can change it)
      p.captainId = (members.find((h) => !hasNeeds(h)) || members[0])?.id || null;
    });
    state.pods = pods;
    return count;
  }

  function renderPods() {
    const consented = state.households.filter((h) => h.consent.given);
    const notConsented = state.households.length - consented.length;
    const unassigned = consented.filter((h) => !h.podId).sort(byAddress);
    const podOptions = (sel) => `<option value="">Unassigned</option>` +
      state.pods.map((p, i) => `<option value="${p.id}" ${p.id === sel ? "selected" : ""}>${esc(p.name || `Pod ${i + 1}`)}</option>`).join("");

    $("#view").innerHTML = `
      <section class="page-head">
        <div>
          <h1>Check-in pods</h1>
          <p class="muted">After an emergency, each household checks on the others in its pod, and they check on you.
          Pods are built from nearby addresses. Only households that consented are included${notConsented ? ` (${notConsented} waiting on consent)` : ""}.</p>
        </div>
      </section>
      <section class="toolbar">
        <label class="inline">Households per pod
          <input type="number" id="pod-size" min="2" max="12" value="${esc(state.settings.podSize)}">
        </label>
        <button class="btn primary" data-act="auto-pods" ${consented.length ? "" : "disabled"}>Auto-assign by address</button>
        <button class="btn" data-act="add-pod">+ Empty pod</button>
      </section>
      ${consented.length === 0 ? `<div class="empty"><p>No consenting households yet. Add households in the <a href="#/directory">Directory</a> first.</p></div>` : ""}
      <section class="pods">
        ${state.pods.map((p, i) => {
          const members = consented.filter((h) => h.podId === p.id).sort(byAddress);
          return `
          <article class="pod" data-pod="${p.id}">
            <header>
              <input class="pod-name" data-pod-name="${p.id}" value="${esc(p.name)}" placeholder="Pod ${i + 1}" aria-label="Pod name">
              <button class="icon-btn" data-act="del-pod" data-id="${p.id}" title="Remove pod" aria-label="Remove pod">✕</button>
            </header>
            <label class="inline small">Captain
              <select data-captain="${p.id}">
                <option value="">None</option>
                ${members.map((h) => `<option value="${h.id}" ${h.id === p.captainId ? "selected" : ""}>${esc(h.names)}</option>`).join("")}
              </select>
            </label>
            <ul class="members">
              ${members.map((h) => `
                <li>
                  <div>
                    <strong>${esc(h.names)}</strong>${h.id === p.captainId ? ' <span class="badge">Captain</span>' : ""}
                    <div class="muted small">${esc(fullAddress(h))}${firstPhone(h) ? " · " + esc(firstPhone(h)) : ""}</div>
                    ${membersLine(h) ? `<div class="small">${esc(membersLine(h))}</div>` : ""}
                    ${needsList(h).map((n) => `<div class="needs small">⚠ ${esc(n)}</div>`).join("")}
                  </div>
                  <select data-move="${h.id}" aria-label="Move to pod">${podOptions(p.id)}</select>
                </li>`).join("") || `<li class="muted">No members yet</li>`}
            </ul>
            <footer class="muted small">${members.length} household${members.length === 1 ? "" : "s"}${headcount(members) ? ` · ${headcount(members)}` : ""}</footer>
          </article>`;
        }).join("")}
      </section>
      ${unassigned.length ? `
      <section>
        <h2>Not in a pod yet</h2>
        <ul class="members flat">
          ${unassigned.map((h) => `<li><div><strong>${esc(h.names)}</strong><div class="muted small">${esc(fullAddress(h))}</div></div>
            <select data-move="${h.id}" aria-label="Assign to pod">${podOptions(null)}</select></li>`).join("")}
        </ul>
      </section>` : ""}
    `;

    $("#pod-size").addEventListener("change", (e) => {
      state.settings.podSize = Math.max(2, Math.min(12, parseInt(e.target.value, 10) || 5));
      save();
    });
    $$("[data-pod-name]").forEach((inp) => inp.addEventListener("change", (e) => {
      const p = state.pods.find((x) => x.id === inp.dataset.podName);
      p.name = e.target.value.trim(); save();
    }));
    $$("[data-captain]").forEach((sel) => sel.addEventListener("change", (e) => {
      const p = state.pods.find((x) => x.id === sel.dataset.captain);
      p.captainId = e.target.value || null; save(); renderPods();
    }));
    $$("[data-move]").forEach((sel) => sel.addEventListener("change", (e) => {
      const h = state.households.find((x) => x.id === sel.dataset.move);
      const old = h.podId;
      h.podId = e.target.value || null;
      state.pods.forEach((p) => { if (p.id === old && p.captainId === h.id) p.captainId = null; });
      save(); renderPods();
    }));
  }

  // ---------- Prepare ----------
  function loadKitChecks() { try { return JSON.parse(safeGet(KITS_KEY) || "{}"); } catch { return {}; } }
  // The radio item points to the stations saved in Settings, or says to find them
  const kitItem = (raw) => {
    const it = typeof raw === "string" ? { text: raw } : raw;
    if (!it.radio) return it;
    const r = state.settings.radio;
    const local = r ? `Your local emergency stations: ${r}.`
      : "Write down your local emergency stations (see Important numbers). If none are listed, scan AM and FM for official updates.";
    return { ...it, note: [it.note, local].filter(Boolean).join(" ") };
  };
  const kitTotal = (kit) => kit.groups.reduce((n, g) => n + g.items.length, 0);
  const kitDone = (kit, checks) => Object.keys(checks).filter((k) => k.startsWith(kit.id + ":") && checks[k]).length;

  // Interactive checklist for one kit (Prepare tab)
  function kitHTML(kit, checks) {
    const total = kitTotal(kit), done = kitDone(kit, checks);
    return `
      <article class="guide kit" id="${kit.id}">
        <h2>${esc(kit.title)} <span class="kit-span">${esc(kit.span)}</span></h2>
        <p class="lead">${esc(kit.intro)}</p>
        <div class="progress" aria-label="${esc(kit.title)} progress"><span style="width:${total ? (done / total) * 100 : 0}%"></span></div>
        <p class="muted small" data-kit-count="${kit.id}">${done} of ${total} packed</p>
        <div class="gobag">
          ${kit.groups.map((g, gi) => `
            <div>
              <h3>${esc(g.group)}</h3>
              ${g.items.map((raw, ii) => {
                const it = kitItem(raw), key = `${kit.id}:${gi}.${ii}`;
                return `<label class="check"><input type="checkbox" data-kit="${kit.id}" data-kit-item="${key}" ${checks[key] ? "checked" : ""}>
                  <span>${esc(it.text)}${it.src ? ` <span class="src">${esc(it.src)}</span>` : ""}${it.note ? `<small>${esc(it.note)}</small>` : ""}</span></label>`;
              }).join("")}
            </div>`).join("")}
        </div>
        ${kit.outro ? `<p class="small">${esc(kit.outro)}</p>` : ""}
        <p><button class="btn small" data-act="reset-kit" data-kit="${kit.id}">Clear checklist</button></p>
      </article>`;
  }

  function guideHTML(g) {
    return `
      <article class="guide" id="guide-${g.id}">
        <h2>${esc(g.title)}</h2>
        <p class="lead">${esc(g.summary)}</p>
        ${g.sections.map((s) => `
          <div class="guide-sec ${s.warn ? "warn" : ""}">
            <h3>${esc(s.heading)}</h3>
            ${s.steps ? `<ol>${s.steps.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>` : ""}
            ${s.text ? `<p>${esc(s.text)}</p>` : ""}
          </div>`).join("")}
      </article>`;
  }

  function numbersHTML() {
    const nums = state.settings.numbers.filter((n) => n.label && n.number);
    const s = state.settings;
    return `
      <table class="numbers">
        ${nums.map((n) => `<tr><th>${esc(n.label)}</th><td>${esc(n.number)}</td></tr>`).join("")}
        ${s.organizer ? `<tr><th>Neighborhood organizer: ${esc(s.organizer)}</th><td>${esc(s.organizerContact)}</td></tr>` : ""}
        ${s.meetingPoint ? `<tr><th>Neighborhood meeting point</th><td>${esc(s.meetingPoint)}</td></tr>` : ""}
        ${s.radio ? `<tr><th>Emergency radio stations</th><td class="wrap">${esc(s.radio)}</td></tr>` : ""}
      </table>`;
  }

  function renderPrepare() {
    const checks = loadKitChecks();
    $("#view").innerHTML = `
      <section class="page-head">
        <div>
          <h1>Prepare</h1>
          <p class="muted">Quick guides for the first hours of an emergency. These are general guidelines. Always follow instructions from local officials and your utilities.</p>
        </div>
      </section>
      <nav class="guide-nav">
        <a href="#/prepare" data-jump="numbers">Important numbers</a>
        ${KITS.map((k) => `<a href="#/prepare" data-jump="${k.id}">${esc(k.title)}</a>`).join("")}
        ${GUIDES.map((g) => `<a href="#/prepare" data-jump="guide-${g.id}">${esc(g.title)}</a>`).join("")}
      </nav>
      <article class="guide" id="numbers">
        <h2>Important numbers</h2>
        ${numbersHTML()}
        <p class="muted small">Fill in your local utility numbers, meeting point and emergency radio stations under <a href="#/settings">Settings</a>.</p>
      </article>
      <p class="muted small kits-note">Be ready to go or stay. Check items off as you pack them (saved on this device). ${esc(KITS_SOURCE)}</p>
      ${KITS.map((k) => kitHTML(k, checks)).join("")}
      ${GUIDES.map(guideHTML).join("")}
    `;
    $$("[data-jump]").forEach((a) => a.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById(a.dataset.jump)?.scrollIntoView({ behavior: "smooth" });
    }));
    $$("[data-kit-item]").forEach((cb) => cb.addEventListener("change", () => {
      const c = loadKitChecks();
      c[cb.dataset.kitItem] = cb.checked;
      safeSet(KITS_KEY, JSON.stringify(c));
      const kit = KITS.find((k) => k.id === cb.dataset.kit);
      const n = kitDone(kit, c), total = kitTotal(kit);
      $(`[data-kit-count="${kit.id}"]`).textContent = `${n} of ${total} packed`;
      $(`#${kit.id} .progress span`).style.width = `${(n / total) * 100}%`;
    }));
  }

  // ---------- Print ----------
  const PRINT_PARTS = [
    ["cover", "Cover & important numbers", true],
    ["contacts", "Out-of-area contacts (fill-in page)", true],
    ["directory", "Directory listings", true],
    ["index", "Skills & resources index", true],
    ["pods", "Pod assignments", true],
    ["guides", "Emergency guides", true],
    ["gobag", "Go bag & stay kit checklists", true],
    ["signs", "OK / HELP window signs", false],
    ["forms", "Blank sign-up & consent forms", false],
  ];
  function loadPrintPrefs() {
    let p = {};
    try { p = JSON.parse(safeGet(PRINT_KEY) || "{}"); } catch { /* ignore */ }
    const parts = Object.fromEntries(PRINT_PARTS.map(([k, , d]) => [k, p.parts?.[k] ?? d]));
    return { parts, sort: p.sort || "address", forms: p.forms || 2 };
  }

  // What may be printed about a household, honoring their share choices.
  // Adults' first names always print with a consenting household. Children print as entered
  // (name and age only if given), or not at all if the household unchecked "Children".
  function printable(h) {
    const s = h.consent.share;
    const people = h.people
      .filter((p) => p.kind === "adult" || s.members)
      .map((p) => ({
        ...p,
        phone: s.phone ? p.phone : "",
        email: s.email ? p.email : "",
        occupation: s.occupation ? p.occupation : "",
        skills: s.skills ? p.skills : [],
        needs: s.needs ? p.needs : "",
      }));
    return {
      ...h,
      people,
      resources: s.resources ? h.resources : [],
      pets: s.pets ? h.pets : "",
      _kidsHidden: !s.members && childrenOf(h).length > 0,
    };
  }

  function renderPrint() {
    const prefs = loadPrintPrefs();
    $("#view").innerHTML = `
      <section class="page-head no-print">
        <div>
          <h1>Print the booklet</h1>
          <p class="muted">Only households that consented are included, and only the fields they agreed to share.
          Organizer notes are never printed. Tip: in the print dialog, turn off "headers and footers" and print double-sided.</p>
        </div>
        <button class="btn primary" data-act="print">Print…</button>
      </section>
      <section class="print-opts no-print">
        ${PRINT_PARTS.map(([k, label]) => `<label class="check"><input type="checkbox" data-part="${k}" ${prefs.parts[k] ? "checked" : ""}><span>${label}</span></label>`).join("")}
        <label class="inline">Directory order
          <select id="p-sort">
            <option value="address" ${prefs.sort === "address" ? "selected" : ""}>By street</option>
            <option value="name" ${prefs.sort === "name" ? "selected" : ""}>By name</option>
          </select>
        </label>
        <label class="inline">Blank forms <input type="number" id="p-forms" min="1" max="20" value="${prefs.forms}"></label>
      </section>
      <div class="booklet" id="booklet">${bookletHTML(prefs)}</div>
    `;
    const update = () => {
      const p = {
        parts: Object.fromEntries($$("[data-part]").map((c) => [c.dataset.part, c.checked])),
        sort: $("#p-sort").value,
        forms: Math.max(1, Math.min(20, parseInt($("#p-forms").value, 10) || 1)),
      };
      safeSet(PRINT_KEY, JSON.stringify(p));
      $("#booklet").innerHTML = bookletHTML(p);
    };
    $$(".print-opts input, .print-opts select").forEach((el) => el.addEventListener("change", update));
  }

  function bookletHTML(prefs) {
    const s = state.settings;
    const hood = s.name || "Our Neighborhood";
    const list = state.households.filter((h) => h.consent.given).map(printable)
      .sort(prefs.sort === "name" ? byName : byAddress);
    const out = [];
    const P = prefs.parts;

    if (P.cover) out.push(`
      <section class="sheet cover">
        <div class="cover-mark">Mini<br>Yellow<br>Pages</div>
        <h1>${esc(hood)}</h1>
        <p class="cover-sub">Neighborhood directory &amp; emergency guide</p>
        <p class="cover-date">Updated ${esc(fmtDate(today()))} · ${list.length} households</p>
        <div class="cover-numbers">
          <h2>Important numbers</h2>
          ${numbersHTML()}
        </div>
        <p class="confidential">Private: for participating neighbors only. Please don't post online or share outside the neighborhood.
        ${s.organizer ? `To update or remove your listing, contact ${esc(s.organizer)}${s.organizerContact ? ` (${esc(s.organizerContact)})` : ""}.` : ""}</p>
      </section>`);

    // Blank address-book page for each household to fill in after the booklet is printed
    if (P.contacts) {
      const line = (label) => `<div class="fline"><span>${label}</span><i></i></div>`;
      const entry = `<div class="abook-entry">${line("Name")}${line("Phone")}${line("Email")}${line("Address")}${line("")}</div>`;
      out.push(`
      <section class="sheet contacts-sheet">
        <h2 class="sheet-title">Our out-of-area contacts</h2>
        <p>People outside the area to call or text after a disaster, such as grandparents, a close friend, or a nanny.
        Long-distance calls often work when local ones don't, and text messages often get through when calls fail.</p>
        <div class="abook">${entry.repeat(8)}</div>
      </section>`);
    }

    if (P.directory) {
      let lastStreet = null;
      out.push(`
      <section class="sheet">
        <h2 class="sheet-title">Directory</h2>
        <div class="listing">
          ${list.length ? list.map((h) => {
            let head = "";
            if (prefs.sort === "address") {
              const st = parseAddress(h.address).street;
              if (st !== lastStreet) {
                lastStreet = st;
                head = `<h3 class="street">${esc(h.address.replace(/^\s*\d+\S*\s*/, "") || "Other")}</h3>`;
              }
            }
            const podName = state.pods.find((p) => p.id === h.podId)?.name;
            const adults = adultsOf(h).map((p) => {
              const bits = [p.phone, p.email, p.occupation].filter(Boolean).map(esc);
              if (!p.first && !bits.length && !p.skills.length) return "";
              const skills = p.skills.length ? `${bits.length ? " · " : ""}<i>${esc(p.skills.join(", "))}</i>` : "";
              return `<div><b>${esc(personName(p, h))}</b> ${bits.join(" · ")}${skills}</div>`;
            }).join("");
            return `${head}
            <div class="entry">
              <div class="entry-top"><strong>${esc(h.names)}</strong><span class="dots"></span><span>${esc(fullAddress(h))}</span></div>
              ${adults}
              ${childrenOf(h).length ? `<div>${esc(childrenText(h))}</div>` : ""}
              ${h.household ? `<div><b>Household:</b> ${esc(h.household)}</div>` : ""}
              ${h.resources.length ? `<div><b>Has:</b> ${esc(h.resources.join(", "))}</div>` : ""}
              ${needsList(h).map((n) => `<div class="needs">⚠ ${esc(n)}</div>`).join("")}
              ${h.pets ? `<div><b>Pets:</b> ${esc(h.pets)}</div>` : ""}
              ${podName ? `<div class="small muted">${esc(podName)}</div>` : ""}
            </div>`;
          }).join("") : `<p>No consenting households yet.</p>`}
        </div>
      </section>`);
    }

    if (P.index) {
      const skillIdx = new Map(), resIdx = new Map();
      const add = (m, k, v) => { if (!m.has(k)) m.set(k, []); m.get(k).push(v); };
      list.forEach((h) => {
        adultsOf(h).forEach((p) => p.skills.forEach((k) => add(skillIdx, k, { h, p })));
        h.resources.forEach((k) => add(resIdx, k, { h }));
      });
      const sorted = (m) => [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      const who = ({ h, p }) => {
        const name = p && p.first && adultsOf(h).length > 1 ? personName(p, h) : "";
        const phone = (p && p.phone) || firstPhone(h);
        return `${name ? `<b>${esc(name)}</b> · ` : ""}${esc(h.names)} <span class="muted">(${esc(fullAddress(h))}${phone ? ", " + esc(phone) : ""})</span>`;
      };
      const indexBlock = (title, entries) => `
        <h3>${title}</h3>
        ${entries.length ? `<dl class="index">${entries.map(([k, vs]) => `
          <dt>${esc(k)}</dt>
          <dd>${vs.map(who).join("<br>")}</dd>`).join("")}</dl>`
        : `<p class="muted">None listed.</p>`}`;
      out.push(`
      <section class="sheet">
        <h2 class="sheet-title">Who can help: skills &amp; resources</h2>
        <div class="two-col">
          <div>${indexBlock("Skills", sorted(skillIdx))}</div>
          <div>${indexBlock("Equipment &amp; resources", sorted(resIdx))}</div>
        </div>
      </section>`);
    }

    if (P.pods) {
      const pods = state.pods.map((p, i) => ({ p, i, members: list.filter((h) => h.podId === p.id).sort(byAddress) }))
        .filter((x) => x.members.length);
      out.push(`
      <section class="sheet">
        <h2 class="sheet-title">Check-in pods</h2>
        <p>After an emergency, check on every household in your pod within the first hour, starting with anyone marked ⚠.
        Captains report to ${s.meetingPoint ? `the meeting point: <strong>${esc(s.meetingPoint)}</strong>` : "the neighborhood organizer"}.</p>
        <div class="pod-grid">
          ${pods.length ? pods.map(({ p, i, members }) => `
            <div class="pod-print">
              <h3>${esc(p.name || `Pod ${i + 1}`)}</h3>
              ${headcount(members) ? `<div class="small muted">${members.length} households · ${esc(headcount(members))}</div>` : ""}
              <table>
                ${members.map((h) => `<tr>
                  <td class="box">☐</td>
                  <td><strong>${esc(h.names)}</strong>${h.id === p.captainId ? " ★" : ""}<br><span class="small">${esc(fullAddress(h))}</span>
                  ${membersLine(h) ? `<br><span class="small">${esc(membersLine(h))}</span>` : ""}
                  ${needsList(h).map((n) => `<br><span class="needs small">⚠ ${esc(n)}</span>`).join("")}</td>
                  <td class="small">${esc(firstPhone(h))}</td></tr>`).join("")}
              </table>
            </div>`).join("") : `<p class="muted">Pods haven't been assigned yet.</p>`}
        </div>
        ${pods.length ? `<p class="small muted">★ = pod captain · ☐ = tick off once you've reached them</p>` : ""}
      </section>`);
    }

    if (P.guides) out.push(`<section class="sheet guides-print"><h2 class="sheet-title">Emergency guides</h2>${GUIDES.map(guideHTML).join("")}</section>`);

    if (P.gobag) out.push(`
      <section class="sheet kits-print">
        <h2 class="sheet-title">Go bag &amp; stay kit</h2>
        <p class="small">Be ready to go or stay. ${esc(KITS_SOURCE)}</p>
        ${KITS.map((kit) => `
          <div class="kit-print">
            <h3>${esc(kit.title)} <span class="kit-span">${esc(kit.span)}</span></h3>
            <p class="small">${esc(kit.intro)}</p>
            <div class="print-gobag">
              ${kit.groups.map((g) => `<div><h4>${esc(g.group)}</h4>${g.items.map((raw) => {
                const it = kitItem(raw);
                return `<div class="pcheck">☐ ${esc(it.text)}${it.src ? ` <span class="src">(${esc(it.src)})</span>` : ""}${it.note ? `<small>${esc(it.note)}</small>` : ""}</div>`;
              }).join("")}</div>`).join("")}
            </div>
            ${kit.outro ? `<p class="small">${esc(kit.outro)}</p>` : ""}
          </div>`).join("")}
      </section>`);

    if (P.signs) out.push(`
      <section class="sheet sign ok-sign"><div>OK</div><p>We are OK. No help needed.</p></section>
      <section class="sheet sign help-sign"><div>HELP</div><p>We need help. Please check on us.</p></section>`);

    if (P.forms) {
      const form = signupFormHTML();
      for (let i = 0; i < (prefs.forms || 1); i++) out.push(form);
    }

    return out.join("") || `<p class="muted">Pick at least one section to print.</p>`;
  }

  // One-page paper form for neighbors to fill in. Its order matches the "Add household" screen.
  function signupFormHTML(extraClass = "") {
    const s = state.settings;
    const hood = s.name || "our neighborhood";
    const line = (label, cls = "") => `<div class="fline ${cls}"><span>${label}</span><i></i></div>`;
    const boxes = (items) => `<div class="form-checks">${items.map((x) => `<span>☐ ${esc(x)}</span>`).join("")}</div>`;
    const rows = Array.from({ length: 6 }, () => `<tr>${"<td></td>".repeat(6)}</tr>`).join("");
    return `
      <section class="sheet form ${extraClass}">
        <div class="form-head">
          <div class="form-mark">Mini<br>Yellow<br>Pages</div>
          <div>
            <h2>${esc(hood)}: neighbor sign-up</h2>
            <p>We're making a printed directory so neighbors can reach and help each other in an emergency, and small check-in
            "pods" of about ${esc(s.podSize)} nearby households who check on each other after a disaster. Taking part is voluntary,
            and you choose what gets printed.</p>
          </div>
        </div>

        <h3><span class="num">1</span> Your household</h3>
        <div class="form-grid">
          ${line("Street address")}${line("Unit / apt")}
          ${line("List us as (e.g. Maria &amp; Tom Alvarez, or The Alvarez family)", "wide")}
        </div>

        <h3><span class="num">2</span> Who lives here</h3>
        <table class="ptable">
          <tr><th style="width:23%">Name</th><th style="width:14%">Adult or child? <span>(child's age)</span></th><th style="width:15%">Phone</th>
            <th>Email</th><th style="width:16%">Occupation</th><th style="width:8%">Initials</th></tr>
          ${rows}
        </table>
        <p class="form-note">For children, name and age are optional. Leave out anything you'd rather not have printed.</p>

        <h3><span class="num">3</span> Skills you could offer: write the <u>initials</u> of whoever has each one</h3>
        <div class="form-checks initials">${SKILL_SUGGESTIONS.map((x) => `<span>${esc(x)}</span>`).join("")}</div>
        ${line("Other skills / languages (with initials)")}

        <h3><span class="num">4</span> Equipment &amp; resources your household could share</h3>
        ${boxes(RESOURCE_SUGGESTIONS)}
        ${line("Other")}

        <h3><span class="num">5</span> Check on us</h3>
        ${line("Special needs or allergies (who, and what)")}
        <div class="form-grid">${line("Pets")}${line("Other household details")}</div>

        <div class="consent-box">
          <h3><span class="num">6</span> Consent</h3>
          <p>☐ <b>Yes, list us.</b> I/we agree to have our <b>listing name, address and adults' first names</b> printed in the
          ${esc(hood)} Mini Yellow Pages, shared only with participating neighbors, and to be placed in a check-in pod.</p>
          <p><b>Also OK to print</b> (check all that apply):</p>
          ${boxes(SHARE_FIELDS.map(([, label]) => label.replace(/ \(.*\)$/, "")))}
          <div class="form-grid three sig">${line("Signature")}${line("Printed name")}${line("Date")}</div>
        </div>
        <div class="office">For organizer: ☐ Entered &nbsp; Date ______</div>
      </section>`;
  }

  // ---------- Sign-up forms page (reached from the Directory tab) ----------
  const SIGNUP_KEY = "myp:signup:v1";
  function renderSignup() {
    let copies = 20;
    try { copies = JSON.parse(safeGet(SIGNUP_KEY) || "{}").copies || 20; } catch { /* default */ }
    const s = state.settings;
    $("#view").innerHTML = `
      <section class="page-head no-print">
        <div>
          <h1>Sign-up forms</h1>
          <p class="muted">Print a stack, drop one at each door, and collect them. Then enter each one
          in the Directory with <strong>+ Add household</strong>. The form follows the same order as that screen.
          Only households that tick <b>"Yes, list us"</b> should be marked as consented.</p>
        </div>
        <div class="btn-row">
          <a class="btn" href="#/directory">← Directory</a>
          <button class="btn primary" data-act="print">Print ${copies} form${copies === 1 ? "" : "s"}…</button>
        </div>
      </section>
      <section class="print-opts no-print signup-opts">
        <label class="inline">Copies <input type="number" id="su-copies" min="1" max="200" value="${copies}"></label>
        <p class="muted small">The form also uses your neighborhood name and pod size from <a href="#/settings">Settings</a>.</p>
      </section>
      <div class="booklet" id="signup-forms"></div>
    `;
    const draw = () => {
      // Show one form on screen; print all the copies.
      $("#signup-forms").innerHTML = signupFormHTML() + Array.from({ length: copies - 1 }, () => signupFormHTML("print-only")).join("");
      $("[data-act=print]").textContent = `Print ${copies} form${copies === 1 ? "" : "s"}…`;
    };
    draw();
    $("#su-copies").addEventListener("change", (e) => {
      copies = Math.max(1, Math.min(200, parseInt(e.target.value, 10) || 1));
      e.target.value = copies;
      safeSet(SIGNUP_KEY, JSON.stringify({ copies }));
      draw();
    });
  }

  // ---------- Settings & data ----------
  function renderSettings() {
    const s = state.settings;
    $("#view").innerHTML = `
      <section class="page-head"><div><h1>Settings &amp; data</h1></div></section>
      <form id="settings-form" class="panel">
        <h2>Neighborhood</h2>
        <div class="grid2">
          <label>Neighborhood name<input name="name" value="${esc(s.name)}" placeholder="e.g. Oak & Elm Neighbors"></label>
          <label>Meeting point after a disaster<input name="meetingPoint" value="${esc(s.meetingPoint)}" placeholder="e.g. Corner of Oak & Elm, by the mailbox"></label>
          <label>Organizer name<input name="organizer" value="${esc(s.organizer)}"></label>
          <label>Organizer phone / email<input name="organizerContact" value="${esc(s.organizerContact)}"></label>
        </div>
        <h2>Important numbers</h2>
        <p class="muted small">Printed on the booklet cover. Leave a number blank to hide that line.</p>
        <label class="radio-field">Emergency radio stations
          <input name="radio" value="${esc(s.radio)}" placeholder="e.g. KCBS 740 AM, KQED 88.5 FM, KSOL 98.9 FM (Spanish)">
          <span class="hint">Stations that carry official emergency updates in your area. Shown with the important numbers and in the stay kit.</span></label>
        <div id="numbers">
          ${s.numbers.map((n, i) => `
            <div class="num-row">
              <input name="nl${i}" value="${esc(n.label)}" aria-label="Label">
              <input name="nn${i}" value="${esc(n.number)}" aria-label="Number" placeholder="Number">
              <button type="button" class="icon-btn" data-act="del-num" data-i="${i}" aria-label="Remove">✕</button>
            </div>`).join("")}
        </div>
        <p><button type="button" class="btn small" data-act="add-num">+ Add number</button></p>
        <p><button type="submit" class="btn primary">Save settings</button></p>
      </form>

      <section class="panel">
        <h2>Your data</h2>
        <p>Everything is stored <strong>only in this browser</strong> on this device. Nothing is uploaded anywhere.
        Export a backup regularly, and use it to move the directory to another computer or hand it to a co-organizer.</p>
        <p class="muted small">A <strong>.json backup</strong> restores everything (households, pods and settings) and replaces what's here.
        A <strong>.csv spreadsheet</strong> adds households, and updates any with the same name and address.</p>
        <div class="btn-row">
          <button class="btn primary" data-act="export-json">Export backup (.json)</button>
          <label class="btn">Import .json or .csv…<input type="file" class="import-file" accept=".csv,.json,text/csv,application/json" hidden></label>
          <button class="btn" data-act="export-csv">Export spreadsheet (.csv)</button>
        </div>
        <h3>Danger zone</h3>
        <div class="btn-row">
          <button class="btn" data-act="sample">Add sample neighbors</button>
          <button class="btn danger" data-act="wipe">Erase all data</button>
        </div>
      </section>
    `;
    const form = $("#settings-form");
    const collect = () => {
      const fd = new FormData(form);
      ["name", "meetingPoint", "radio", "organizer", "organizerContact"].forEach((k) => (s[k] = (fd.get(k) || "").toString().trim()));
      s.numbers = s.numbers.map((_, i) => ({ label: (fd.get("nl" + i) || "").toString().trim(), number: (fd.get("nn" + i) || "").toString().trim() }));
    };
    form.addEventListener("submit", (e) => { e.preventDefault(); collect(); save(); render(); toast("Settings saved"); });
    form.addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      if (b.dataset.act === "add-num") { collect(); s.numbers.push({ label: "", number: "" }); save(); renderSettings(); }
      if (b.dataset.act === "del-num") { collect(); s.numbers.splice(+b.dataset.i, 1); save(); renderSettings(); }
    });
  }

  function download(name, text, type) {
    const blob = new Blob([text], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  const slug = () => (state.settings.name || "neighborhood").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  function exportJSON() {
    download(`mini-yellow-pages-${slug()}-${today()}.json`, JSON.stringify(state, null, 2), "application/json");
    toast("Backup downloaded");
  }

  // Settings stored in the CSV's "## Settings" section: [state key, label in the file]
  const CSV_SETTINGS = [
    ["name", "Neighborhood name"],
    ["meetingPoint", "Meeting point"],
    ["organizer", "Organizer"],
    ["organizerContact", "Organizer contact"],
    ["podSize", "Households per pod"],
    ["radio", "Emergency radio stations"],
  ];

  // The CSV holds everything the .json backup does: households (one row each), then a
  // "## People" section (one row per person, linked by listing name + address), then
  // labeled sections for settings, important numbers and the pod list.
  const PEOPLE_COLS = ["household", "address", "unit", "kind", "first", "last", "age", "phone", "email", "occupation", "skills", "needs"];
  function exportCSV() {
    const cols = ["names", "address", "unit", "resources", "pets", "household", "consent", "consentDate", "signedBy", "hiddenFields", "pod", "podCaptain", "notes"];
    const cell = (v) => {
      const s = String(v ?? "");
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const line = (arr) => arr.map(cell).join(",");
    // Pods are matched by name on import, so give every pod a distinct name in the file
    const podNames = new Map(), seen = new Set();
    state.pods.forEach((p, i) => {
      const base = p.name || `Pod ${i + 1}`;
      let name = base, n = 2;
      while (seen.has(name.toLowerCase())) name = `${base} (${n++})`;
      seen.add(name.toLowerCase()); podNames.set(p.id, name);
    });
    const podOf = (h) => state.pods.find((p) => p.id === h.podId);
    const sorted = state.households.slice().sort(byAddress);
    const lines = [line(cols), ...sorted.map((h) => line([
      h.names, h.address, h.unit, h.resources.join("; "), h.pets, h.household,
      h.consent.given ? "yes" : "no", h.consent.date, h.consent.signedBy,
      SHARE_FIELDS.filter(([k]) => !h.consent.share[k]).map(([k]) => k).join("; "),
      podNames.get(h.podId) || "", podOf(h)?.captainId === h.id ? "yes" : "", h.notes,
    ]))];
    lines.push("", "## People", line(PEOPLE_COLS),
      ...sorted.flatMap((h) => h.people.map((p) => line([
        h.names, h.address, h.unit, p.kind, p.first, p.last, p.age ?? "", p.phone, p.email, p.occupation, p.skills.join("; "), p.needs,
      ]))));
    lines.push("", "## Settings", line(["setting", "value"]),
      ...CSV_SETTINGS.map(([k, label]) => line([label, state.settings[k]])));
    lines.push("", "## Important numbers", line(["label", "number"]),
      ...state.settings.numbers.map((n) => line([n.label, n.number])));
    lines.push("", "## Pods", line(["pod"]),
      ...state.pods.map((p) => line([podNames.get(p.id)])));
    download(`mini-yellow-pages-${slug()}-${today()}.csv`, lines.join("\n"), "text/csv");
    toast("Spreadsheet downloaded");
  }

  // ---------- Import (.json backup or .csv spreadsheet) ----------
  function importFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "").replace(/^﻿/, "");
      const isJSON = /\.json$/i.test(file.name) || /^\s*[[{]/.test(text);
      try {
        if (isJSON) importJSONText(text);
        else importCSVText(text);
      } catch (err) {
        alert(`Couldn't import "${file.name}". ${err.message || ""}`.trim());
      }
    };
    reader.onerror = () => alert(`Couldn't read "${file.name}".`);
    reader.readAsText(file);
  }

  function importJSONText(text) {
    let data;
    try { data = JSON.parse(text); } catch { throw new Error("The file isn't valid JSON."); }
    if (Array.isArray(data)) return mergeHouseholds(data.map(normalizeHousehold), "file");
    if (!data || !Array.isArray(data.households)) throw new Error("It doesn't look like a Mini Yellow Pages backup.");
    if (state.households.length &&
        !confirm(`Replace everything here (${state.households.length} households, pods and settings) with this backup (${data.households.length} households)?\n\nTip: export a backup of the current data first if you might need it.`)) return;
    state = migrate(data);
    save(); render(); toast(`Backup restored: ${state.households.length} households`);
  }

  // RFC 4180-style CSV parser (quoted fields, escaped quotes, newlines inside quotes)
  function parseCSV(text) {
    const rows = [];
    let row = [], field = "", i = 0, quoted = false;
    const delim = (text.split("\n")[0].match(/\t/g) || []).length > (text.split("\n")[0].match(/,/g) || []).length ? "\t" : ",";
    while (i < text.length) {
      const c = text[i];
      if (quoted) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
        } else field += c;
      } else if (c === '"') quoted = true;
      else if (c === delim) { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); rows.push(row); row = []; field = "";
      } else field += c;
      i++;
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    return rows.filter((r) => r.some((v) => v.trim() !== ""));
  }

  const CSV_ALIASES = {
    names: ["names", "name", "fullname", "householdname", "family"],
    address: ["address", "streetaddress", "street", "addr"],
    unit: ["unit", "apt", "apartment", "suite"],
    phone: ["phone", "phonenumber", "mobile", "cell", "telephone", "phone1"],
    phone2: ["phone2", "otherphone", "secondphone", "altphone"],
    email: ["email", "emailaddress", "e-mail"],
    occupation: ["occupation", "occupations", "job", "work", "profession"],
    household: ["household", "householdmembers", "members", "ages", "agesotherdetails", "memberdetails"],
    adults: ["adults", "numadults", "numberofadults"],
    children: ["children", "kids", "numchildren", "numberofchildren", "numkids", "childrenunder18"],
    skills: ["skills", "skill"],
    resources: ["resources", "equipment", "has"],
    needs: ["needs", "specialneeds"],
    pets: ["pets", "pet"],
    consent: ["consent", "consented", "consentgiven"],
    consentDate: ["consentdate", "dateofconsent"],
    signedBy: ["signedby", "givenby"],
    hiddenFields: ["hiddenfields", "donotprint", "dontprint"],
    pod: ["pod", "podname"],
    podCaptain: ["podcaptain", "captain"],
    notes: ["notes", "organizernotes"],
  };
  const PEOPLE_ALIASES = {
    household: ["household", "householdname", "listing", "listingname", "names"],
    address: ["address", "streetaddress", "street"],
    unit: ["unit", "apt", "apartment", "suite"],
    kind: ["kind", "type", "adultorchild", "adultchild"],
    first: ["first", "firstname", "name"],
    last: ["last", "lastname", "surname"],
    age: ["age"],
    phone: ["phone", "phonenumber", "mobile", "cell"],
    email: ["email", "emailaddress", "e-mail"],
    occupation: ["occupation", "job", "work"],
    skills: ["skills", "skill"],
    needs: ["needs", "specialneeds", "allergies"],
  };
  function columnsFor(header, aliases, norm) {
    const col = {};
    for (const [field, names] of Object.entries(aliases)) {
      const idx = header.findIndex((h) => names.map(norm).includes(h));
      if (idx >= 0) col[field] = idx;
    }
    return col;
  }
  const keyOf = (h) => `${h.names}|${h.address}|${h.unit}`.toLowerCase().replace(/[^a-z0-9|]/g, "");

  // "## People" rows grouped by household (listing name + address + unit)
  function readPeopleSection(rows, norm) {
    const byHousehold = new Map();
    if (!rows || rows.length < 2) return byHousehold;
    const col = columnsFor(rows[0].map(norm), PEOPLE_ALIASES, norm);
    rows.slice(1).forEach((r) => {
      const get = (f) => (col[f] === undefined ? "" : (r[col[f]] ?? "").trim());
      const hh = { names: get("household"), address: get("address"), unit: get("unit") };
      const key = keyOf(hh);
      if (!byHousehold.has(key)) byHousehold.set(key, { ...hh, people: [] });
      byHousehold.get(key).people.push(normalizePerson({
        kind: /^(c|k)/i.test(get("kind")) ? "child" : "adult",
        first: get("first"), last: get("last"), age: get("age"),
        phone: get("phone"), email: get("email"), occupation: get("occupation"), skills: get("skills"), needs: get("needs"),
      }));
    });
    return byHousehold;
  }
  const truthy = (v) => /^(y|yes|true|1|x|✓|✔|consented|agreed)$/i.test(String(v).trim());

  function importCSVText(text) {
    const norm = (h) => String(h).toLowerCase().replace(/[^a-z0-9]/g, "");
    // Split into sections at "## Title" rows. Rows before the first marker are households.
    const sections = { households: [] };
    let cur = sections.households;
    for (const r of parseCSV(text)) {
      const first = (r[0] || "").trim();
      if (first.startsWith("##")) {
        const key = norm(first.slice(2));
        cur = sections[key] = [];
      } else cur.push(r);
    }
    const rows = sections.households;
    const extras = readCSVExtras(sections, norm);
    if (rows.length < 2 && !extras) throw new Error("The spreadsheet has no data rows.");
    if (rows.length < 2) return mergeHouseholds([], "spreadsheet", extras);
    const col = columnsFor(rows[0].map(norm), CSV_ALIASES, norm);
    if (col.names === undefined && col.address === undefined) {
      throw new Error('The first row needs column headings, including at least "names" or "address".');
    }
    const records = rows.slice(1).map((r) => {
      const get = (f) => (col[f] === undefined ? undefined : (r[col[f]] ?? "").trim());
      const rec = {};
      ["names", "address", "unit", "phone", "phone2", "email", "occupation", "household", "needs", "pets", "notes"]
        .forEach((f) => { if (get(f) !== undefined) rec[f] = get(f); });
      ["adults", "children"].forEach((f) => { if (get(f) !== undefined) rec[f] = toCount(get(f)); });
      ["skills", "resources"].forEach((f) => { if (get(f) !== undefined) rec[f] = uniq(get(f).split(/[;,]/).map((x) => x.trim()).filter(Boolean)); });
      if (["consent", "consentDate", "signedBy", "hiddenFields"].some((f) => get(f) !== undefined)) {
        const hidden = (get("hiddenFields") || "").toLowerCase();
        const share = get("hiddenFields") !== undefined
          ? Object.fromEntries(SHARE_FIELDS.map(([k]) => [k, !hidden.includes(k.toLowerCase())])) : undefined;
        rec.consent = {
          given: get("consent") !== undefined ? truthy(get("consent")) : undefined,
          date: get("consentDate"),
          signedBy: get("signedBy"),
          share,
        };
      }
      rec._pod = get("pod");
      rec._captain = get("podCaptain");
      return rec;
    }).filter((rec) => rec.names || rec.address);
    // People: from the "## People" section, or from older one-row-per-household columns (phone, skills, adults…)
    const peopleBy = readPeopleSection(sections.people, norm);
    records.forEach((rec) => {
      const key = keyOf({ names: rec.names || "", address: rec.address || "", unit: rec.unit || "" });
      if (peopleBy.has(key)) { rec.people = peopleBy.get(key).people; peopleBy.delete(key); }
      else if (LEGACY_PERSON_FIELDS.some((f) => rec[f] !== undefined)) rec.people = peopleFromLegacy(rec);
      LEGACY_PERSON_FIELDS.forEach((f) => delete rec[f]);
    });
    peopleBy.forEach((hh) => { if (hh.names || hh.address) records.push(hh); });
    if (!records.length && !extras) throw new Error("No rows with a name or address were found.");
    mergeHouseholds(records, "spreadsheet", extras);
  }

  // Settings, important numbers and pod list from the CSV's labeled sections (each has a header row first).
  function readCSVExtras(sections, norm) {
    const body = (rows) => (rows || []).slice(1).filter((r) => r.some((v) => v.trim()));
    const extras = {};
    if (sections.settings) {
      const byLabel = Object.fromEntries(CSV_SETTINGS.flatMap(([k, label]) => [[norm(label), k], [norm(k), k]]));
      extras.settings = {};
      body(sections.settings).forEach(([label = "", value = ""]) => {
        const k = byLabel[norm(label)];
        if (!k) return;
        extras.settings[k] = k === "podSize" ? Math.max(2, Math.min(12, parseInt(value, 10) || 5)) : value.trim();
      });
    }
    if (sections.importantnumbers || sections.numbers) {
      extras.numbers = body(sections.importantnumbers || sections.numbers)
        .map(([label = "", number = ""]) => ({ label: label.trim(), number: number.trim() }))
        .filter((n) => n.label || n.number);
    }
    if (sections.pods) extras.pods = body(sections.pods).map(([name = ""]) => name.trim()).filter(Boolean);
    return Object.keys(extras).length ? extras : null;
  }

  // Add new households; update existing ones that have the same name + address + unit.
  function mergeHouseholds(records, what, extras = null) {
    const byKey = new Map(state.households.map((h) => [keyOf(h), h]));
    let added = 0, updated = 0;
    const plan = records.map((rec) => {
      const existing = byKey.get(keyOf({ names: rec.names || "", address: rec.address || "", unit: rec.unit || "" }));
      existing ? updated++ : added++;
      return { rec, existing };
    });
    const also = [];
    if (extras?.settings) also.push("neighborhood settings");
    if (extras?.numbers) also.push(`important numbers (${extras.numbers.length}, replacing the current list)`);
    if (extras?.pods) also.push(`pod list (${extras.pods.length})`);
    if (!confirm(`Import ${records.length} household${records.length === 1 ? "" : "s"} from this ${what}?\n\n` +
      `• ${added} new\n• ${updated} matching name & address (will be updated)` +
      (also.length ? `\n• Also: ${also.join(", ")}` : "") +
      `\n\nNo households will be removed.`)) return;

    if (extras?.settings) Object.assign(state.settings, extras.settings);
    if (extras?.numbers) state.settings.numbers = extras.numbers;

    const podFor = (name) => {
      if (!name) return null;
      let p = state.pods.find((x) => x.name.trim().toLowerCase() === name.trim().toLowerCase());
      if (!p) { p = { id: uid(), name: name.trim(), captainId: null }; state.pods.push(p); }
      return p.id;
    };
    extras?.pods?.forEach(podFor); // creates listed pods (incl. empty ones) in file order
    plan.forEach(({ rec, existing }) => {
      const { _pod, _captain, consent, ...fields } = rec;
      const base = existing || normalizeHousehold({});
      const merged = { ...base, ...fields, updatedAt: new Date().toISOString() };
      if (consent) {
        merged.consent = {
          given: consent.given ?? base.consent.given,
          date: consent.date ?? base.consent.date,
          signedBy: consent.signedBy ?? base.consent.signedBy,
          share: consent.share ? { ...base.consent.share, ...consent.share } : base.consent.share,
        };
      }
      if (_pod !== undefined) merged.podId = podFor(_pod);
      const h = normalizeHousehold(merged);
      if (!h.consent.given) h.podId = null;
      if (existing) Object.assign(existing, h);
      else { state.households.push(h); byKey.set(keyOf(h), h); }
      // A captain must belong to the pod they lead
      state.pods.forEach((p) => { if (p.captainId === h.id && (p.id !== h.podId || (_captain !== undefined && !truthy(_captain)))) p.captainId = null; });
      if (_captain !== undefined && truthy(_captain) && h.podId) state.pods.find((p) => p.id === h.podId).captainId = h.id;
    });
    save(); render();
    toast(`Imported: ${added} added, ${updated} updated`);
  }

  function addSamples() {
    SAMPLE_HOUSEHOLDS.forEach((sample) => {
      state.households.push(normalizeHousehold({
        ...sample,
        notes: "Sample entry",
        consent: { given: true, date: today(), signedBy: sample.names },
      }));
    });
    if (!state.settings.name) state.settings.name = "Oak & Elm Neighbors";
    save(); render(); toast("Sample neighbors added");
  }

  // ---------- global actions ----------
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b || b.closest("#settings-form")) return;
    switch (b.dataset.act) {
      case "add": openEditor(null); break;
      case "edit": openEditor(b.dataset.id); break;
      case "sample": addSamples(); break;
      case "auto-pods": {
        const hasPods = state.households.some((h) => h.podId);
        if (hasPods && !confirm("Re-assign every consenting household to pods by address? Manual changes will be replaced.")) return;
        const n = autoAssignPods(); save(); renderPods(); toast(`Created ${n} pod${n === 1 ? "" : "s"}`);
        break;
      }
      case "add-pod": state.pods.push({ id: uid(), name: `Pod ${state.pods.length + 1}`, captainId: null }); save(); renderPods(); break;
      case "del-pod": {
        const id = b.dataset.id;
        state.households.forEach((h) => { if (h.podId === id) h.podId = null; });
        state.pods = state.pods.filter((p) => p.id !== id);
        save(); renderPods(); break;
      }
      case "reset-kit": {
        const c = loadKitChecks();
        Object.keys(c).forEach((k) => { if (k.startsWith(b.dataset.kit + ":")) delete c[k]; });
        safeSet(KITS_KEY, JSON.stringify(c)); renderPrepare(); break;
      }
      case "print": window.print(); break;
      case "export-json": exportJSON(); break;
      case "export-csv": exportCSV(); break;
      case "wipe":
        if (!confirm("Erase ALL households, pods and settings from this browser? Export a backup first if you might need it.")) return;
        if (!confirm("Are you sure? This can't be undone.")) return;
        state = blankState(); save(); render(); toast("All data erased");
        break;
    }
  });

  document.addEventListener("change", (e) => {
    if (!e.target.matches(".import-file")) return;
    importFile(e.target.files[0]);
    e.target.value = "";
  });

  render();
})();
