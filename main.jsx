import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import { Trophy, Plus, RotateCcw, Swords, Search, Crown, Moon, Trash2, Undo2, Link2, Shield, Eye, Lock, Wifi, Medal, AlertTriangle } from "lucide-react";
import "./styles.css";

const ADMIN_PASSWORD = "offhours67";

// These are public Supabase values. Never paste service_role keys or database passwords here.
const SUPABASE_URL = "https://vsyowcznpnwcpsvlayem.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzeW93Y3pucG53Y3BzdmxheWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDUzNTEsImV4cCI6MjA5NTgyMTM1MX0.9bwp1xUdZemrtplr8DwbGB3BmHNbNXWuplSmcANFCF0";
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

function normalizeLossPoints(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return -1;
  return number >= 0 ? -1 : number;
}

function getPlayerLink() {
  const url = new URL(window.location.href);
  url.searchParams.set("view", "players");
  return url.toString();
}

function RankBadge({ rank }) {
  if (rank === 1) return <div className="rank gold"><Crown size={17} /></div>;
  if (rank === 2) return <div className="rank silver">2</div>;
  if (rank === 3) return <div className="rank bronze">3</div>;
  return <div className="rank muted">{rank}</div>;
}

function Stat({ label, value, hint }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="empty-state">{text}</div>;
}

function AdminGate({ onUnlock }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit(e) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      onUnlock();
      setError("");
      setPassword("");
    } else {
      setError("Wrong password. Try again.");
    }
  }

  return (
    <div className="app-bg centered-page">
      <div className="glow red-glow" />
      <div className="glow amber-glow" />
      <form className="login-card glass" onSubmit={submit}>
        <div className="login-icon"><Shield size={25} /></div>
        <p className="eyebrow">Off Hours Admin</p>
        <h1>Enter password</h1>
        <p className="subtext">The leaderboard is live. Unlock admin controls to edit scores.</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin password"
          autoFocus
        />
        {error ? <p className="error-text">{error}</p> : null}
        <button className="primary-btn" type="submit"><Lock size={17} /> Unlock Admin</button>
        <a className="view-link" href="?view=players"><Eye size={16} /> Open player view</a>
      </form>
    </div>
  );
}

function App() {
  const isPlayerView = new URLSearchParams(window.location.search).get("view") === "players";
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [players, setPlayers] = useState([]);
  const [lastWeekTop3, setLastWeekTop3] = useState([]);
  const [matches, setMatches] = useState([]);
  const [settings, setSettings] = useState({ win_points: 3, loss_points: -1 });
  const [name, setName] = useState("");
  const [winnerId, setWinnerId] = useState("");
  const [loserId, setLoserId] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Loading leaderboard…");
  const [copied, setCopied] = useState(false);

  const isAdmin = !isPlayerView && adminUnlocked;

  async function loadData() {
    if (!supabase) {
      setStatus("Supabase is not connected yet.");
      return;
    }

    setStatus("Loading leaderboard…");
    const [playersRes, settingsRes, top3Res, matchesRes] = await Promise.all([
      supabase.from("players").select("*").order("created_at", { ascending: true }),
      supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("last_week_top3").select("*").order("rank", { ascending: true }),
      supabase.from("match_history").select("*").order("created_at", { ascending: false }).limit(20),
    ]);

    if (playersRes.error || settingsRes.error || top3Res.error || matchesRes.error) {
      setStatus("Database tables are missing or blocked. Run supabase-setup.sql again.");
      return;
    }

    setPlayers(playersRes.data || []);
    setSettings({
      win_points: settingsRes.data?.win_points ?? 3,
      loss_points: normalizeLossPoints(settingsRes.data?.loss_points ?? -1),
    });
    setLastWeekTop3(top3Res.data || []);
    setMatches(matchesRes.data || []);
    setStatus("");
  }

  useEffect(() => {
    loadData();
    if (!supabase) return;

    const channel = supabase
      .channel("off-hours-live-board")
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "last_week_top3" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_history" }, loadData)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    if (!winnerId && players[0]) setWinnerId(players[0].id);
    if (!loserId && players[1]) setLoserId(players[1].id);
  }, [players, winnerId, loserId]);

  const rankedPlayers = useMemo(() => {
    return [...players]
      .map((player) => {
        const points = player.won * settings.win_points + player.lost * settings.loss_points;
        const winRate = player.played ? Math.round((player.won / player.played) * 100) : 0;
        return { ...player, points, winRate };
      })
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        if (b.won !== a.won) return b.won - a.won;
        return a.name.localeCompare(b.name);
      });
  }, [players, settings]);

  const filteredPlayers = rankedPlayers.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
  const leader = rankedPlayers[0];
  const totalMatches = Math.floor(players.reduce((sum, p) => sum + p.played, 0) / 2);

  async function addPlayer(e) {
    e.preventDefault();
    if (!isAdmin || !name.trim()) return;
    await supabase.from("players").insert({ name: name.trim(), played: 0, won: 0, lost: 0 });
    setName("");
    await loadData();
  }

  async function removePlayer(id) {
    if (!isAdmin) return;
    await supabase.from("players").delete().eq("id", id);
    if (winnerId === id) setWinnerId("");
    if (loserId === id) setLoserId("");
    await loadData();
  }

  async function recordMatch(e) {
    e.preventDefault();
    if (!isAdmin || !winnerId || !loserId || winnerId === loserId) return;

    const winner = players.find((p) => p.id === winnerId);
    const loser = players.find((p) => p.id === loserId);
    if (!winner || !loser) return;

    await Promise.all([
      supabase.from("players").update({ played: winner.played + 1, won: winner.won + 1 }).eq("id", winner.id),
      supabase.from("players").update({ played: loser.played + 1, lost: loser.lost + 1 }).eq("id", loser.id),
      supabase.from("match_history").insert({ winner_id: winner.id, loser_id: loser.id, winner_name: winner.name, loser_name: loser.name }),
    ]);
    await loadData();
  }

  async function undoLastMatch() {
    if (!isAdmin || matches.length === 0) return;
    const match = matches[0];
    const winner = players.find((p) => p.id === match.winner_id);
    const loser = players.find((p) => p.id === match.loser_id);

    const updates = [supabase.from("match_history").delete().eq("id", match.id)];
    if (winner) updates.push(supabase.from("players").update({ played: Math.max(0, winner.played - 1), won: Math.max(0, winner.won - 1) }).eq("id", winner.id));
    if (loser) updates.push(supabase.from("players").update({ played: Math.max(0, loser.played - 1), lost: Math.max(0, loser.lost - 1) }).eq("id", loser.id));

    await Promise.all(updates);
    await loadData();
  }

  async function resetWeek() {
    if (!isAdmin) return;
    const top3 = rankedPlayers.slice(0, 3).map((p, index) => ({ rank: index + 1, name: p.name, played: p.played, won: p.won, lost: p.lost, points: p.points }));
    await supabase.from("last_week_top3").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (top3.length) await supabase.from("last_week_top3").insert(top3);
    await supabase.from("match_history").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("players").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await loadData();
  }

  async function updateSettings(field, value) {
    if (!isAdmin) return;
    const next = field === "loss_points" ? normalizeLossPoints(value) : Number(value);
    const updated = { ...settings, [field]: next };
    setSettings(updated);
    await supabase.from("app_settings").upsert({ id: 1, win_points: updated.win_points, loss_points: updated.loss_points });
  }

  async function copyPlayerLink() {
    await navigator.clipboard.writeText(getPlayerLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!isPlayerView && !adminUnlocked) {
    return <AdminGate onUnlock={() => setAdminUnlocked(true)} />;
  }

  return (
    <div className="app-bg">
      <div className="glow red-glow" />
      <div className="glow amber-glow" />
      <main className="container">
        <section className="hero glass">
          <div className="hero-left">
            <div className="eyebrow"><Moon size={15} /> Off Hours Pool League</div>
            <h1>{isPlayerView ? "Live Leaderboard" : "Weekly 8-Ball Leaderboard"}</h1>
            <p className="subtext">Warm lounge energy, serious bragging rights. Wins add points. Losses subtract points.</p>
          </div>
          <div className="hero-right">
            <p>Current leader</p>
            <strong>{leader?.name || "No leader yet"}</strong>
            <span>{leader ? `${leader.points} pts · ${leader.winRate}% win rate` : "Add players to begin"}</span>
          </div>
        </section>

        {status ? <div className="notice"><AlertTriangle size={18} /> {status}</div> : null}

        <section className="stats-row">
          <Stat label="Players" value={players.length} />
          <Stat label="Matches" value={totalMatches} />
          <Stat label="Win" value={`+${settings.win_points}`} hint="points per win" />
          <Stat label="Loss" value={settings.loss_points} hint="points per loss" />
        </section>

        {lastWeekTop3.length > 0 ? (
          <section className="last-week glass">
            <div className="section-title compact"><Medal size={18} /><span>Last week’s top 3</span></div>
            <div className="podium">
              {lastWeekTop3.map((p) => (
                <div className="podium-card" key={p.id || p.rank}>
                  <RankBadge rank={p.rank} />
                  <strong>{p.name}</strong>
                  <span>{p.points} pts · {p.won}W/{p.lost}L</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="leaderboard glass">
          <div className="leaderboard-head">
            <div>
              <div className="section-title"><Trophy size={20} /> Live Standings</div>
              <h2>Leaderboard</h2>
            </div>
            <div className="head-actions">
              {isAdmin ? <button className="ghost-btn" onClick={copyPlayerLink}><Link2 size={16} /> {copied ? "Copied" : "Copy Player Link"}</button> : <div className="view-badge"><Eye size={15} /> View only</div>}
              {isAdmin ? <button className="ghost-btn" onClick={() => setAdminUnlocked(false)}><Lock size={16} /> Lock</button> : null}
              <label className="search-box"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search player" /></label>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Played</th>
                  <th>Won</th>
                  <th>Lost</th>
                  <th>Win %</th>
                  <th className="right">Points</th>
                  {isAdmin ? <th className="right">Remove</th> : null}
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map((player) => {
                  const rank = rankedPlayers.findIndex((p) => p.id === player.id) + 1;
                  return (
                    <tr key={player.id}>
                      <td><RankBadge rank={rank} /></td>
                      <td><strong>{player.name}</strong><small>{rank === 1 ? "Table king" : rank <= 3 ? "Prize zone" : "Chasing the board"}</small></td>
                      <td>{player.played}</td>
                      <td className="win-text">{player.won}</td>
                      <td className="loss-text">{player.lost}</td>
                      <td>{player.winRate}%</td>
                      <td className="points right">{player.points}</td>
                      {isAdmin ? <td className="right"><button className="icon-btn" onClick={() => removePlayer(player.id)}><Trash2 size={16} /></button></td> : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredPlayers.length === 0 ? <EmptyState text="No players on the leaderboard yet." /> : null}
          </div>
        </section>

        {isAdmin ? (
          <section className="controls-grid">
            <form className="panel glass" onSubmit={recordMatch}>
              <div className="section-title"><Swords size={20} /> Add a match</div>
              <label>Winner</label>
              <select value={winnerId} onChange={(e) => setWinnerId(e.target.value)}>
                <option value="">Select winner</option>
                {players.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}
              </select>
              <label>Loser</label>
              <select value={loserId} onChange={(e) => setLoserId(e.target.value)}>
                <option value="">Select loser</option>
                {players.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}
              </select>
              <button className="primary-btn" disabled={players.length < 2 || winnerId === loserId}><Trophy size={17} /> Add Result</button>
              <button type="button" className="ghost-btn full" onClick={undoLastMatch} disabled={matches.length === 0}><Undo2 size={16} /> Undo Last Match</button>
            </form>

            <form className="panel glass" onSubmit={addPlayer}>
              <div className="section-title"><Plus size={20} /> Add player</div>
              <label>Player name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rohan" />
              <button className="primary-btn"><Plus size={17} /> Add Player</button>
            </form>

            <div className="panel glass">
              <div className="section-title"><Wifi size={20} /> Points + reset</div>
              <div className="two-cols">
                <div>
                  <label>Win points</label>
                  <input type="number" value={settings.win_points} onChange={(e) => updateSettings("win_points", e.target.value)} />
                </div>
                <div>
                  <label>Loss points</label>
                  <input type="number" value={settings.loss_points} onChange={(e) => updateSettings("loss_points", e.target.value)} />
                </div>
              </div>
              <p className="tiny-note">Losses are forced to stay negative. Example: 3 wins and 2 losses = 7 points.</p>
              <button className="danger-btn" onClick={resetWeek}><RotateCcw size={17} /> Reset Week + Save Top 3</button>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
