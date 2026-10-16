"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface GameboardProfile {
  id: string;
  name: string;
  description: string;
  dateCreated: string;
}

export default function GameboardDashboard() {
  const router = useRouter();
  const [gameboards, setGameboards] = useState<GameboardProfile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form input fields
  const [boardName, setBoardName] = useState("");
  const [boardDesc, setBoardDesc] = useState("");

  // Statistics counters parsed from localStorage per board id
  const [boardStats, setBoardStats] = useState<Record<string, { groups: number; games: number }>>({});

  useEffect(() => {
    const storedBoards = localStorage.getItem("central_gameboards");
    if (storedBoards) {
      const parsedBoards: GameboardProfile[] = JSON.parse(storedBoards);
      setGameboards(parsedBoards);

      // Dynamically calculate metrics for each board profile entry
      const statsMap: Record<string, { groups: number; games: number }> = {};
      parsedBoards.forEach((board) => {
        const groups = JSON.parse(localStorage.getItem(`groups_${board.id}`) || "[]");
        const games = JSON.parse(localStorage.getItem(`games_${board.id}`) || "[]");
        statsMap[board.id] = { groups: groups.length, games: games.length };
      });
      setBoardStats(statsMap);
    }
  }, []);

  const handleCreateBoard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardName.trim()) return;

    const newBoard: GameboardProfile = {
      id: crypto.randomUUID(),
      name: boardName.trim(),
      description: boardDesc.trim() || "No extra info provided",
      dateCreated: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };

    const updatedBoards = [...gameboards, newBoard];
    setGameboards(updatedBoards);
    localStorage.setItem("central_gameboards", JSON.stringify(updatedBoards));

    // Clear input models and close layout overlay modal
    setBoardName("");
    setBoardDesc("");
    setIsModalOpen(false);

    // Auto-route straight into configuring the new board layout
    router.push(`/gameboard?id=${newBoard.id}`);
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12 text-slate-800">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Navigation Head */}
        <header className="border-b pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">📊 Saved Gameboards Manager</h1>
            <p className="text-slate-500 mt-1">Select an active tourney profile dashboard or initialize a new scoring matrix sheet.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/" className="border bg-white text-slate-700 font-medium px-4 py-2.5 rounded-lg text-sm transition hover:bg-slate-100">
              ← Main Hub
            </Link>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition shadow-sm"
            >
              ➕ Create New Gameboard
            </button>
          </div>
        </header>

        {/* Gameboard Records Table List Grid Container */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {gameboards.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <div className="text-3xl">📭</div>
              <p className="text-sm">No gameboards registered yet. Click the top button to deploy your first dashboard bracket!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                    <th className="p-4">Game Name</th>
                    <th className="p-4">Additional Details</th>
                    <th className="p-4">Date Created</th>
                    <th className="p-4 text-center">Number of Groups</th>
                    <th className="p-4 text-center">Number of Games</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gameboards.map((board) => (
                    <tr
                      key={board.id}
                      onClick={() => router.push(`/gameboard?id=${board.id}`)}
                      className="hover:bg-blue-50/50 cursor-pointer transition"
                    >
                      <td className="p-4 font-bold text-blue-600 text-base">{board.name}</td>
                      <td className="p-4 text-slate-500 max-w-xs truncate">{board.description}</td>
                      <td className="p-4 text-slate-600 font-medium">{board.dateCreated}</td>
                      <td className="p-4 text-center font-semibold text-slate-700">
                        {boardStats[board.id]?.groups ?? 0}
                      </td>
                      <td className="p-4 text-center font-semibold text-slate-700">
                        {boardStats[board.id]?.games ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Overlay Dropdown for New Gameboard Form Entry */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl border p-6 max-w-md w-full space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-lg font-bold text-slate-900">Initialize New Scoreboard</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
              </div>
              <form onSubmit={handleCreateBoard} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Game Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Winter Olympics 2026, Office Trivia"
                    value={boardName}
                    onChange={(e) => setBoardName(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Other Information / Description</label>
                  <textarea
                    rows={3}
                    placeholder="Provide rules, venue locations or tournament structure notes..."
                    value={boardDesc}
                    onChange={(e) => setBoardDesc(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-semibold border rounded-lg text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                  >
                    Generate Board
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
