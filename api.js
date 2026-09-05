/* Public APIs that work from a static GitHub Pages site (CORS-open).
   Yahoo Fantasy requires OAuth + a backend — we cannot read league points
   from the browser. Sleeper box scores are scored with THIS league's sheet. */

const API = (() => {
  const SLEEPER = "https://api.sleeper.app/v1";
  const ESPN = "https://site.api.espn.com/apis/site/v2/sports/football/nfl";

  async function getJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(url + " " + res.status);
    return res.json();
  }

  function customPoints(st, nflPos) {
    if (!st) return 0;
    const n = (k) => Number(st[k] || 0);
    let p = 0;
    p += n("pass_cmp") * 0.5;
    p += n("pass_yd") / 20;
    p += n("pass_td") * 7;
    p += n("pass_int") * -1;
    p += n("pass_fd") * 1;
    p += n("pass_cmp_40p") * 1;
    p += n("pass_td_40p") * 1;
    p += n("rush_att") * 0.5;
    p += n("rush_yd") / 10;
    p += n("rush_td") * 7;
    p += n("rush_fd") * 0.5;
    p += n("rush_40p") * 1;
    p += n("rush_td_40p") * 1;
    p += n("rec") * 1;
    p += n("rec_yd") / 10;
    p += n("rec_td") * 6;
    p += n("rec_fd") * 1;
    p += n("fum_lost") * -2;
    const py = n("pass_yd");
    if (py >= 200) p += 4;
    if (py >= 250) p += 3;
    if (py >= 300) p += 4;
    const ry = n("rush_yd");
    if (ry >= 60) p += 3;
    if (ry >= 80) p += 3;
    if (ry >= 100) p += 4;
    const cy = n("rec_yd");
    if (cy >= 75) p += 3;
    if (cy >= 95) p += 3;
    if (cy >= 115) p += 4;
    const idp = ["LB", "DB", "S", "CB", "DE", "DT", "DL"].includes(nflPos);
    if (idp) {
      p += n("idp_tkl_solo") * 3;
      p += n("idp_tkl_ast") * 1.75;
      p += n("idp_sack") * 7;
      p += n("idp_tkl_loss") * 4;
      p += n("idp_pass_def") * 4.5;
      p += n("idp_ff") * 4.5;
      p += n("int") * 7;
    }
    return Math.round(p * 10) / 10;
  }

  return {
    customPoints,
    state: () => getJson(SLEEPER + "/state/nfl"),
    weekStats: (season, week) => getJson(`${SLEEPER}/stats/nfl/regular/${season}/${week}`),
    seasonStats: (season) => getJson(`${SLEEPER}/stats/nfl/regular/${season}`),
    scoreboard: () => getJson(ESPN + "/scoreboard"),
    news: () => getJson(ESPN + "/news?limit=6"),
  };
})();
