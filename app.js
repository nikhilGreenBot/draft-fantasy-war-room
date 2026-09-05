const PLAYERS = WR.players;
const LEAGUE = WR.league;
const PICKS = WR.picks;
const ROSTER_KEY = "domination-roster-2026";
const SLOTS = ["QB", "RB", "WR", "WR", "TE", "FLEX", "FLEX", "IDP", "IDP", "K", "DEF"];

const $ = (id) => document.getElementById(id);
const toastEl = $("toast");

function toast(msg) {
  toastEl.hidden = false;
  toastEl.textContent = msg;
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => { toastEl.hidden = true; }, 1600);
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

/* ── countdown ── */
function tickClock() {
  const target = new Date(LEAGUE.draftAt).getTime();
  const now = Date.now();
  const el = $("draftClock");
  const sub = $("tonightSub");
  if (now >= target) {
    el.textContent = "DRAFT LIVE · 45s clock";
    if (sub) sub.textContent = "On the clock after 1.01 · queue first, talk second";
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
  const img = p.sid
    ? `<img class="head" src="${headshot(p)}" alt="" onerror="this.style.opacity='0'"/>`
    : `<div class="head"></div>`;
  const ppg = p.custom && p.custom.ppg != null ? p.custom.ppg.toFixed(1) : "—";
  const badge = p.tier === "lock" ? "lock" : p.tier === "fade" ? "fade" : p.tier === "qb1" ? "qb1" : p.tier === "idp1" ? "idp1" : "";
  return `<button class="prow" data-search="${p.search.replace(/"/g, "&quot;")}">
    <div class="rk">${p.rank < 200 ? p.rank : "—"}</div>
    ${img}
    <div>
      <div class="p-name">${p.name}${badge ? `<span class="badge ${badge}">${p.tier}</span>` : ""}</div>
      <div class="p-sub">${p.pos} · ${p.team || ""} · bye ${p.bye || "—"} · Yahoo: ${p.search}</div>
      ${p.note ? `<div class="p-sub">${p.note}</div>` : ""}
    </div>
    <div class="p-right">
      <div class="ppg">${ppg}</div>
      <div class="ppg-lbl">’25 custom</div>
      ${extra}
    </div>
  </button>`;
}

function bindRows(root, { copy = true, roster = false } = {}) {
  root.querySelectorAll(".prow").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = PLAYERS.find((x) => x.search === btn.dataset.search);
      if (!p) return;
      if (roster) addToRoster(p);
      if (copy) copyName(p);
    });
  });
}

/* ── renderers ── */
const RENDER = {
  tonight() {
    const locks = PLAYERS.filter((p) => p.tier === "lock").sort(byRank);
    const qbs = PLAYERS.filter((p) => p.tier === "qb1").sort(byRank);
    const rbs = PLAYERS.filter((p) => ["Achane", "Henry", "Hampton", "Chase Brown", "Taylor", "Cook", "Barkley"].some((n) => p.name.includes(n.split(" ").pop()) || p.name.includes(n)));
    const hunt = PLAYERS.filter((p) => p.rank >= 11 && p.rank <= 24 && p.pos !== "IDP");

    $("tonightRoot").innerHTML = `
      <div class="callout"><strong>No fandom.</strong> Bills names only move if they are the best player on the clock. Cook at 2 is a reach. Allen at 23 is a scoring pick.</div>
      <div class="stat-row">
        <div class="stat"><b>1.02</b><span>Our slot</span></div>
        <div class="stat"><b>45s</b><span>Pick clock</span></div>
        <div class="stat"><b>12</b><span>Teams</span></div>
        <div class="stat"><b>17</b><span>Rounds</span></div>
      </div>
      <h3 class="lock-name" style="font-size:22px;margin-bottom:10px">On the clock — 10 seconds</h3>
      <div class="grid-3">
        ${locks.map((p, i) => `
          <article class="card ${i === 0 ? "accent" : i === 1 ? "navy" : ""}">
            <div class="lock-num">LOCK ${i + 1}</div>
            <div class="lock-name">${p.name}</div>
            <div class="lock-meta">${p.pos} · ${p.team} · bye ${p.bye} · ’25 ${p.custom?.ppg ?? "—"} ppg in our scoring</div>
            <p class="lock-note">${p.note}</p>
          </article>`).join("")}
      </div>
      <div class="callout navy" style="margin-top:18px">If 1.01 takes Gibbs → we take <strong>Ja'Marr Chase</strong>. If 1.01 takes Chase → we take <strong>Gibbs</strong>. CMC / Cook / Allen are not pick-2 names.</div>

      <h3 class="lock-name" style="font-size:22px;margin:22px 0 10px">Picks 23 + 26 — the package</h3>
      <div class="grid-2">
        <article class="card navy">
          <div class="lock-num">WANT ONE ELITE QB</div>
          ${qbs.slice(0, 6).map((p) => `<div class="lock-meta" style="margin-top:8px"><strong>${p.name}</strong> · ${p.team} · ${p.custom?.ppg ?? "—"} ppg</div>`).join("")}
        </article>
        <article class="card">
          <div class="lock-num">THEN RB OR WR1</div>
          <p class="lock-note">Took Chase at 2? You must leave 23/26 with a starting RB. Took Gibbs/Bijan? QB + WR is the cleanest championship shape.</p>
          <p class="lock-note">Hunt: Jefferson, A.J. Brown, London, Nico, Pickens, Achane, Henry, Hampton, Chase Brown, Bowers only if the skill board is dead.</p>
        </article>
      </div>

      <h3 class="lock-name" style="font-size:22px;margin:22px 0 10px">Our snake picks</h3>
      <div class="picks">${PICKS.map((n, i) => `<span class="pick-pill ours">R${i + 1} · ${n}</span>`).join("")}</div>

      <h3 class="lock-name" style="font-size:22px;margin:22px 0 10px">Hard rules</h3>
      <div class="rules">
        <div class="rule"><i>1</i> Never K or DEF before round 14. Aubrey in 12–13 is the only exception.</div>
        <div class="rule"><i>2</i> Elite QB by pick 26. This scoring makes Allen/Lamar weekly cheat codes.</div>
        <div class="rule"><i>3</i> Two green-dot linebackers for IDP. Rounds 6–11. Not pass rushers.</div>
        <div class="rule"><i>4</i> At 15 seconds left, click queue #1. No debate.</div>
      </div>
    `;
  },

  board() {
    const chips = ["ALL", "QB", "RB", "WR", "TE", "IDP", "K", "DEF"];
    $("posChips").innerHTML = chips.map((c, i) => `<button class="chip ${i === 0 ? "on" : ""}" data-pos="${c}">${c}</button>`).join("");
    let pos = "ALL";
    const draw = () => {
      const q = ($("boardSearch").value || "").toLowerCase();
      const list = PLAYERS.filter((p) => {
        const okPos = pos === "ALL" || p.pos === pos;
        const blob = `${p.name} ${p.search} ${p.team} ${p.pos} ${p.note || ""}`.toLowerCase();
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

  roster() {
    renderRoster();
  },

  async form() {
    const root = $("formRoot");
    root.innerHTML = `<p class="lock-meta">Loading NFL scoreboard + Sleeper box scores…</p>
      <div class="callout navy">Yahoo league points need a Yahoo login (OAuth). This page cannot see your Yahoo matchup from GitHub Pages. Instead we score official NFL box scores with <strong>your</strong> sheet: 7-pt pass TDs, 0.5/completion, first downs, IDP tackles. Close enough to rank form. Open Yahoo for the official total.</div>`;

    const top = PLAYERS.filter((p) => p.custom && p.custom.ppg).sort((a, b) => b.custom.ppg - a.custom.ppg).slice(0, 12);

    let gamesHtml = "";
    try {
      const sb = await API.scoreboard();
      const events = sb.events || [];
      if (!events.length) {
        gamesHtml = `<div class="callout">No live NFL games on the ESPN board right now. Season kicks off ${LEAGUE.seasonStart}. 2025 custom PPG is below so you can still compare players tonight.</div>`;
      } else {
        gamesHtml = `<div class="plist">${events.map((ev) => {
          const comp = ev.competitions?.[0];
          const home = comp?.competitors?.find((c) => c.homeAway === "home");
          const away = comp?.competitors?.find((c) => c.homeAway === "away");
          const st = comp?.status?.type?.shortDetail || ev.status?.type?.shortDetail || "";
          return `<div class="game">
            <div class="t">${away?.team?.abbreviation || ""}</div>
            <div>
              <div class="sc">${away?.score || "–"}  ${home?.score || "–"}</div>
              <div class="st">${st}</div>
            </div>
            <div class="t" style="text-align:right">${home?.team?.abbreviation || ""}</div>
          </div>`;
        }).join("")}</div>`;
      }
    } catch {
      gamesHtml = `<div class="callout">ESPN scoreboard blocked or offline. Using cached 2025 form.</div>`;
    }

    let liveNote = "";
    try {
      const state = await API.state();
      liveNote = `<p class="lock-meta" style="margin:12px 0">Sleeper NFL state · season ${state.season} · week ${state.display_week} · ${state.season_type}</p>`;
      if (state.season_has_scores && state.display_week) {
        const week = await API.weekStats(state.season, state.display_week);
        const rows = PLAYERS.map((p) => {
          if (!p.sid || !week[p.sid]) return null;
          const pts = API.customPoints(week[p.sid], p.nflPos);
          return { p, pts };
        }).filter(Boolean).sort((a, b) => b.pts - a.pts);
        if (rows.length) {
          liveNote += `<h3 class="lock-name" style="font-size:22px;margin:18px 0 10px">This week in our scoring</h3>
            <div class="plist">${rows.slice(0, 20).map(({ p, pts }) => playerCard(p, `<div class="ppg-lbl">wk ${pts}</div>`)).join("")}</div>`;
        }
      }
    } catch {
      liveNote += `<div class="callout">Sleeper week stats not up yet. Showing 2025 custom form.</div>`;
    }

    root.innerHTML += `
      ${gamesHtml}
      ${liveNote}
      <h3 class="lock-name" style="font-size:22px;margin:22px 0 8px">2025 custom PPG (this league)</h3>
      <p class="lock-meta" style="margin-bottom:12px">Includes first downs. Per-game 100-yard / 300-yard bonuses are applied on weekly lines only, so season PPG is a floor.</p>
      <div class="plist">${top.map((p) => playerCard(p)).join("")}</div>
      <p class="lock-meta" style="margin-top:16px"><a href="${LEAGUE.yahooUrl}" target="_blank" rel="noopener" style="color:#C0C4C8">Open Yahoo league #${LEAGUE.id} →</a></p>
    `;
    bindRows(root, { copy: true, roster: true });
  },

  league() {
    $("leagueRoot").innerHTML = `
      <div class="callout accent">Public cheat sheets assume 4-pt passing TDs and no first downs. Ours does not. That is why Allen is a round-2 pick here and a green-dot LB scores like a WR2.</div>
      <div class="grid-2">
        <article class="card navy">
          <div class="lock-num">QUARTERBACK</div>
          <table class="table">
            <tr><th>Stat</th><th>Pts</th></tr>
            <tr><td>Completion</td><td class="num">0.5</td></tr>
            <tr><td>Pass yards</td><td class="num">1 / 20</td></tr>
            <tr><td>Pass TD</td><td class="num">7</td></tr>
            <tr><td>INT</td><td class="num">-1</td></tr>
            <tr><td>Pass 1st down</td><td class="num">1</td></tr>
            <tr><td>200 / 250 / 300 yd</td><td class="num">+4 / +3 / +4</td></tr>
          </table>
        </article>
        <article class="card">
          <div class="lock-num">RUSH / REC</div>
          <table class="table">
            <tr><th>Stat</th><th>Pts</th></tr>
            <tr><td>Rush attempt</td><td class="num">0.5</td></tr>
            <tr><td>Rush / rec yards</td><td class="num">1 / 10</td></tr>
            <tr><td>Rush TD / rec TD</td><td class="num">7 / 6</td></tr>
            <tr><td>Reception (PPR)</td><td class="num">1</td></tr>
            <tr><td>Rec 1st / rush 1st</td><td class="num">1 / 0.5</td></tr>
            <tr><td>100 rush / 115 rec</td><td class="num">bonus stack</td></tr>
          </table>
        </article>
        <article class="card accent">
          <div class="lock-num">IDP · START TWO LBs</div>
          <table class="table">
            <tr><th>Stat</th><th>Pts</th></tr>
            <tr><td>Solo tackle</td><td class="num">3.0</td></tr>
            <tr><td>Assist</td><td class="num">1.75</td></tr>
            <tr><td>Sack / INT</td><td class="num">7 / 7</td></tr>
            <tr><td>TFL / PD</td><td class="num">4 / 4.5</td></tr>
          </table>
        </article>
        <article class="card">
          <div class="lock-num">ROSTER</div>
          <p class="lock-note">1 QB · 1 RB · 2 WR · 1 TE · 2 FLEX · 2 IDP · K · DEF · 6 bench · 5 IR</p>
          <p class="lock-note">You can start four skill players. Only one RB is required. Load WRs. Still lock a workhorse because rush attempts pay.</p>
          <p class="lock-note">Playoffs: 6 teams, weeks 15–17. Avoid stacking Dallas + Arizona (week 14 bye) in the starting lineup.</p>
        </article>
      </div>
    `;
  },

  duties() {
    $("dutiesRoot").innerHTML = `
      <div class="duty">
        <article class="card accent">
          <h3>Yahoo operator</h3>
          <p class="lock-meta">The clicker. Never leaves the draft tab.</p>
          <ul>
            <li>Owns search + queue. Always 8–12 names.</li>
            <li>Pre-load Gibbs, Chase, Bijan before 8:30.</li>
            <li>At 15 seconds, click queue #1. No meeting.</li>
            <li>After our pick, re-queue immediately.</li>
          </ul>
        </article>
        <article class="card navy">
          <h3>War room</h3>
          <p class="lock-meta">This site + Meet audio.</p>
          <ul>
            <li>Watches the pick stream and bye weeks.</li>
            <li>Calls the 3-name lock list before we are on the clock.</li>
            <li>Tracks QB / RB / WR / IDP counts so we do not leave round 7 empty.</li>
            <li>If silent at 15 seconds, operator clicks.</li>
          </ul>
        </article>
      </div>
      <div class="callout" style="margin-top:16px">Conflict protocol: one name, ten seconds, then click. The marriage survives. The pick does not get tabled.</div>
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
    <div class="callout navy">Tap anyone on the Board tab to copy their Yahoo name <em>and</em> add them here. Each phone stores its own roster (localStorage) — both of you can track the same draft if you tap the same names.</div>
    <div class="slot-grid">
      ${rows.map(({ slot, p }) => p ? `
        <div class="slot filled">
          <div class="slot-pos">${slot}</div>
          <div><div class="p-name">${p.name}</div><div class="p-sub">${p.pos} · ${p.team || ""}</div></div>
          <button class="xbtn" data-x="${p.search}">×</button>
        </div>` : `
        <div class="slot">
          <div class="slot-pos">${slot}</div>
          <div class="ghost">Empty — grab from Board</div>
          <span></span>
        </div>`).join("")}
    </div>
    ${extras.length ? `<h3 class="lock-name" style="font-size:22px;margin:18px 0 8px">Bench</h3>
      <div class="slot-grid">${extras.map((p) => `
        <div class="slot filled">
          <div class="slot-pos">BN</div>
          <div><div class="p-name">${p.name}</div><div class="p-sub">${p.pos} · ${p.team || ""}</div></div>
          <button class="xbtn" data-x="${p.search}">×</button>
        </div>`).join("")}</div>` : ""}
    <p class="lock-meta" style="margin-top:14px">${list.length} players saved on this device.</p>
  `;
  $("rosterRoot").querySelectorAll(".xbtn").forEach((b) => {
    b.addEventListener("click", () => removeFromRoster(b.dataset.x));
  });
}

RENDER.tonight();
