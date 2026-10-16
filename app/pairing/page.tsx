"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Participant {
  id: string;
  name: string;
  isPaired: boolean;
}

interface ConfirmedPair {
  id: string;
  partnerOne: string;
  partnerTwo: string;
}

export default function SelectionPortal() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [confirmedPairs, setConfirmedPairs] = useState<ConfirmedPair[]>([]);
  
  const [newPlayerName, setNewPlayerName] = useState("");
  const [currentUser, setCurrentUser] = useState("");
  const [selectedPartnerId, setSelectedPartnerId] = useState("");

  // Sync state data model with LocalStorage
  useEffect(() => {
    const storedPlayers = localStorage.getItem("portal_players");
    const storedPairs = localStorage.getItem("portal_pairs");
    if (storedPlayers) setParticipants(JSON.parse(storedPlayers));
    if (storedPairs) setConfirmedPairs(JSON.parse(storedPairs));
  }, []);

  // Filter out individuals who haven't been picked yet
  const availablePartners = participants.filter(p => !p.isPaired && p.name !== currentUser);

  // Auto-select the first available partner in the dropdown list
  useEffect(() => {
    if (availablePartners.length > 0) {
      setSelectedPartnerId(availablePartners[0].id);
    } else {
      setSelectedPartnerId("");
    }
  }, [currentUser, participants]);

  // Register a brand new individual name to the pool
  const handleRegisterPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    // Check for duplicates
    if (participants.some(p => p.name.toLowerCase() === newPlayerName.trim().toLowerCase())) {
      alert("❌ This name is already in the participant pool!");
      return;
    }

    const updatedPlayers = [...participants, { id: crypto.randomUUID(), name: newPlayerName.trim(), isPaired: false }];
    setParticipants(updatedPlayers);
    localStorage.setItem("portal_players", JSON.stringify(updatedPlayers));
    setNewPlayerName("");
  };

  // Lock in a pair matchup
  const handleLockPairing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser.trim() || !selectedPartnerId) {
      alert("❌ Please specify your name and select an available partner!");
      return;
    }

    const chosenPartner = participants.find(p => p.id === selectedPartnerId);
    if (!chosenPartner) return;

    // 1. Create the new matchup pair
    const newPair: ConfirmedPair = {
      id: crypto.randomUUID(),
      partnerOne: currentUser.trim(),
      partnerTwo: chosenPartner.name
    };

    // 2. Mark the partner as paired. If the current user exists in the registry, mark them paired too.
    const updatedPlayers = participants.map(p => {
      if (p.id === selectedPartnerId) return { ...p, isPaired: true };
      if (p.name.toLowerCase() === currentUser.trim().toLowerCase()) return { ...p, isPaired: true };
      return p;
    });

    const updatedPairs = [...confirmedPairs, newPair];

    setParticipants(updatedPlayers);
    setConfirmedPairs(updatedPairs);
    
    localStorage.setItem("portal_players", JSON.stringify(updatedPlayers));
    localStorage.setItem("portal_pairs", JSON.stringify(updatedPairs));
    
    // Reset individual action fields
    setCurrentUser("");
    setSelectedPartnerId("");
    alert(`🎉 Success! You are now paired with ${chosenPartner.name}.`);
  };

  const resetPortal = () => {
    if (confirm("Are you sure you want to clear all participants and pairings?")) {
      setParticipants([]);
      setConfirmedPairs([]);
      localStorage.removeItem("portal_players");
      localStorage.removeItem("portal_pairs");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12 text-slate-800">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Navigation / Header */}
        <header className="border-b pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">🤝 Player Pairing Selection Portal</h1>
            <p className="text-slate-500 mt-1">Enter your name, browse available individuals, and pick your partner.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={resetPortal} className="text-xs text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 font-semibold px-3 py-2 rounded-lg transition">
              Reset Portal
            </button>
            <Link href="/" className="bg-slate-800 hover:bg-slate-900 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition">
              ← Main Dashboard
            </Link>
          </div>
        </header>

        <div className="grid md:grid-cols-3 gap-6">
          
          {/* Column 1: Add Name to Pool */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
            <h2 className="text-lg font-semibold mb-3 text-slate-900">1. Join the Pool</h2>
            <p className="text-xs text-slate-500 mb-4">Add your name to the global registry so others can select you as a partner.</p>
            <form onSubmit={handleRegisterPlayer} className="space-y-3">
              <input
                type="text"
                placeholder="Enter player name..."
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg text-sm transition">
                Add to Pool List
              </button>
            </form>

            <div className="mt-6 border-t pt-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Available Pool ({participants.filter(p => !p.isPaired).length})</h3>
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1">
                {participants.filter(p => !p.isPaired).map((p) => (
                  <span key={p.id} className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-2.5 py-1 rounded-md font-medium">
                    🟢 {p.name}
                  </span>
                ))}
                {participants.filter(p => !p.isPaired).length === 0 && (
                  <span className="text-xs text-slate-400 italic">No single players left. Add more above!</span>
                )}
              </div>
            </div>
          </div>

          {/* Column 2: Choose Your Partner */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
            <h2 className="text-lg font-semibold mb-3 text-slate-900">2. Pick a Partner</h2>
            <form onSubmit={handleLockPairing} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Your Name</label>
                <input
                  type="text"
                  placeholder="Who is choosing right now?"
                  value={currentUser}
                  onChange={(e) => setCurrentUser(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Select an Available Partner</label>
                {availablePartners.length === 0 ? (
                  <div className="text-xs text-slate-400 bg-slate-50 border p-3 rounded-lg italic">
                    No matching individuals are currently free in the pool list.
                  </div>
                ) : (
                  <select
                    value={selectedPartnerId}
                    onChange={(e) => setSelectedPartnerId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    {availablePartners.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <button 
                type="submit" 
                disabled={availablePartners.length === 0 || !currentUser.trim()}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-medium py-2 rounded-lg text-sm transition mt-2"
              >
                🔒 Confirm Pairing
              </button>
            </form>
          </div>

          {/* Column 3: Display Confirmed Alliances */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-h-[300px]">
            <h2 className="text-xl font-bold mb-4 text-slate-900 border-b pb-2">Locked-In Pairs ({confirmedPairs.length})</h2>
            
            {confirmedPairs.length === 0 ? (
              <div className="text-center text-slate-400 text-sm py-12 italic">
                No couples or pairs matched yet. Use the selector to form a team!
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-96">
                {confirmedPairs.map((pair) => (
                  <div key={pair.id} className="p-3 border rounded-xl bg-indigo-50/40 border-indigo-100 flex items-center justify-between">
                    <div className="text-sm font-medium text-slate-800">
                      🤝 <span className="font-bold text-indigo-950">{pair.partnerOne}</span> & <span className="font-bold text-indigo-950">{pair.partnerTwo}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
      </main>
        );
}  
