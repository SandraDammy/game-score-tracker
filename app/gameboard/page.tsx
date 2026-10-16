"use client";

import { Suspense, useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Group {
  id: string;
  name: string;
}

interface GameCategory {
  id: string;
  name: string;
}

type ScoreMap = Record<string, Record<string, number>>;

function readArray<T>(key: string): T[] {
  try {
    const value = localStorage.getItem(key);
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (error) {
    console.error(`Unable to read ${key}.`, error);
    return [];
  }
}

function syncGlobalGroupRegistry(groups: Group[]) {
  const currentRegistry = readArray<Group>("game_groups");
  const merged = new Map<string, Group>();

  [...currentRegistry, ...groups].forEach((group) => {
    if (group?.id && group?.name && !merged.has(group.id)) {
      merged.set(group.id, group);
    }
  });

  localStorage.setItem("game_groups", JSON.stringify([...merged.values()]));
}

function GameboardContent() {
  const searchParams = useSearchParams();
  const boardId = searchParams.get("id") || "default";

  const [boardProfile, setBoardProfile] = useState<{ name: string } | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [games, setGames] = useState<GameCategory[]>([]);
  const [scores, setScores] = useState<ScoreMap>({});
  const [newGroupName, setNewGroupName] = useState("");
  const [newGameName, setNewGameName] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem("active_gameboard_id", boardId);

      const boards = readArray<{ id: string; name?: string }>("central_gameboards");
      const match = boards.find((board) => board.id === boardId);
      setBoardProfile(match ? { name: match.name || "Game Score Matrix" } : null);

      const loadedGroups = readArray<Group>(`groups_${boardId}`);
      const loadedGames = readArray<GameCategory>(`games_${boardId}`);

      let loadedScores: ScoreMap = {};
      try {
        const rawScores = localStorage.getItem(`scores_${boardId}`);
        if (rawScores) {
          const parsed: unknown = JSON.parse(rawScores);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            loadedScores = parsed as ScoreMap;
          }
        }
      } catch (error) {
        console.error("Unable to read board scores.", error);
      }

      setGroups(loadedGroups);
      setGames(loadedGames);
      setScores(loadedScores);
    } catch (error) {
      console.error("Failed to load gameboard data.", error);
    }
  }, [boardId]);

  const persistGroups = (updatedGroups: Group[]) => {
    setGroups(updatedGroups);
    localStorage.setItem(`groups_${boardId}`, JSON.stringify(updatedGroups));
    syncGlobalGroupRegistry(updatedGroups);
  };

  const addGroup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newGroupName.trim();
    if (!name) return;

    if (groups.some((group) => group.name.toLowerCase() === name.toLowerCase())) {
      alert("A group or team with this name already exists on this gameboard.");
      return;
    }

    persistGroups([...groups, { id: crypto.randomUUID(), name }]);
    setNewGroupName("");
  };

  const addGame = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newGameName.trim();
    if (!name) return;

    if (games.some((game) => game.name.toLowerCase() === name.toLowerCase())) {
      alert("This game category already exists.");
      return;
    }

    const updated = [...games, { id: crypto.randomUUID(), name }];
    setGames(updated);
    localStorage.setItem(`games_${boardId}`, JSON.stringify(updated));
    setNewGameName("");
  };

  const deleteGroup = (id: string) => {
    const updatedGroups = groups.filter((group) => group.id !== id);
    persistGroups(updatedGroups);

    const updatedScores = { ...scores };
    delete updatedScores[id];
    setScores(updatedScores);
    localStorage.setItem(`scores_${boardId}`, JSON.stringify(updatedScores));

    // If a deleted group had assigned roster members, return them to unassigned.
    const rawPeople = localStorage.getItem("game_people");
    if (rawPeople) {
      try {
        const people = JSON.parse(rawPeople) as Array<{ groupId?: string }>;
        const updatedPeople = people.map((person) =>
          person.groupId === id ? { ...person, groupId: "" } : person,
        );
        localStorage.setItem("game_people", JSON.stringify(updatedPeople));
      } catch (error) {
        console.error("Unable to update player assignments after deleting a group.", error);
      }
    }

    // Remove the deleted group from the legacy/global registry if present.
    const globalGroups = readArray<Group>("game_groups").filter((group) => group.id !== id);
    localStorage.setItem("game_groups", JSON.stringify(globalGroups));
  };

  const deleteGame = (id: string) => {
    const updatedGames = games.filter((game) => game.id !== id);
    setGames(updatedGames);
    localStorage.setItem(`games_${boardId}`, JSON.stringify(updatedGames));

    const updatedScores = { ...scores };
    Object.keys(updatedScores).forEach((groupId) => {
      if (updatedScores[groupId]) delete updatedScores[groupId][id];
    });
    setScores(updatedScores);
    localStorage.setItem(`scores_${boardId}`, JSON.stringify(updatedScores));
  };

  const handleScoreChange = (groupId: string, gameId: string, value: string) => {
    const numericValue = value === "" ? 0 : Number.parseInt(value, 10);
    if (Number.isNaN(numericValue)) return;

    const updated = {
      ...scores,
      [groupId]: { ...(scores[groupId] || {}), [gameId]: numericValue },
    };
    setScores(updated);
    localStorage.setItem(`scores_${boardId}`, JSON.stringify(updated));
  };

  const getGroupTotal = (groupId: string) =>
    Object.values(scores[groupId] || {}).reduce<number>((sum, value) => sum + value, 0);

  // Rank groups by total score, highest score first. Tied groups share a rank.
  const sortedGroups = [...groups]
    .map((group) => ({
      ...group,
      total: getGroupTotal(group.id),
    }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  let currentRank = 0;
  let previousTotal: number | null = null;

  const rankedGroups = sortedGroups.map((group, index) => {
    if (index === 0 || group.total !== previousTotal) {
      currentRank = index + 1;
    }

    previousTotal = group.total;
    return { ...group, rank: currentRank };
  });

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-800 md:p-12">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col items-start justify-between gap-4 border-b pb-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">🏆 {boardProfile?.name || "Game Score Matrix"}</h1>
            <p className="text-xs text-slate-400">Board Tracking Hash Ref Key: {boardId}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/players?id=${encodeURIComponent(boardId)}`} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
              👥 Manage Rosters &amp; Players
            </Link>
            <Link href="/dashboard" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-900">
              ← Back to Board List
            </Link>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="space-y-4 rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold">Append New Group / Team</h2>
            <form onSubmit={addGroup} className="flex gap-2">
              <input type="text" placeholder="Team name..." value={newGroupName} onChange={(event) => setNewGroupName(event.target.value)} className="min-w-0 flex-1 rounded-md border px-3 py-1.5 text-sm" required />
              <button type="submit" className="rounded-md bg-blue-600 px-3 text-xs text-white hover:bg-blue-700">Add</button>
            </form>

            <div className="border-t border-slate-100 pt-2">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Registered Groups</span>
              {groups.length === 0 ? (
                <p className="text-xs italic text-slate-400">No groups added yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {groups.map((group) => (
                    <div key={group.id} className="inline-flex items-center gap-1.5 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                      <span>{group.name}</span>
                      <button type="button" onClick={() => deleteGroup(group.id)} aria-label={`Delete ${group.name}`} className="font-bold text-blue-400 transition hover:text-blue-900">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4 rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold">Append Game Category Type</h2>
            <form onSubmit={addGame} className="flex gap-2">
              <input type="text" placeholder="Game type (e.g. Trivia)..." value={newGameName} onChange={(event) => setNewGameName(event.target.value)} className="min-w-0 flex-1 rounded-md border px-3 py-1.5 text-sm" required />
              <button type="submit" className="rounded-md bg-green-600 px-3 text-xs text-white hover:bg-green-700">Add</button>
            </form>

            <div className="border-t border-slate-100 pt-2">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Registered Game Types</span>
              {games.length === 0 ? (
                <p className="text-xs italic text-slate-400">No game types added yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {games.map((game) => (
                    <div key={game.id} className="inline-flex items-center gap-1.5 rounded-md border border-green-100 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                      <span>{game.name}</span>
                      <button type="button" onClick={() => deleteGame(game.id)} aria-label={`Delete ${game.name}`} className="font-bold text-green-400 transition hover:text-green-900">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
          {groups.length === 0 || games.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-400">Add teams and game categories above to build the score tracker matrix.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 font-bold text-slate-700">
                    <th className="p-4">Group Name</th>
                    {games.map((game) => <th key={game.id} className="p-4 text-center">{game.name}</th>)}
                    <th className="bg-blue-50/50 p-4 text-center">Sum Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {groups.map((group) => (
                    <tr key={group.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-bold">{group.name}</td>
                      {games.map((game) => (
                        <td key={game.id} className="p-2 text-center">
                          <input type="number" min="0" placeholder="0" value={scores[group.id]?.[game.id] ?? ""} onChange={(event) => handleScoreChange(group.id, game.id, event.target.value)} className="w-16 rounded border p-1 text-center" />
                        </td>
                      ))}
                      <td className="bg-blue-50/20 p-4 text-center font-bold text-blue-600">{getGroupTotal(group.id)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Group rankings update automatically when scores change. */}
        <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="flex flex-col gap-1 border-b p-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">🏆 Group Rankings</h2>
              <p className="mt-1 text-sm text-slate-500">
                Teams are ranked by total points, from highest to lowest.
              </p>
            </div>
            <span className="text-xs font-medium text-slate-400">
              {groups.length} {groups.length === 1 ? "group" : "groups"}
            </span>
          </div>

          {rankedGroups.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">
              Create a group to see the rankings.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">Rank</th>
                    <th className="px-5 py-3">Group / Team</th>
                    <th className="px-5 py-3 text-right">Total Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rankedGroups.map((group) => (
                    <tr key={group.id} className={group.rank === 1 ? "bg-amber-50/60" : "hover:bg-slate-50/70"}>
                      <td className="px-5 py-3">
                        <span className={`inline-flex min-w-9 items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold ${
                          group.rank === 1
                            ? "bg-amber-100 text-amber-800"
                            : group.rank === 2
                              ? "bg-slate-200 text-slate-700"
                              : group.rank === 3
                                ? "bg-orange-100 text-orange-800"
                                : "bg-slate-100 text-slate-600"
                        }`}>
                          {group.rank === 1 ? "🥇 1" : group.rank === 2 ? "🥈 2" : group.rank === 3 ? "🥉 3" : group.rank}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-800">{group.name}</td>
                      <td className="px-5 py-3 text-right font-bold tabular-nums text-blue-700">{group.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function Gameboard() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-slate-500">Loading gameboard...</div>}>
      <GameboardContent />
    </Suspense>
  );
}
