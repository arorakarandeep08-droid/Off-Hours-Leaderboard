import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion } from "framer-motion";
import { Trophy, Plus, RotateCcw, Swords, Search, Crown, Flame, Moon, CircleDot, Trash2, Undo2, Medal, Link2, Eye, Shield } from "lucide-react";
import "./styles.css";

const defaultPlayers = [
  { id: "p1", name: "Aarav", played: 8, won: 6, lost: 2 },
  { id: "p2", name: "Kabir", played: 7, won: 5, lost: 2 },
  { id: "p3", name: "Rohan", played: 9, won: 5, lost: 4 },
  { id: "p4", name: "Ishaan", played: 6, won: 3, lost: 3 },
  { id: "p5", name: "Dev", played: 5, won: 2, lost: 3 },
  { id: "p6", name: "Arjun", played: 4, won: 1, lost: 3 }
];

const uid = () => Math.random().toString(36).slice(2, 10);

function encodeShareData(data) {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  } catch (error) {
    return "";
  }
}

function decodeShareData(value) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(value))));
  } catch (error) {
    return null;
  }
}

function getPlayerViewDataFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const data = params.get("data");
  if (!data) return null;
  return decodeShareData(data);
}

function loadState() {
  try {
    const saved = localStorage.getItem("off-hours-leaderboard");
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        players: parsed.players || defaultPlayers,
        winPoints: typeof parsed.winPoints === "number" ? parsed.winPoints : 3,
        lossPoints: typeof parsed.lossPoints === "number" ? parsed.lossPoints : -1,
        history: parsed.history || [],
        lastWeekTop3: parsed.lastWeekTop3 || []
      };
    }
  } catch (error) {}
  return { players: defaultPlayers, winPoints: 3, lossPoints: -1, history: [], lastWeekTop3: [] };
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

function App() {
  const savedState = loadState();
  const params = new URLSearchParams(window.location.search);
  const isPlayerView = params.get("view") === "players";
  const sharedState = isPlayerView ? getPlayerViewDataFromUrl() : null;
  const startingState = sharedState || savedState;

  const [players, setPlayers] = useState(startingState.players || []);
  const [winPoints, setWinPoints] = useState(typeof startingState.winPoints === "number" ? startingState.winPoints : 3);
  const [lossPoints, setLossPoints] = useState(typeof startingState.lossPoints === "number" ? startingState.lossPoints : -1);
  const [history, setHistory] = useState(startingState.history || []);
  const [lastWeekTop3, setLastWeekTop3] = useState(startingState.lastWeekTop3 || []);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [winnerId, setWinnerId] = useState((startingState.players || [])[0]?.id || "");
  const [loserId, setLoserId] = useState((startingState.players || [])[1]?.id || "");
  const [shareStatus, setShareStatus] = useState("");

  useEffect(() => {
    if (isPlayerView) return;
    localStorage.setItem("off-hours-leaderboard", JSON.stringify({ players, winPoints, lossPoints, history, lastWeekTop3 }));
  }, [players, winPoints, lossPoints, history, lastWeekTop3, isPlayerView]);

  useEffect(() => {
    if (!players.some((player) => player.id === winnerId)) setWinnerId(players[0]?.id || "");
    if (!players.some((player) => player.id === loserId)) setLoserId(players[1]?.id || players[0]?.id || "");
  }, [players, winnerId, loserId]);

  const rankedPlayers = useMemo(() => {
    return [...players]
      .map((player) => ({
        ...player,
        points: player.won * winPoints + player.lost * lossPoints,
        winRate: player.played ? Math.round((player.won / player.played) * 100) : 0
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

  const totalGames = Math.floor(players.reduce((sum, player) => sum + player.played, 0) / 2);
  const leader = rankedPlayers[0];

  function addPlayer() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newPlayer = { id: uid(), name: trimmed, played: 0, won: 0, lost: 0 };
    setPlayers((current) => [...current, newPlayer]);
    if (!winnerId) setWinnerId(newPlayer.id);
    if (!loserId) setLoserId(newPlayer.id);
    setName("");
  }

  function recordMatch() {
    if (!winnerId || !loserId || winnerId === loserId) return;
    const winner = players.find((p) => p.id === winnerId);
    const loser = players.find((p) => p.id === loserId);
    setHistory((current) => [...current, { winnerId, loserId, winnerName: winner?.name, loserName: loser?.name, time: new Date().toISOString() }]);
    setPlayers((current) => current.map((player) => {
      if (player.id === winnerId) return { ...player, played: player.played + 1, won: player.won + 1 };
      if (player.id === loserId) return { ...player, played: player.played + 1, lost: player.lost + 1 };
      return player;
    }));
  }

  function undoLastMatch() {
    const last = history[history.length - 1];
    if (!last) return;
    setPlayers((current) => current.map((player) => {
      if (player.id === last.winnerId) return { ...player, played: Math.max(0, player.played - 1), won: Math.max(0, player.won - 1) };
      if (player.id === last.loserId) return { ...player, played: Math.max(0, player.played - 1), lost: Math.max(0, player.lost - 1) };
      return player;
    }));
    setHistory((current) => current.slice(0, -1));
  }

  function resetWeek() {
    if (players.length === 0) return;
    const confirmReset = window.confirm("End this week? This will remove all players and save the current top 3 as last week's leaders.");
    if (!confirmReset) return;
    const top3 = rankedPlayers.slice(0, 3).map((player, index) => ({
      rank: index + 1,
      id: player.id,
      name: player.name,
      played: player.played,
      won: player.won,
      lost: player.lost,
      points: player.points,
      winRate: player.winRate
    }));
    setLastWeekTop3(top3);
    setPlayers([]);
    setHistory([]);
    setWinnerId("");
    setLoserId("");
    setQuery("");
  }

  function removePlayer(id) {
    const confirmRemove = window.confirm("Remove this player from the leaderboard?");
    if (!confirmRemove) return;
    setPlayers((current) => current.filter((player) => player.id !== id));
    setHistory((current) => current.filter((item) => item.winnerId !== id && item.loserId !== id));
  }

  async function copyPlayerViewLink() {
    const shareData = encodeShareData({ players, winPoints, lossPoints, lastWeekTop3, sharedAt: new Date().toISOString() });
    const link = `${window.location.origin}${window.location.pathname}?view=players&data=${encodeURIComponent(shareData)}`;
    try {
      await navigator.clipboard.writeText(link);
      setShareStatus("Player view link copied");
    } catch (error) {
      window.prompt("Copy this player view link:", link);
      setShareStatus("Copy the player view link from the popup");
    }
    window.setTimeout(() => setShareStatus(""), 3000);
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-red" />
      <div className="ambient ambient-gold" />
      <main className="container">
        <section className="hero-card glass-card">
          <div className="hero-content">
            <div>
              <div className="eyebrow"><Moon size={14} /> Off Hours Pool League</div>
              <h1>Weekly 8-Ball Leaderboard</h1>
              <p>Track every match, reward regulars, and keep the night crowd chasing the top spot. Wins add points. Losses cut points.</p>
            </div>
            <div className="leader-card">
              <div className="leader-label">{isPlayerView ? "View only" : "Current leader"}</div>
              <div className="leader-name">{leader?.name || "—"}</div>
              <div className="leader-meta">{leader?.points ?? 0} points · {leader?.winRate || 0}% win rate</div>
              {isPlayerView ? <div className="view-pill"><Eye size={14} /> Players can view, not edit</div> : null}
            </div>
          </div>
          <div className="stats-grid">
            <StatPill label="Players" value={players.length} />
            <StatPill label="Matches" value={totalGames} />
            <StatPill label="Points" value={`Win +${winPoints} / Loss ${lossPoints}`} hint="Losses subtract from total" />
          </div>
          {!isPlayerView && (
            <div className="share-strip">
              <div>
                <div className="share-title"><Shield size={16} /> Player view link</div>
                <p>Share a view-only snapshot with players. They can see the leaderboard, but edit controls are hidden.</p>
              </div>
              <button className="share-button" onClick={copyPlayerViewLink}><Link2 size={17} /> Copy Player Link</button>
              {shareStatus ? <div className="share-status">{shareStatus}</div> : null}
            </div>
          )}
        </section>

        {lastWeekTop3.length > 0 && (
          <section className="last-week glass-card">
            <div className="last-week-title">
              <div className="eyebrow"><Medal size={16} /> Last Week's Top 3</div>
              <p>Saved when you clicked reset. Use this for prize announcements or your Instagram story.</p>
            </div>
            <div className="podium-grid">
              {lastWeekTop3.map((player) => (
                <div className={`podium-card podium-${player.rank}`} key={`${player.id}-${player.rank}`}>
                  <RankBadge rank={player.rank} />
                  <div>
                    <strong>{player.name}</strong>
                    <span>{player.points} pts · {player.won}W / {player.lost}L · {player.winRate}% win rate</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="leaderboard glass-card top-leaderboard">
          <div className="leaderboard-header">
            <div><div className="eyebrow"><Flame size={16} /> Live Standings</div><h2>Leaderboard</h2></div>
            <div className="search-box"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search player" /></div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Rank</th><th>Player</th><th>Played</th><th>Won</th><th>Lost</th><th>Win %</th><th>Points</th>{!isPlayerView && <th>Remove</th>}</tr></thead>
              <tbody>
                {filteredPlayers.length === 0 ? (
                  <tr><td colSpan={isPlayerView ? "7" : "8"} className="empty-state">{isPlayerView ? "No leaderboard data in this shared link yet." : "No players yet. Add players below to start the new week."}</td></tr>
                ) : filteredPlayers.map((player) => {
                  const rank = rankedPlayers.findIndex((item) => item.id === player.id) + 1;
                  return <motion.tr layout key={player.id}><td><RankBadge rank={rank} /></td><td><strong>{player.name}</strong><span>{rank === 1 ? "Table king" : rank <= 3 ? "In the money zone" : "Chasing the board"}</span></td><td>{player.played}</td><td className="won">{player.won}</td><td className="lost">{player.lost}</td><td>{player.winRate}%</td><td className="points">{player.points}</td>{!isPlayerView && <td><button className="delete-button" onClick={() => removePlayer(player.id)}><Trash2 size={16} /></button></td>}</motion.tr>;
                })}
              </tbody>
            </table>
          </div>
        </section>

        {!isPlayerView && <section className="actions-grid">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="panel glass-card">
            <div className="panel-title"><div className="icon red"><Swords size={20} /></div><div><h2>Record a Match</h2><p>Winner gets +{winPoints}. Loser gets {lossPoints}.</p></div></div>
            <label>Winner</label>
            <select value={winnerId} onChange={(e) => setWinnerId(e.target.value)} disabled={players.length < 2}>{players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select>
            <label>Loser</label>
            <select value={loserId} onChange={(e) => setLoserId(e.target.value)} disabled={players.length < 2}>{players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select>
            <button className="primary-button" onClick={recordMatch} disabled={players.length < 2 || winnerId === loserId}><Trophy size={17} /> Add Result</button>
            <button className="secondary-button" onClick={undoLastMatch} disabled={history.length === 0}><Undo2 size={16} /> Undo Last Match</button>
          </motion.div>

          <div className="panel glass-card">
            <div className="panel-title"><div className="icon gold"><Plus size={20} /></div><div><h2>Add Player</h2><p>For walk-ins, regulars, or weekly members.</p></div></div>
            <div className="inline-form"><input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addPlayer()} placeholder="Player name" /><button onClick={addPlayer}>Add</button></div>
          </div>

          <div className="panel glass-card">
            <div className="panel-title"><div className="icon neutral"><CircleDot size={20} /></div><div><h2>Points System</h2><p>Default: win +3, loss -1.</p></div></div>
            <div className="points-grid"><div><label>Win</label><input type="number" value={winPoints} onChange={(e) => setWinPoints(Number(e.target.value))} /></div><div><label>Loss</label><input type="number" value={lossPoints} onChange={(e) => setLossPoints(Number(e.target.value))} /></div></div>
            <button className="secondary-button full" onClick={resetWeek}><RotateCcw size={16} /> Reset Week & Save Top 3</button>
          </div>
        </section>}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
