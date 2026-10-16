"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Group {
  id: string;
  name: string;
}

interface Game {
  id: string;
  name: string;
}

interface Person {
  id: string;
  name: string;
  groupId: string;
}

type Scores = Record<string, Record<string, number>>;

export default function Home() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [scores, setScores] = useState<Scores>({});
  const [newGameName, setNewGameName] = useState("");

  // Load state data from localStorage to stay synced between pages
  useEffect(() => {
    const storedGroups = localStorage.getItem("game_groups");
    const storedPeople = localStorage.getItem("game_people");
    const storedGames = localStorage.getItem("game_games");
    const storedScores = localStorage.getItem("game_scores");

    if (storedGroups) setGroups(JSON.parse(storedGroups));
    if (storedPeople) setPeople(JSON.parse(storedPeople));
    if (storedGames) setGames(JSON.parse(storedGames));
    if (storedScores) setScores(JSON.parse(storedScores));
  }, []);

  const addGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGameName.trim()) return;

    const updatedGames = [...games, { id: crypto.randomUUID(), name: newGameName.trim() }];
    setGames(updatedGames);
    localStorage.setItem("game_games", JSON.stringify(updatedGames));
    setNewGameName("");
  };

  const handleScoreChange = (groupId: string, gameId: string, val: string) => {
    const numericValue = val === "" ? 0 : parseInt(val, 10);
    if (isNaN(numericValue)) return;

    const updatedScores = {
      ...scores,
      [groupId]: {
        ...(scores[groupId] || {}),
        [gameId]: numericValue,
      },
    };
    setScores(updatedScores);
    localStorage.setItem("game_scores", JSON.stringify(updatedScores));
  };

  const getGroupTotal = (groupId: string) => {
    const groupScores = scores[groupId] || {};
    return Object.values(groupScores).reduce((sum, current) => sum + current, 0);
  };

  // Filter people assigned to a specific group
  const getGroupMembers = (groupId: string) => {
    return people.filter((p) => p.groupId === groupId);
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12 text-slate-800">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <header className="border-b pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">🏆 Game Score Dashboard</h1>
            <p className="text-slate-500 mt-1">Track groups, manage games, and view aggregated performance scores.</p>
          </div>
          <Link
            href="/players"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition shadow-sm"
          >
            👥 Manage People & Groups →
          </Link>

          {/* Insert this button within your header flex row inside src/app/page.tsx */}
          <Link
            href="/pairing"
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition shadow-sm"
          >
            ⚔️ Match Pairing Arena →
          </Link>

        </header>

        {/* Game Types Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-xl">
          <h2 className="text-lg font-semibold mb-3 text-slate-900">Add Game Type</h2>
          <form onSubmit={addGame} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g., Chess, Football, Trivia"
              value={newGameName}
              onChange={(e) => setNewGameName(e.target.value)}
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />
            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition">
              Add Game
            </button>
          </form>
        </div>

        {/* Scoreboard Matrix Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b bg-slate-50">
            <h2 className="font-bold text-slate-900">Live Matrix Scoreboard</h2>
          </div>

          {groups.length === 0 || games.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              💡 Please head over to the <Link href="/players" className="text-blue-600 underline">Manage People page</Link> to add groups, then create game types to view the scoreboard.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                    <th className="p-4 min-w-[220px]">Groups / Teams</th>
                    {games.map((game) => (
                      <th key={game.id} className="p-4 text-center min-w-[100px]">{game.name}</th>
                    ))}
                    <th className="p-4 text-center font-bold text-blue-700 bg-blue-50/50 min-w-[120px]">Sum Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groups.map((group) => {
                    const members = getGroupMembers(group.id);
                    return (
                      <tr key={group.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-4 vertical-top">
                          <div className="font-bold text-slate-900 text-base">{group.name}</div>
                          {/* Display Team Roster */}
                          <div className="mt-1 flex flex-wrap gap-1">
                            {members.length > 0 ? (
                              members.map(m => (
                                <span key={m.id} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                  {m.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400 italic">No members assigned</span>
                            )}
                          </div>
                        </td>

                        {games.map((game) => (
                          <td key={game.id} className="p-2 text-center">
                            <input
                              type="number"
                              value={scores[group.id]?.[game.id] ?? ""}
                              placeholder="0"
                              onChange={(e) => handleScoreChange(group.id, game.id, e.target.value)}
                              className="w-20 text-center px-2 py-1.5 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                            />
                          </td>
                        ))}

                        <td className="p-4 text-center font-bold text-blue-600 bg-blue-50/30 text-lg">
                          {getGroupTotal(group.id)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
