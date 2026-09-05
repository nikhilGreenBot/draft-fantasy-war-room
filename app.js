const PLAYERS = WR.players;
const LEAGUE = WR.league;
const PICKS = WR.picks;
const ROSTER_KEY = "domination-roster-2026";
const SLOTS = ["QB", "RB", "WR", "WR", "TE", "FLEX", "FLEX", "IDP", "IDP", "K", "DEF"];

const ESPN_ABBR = {
  ARI: "ari", ATL: "atl", BAL: "bal", BUF: "buf", CAR: "car", CHI: "chi",
  CIN: "cin", CLE: "cle", DAL: "dal", DEN: "den", DET: "det", GB: "gb",
  HOU: "hou", IND: "ind", JAX: "jax", KC: "kc", LAC: "lac", LAR: "lar",
  LV: "lv", MIA: "mia", MIN: "min", NE: "ne", NO: "no", NYG: "nyg",
  NYJ: "nyj", PHI: "phi", PIT: "pit", SEA: "sea", SF: "sf", TB: "tb",
  TEN: "ten", WAS: "wsh", WSH: "wsh",
};

const $ = (id) => document.getElementById(id);
const toastEl = $("toast");

function toast(msg) {
  toastEl.hidden = false;
  toastEl.textContent = msg;
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => { toastEl.hidden = true; }, 1400);
}

function teamLogo(team, size = 40) {
  if (!team) return "";
  const ab = ESPN_ABBR[team] || String(team).toLowerCase();
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${ab}.png`;
}

function logoImg(team, cls = "tlogo") {
  if (!team) return `<span class="${cls} empty"></span>`;
  return `<img class="${cls}" src="${teamLogo(team)}" alt="${team}" loading="lazy" onerror="this.classList.add('broken')"/>`;
}

function headshot(p) {
  if (!p.sid) return "";
  return `https://sleepercdn.com/content/nfl/players/thumb/${p.sid}.jpg`;
}

function byRank(a, b) { return a.rank - b.rank; }

function copyName(p) {
  const text = p.search || p.name;
  navigator.clipboard.writeText(text).then(() => toast("Copied · " + text));
}

function loadRoster() {
  try { return JSON.parse(localStorage.getItem(ROSTER_KEY) || "[]"); }
  catch { return []; }
}
function saveRoster(list) {
  localStorage.setItem(ROSTER_KEY, JSON.stringify(list));
}

function addToRoster(p) {
  const list = loadRoster();
  if (list.some((x) => x.search === p.search)) { toast("Already on roster"); return; }
  list.push({ search: p.search, name: p.name, pos: p.pos, team: p.team, sid: p.sid, nflPos: p.nflPos });
  saveRoster(list);
  toast("Added · " + p.name);
}

function removeFromRoster(search) {
  saveRoster(loadRoster().filter((x) => x.search !== search));
  renderRoster();
}

function shortNote(p) {
  if (!p.note) return "";
  // Keep first sentence only for board cards
  const s = p.note.split(/(?<=[.!?])\s+/)[0];
  return s.length > 72 ? s.slice(0, 69) + "…" : s;
}

function tierLabel(t) {
  if (t === "lock") return "LOCK";
  if (t === "fade") return "FADE";
  if (t === "qb1") return "QB";
  if (t === "idp1") return "IDP";
  if (t === "te1") return "TE";
  return "";
}

/* ── countdown ── */
function tickClock() {
  const target = new Date(LEAGUE.draftAt).getTime();
  const now = Date.now();
  const el = $("draftClock");
  const sub = $("tonightSub");
  if (now >= target) {
    el.textContent = "Draft live · 45s";
    if (sub) sub.textContent = "On the clock after 1.01";
    return;
  }
  let s = Math.floor((target - now) / 1000);
  const h = Math.floor(s / 3600); s %= 3600;
  const m = Math.floor(s / 60); s %= 60;
  el.textContent = `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}
tickClock();
setInterval(tickClock, 1000);

/* ── nav ── */
const tabs = [...document.querySelectorAll(".nav-tab")];
const indicator = $("navIndicator");
let cur = "tonight";
const painted = new Set(["tonight"]);

function moveIndicator(tab) {
  const ni = document.querySelector(".nav-inner");
  const tr = tab.getBoundingClientRect();
  const nr = ni.getBoundingClientRect();
  indicator.style.left = (tr.left - nr.left + ni.scrollLeft) + "px";
  indicator.style.width = tr.width + "px";
}

function goTo(id) {
  if (id === cur) return;
  document.getElementById("s-" + cur).classList.remove("active");
  document.getElementById("s-" + id).classList.add("active");
  tabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === id));
  const tab = tabs.find((t) => t.dataset.tab === id);
  if (tab) moveIndicator(tab);
  cur = id;
  if (!painted.has(id)) { painted.add(id); RENDER[id](); }
}
tabs.forEach((t) => t.addEventListener("click", () => goTo(t.dataset.tab)));
window.addEventListener("load", () => moveIndicator(tabs[0]));
window.addEventListener("resize", () => {
  const tab = tabs.find((t) => t.dataset.tab === cur);
  if (tab) moveIndicator(tab);
});

function playerCard(p, extra = "") {
  const hs = p.sid
    ? `<img class="head" src="${headshot(p)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'head'}))"/>`
    : `<div class="head"></div>`;
  const ppg = p.custom && p.custom.ppg != null ? p.custom.ppg.toFixed(1) : "—";
  const badge = tierLabel(p.tier);
  const note = shortNote(p);
  return `<button class="prow" data-search="${p.search.replace(/"/g, "&quot;")}">
    <div class="rk">${p.rank < 200 ? p.rank : "—"}</div>
    <div class="media">
      ${hs}
      ${logoImg(p.team, "tlogo sm")}
    </div>
    <div class="p-main">
      <div class="p-name">${p.name}${badge ? `<span class="badge ${p.tier}">${badge}</span>` : ""}</div>
      <div class="p-sub"><span class="pos-pill">${p.pos}</span> ${p.team || ""} · Bye ${p.bye || "—"}</div>
      ${note ? `<div class="p-note">${note}</div>` : ""}
    </div>
    <div class="p-right">
      <div class="ppg">${ppg}</div>
      <div class="ppg-lbl">PPG</div>
      ${extra}
    </div>
  </button>`;
}

function miniPlayer(p) {
  return `<button class="mini" data-search="${p.search.replace(/"/g, "&quot;")}">
    ${logoImg(p.team, "tlogo sm")}
    <span class="mini-name">${p.name}</span>
    <span class="mini-meta">${p.pos} · ${p.custom?.ppg?.toFixed(1) ?? "—"}</span>
  </button>`;
}

function bindRows(root, { copy = true, roster = false } = {}) {
  root.querySelectorAll(".prow, .mini, .lock-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = PLAYERS.find((x) => x.search === btn.dataset.search);
      if (!p) return;
      if (roster) addToRoster(p);
      if (copy) copyName(p);
    });
  });
}

const RENDER = {
  tonight() {
    const locks = PLAYERS.filter((p) => p.tier === "lock").sort(byRank);
    const qbs = PLAYERS.filter((p) => p.tier === "qb1").sort(byRank);
    const targets = PLAYERS.filter((p) =>
      ["Justin Jefferson", "A.J. Brown", "Drake London", "Nico Collins", "George Pickens",
        "De'Von Achane", "Derrick Henry", "Omarion Hampton", "Chase Brown", "Jonathan Taylor",
        "James Cook", "Saquon Barkley", "Brock Bowers", "Trey McBride", "Josh Allen", "Lamar Jackson"]
        .includes(p.name) || p.search === "James Cook III"
    ).sort(byRank);

    $("tonightRoot").innerHTML = `
      <div class="hero-bar">
        <div class="hero-chip"><strong>Katie &amp; Nikhil</strong> · Domination League</div>
        <div class="stat-row tight">
          <div class="stat"><b>1.02</b><span>Slot</span></div>
          <div class="stat"><b>45s</b><span>Clock</span></div>
          <div class="stat"><b>12</b><span>Teams</span></div>
        </div>
      </div>

      <div class="block-label">Pick 2 — take in this order</div>
      <div class="lock-grid">
        ${locks.map((p, i) => `
          <button class="lock-card ${i === 0 ? "accent" : ""}" data-search="${p.search.replace(/"/g, "&quot;")}">
            <div class="lock-top">
              ${logoImg(p.team, "tlogo")}
              <span class="lock-num">#${i + 1}</span>
            </div>
            <div class="lock-name">${p.name}</div>
            <div class="lock-meta">${p.pos} · ${p.team} · Bye ${p.bye}</div>
            <div class="lock-ppg">${p.custom?.ppg?.toFixed(1) ?? "—"} <span>PPG</span></div>
          </button>`).join("")}
      </div>

      <div class="ifthen">
        <div class="ifthen-row"><span class="tag">If</span> 1.01 takes Gibbs <span class="arrow">→</span> <strong>Chase</strong></div>
        <div class="ifthen-row"><span class="tag">If</span> 1.01 takes Chase <span class="arrow">→</span> <strong>Gibbs</strong></div>
        <div class="ifthen-row mute">Skip at #2: CMC · Cook · Allen</div>
      </div>

      <div class="block-label">Picks 23 + 26</div>
      <div class="grid-2">
        <article class="card navy">
          <div class="lock-num">1. Elite QB</div>
          <div class="mini-list">${qbs.slice(0, 6).map(miniPlayer).join("")}</div>
        </article>
        <article class="card">
          <div class="lock-num">2. Then RB or WR</div>
          <p class="one-liner">Chase at 2 → need an RB here. Gibbs/Bijan at 2 → QB + WR is fine.</p>
          <div class="mini-list">${targets.filter((p) => p.pos !== "QB").slice(0, 8).map(miniPlayer).join("")}</div>
        </article>
      </div>

      <div class="block-label">Our picks</div>
      <div class="picks">${PICKS.map((n, i) => `<span class="pick-pill ours">R${i + 1} · ${n}</span>`).join("")}</div>

      <div class="block-label">Rules</div>
      <div class="rules compact">
        <div class="rule"><i>1</i> No K / DEF before round 14</div>
        <div class="rule"><i>2</i> Elite QB by pick 26</div>
        <div class="rule"><i>3</i> Two tackle LBs for IDP (rounds 6–11)</div>
        <div class="rule"><i>4</i> At 15s left → click queue #1</div>
      </div>
    `;
    bindRows($("tonightRoot"), { copy: true, roster: true });
  },

  board() {
    const chips = ["ALL", "QB", "RB", "WR", "TE", "IDP", "K", "DEF"];
    $("posChips").innerHTML = chips.map((c, i) => `<button class="chip ${i === 0 ? "on" : ""}" data-pos="${c}">${c}</button>`).join("");
    let pos = "ALL";
    const draw = () => {
      const q = ($("boardSearch").value || "").toLowerCase();
      const list = PLAYERS.filter((p) => {
        const okPos = pos === "ALL" || p.pos === pos;
        const blob = `${p.name} ${p.search} ${p.team} ${p.pos}`.toLowerCase();
        return okPos && (!q || blob.includes(q));
      }).sort(byRank);
      $("boardRoot").innerHTML = `<div class="plist">${list.map((p) => playerCard(p)).join("")}</div>`;
      bindRows($("boardRoot"), { copy: true, roster: true });
    };
    $("posChips").onclick = (e) => {
      const b = e.target.closest(".chip");
      if (!b) return;
      pos = b.dataset.pos;
      [...$("posChips").children].forEach((c) => c.classList.toggle("on", c === b));
      draw();
    };
    $("boardSearch").oninput = draw;
    draw();
  },

  roster() { renderRoster(); },

  async form() {
    const root = $("formRoot");
    root.innerHTML = `<p class="one-liner muted">Loading games…</p>`;

    const top = PLAYERS.filter((p) => p.custom && p.custom.ppg)
      .sort((a, b) => b.custom.ppg - a.custom.ppg).slice(0, 10);

    let gamesHtml = "";
    try {
      const sb = await API.scoreboard();
      const events = (sb.events || []).slice(0, 12);
      if (!events.length) {
        gamesHtml = `<p class="one-liner muted">No live games yet. Season starts ${LEAGUE.seasonStart}.</p>`;
      } else {
        gamesHtml = `<div class="games-grid">${events.map((ev) => {
          const comp = ev.competitions?.[0];
          const home = comp?.competitors?.find((c) => c.homeAway === "home");
          const away = comp?.competitors?.find((c) => c.homeAway === "away");
          const st = comp?.status?.type?.shortDetail || "";
          const aAb = away?.team?.abbreviation;
          const hAb = home?.team?.abbreviation;
          return `<div class="game">
            <div class="g-side">${logoImg(aAb, "tlogo sm")}<span>${aAb || ""}</span></div>
            <div class="g-mid">
              <div class="sc">${away?.score || "–"} · ${home?.score || "–"}</div>
              <div class="st">${st}</div>
            </div>
            <div class="g-side right">${logoImg(hAb, "tlogo sm")}<span>${hAb || ""}</span></div>
          </div>`;
        }).join("")}</div>`;
      }
    } catch {
      gamesHtml = `<p class="one-liner muted">Scoreboard unavailable.</p>`;
    }

    let weekHtml = "";
    try {
      const state = await API.state();
      if (state.season_has_scores && state.display_week) {
        const week = await API.weekStats(state.season, state.display_week);
        const rows = PLAYERS.map((p) => {
          if (!p.sid || !week[p.sid]) return null;
          return { p, pts: API.customPoints(week[p.sid], p.nflPos) };
        }).filter(Boolean).sort((a, b) => b.pts - a.pts).slice(0, 12);
        if (rows.length) {
          weekHtml = `
            <div class="block-label">Week ${state.display_week} · our scoring</div>
            <div class="plist">${rows.map(({ p, pts }) => playerCard(p, `<div class="ppg-lbl">wk ${pts}</div>`)).join("")}</div>`;
        }
      }
    } catch { /* ignore */ }

    root.innerHTML = `
      <p class="one-liner">NFL box scores in our scoring. Official totals stay in Yahoo.</p>
      <div class="block-label">Scoreboard</div>
      ${gamesHtml}
      ${weekHtml}
      <div class="block-label">2025 PPG (our league)</div>
      <div class="plist">${top.map((p) => playerCard(p)).join("")}</div>
      <p class="one-liner muted" style="margin-top:14px"><a href="${LEAGUE.yahooUrl}" target="_blank" rel="noopener">Open Yahoo #${LEAGUE.id} →</a></p>
    `;
    bindRows(root, { copy: true, roster: true });
  },

  league() {
    $("leagueRoot").innerHTML = `
      <p class="one-liner">Not Yahoo default. Draft for these numbers.</p>
      <div class="score-grid">
        <article class="card navy">
          <div class="score-head">${logoImg("BUF", "tlogo sm")}<span>QB</span></div>
          <ul class="score-list">
            <li><span>Completion</span><b>0.5</b></li>
            <li><span>Pass yards</span><b>1/20</b></li>
            <li><span>Pass TD</span><b>7</b></li>
            <li><span>Pass 1st down</span><b>1</b></li>
            <li><span>200/250/300</span><b>+4/+3/+4</b></li>
          </ul>
        </article>
        <article class="card">
          <div class="score-head">${logoImg("DET", "tlogo sm")}<span>RB / WR</span></div>
          <ul class="score-list">
            <li><span>Reception</span><b>1</b></li>
            <li><span>Rush attempt</span><b>0.5</b></li>
            <li><span>Yards</span><b>1/10</b></li>
            <li><span>Rush / Rec TD</span><b>7 / 6</b></li>
            <li><span>Rec 1st down</span><b>1</b></li>
          </ul>
        </article>
        <article class="card accent">
          <div class="score-head">${logoImg("MIA", "tlogo sm")}<span>IDP</span></div>
          <ul class="score-list">
            <li><span>Solo tackle</span><b>3.0</b></li>
            <li><span>Assist</span><b>1.75</b></li>
            <li><span>Sack / INT</span><b>7</b></li>
            <li><span>TFL</span><b>4</b></li>
            <li><span>Start</span><b>2 LBs</b></li>
          </ul>
        </article>
        <article class="card">
          <div class="score-head"><span class="pos-pill">ROSTER</span></div>
          <ul class="score-list plain">
            <li>QB · RB · WR · WR · TE</li>
            <li>FLEX · FLEX · IDP · IDP</li>
            <li>K · DEF · 6 bench · 5 IR</li>
            <li>Playoffs: weeks 15–17</li>
          </ul>
        </article>
      </div>
    `;
  },

  duties() {
    $("dutiesRoot").innerHTML = `
      <div class="duty">
        <article class="card accent">
          <div class="role-tag">Katie</div>
          <h3>Yahoo</h3>
          <ul>
            <li>Stay on the draft tab</li>
            <li>Keep queue full (8–12)</li>
            <li>At 15s → click #1</li>
          </ul>
        </article>
        <article class="card navy">
          <div class="role-tag">Nikhil</div>
          <h3>War room</h3>
          <ul>
            <li>Call the next 3 names</li>
            <li>Watch byes &amp; holes</li>
            <li>Run Meet audio</li>
          </ul>
        </article>
      </div>
      <p class="one-liner center" style="margin-top:16px">Disagree? One name · 10 seconds · click.</p>
    `;
  },

  faq() {
    $("faqRoot").innerHTML = `
      <div class="faq-list">
        <article class="faq-item">
          <h3>Quick start</h3>
          <ol>
            <li>Open this page + Yahoo + Meet</li>
            <li>Read <strong>Tonight</strong> once</li>
            <li>During the draft, use <strong>Board</strong> — tap a name to copy it into Yahoo</li>
            <li>Tap picks onto <strong>Roster</strong> as you go</li>
          </ol>
        </article>
        <article class="faq-item">
          <h3>Tabs</h3>
          <ul>
            <li><strong>Tonight</strong> — who to take</li>
            <li><strong>Board</strong> — search &amp; copy names</li>
            <li><strong>Roster</strong> — your lineup on this phone</li>
            <li><strong>Form</strong> — NFL games / PPG</li>
            <li><strong>League</strong> — scoring cheat sheet</li>
            <li><strong>Duties</strong> — Katie vs Nikhil</li>
          </ul>
        </article>
        <article class="faq-item">
          <h3>Yahoo points?</h3>
          <p>Not on this site (needs Yahoo login). Form uses NFL stats with our scoring. Official scores stay in Yahoo.</p>
        </article>
        <article class="faq-item">
          <h3>Roster sync?</h3>
          <p>Each phone saves its own list. Tap the same names on both devices after each pick.</p>
        </article>
      </div>
    `;
  },
};

function renderRoster() {
  const list = loadRoster();
  const used = new Set();
  const rows = SLOTS.map((slot) => {
    const fit = list.find((p) => !used.has(p.search) && (
      p.pos === slot ||
      (slot === "FLEX" && ["RB", "WR", "TE"].includes(p.pos)) ||
      (slot === "IDP" && p.pos === "IDP")
    ));
    if (fit) used.add(fit.search);
    return { slot, p: fit };
  });
  const extras = list.filter((p) => !used.has(p.search));

  $("rosterRoot").innerHTML = `
    <p class="one-liner">Tap players on Board to fill this. Saved on this device only.</p>
    <div class="slot-grid">
      ${rows.map(({ slot, p }) => p ? `
        <div class="slot filled">
          <div class="slot-pos">${slot}</div>
          <div class="slot-player">
            ${logoImg(p.team, "tlogo sm")}
            <div>
              <div class="p-name">${p.name}</div>
              <div class="p-sub">${p.pos} · ${p.team || ""}</div>
            </div>
          </div>
          <button class="xbtn" data-x="${p.search}" aria-label="Remove">×</button>
        </div>` : `
        <div class="slot">
          <div class="slot-pos">${slot}</div>
          <div class="ghost">Empty</div>
          <span></span>
        </div>`).join("")}
    </div>
    ${extras.length ? `
      <div class="block-label">Bench</div>
      <div class="slot-grid">${extras.map((p) => `
        <div class="slot filled">
          <div class="slot-pos">BN</div>
          <div class="slot-player">
            ${logoImg(p.team, "tlogo sm")}
            <div>
              <div class="p-name">${p.name}</div>
              <div class="p-sub">${p.pos} · ${p.team || ""}</div>
            </div>
          </div>
          <button class="xbtn" data-x="${p.search}">×</button>
        </div>`).join("")}</div>` : ""}
  `;
  $("rosterRoot").querySelectorAll(".xbtn").forEach((b) => {
    b.addEventListener("click", (e) => { e.stopPropagation(); removeFromRoster(b.dataset.x); });
  });
}

RENDER.tonight();
