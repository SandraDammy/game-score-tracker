"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-center p-6 md:p-12 text-slate-800">
      <div className="max-w-5xl mx-auto w-full space-y-12">
        
        {/* Main Hero Header */}
        <header className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center bg-blue-50 border border-blue-200 text-blue-700 font-semibold px-4 py-1.5 rounded-full text-sm">
            🏆 Multi-Sport Tournament Management Hub
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
            Game Board & Pairing Portal
          </h1>
          <p className="text-lg text-slate-500">
            Track custom group brackets, build custom multi-game scoreboard matrices, and manage custom individual matchmaking queues effortlessly.
          </p>
        </header>

        {/* Dynamic Navigation Interface Matrix Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card 1: Score Matrix Dashboard */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl group-hover:bg-blue-100 transition">
                📊
              </div>
              <h2 className="text-xl font-bold text-slate-900">Game Score Dashboard</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Add game types and groups to track dynamic aggregated performance score matrices with auto-updating column sum totals.
              </p>
            </div>
            <div className="mt-6">
<Link
  href="/dashboard"
  className="w-full inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition shadow-sm"
>
  Go to Dashboard →
</Link>
            </div>
          </div>

          {/* Card 2: Match Pairing Arena */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-2xl group-hover:bg-purple-100 transition">
                ⚔️
              </div>
              <h2 className="text-xl font-bold text-slate-900">Match Pairing Arena</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Register competitors into a pool and manually pair them or run the smart randomizer module to lock in active rosters.
              </p>
            </div>
            <div className="mt-6">
              <Link
                href="/players"
                className="w-full inline-flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition shadow-sm"
              >
                Enter Arena →
              </Link>
            </div>
          </div>

          {/* Card 3: Pair Selection Portal */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition flex flex-col justify-between group sm:col-span-2 lg:col-span-1">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-2xl group-hover:bg-indigo-100 transition">
                🤝
              </div>
              <h2 className="text-xl font-bold text-slate-900">Pair Selection Portal</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                An open login portal screen for individuals to select an available participant and reserve their pair alliance.
              </p>
            </div>
            <div className="mt-6">
              <Link
                href="/pairing"
                className="w-full inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition shadow-sm"
              >
                Open Selection Portal →
              </Link>
            </div>
          </div>

        </div>

        {/* Small Analytics Footer Indicator */}
        <footer className="text-center pt-6 border-t border-slate-200/60 text-xs text-slate-400">
          Powered by local app router pipelines. State details are securely stored on your browser cache client.
        </footer>

      </div>
    </main>
  );
}
