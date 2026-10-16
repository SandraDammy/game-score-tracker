"use client";

import { Suspense, useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Group {
    id: string;
    name: string;
}

interface Person {
    id: string;
    name: string;
    groupId: string;
}

function readGroups(storageKey: string): Group[] {
    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return [];

        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        return parsed.filter(
            (item): item is Group =>
                Boolean(item) &&
                typeof item.id === "string" &&
                typeof item.name === "string",
        );
    } catch (error) {
        console.error(`Unable to read ${storageKey}.`, error);
        return [];
    }
}

function mergeGroups(...lists: Group[][]): Group[] {
    const merged = new Map<string, Group>();
    const names = new Set<string>();

    lists.flat().forEach((group) => {
        const normalizedName = group.name.trim().toLowerCase();
        if (!group.id || !normalizedName || merged.has(group.id) || names.has(normalizedName)) {
            return;
        }

        merged.set(group.id, { id: group.id, name: group.name.trim() });
        names.add(normalizedName);
    });

    return [...merged.values()];
}

function PlayersAndGroupsContent() {
    const searchParams = useSearchParams();
    const requestedBoardId = searchParams.get("id");

    // When opened directly, use the last board visited in this browser.
    const [boardId, setBoardId] = useState<string | null>(null);
    const [groups, setGroups] = useState<Group[]>([]);
    const [people, setPeople] = useState<Person[]>([]);
    const [groupInput, setGroupInput] = useState("");
    const [personInput, setPersonInput] = useState("");
    const [bulkInput, setBulkInput] = useState("");
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [shuffleBeforeAssign, setShuffleBeforeAssign] = useState(true);

    useEffect(() => {
        const activeBoardId =
            requestedBoardId || localStorage.getItem("active_gameboard_id") || "";
        setBoardId(activeBoardId);
    }, [requestedBoardId]);

    // Load groups from the current board's key so both pages use the same source.
    useEffect(() => {
        if (boardId === null) return;

        try {
            let loadedGroups: Group[];

            if (boardId) {
                const boardGroupsKey = `groups_${boardId}`;
                const boardGroupsValue = localStorage.getItem(boardGroupsKey);

                if (boardGroupsValue !== null) {
                    loadedGroups = readGroups(boardGroupsKey);
                } else {
                    // Keep groups board-specific. The old global registry has no reliable
                    // board ownership, so importing it here could mix teams from other boards.
                    loadedGroups = [];
                    localStorage.setItem(boardGroupsKey, JSON.stringify(loadedGroups));
                }
            } else {
                // Standalone /players view: show the global registry plus all board groups.
                const groupLists: Group[][] = [readGroups("game_groups")];
                const rawBoards = localStorage.getItem("central_gameboards");

                if (rawBoards) {
                    try {
                        const boards: unknown = JSON.parse(rawBoards);
                        if (Array.isArray(boards)) {
                            boards.forEach((board) => {
                                if (board && typeof board.id === "string") {
                                    groupLists.push(readGroups(`groups_${board.id}`));
                                }
                            });
                        }
                    } catch (error) {
                        console.error("Unable to read saved gameboards.", error);
                    }
                }

                loadedGroups = mergeGroups(...groupLists);
            }

            setGroups(loadedGroups);

            const storedPeople = localStorage.getItem("game_people");
            if (storedPeople) {
                const parsedPeople: unknown = JSON.parse(storedPeople);
                if (Array.isArray(parsedPeople)) {
                    const normalizedPeople = parsedPeople
                        .filter(
                            (person): person is Partial<Person> & { name: string } =>
                                Boolean(person) && typeof person.name === "string",
                        )
                        .map((person) => ({
                            id:
                                typeof person.id === "string" && person.id
                                    ? person.id
                                    : crypto.randomUUID(),
                            name: person.name.trim(),
                            groupId: typeof person.groupId === "string" ? person.groupId : "",
                        }))
                        .filter((person) => person.name.length > 0);

                    setPeople(normalizedPeople);
                } else {
                    setPeople([]);
                }
            } else {
                setPeople([]);
            }
        } catch (error) {
            console.error("Failed to load saved groups or roster members.", error);
        }
    }, [boardId]);

    const saveGroups = (updatedGroups: Group[]) => {
        setGroups(updatedGroups);

        // Save the board-specific group list used by Gameboard.
        if (boardId) {
            localStorage.setItem(`groups_${boardId}`, JSON.stringify(updatedGroups));
        }

        // Keep the legacy/global group registry in sync as well.
        const globalGroups = readGroups("game_groups");
        const updatedGlobalGroups = boardId
            ? mergeGroups(globalGroups, updatedGroups)
            : updatedGroups;

        localStorage.setItem("game_groups", JSON.stringify(updatedGlobalGroups));
    };

    const savePeople = (updatedPeople: Person[]) => {
        setPeople(updatedPeople);
        localStorage.setItem("game_people", JSON.stringify(updatedPeople));
    };

    const handleAddGroup = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const name = groupInput.trim();
        if (!name) return;

        if (groups.some((group) => group.name.toLowerCase() === name.toLowerCase())) {
            alert("A group with this name already exists.");
            return;
        }

        const newGroup: Group = { id: crypto.randomUUID(), name };
        saveGroups([...groups, newGroup]);
        setGroupInput("");
    };

    const handleAddPerson = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const name = personInput.trim();
        if (!name) return;

        savePeople([...people, { id: crypto.randomUUID(), name, groupId: "" }]);
        setPersonInput("");
    };

    const handleBulkAddPeople = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!bulkInput.trim()) return;

        const newPeople: Person[] = bulkInput
            .split(/[\n,;]+/)
            .map((name) => name.trim())
            .filter(Boolean)
            .map((name) => ({ id: crypto.randomUUID(), name, groupId: "" }));

        if (!newPeople.length) return;

        savePeople([...people, ...newPeople]);
        setBulkInput("");
        alert(`Successfully added ${newPeople.length} player(s) to the roster.`);
    };

    // const handleAutoAssignTeams = () => {
    //     if (!people.length) {
    //         alert("Add players to the roster before running auto-assignment.");
    //         return;
    //     }

    //     if (!groups.length) {
    //         alert("Create at least one group before running auto-assignment.");
    //         return;
    //     }

    //     const playersToAssign = [...people];

    //     if (shuffleBeforeAssign) {
    //         for (let index = playersToAssign.length - 1; index > 0; index -= 1) {
    //             const randomIndex = Math.floor(Math.random() * (index + 1));
    //             [playersToAssign[index], playersToAssign[randomIndex]] = [
    //                 playersToAssign[randomIndex],
    //                 playersToAssign[index],
    //             ];
    //         }
    //     }

    //     const assignedPeople = playersToAssign.map((person, index) => ({
    //         ...person,
    //         groupId: groups[index % groups.length].id,
    //     }));

    //     savePeople(assignedPeople);
    //     alert(`Assigned ${assignedPeople.length} player(s) across ${groups.length} group(s).`);
    // };

    const handleAutoAssignTeams = () => {
        if (people.length === 0) {
            alert("Add players to the roster before running auto-assignment.");
            return;
        }

        if (groups.length === 0) {
            alert("Create at least one group before running auto-assignment.");
            return;
        }

        // Identify players who already belong to a valid group.
        const alreadyAssignedPeople = people.filter((person) =>
            groups.some((group) => group.id === person.groupId)
        );

        // Only new or unassigned players are eligible for assignment.
        const newPlayers = people.filter(
            (person) =>
                !person.groupId ||
                !groups.some((group) => group.id === person.groupId)
        );

        if (newPlayers.length === 0) {
            alert("All players are already assigned. No changes were made.");
            return;
        }

        // Shuffle only the new players, if enabled.
        const playersToAssign = [...newPlayers];

        if (shuffleBeforeAssign) {
            for (let i = playersToAssign.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));

                [playersToAssign[i], playersToAssign[j]] = [
                    playersToAssign[j],
                    playersToAssign[i],
                ];
            }
        }

        // Count existing players in each group.
        const groupCounts = new Map<string, number>();

        groups.forEach((group) => {
            groupCounts.set(
                group.id,
                alreadyAssignedPeople.filter(
                    (person) => person.groupId === group.id
                ).length
            );
        });

        // Assign new players to the group with the fewest members.
        const newlyAssignedPeople = playersToAssign.map((player) => {
            const targetGroup = groups.reduce((smallestGroup, group) =>
                (groupCounts.get(group.id) ?? 0) <
                    (groupCounts.get(smallestGroup.id) ?? 0)
                    ? group
                    : smallestGroup
            );

            groupCounts.set(
                targetGroup.id,
                (groupCounts.get(targetGroup.id) ?? 0) + 1
            );

            return {
                ...player,
                groupId: targetGroup.id,
            };
        });

        // Preserve existing assignments and add the newly assigned players.
        const updatedPeople = [
            ...alreadyAssignedPeople,
            ...newlyAssignedPeople,
        ];

        savePeople(updatedPeople);

        alert(
            `Successfully assigned ${newlyAssignedPeople.length} new player(s). Existing group assignments were preserved.`
        );
    };

    const handleClearPlayers = () => {
        if (confirm("Clear all registered player names? This cannot be undone.")) {
            savePeople([]);
        }
    };

    const removePerson = (id: string) => {
        savePeople(people.filter((person) => person.id !== id));
    };

    const unassignedPeople = people.filter(
        (person) => !person.groupId || !groups.some((group) => group.id === person.groupId),
    );

    const totalAssignedPlayers = people.filter((person) =>
        groups.some((group) => group.id === person.groupId)
    ).length;

    if (boardId === null) {
        return <main className="p-12 text-center text-sm text-slate-500">Loading roster...</main>;
    }

    return (
        <main className="min-h-screen bg-slate-50 p-6 text-slate-800 md:p-12">
            <div className="mx-auto max-w-5xl space-y-8">
                <header className="flex flex-col items-start justify-between gap-4 border-b pb-4 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                            👥 Team &amp; Member Configurations
                        </h1>
                        <p className="mt-1 text-slate-500">
                            {boardId
                                ? "Manage roster members and groups for this gameboard."
                                : "Add player names and manage the global group registry."}
                        </p>
                        {boardId && (
                            <p className="mt-1 text-xs text-slate-400">Board ID: {boardId}</p>
                        )}
                    </div>
                    <Link
                        href={boardId ? `/gameboard?id=${encodeURIComponent(boardId)}` : "/dashboard"}
                        className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-900"
                    >
                        {boardId ? "← Back to Gameboard" : "← Back to Board List"}
                    </Link>
                </header>
                <div className="space-y-6">
                    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="mb-3 text-lg font-semibold text-slate-900">1. Setup Groups / Teams</h2>
                        <form onSubmit={handleAddGroup} className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Group / Team name..."
                                value={groupInput}
                                onChange={(event) => setGroupInput(event.target.value)}
                                className="min-w-0 flex-1 rounded-lg border px-4 py-2 text-sm outline-none focus:border-blue-500"
                                required
                            />
                            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
                                Create Group
                            </button>
                        </form>
                        <p className="mt-2 text-xs text-slate-500">
                            {groups.length} group(s) available{boardId ? " on this gameboard" : ""}.
                        </p>
                        {!boardId && (
                            <p className="mt-2 text-xs text-amber-700">
                                Open this page from a Gameboard to make new groups specific to that board.
                            </p>
                        )}
                    </section>
                </div>
                <div className="grid gap-8 md:grid-cols-2">


                    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">2. Roster Members</h2>
                                <p className="mt-1 text-xs text-slate-500">Enter player names only. Group assignment happens separately.</p>
                            </div>
                            <div className="inline-flex rounded-md border bg-slate-50 p-0.5 text-xs shadow-sm">
                                <button type="button" onClick={() => setIsBulkMode(false)} aria-pressed={!isBulkMode} className={`rounded px-3 py-1.5 font-medium ${!isBulkMode ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
                                    Single Mode
                                </button>
                                <button type="button" onClick={() => setIsBulkMode(true)} aria-pressed={isBulkMode} className={`rounded px-3 py-1.5 font-medium ${isBulkMode ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
                                    Bulk Mode
                                </button>
                            </div>
                        </div>

                        {!isBulkMode ? (
                            <form onSubmit={handleAddPerson} className="space-y-3">
                                <input type="text" placeholder="Enter player's name" value={personInput} onChange={(event) => setPersonInput(event.target.value)} className="w-full rounded-lg border px-4 py-2 text-sm outline-none focus:border-blue-500" required />
                                <button type="submit" className="w-full rounded-lg bg-slate-800 py-2.5 text-sm font-medium text-white transition hover:bg-slate-900">Add Player</button>
                            </form>
                        ) : (
                            <form onSubmit={handleBulkAddPeople} className="space-y-3">
                                <textarea rows={4} placeholder={"Enter names separated by a new line, comma, or semicolon.\nExample: John Smith, Alice Johnson"} value={bulkInput} onChange={(event) => setBulkInput(event.target.value)} className="w-full resize-y rounded-lg border px-4 py-2 font-mono text-sm outline-none focus:border-blue-500" required />
                                <button type="submit" className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700">Add Players to Roster</button>
                            </form>
                        )}

                        <div className="flex items-center justify-between border-t pt-3">
                            <p className="text-sm text-slate-600"><span className="font-semibold text-slate-900">{people.length}</span> player(s) registered</p>
                            <button type="button" onClick={handleClearPlayers} disabled={people.length === 0} className="text-xs font-medium text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40">Clear Roster</button>
                        </div>
                    </section>

                    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">⚡ Auto-Assign Utility</h2>
                            <p className="mt-1 text-xs leading-relaxed text-slate-500">Automatically distribute roster members as evenly as possible among this board's available groups.</p>
                        </div>

                        {unassignedPeople.length > 0 && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <h3 className="font-semibold text-amber-900">Unassigned Players</h3>
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{unassignedPeople.length}</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {unassignedPeople.map((person) => (
                                        <div key={person.id} className="inline-flex items-center gap-1 rounded border border-amber-200 bg-white px-2 py-1 text-xs">
                                            <span>{person.name}</span>
                                            <button type="button" onClick={() => removePerson(person.id)} aria-label={`Remove ${person.name}`} className="ml-1 font-bold text-slate-400 hover:text-red-600">×</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <input type="checkbox" id="shuffle-toggle" checked={shuffleBeforeAssign} onChange={(event) => setShuffleBeforeAssign(event.target.checked)} className="h-4 w-4 accent-blue-600" />
                            <span className="text-sm font-medium text-slate-700">Shuffle players before assigning</span>
                        </label>

                        <button type="button" onClick={handleAutoAssignTeams} disabled={people.length === 0 || groups.length === 0} className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">⚡ Auto-Assign Players</button>
                        <p className="text-xs text-slate-500">
                            {people.length === 0 ? "Add player names to enable auto-assignment." : groups.length === 0 ? "Create at least one group to enable auto-assignment." : `${people.length} player(s) will be distributed across ${groups.length} group(s).`}
                        </p>
                    </section>
                </div>

                <section className="flex h-full min-h-0 flex-col space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="border-b pb-3">
                        <h2 className="text-xl font-bold text-slate-900">{groups.length} Active Assigned Groups</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            {totalAssignedPlayers} of {people.length} players assigned to groups.
                        </p>
                        {/* <p className="mt-1 text-sm text-slate-500">Players appear under a group after auto-assignment.</p> */}
                    </div>

                    {groups.length === 0 ? (
                        <p className="py-6 text-center text-sm italic text-slate-400">No groups created yet. Create a group on this page or the Gameboard page.</p>
                    ) : (
                        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
                            {groups.map((group) => {
                                const assigned = people.filter((person) => person.groupId === group.id);
                                return (
                                    <div key={group.id} className="rounded-xl border bg-slate-50/70 p-4">
                                        <div className="mb-3 flex items-center justify-between gap-3 font-bold text-slate-800">
                                            {/* <span>{group.name}</span> */}
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="font-bold text-slate-800">
                                                    {group.name}
                                                </span>

                                                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-700">
                                                    {assigned.length} {assigned.length === 1 ? "player" : "players"}
                                                </span>
                                            </div>
                                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-700">{assigned.length} player(s)</span>
                                        </div>
                                        {assigned.length > 0 ? (
                                            <div className="flex flex-wrap gap-1.5">
                                                {assigned.map((person) => (
                                                    <div key={person.id} className="inline-flex items-center gap-1 rounded border bg-white px-2 py-1 text-xs">
                                                        <span>{person.name}</span>
                                                        <button type="button" onClick={() => removePerson(person.id)} aria-label={`Remove ${person.name}`} className="ml-1 font-bold text-slate-400 hover:text-red-600">×</button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs italic text-slate-400">No players assigned to this group yet.</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}

export default function PlayersAndGroups() {
    return (
        <Suspense fallback={<main className="p-12 text-center text-sm text-slate-500">Loading roster page...</main>}>
            <PlayersAndGroupsContent />
        </Suspense>
    );
}
