import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion } from "framer-motion";
import { Trophy, Plus, RotateCcw, Swords, Search, Crown, Flame, Moon, CircleDot, Trash2 } from "lucide-react";
import "./styles.css";

const STORAGE_KEY = "off-hours-leaderboard-v1";

const initialPlayers = [
  { id: "p1", name: "Aarav", played: 8, won: 6, lost: 2 },
  { id: "p2", name: "Kabir", played: 7, won: 5, lost: 2 },
  { id: "p3", name: "Rohan", played: 9, won: 5, lost: 4 },
  { id: "p4", name: "Ishaan", played: 6, won: 3, lost: 3 },
  { id: "p5", name: "Dev", played: 5, won: 2, lost: 3 },
  { id: "p6", name: "Arjun", played: 4, won: 1, lost: 3 },
];

const uid = () => Math.random().toString(36).slice(2, 10);

function StatPill({ label, value }) {
  return (
    <div className="stat-pill">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

function RankBadge({ rank }) {
  if (rank === 1) return <div className="rank-badge rank-1"><Crown size={16} /></div>;
  if (rank === 2) return <div className="rank-badge rank-2">2</div>;
  if (rank === 3) return <div className="rank-badge rank-3">3</div>;
  return <div className="rank-badge rank-other">{rank}</div>;
}

function App() {
  const [players, setPlayers] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).players || initialPlayers;
    } catch {}
    return initialPlayers;
  });
  const [name, setName] = useState("");
  const [winnerId, setWinnerId] = useState("p1");
  const [loserId, setLoserId] = useState("p2");
  const [winPoints, setWinPoints] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).winPoints ?? 3;
    } catch {}
    return 3;
  });
  const [lossPoints, setLossPoints] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).lossPoints ?? 1;
    } catch {}
    return 1;
  });
  const [query, setQuery] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ players, winPoints, lossPoints }));
  }, [players, winPoints, lossPoints]);

  const rankedPlayers = useMemo(() => {
    return [...players]
      .map((player) => ({
        ...player,
        points: player.won * winPoints + player.lost * lossPoints,
        winRate: player.played ? Math.round((player.won / player.played) * 100) : 0,
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

  const addPlayer = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newPlayer = { id: uid(), name: trimmed, played: 0, won: 0, lost: 0 };
    setPlayers((current) => [...current, newPlayer]);
    setWinnerId((current) => current || newPlayer.id);
    setLoserId((current) => current || newPlayer.id);
    setName("");
  };

  const recordMatch = () => {
    if (!winnerId || !loserId || winnerId === loserId) return;
    setPlayers((current) =>
      current.map((player) => {
        if (player.id === winnerId) return { ...player, played: player.played + 1, won: player.won + 1 };
        if (player.id === loserId) return { ...player, played: player.played + 1, lost: player.lost + 1 };
        return player;
      })
    );
  };

  const resetWeek = () => {
    const sure = window.confirm("Reset all weekly scores to zero?");
    if (!sure) return;
    setPlayers((current) => current.map((player) => ({ ...player, played: 0, won: 0, lost: 0 })));
  };

  const removePlayer = (id) => {
    const sure = window.confirm("Remove this player from the leaderboard?");
    if (!sure) return;
    setPlayers((current) => {
      const next = current.filter((player) => player.id !== id);
      if (winnerId === id) setWinnerId(next[0]?.id || "");
      if (loserId === id) setLoserId(next[1]?.id || next[0]?.id || "");
      return next;
    });
  };

  return (
    <div className="app-shell">
      <div className="background-glow">
        <div className="glow glow-red" />
        <div className="glow glow-amber" />
        <div className="grain" />
      </div>

      <main className="container">
        <section className="hero-grid">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="hero-card">
            <div className="hero-content">
              <div>
                <div className="eyebrow"><Moon size={14} /> Off Hours Pool League</div>
                <h1>Weekly 8-Ball Leaderboard</h1>
                <p>Track every match, reward regulars, and keep the night crowd chasing the top spot.</p>
              </div>
              <div className="leader-card">
                <div className="leader-label">Current leader</div>
                <div className="leader-name">{leader?.name || "—"}</div>
                <div className="leader-meta">{leader?.points || 0} points · {leader?.winRate || 0}% win rate</div>
              </div>
            </div>
            <div className="stats-grid">
              <StatPill label="Players" value={players.length} />
              <StatPill label="Matches" value={totalGames} />
              <StatPill label="Win Points" value={winPoints} />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.05 }} className="panel">
            <div className="panel-title-row">
              <div className="icon-box red"><Swords size={20} /></div>
              <div><h2>Record a Match</h2><p>Winner gets points. Loser gets attendance points.</p></div>
            </div>
            <div className="form-grid">
              <label>Winner</label>
              <select value={winnerId} onChange={(e) => setWinnerId(e.target.value)}>
                {players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
              </select>
              <label>Loser</label>
              <select value={loserId} onChange={(e) => setLoserId(e.target.value)}>
                {players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
              </select>
              <button className="primary-button" onClick={recordMatch}><Trophy size={17} /> Add Result</button>
            </div>
          </motion.div>
        </section>

        <section className="main-grid">
          <div className="side-stack">
            <div className="panel">
              <div className="panel-title-row">
                <div className="icon-box amber"><Plus size={20} /></div>
                <div><h2>Add Player</h2><p>For walk-ins, regulars, or weekly members.</p></div>
              </div>
              <div className="add-row">
                <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addPlayer()} placeholder="Player name" />
                <button className="amber-button" onClick={addPlayer}>Add</button>
              </div>
            </div>

            <div className="panel dark-panel">
              <div className="panel-title-row">
                <div className="icon-box neutral"><CircleDot size={20} /></div>
                <div><h2>Points System</h2><p>Change it based on your weekly format.</p></div>
              </div>
              <div className="points-grid">
                <div><label>Win</label><input type="number" value={winPoints} min="0" onChange={(e) => setWinPoints(Number(e.target.value))} /></div>
                <div><label>Loss</label><input type="number" value={lossPoints} min="0" onChange={(e) => setLossPoints(Number(e.target.value))} /></div>
              </div>
              <button className="outline-button" onClick={resetWeek}><RotateCcw size={16} /> Reset Weekly Scores</button>
            </div>
          </div>

          <div className="leaderboard-card">
            <div className="leaderboard-header">
              <div>
                <div className="live-label"><Flame size={16} /> Live Standings</div>
                <h2>Leaderboard</h2>
              </div>
              <div className="search-box"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search player" /></div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Rank</th><th>Player</th><th>Played</th><th>Won</th><th>Lost</th><th>Win %</th><th>Points</th><th></th></tr>
                </thead>
                <tbody>
                  {filteredPlayers.map((player) => {
                    const rank = rankedPlayers.findIndex((item) => item.id === player.id) + 1;
                    return (
                      <motion.tr layout key={player.id}>
                        <td><RankBadge rank={rank} /></td>
                        <td><strong>{player.name}</strong><span>{rank === 1 ? "Table king" : rank <= 3 ? "In the money zone" : "Chasing the board"}</span></td>
                        <td>{player.played}</td><td className="won">{player.won}</td><td className="lost">{player.lost}</td><td>{player.winRate}%</td><td className="points">{player.points}</td>
                        <td><button className="trash-button" onClick={() => removePlayer(player.id)}><Trash2 size={16} /></button></td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
