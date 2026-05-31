import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { Trophy, Plus, RotateCcw, Swords, Search, Crown, Flame, Moon, CircleDot, Trash2, Undo2, Medal, Link2, Eye, Shield, Wifi, AlertTriangle } from "lucide-react";
import "./styles.css";

const ADMIN_PASSWORD = "offhours67";
const SUPABASE_URL = "https://vsyowcznpnwcpsvlayem.supabase.co";
const SUPABASE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzeW93Y3pucG53Y3BzdmxheWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDUzNTEsImV4cCI6MjA5NTgyMTM1MX0.9bwp1xUdZemrtplr8DwbGB3BmHNbNXWuplSmcANFCF0 || sb_publishable_6ePyY_rxXqDYHzz-THtRug_JLHRfeGL;
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

function normalizeLossPoints(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return -1;
  if (number >= 0) return -1;
  return number;
}

function RankBadge({ rank }) {
  if (rank === 1) return <div className="rank rank-one"><Crown size={16} /></div>;
  if (rank === 2) return <div className="rank rank-two">2</div>;
  if (rank === 3) return <div className="rank rank-three">3</div>;
  return <div className="rank">{rank}</div>;
}

function StatPill({ label, value, hint }) {
  return (
    <div className="stat-pill">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {hint ? <div className="stat-hint">{hint}</div> : null}
    </div>
  );
}

function SetupMissing() {
  return (
    <div className="app-shell">
      <div className="glow glow-red" />
      <div className="glow glow-amber" />
      <main className="main-wrap">
        <section className="hero-card admin-gate-card">
          <div className="gate-icon"><AlertTriangle size={28} /></div>
          <h1>Supabase is not connected yet</h1>
          <p className="gate-copy">Add your Supabase environment variables in Vercel, then redeploy.</p>
          <div className="setup-box">
            <code>VITE_SUPABASE_URL</code><br />
            <code>VITE_SUPABASE_ANON_KEY</code>
          </div>
        </section>
      </main>
    </div>
  );
}

function App() {
  const params = new URLSearchParams(window.location.search);
  const isPlayerView = params.get("view") === "players";

  const [players, setPlayers] = useState([]);
  const [winPoints, setWinPoints] = useState(3);
  const [lossPoints, setLossPoints] = useState(-1);
  const [history, setHistory] = useState([]);
  const [lastWeekTop3, setLastWeekTop3] = useState([]);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [winnerId, setWinnerId] = useState("");
  const [loserId, setLoserId] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Connecting to Supabase...");
  const [dbError, setDbError] = useState("");

  if (!supabase) return <SetupMissing />;

  async function loadAll(silent = false) {
    try {
      if (!silent) {
        setLoading(true);
        setStatus("Loading live leaderboard...");
      }
      setDbError("");

      const [playersResult, settingsResult, historyResult, top3Result] = await Promise.all([
        supabase.from("players").select("*").order("created_at", { ascending: true }),
        supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
        supabase.from("match_history").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("last_week_top3").select("*").order("rank", { ascending: true })
      ]);

      if (playersResult.error) throw playersResult.error;
      if (settingsResult.error) throw settingsResult.error;
      if (historyResult.error) throw historyResult.error;
      if (top3Result.error) throw top3Result.error;

      setPlayers(playersResult.data || []);
      const settings = settingsResult.data || { win_points: 3, loss_points: -1 };
      setWinPoints(Number(settings.win_points ?? 3));
      setLossPoints(normalizeLossPoints(settings.loss_points));
      setHistory(historyResult.data || []);
      setLastWeekTop3(top3Result.data || []);
      setStatus("Live database connected");
    } catch (error) {
      setDbError(error.message || "Something went wrong while loading Supabase data.");
      setStatus("Database error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    const interval = window.setInterval(() => loadAll(true), 3000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!players.some((player) => player.id === winnerId)) setWinnerId(players[0]?.id || "");
    if (!players.some((player) => player.id === loserId)) setLoserId(players[1]?.id || players[0]?.id || "");
  }, [players, winnerId, loserId]);

  const rankedPlayers = useMemo(() => {
    return [...players]
      .map((player) => ({
        ...player,
        points: Number(player.won || 0) * winPoints + Number(player.lost || 0) * lossPoints,
        winRate: player.played ? Math.round((Number(player.won || 0) / Number(player.played || 1)) * 100) : 0
      }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        if (b.won !== a.won) return b.won - a.won;
        return a.name.localeCompare(b.name);
      });
  }, [players, winPoints, lossPoints]);

  const filteredPlayers = rankedPlayers.filter((player) =>
    player.name.toLowerCase().includes(query.toLowerCase())
  );

  const totalGames = Math.floor(players.reduce((sum, player) => sum + Number(player.played || 0), 0) / 2);
  const leader = rankedPlayers[0];

  async function addPlayer() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { error } = await supabase.from("players").insert({ name: trimmed, played: 0, won: 0, lost: 0 });
    if (error) return setDbError(error.message);
    setName("");
    await loadAll(true);
  }

  async function recordMatch() {
    if (!winnerId || !loserId || winnerId === loserId) return;
    const winner = players.find((p) => p.id === winnerId);
    const loser = players.find((p) => p.id === loserId);
    if (!winner || !loser) return;

    const winnerUpdate = { played: Number(winner.played || 0) + 1, won: Number(winner.won || 0) + 1 };
    const loserUpdate = { played: Number(loser.played || 0) + 1, lost: Number(loser.lost || 0) + 1 };

    const { error: winnerError } = await supabase.from("players").update(winnerUpdate).eq("id", winnerId);
    if (winnerError) return setDbError(winnerError.message);
    const { error: loserError } = await supabase.from("players").update(loserUpdate).eq("id", loserId);
    if (loserError) return setDbError(loserError.message);
    const { error: historyError } = await supabase.from("match_history").insert({ winner_id: winnerId, loser_id: loserId, winner_name: winner.name, loser_name: loser.name });
    if (historyError) return setDbError(historyError.message);
    await loadAll(true);
  }

  async function undoLastMatch() {
    const last = history[0];
    if (!last) return;
    const winner = players.find((p) => p.id === last.winner_id);
    const loser = players.find((p) => p.id === last.loser_id);

    if (winner) {
      const { error } = await supabase.from("players").update({ played: Math.max(0, Number(winner.played || 0) - 1), won: Math.max(0, Number(winner.won || 0) - 1) }).eq("id", winner.id);
      if (error) return setDbError(error.message);
    }
    if (loser) {
      const { error } = await supabase.from("players").update({ played: Math.max(0, Number(loser.played || 0) - 1), lost: Math.max(0, Number(loser.lost || 0) - 1) }).eq("id", loser.id);
      if (error) return setDbError(error.message);
    }
    const { error } = await supabase.from("match_history").delete().eq("id", last.id);
    if (error) return setDbError(error.message);
    await loadAll(true);
  }

  async function resetWeek() {
    if (players.length === 0) return;
    const confirmReset = window.confirm("End this week? This will remove all players and save the current top 3 as last week's leaders.");
    if (!confirmReset) return;
    const top3 = rankedPlayers.slice(0, 3).map((player, index) => ({
      rank: index + 1,
      name: player.name,
      played: Number(player.played || 0),
      won: Number(player.won || 0),
      lost: Number(player.lost || 0),
      points: Number(player.points || 0),
      win_rate: Number(player.winRate || 0)
    }));

    let result = await supabase.from("last_week_top3").delete().not("id", "is", null);
    if (result.error) return setDbError(result.error.message);
    if (top3.length) {
      result = await supabase.from("last_week_top3").insert(top3);
      if (result.error) return setDbError(result.error.message);
    }
    result = await supabase.from("match_history").delete().not("id", "is", null);
    if (result.error) return setDbError(result.error.message);
    result = await supabase.from("players").delete().not("id", "is", null);
    if (result.error) return setDbError(result.error.message);
    setQuery("");
    await loadAll(true);
  }

  async function removePlayer(id) {
    const confirmRemove = window.confirm("Remove this player from the leaderboard?");
    if (!confirmRemove) return;
    const { error } = await supabase.from("players").delete().eq("id", id);
    if (error) return setDbError(error.message);
    await supabase.from("match_history").delete().or(`winner_id.eq.${id},loser_id.eq.${id}`);
    await loadAll(true);
  }

  async function updateWinPoints(value) {
    const next = Number(value);
    if (Number.isNaN(next)) return;
    setWinPoints(next);
    const { error } = await supabase.from("app_settings").update({ win_points: next, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) setDbError(error.message);
  }

  async function updateLossPoints(value) {
    const next = normalizeLossPoints(value);
    setLossPoints(next);
    const { error } = await supabase.from("app_settings").update({ loss_points: next, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) setDbError(error.message);
  }

  async function copyPlayerViewLink() {
    const link = `${window.location.origin}${window.location.pathname}?view=players`;
    try {
      await navigator.clipboard.writeText(link);
      setShareStatus("Live player view link copied");
    } catch (error) {
      window.prompt("Copy this live player view link:", link);
      setShareStatus("Copy the player view link from the popup");
    }
    window.setTimeout(() => setShareStatus(""), 3000);
  }

  function unlockAdmin(event) {
    event.preventDefault();
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAdminUnlocked(true);
      setAdminPassword("");
      setAdminError("");
    } else {
      setAdminError("Wrong password");
    }
  }

  if (!isPlayerView && !isAdminUnlocked) {
    return (
      <div className="app-shell">
        <div className="glow glow-red" />
        <div className="glow glow-amber" />
        <main className="main-wrap">
          <section className="hero-card admin-gate-card">
            <div className="gate-icon"><Shield size={28} /></div>
            <h1>Admin Access</h1>
            <p className="gate-copy">Enter the Off Hours admin password to edit the live leaderboard.</p>
            <form onSubmit={unlockAdmin} className="gate-form">
              <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Admin password" autoFocus />
              <button type="submit">Unlock Admin</button>
            </form>
            {adminError ? <p className="gate-error">{adminError}</p> : null}
            <p className="gate-note">The admin page asks for the password every time it is loaded.</p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="glow glow-red" />
      <div className="glow glow-amber" />
      <main className="main-wrap">
        <section className="hero-card">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <div className="hero-topline"><Moon size={14} /> {isPlayerView ? "Off Hours Live Player View" : "Off Hours Admin"}</div>
            <h1>Weekly 8-Ball Leaderboard</h1>
            <p className="hero-copy">{isPlayerView ? "Live standings for players. Editing is locked." : "Track matches, sync every browser, and keep the night crowd chasing the top spot."}</p>
          </motion.div>
          <div className="leader-card">
            <div className="leader-label">Current leader</div>
            <div className="leader-name">{leader?.name || "—"}</div>
            <div className="leader-meta">{leader?.points ?? 0} pts · {leader?.winRate ?? 0}% win rate</div>
          </div>
        </section>

        <section className="stats-grid">
          <StatPill label="Players" value={players.length} />
          <StatPill label="Matches" value={totalGames} />
          <StatPill label="Win" value={`+${winPoints}`} />
          <StatPill label="Loss" value={lossPoints} hint="Loss subtracts points" />
        </section>

        <div className={dbError ? "db-status db-error" : "db-status"}>
          <Wifi size={15} /> {dbError || status}{loading ? "" : " · refreshes every 3 sec"}
        </div>

        {lastWeekTop3.length > 0 ? (
          <section className="last-week-card">
            <div className="section-heading"><Medal size={18} /> Last Week's Top 3</div>
            <div className="top-three-grid">
              {lastWeekTop3.map((player) => (
                <div className="top-three-item" key={`${player.rank}-${player.name}`}>
                  <RankBadge rank={player.rank} />
                  <div>
                    <strong>{player.name}</strong>
                    <span>{player.points} pts · {player.won}W / {player.lost}L</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="board-card">
          <div className="board-header">
            <div>
              <div className="section-heading"><Flame size={16} /> Live Standings</div>
              <h2>Leaderboard</h2>
            </div>
            <div className="board-actions">
              {!isPlayerView ? <button className="ghost-button" onClick={copyPlayerViewLink}><Link2 size={16} /> Copy Player Link</button> : <span className="view-badge"><Eye size={15} /> View Only</span>}
              {shareStatus ? <span className="share-status">{shareStatus}</span> : null}
              <div className="search-box"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search player" /></div>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank</th><th>Player</th><th>Played</th><th>Won</th><th>Lost</th><th>Win %</th><th>Points</th>{!isPlayerView ? <th>Remove</th> : null}
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.length === 0 ? (
                  <tr><td colSpan={isPlayerView ? 7 : 8} className="empty-cell">No players yet. Add players below.</td></tr>
                ) : filteredPlayers.map((player) => {
                  const rank = rankedPlayers.findIndex((item) => item.id === player.id) + 1;
                  return (
                    <motion.tr layout key={player.id}>
                      <td><RankBadge rank={rank} /></td>
                      <td><strong>{player.name}</strong><span>{rank === 1 ? "Table king" : rank <= 3 ? "In the money zone" : "Chasing the board"}</span></td>
                      <td>{player.played}</td><td className="won">{player.won}</td><td className="lost">{player.lost}</td><td>{player.winRate}%</td><td className="points">{player.points}</td>
                      {!isPlayerView ? <td><button className="icon-button" onClick={() => removePlayer(player.id)}><Trash2 size={16} /></button></td> : null}
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {!isPlayerView ? (
          <section className="controls-grid">
            <div className="control-card">
              <div className="card-title"><Swords size={20} /> <div><h2>Record a Match</h2><p>Winner gets +{winPoints}. Loser gets {lossPoints}.</p></div></div>
              <label>Winner</label>
              <select value={winnerId} onChange={(e) => setWinnerId(e.target.value)}>{players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <label>Loser</label>
              <select value={loserId} onChange={(e) => setLoserId(e.target.value)}>{players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <button className="primary-button" onClick={recordMatch} disabled={players.length < 2}><Trophy size={17} /> Add Result</button>
              <button className="secondary-button" onClick={undoLastMatch} disabled={history.length === 0}><Undo2 size={16} /> Undo Last Match</button>
            </div>

            <div className="control-card">
              <div className="card-title"><Plus size={20} /> <div><h2>Add Player</h2><p>For walk-ins, regulars, or weekly members.</p></div></div>
              <div className="inline-form"><input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addPlayer()} placeholder="Player name" /><button onClick={addPlayer}>Add</button></div>
            </div>

            <div className="control-card">
              <div className="card-title"><CircleDot size={20} /> <div><h2>Points System</h2><p>Loss value is forced negative.</p></div></div>
              <div className="points-grid"><div><label>Win</label><input type="number" value={winPoints} onChange={(e) => updateWinPoints(e.target.value)} /></div><div><label>Loss</label><input type="number" value={lossPoints} onChange={(e) => updateLossPoints(e.target.value)} /></div></div>
              <button className="danger-button" onClick={resetWeek}><RotateCcw size={16} /> Reset Week</button>
              <button className="secondary-button" onClick={() => setIsAdminUnlocked(false)}><Shield size={16} /> Lock Admin</button>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
