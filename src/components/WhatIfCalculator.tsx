'use client';

import { useState, useMemo } from 'react';
import { AttendanceRecord } from '@/lib/types';

interface WhatIfCalculatorProps {
    records: AttendanceRecord[];
}

export const WhatIfCalculator: React.FC<WhatIfCalculatorProps> = ({ records }) => {
    const [selectedSubject, setSelectedSubject] = useState<string>(records[0]?.subjectName || '');
    const [scenario, setScenario] = useState<'attend' | 'miss'>('attend');
    const [classCount, setClassCount] = useState<number>(1);

    const selectedRecord = records.find(r => r.subjectName === selectedSubject);

    const simulation = useMemo(() => {
        if (!selectedRecord) return null;

        const { attended, total, percentage } = selectedRecord;

        if (scenario === 'attend') {
            // Simulate attending more classes
            const newAttended = attended + classCount;
            const newTotal = total + classCount;
            const newPercentage = Math.round((newAttended / newTotal) * 100);
            return {
                newAttended,
                newTotal,
                newPercentage,
                change: newPercentage - percentage,
            };
        } else {
            // Simulate missing classes
            const newTotal = total + classCount;
            const newPercentage = Math.round((attended / newTotal) * 100);
            return {
                newAttended: attended,
                newTotal,
                newPercentage,
                change: newPercentage - percentage,
            };
        }
    }, [selectedRecord, scenario, classCount]);

    // Calculate classes needed to reach 75%
    const classesToReach75 = useMemo(() => {
        if (!selectedRecord) return null;
        const { attended, total, percentage } = selectedRecord;

        if (percentage >= 75) {
            // Already above 75%, calculate how many can be missed
            // Formula: (attended) / (total + x) >= 0.75
            // attended >= 0.75 * (total + x)
            // attended / 0.75 >= total + x
            // x <= (attended / 0.75) - total
            const canMiss = Math.floor((attended / 0.75) - total);
            return { type: 'can_miss' as const, count: Math.max(0, canMiss) };
        } else {
            // Below 75%, calculate classes needed
            // Formula: (attended + x) / (total + x) >= 0.75
            // attended + x >= 0.75 * total + 0.75 * x
            // 0.25 * x >= 0.75 * total - attended
            // x >= (0.75 * total - attended) / 0.25
            // x >= 3 * total - 4 * attended
            const needed = Math.ceil(3 * total - 4 * attended);
            return { type: 'need' as const, count: Math.max(0, needed) };
        }
    }, [selectedRecord]);

    if (records.length === 0) {
        return (
            <div className="text-center py-12 text-textMuted">
                No attendance data available for simulation.
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            {/* Subject Selector */}
            <div className="mb-6">
                <label className="text-sm text-textMuted mb-2 block">Select Subject</label>
                <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full bg-[#0B0C0E] border border-border rounded-lg px-4 py-3 text-white outline-none focus:border-primary/50"
                >
                    {records.map((r) => (
                        <option key={r.subjectName} value={r.subjectName}>
                            {r.subjectName} ({r.percentage}%)
                        </option>
                    ))}
                </select>
            </div>

            {/* Current Status Card */}
            {selectedRecord && (
                <div className="bg-surface border border-border rounded-xl p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-textMuted">Current Status</span>
                        <span className={`text-2xl font-bold ${selectedRecord.percentage >= 75 ? 'text-green-400' : 'text-red-400'}`}>
                            {selectedRecord.percentage}%
                        </span>
                    </div>
                    <div className="flex gap-8 text-sm">
                        <div>
                            <span className="text-textMuted">Attended: </span>
                            <span className="text-white font-medium">{selectedRecord.attended}</span>
                        </div>
                        <div>
                            <span className="text-textMuted">Total: </span>
                            <span className="text-white font-medium">{selectedRecord.total}</span>
                        </div>
                    </div>

                    {/* Margin Info */}
                    {classesToReach75 && (
                        <div className={`mt-4 p-3 rounded-lg ${classesToReach75.type === 'can_miss' ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                            {classesToReach75.type === 'can_miss' ? (
                                <p className="text-green-400 text-sm">
                                    ✓ You can miss up to <strong>{classesToReach75.count}</strong> more classes and stay above 75%
                                </p>
                            ) : (
                                <p className="text-red-400 text-sm">
                                    ⚠ You need to attend <strong>{classesToReach75.count}</strong> consecutive classes to reach 75%
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Scenario Simulator */}
            <div className="bg-surface border border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">🧮 What If Simulator</h3>

                <div className="flex gap-4 mb-4">
                    <button
                        onClick={() => setScenario('attend')}
                        className={`flex-1 py-3 rounded-lg font-medium transition-all ${scenario === 'attend'
                            ? 'bg-green-500 text-white'
                            : 'bg-surfaceHighlight text-textMuted hover:text-white'
                            }`}
                    >
                        I Attend
                    </button>
                    <button
                        onClick={() => setScenario('miss')}
                        className={`flex-1 py-3 rounded-lg font-medium transition-all ${scenario === 'miss'
                            ? 'bg-red-500 text-white'
                            : 'bg-surfaceHighlight text-textMuted hover:text-white'
                            }`}
                    >
                        I Miss
                    </button>
                </div>

                <div className="mb-6">
                    <label className="text-sm text-textMuted mb-2 block">Number of Classes</label>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="1"
                            max="20"
                            value={classCount}
                            onChange={(e) => setClassCount(Number(e.target.value))}
                            className="flex-1 accent-primary"
                        />
                        <span className="text-2xl font-bold text-white w-12 text-center">{classCount}</span>
                    </div>
                </div>

                {/* Result */}
                {simulation && (
                    <div className="bg-[#0B0C0E] rounded-lg p-4 border border-border">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-sm text-textMuted mb-1">New Attendance</div>
                                <div className="text-xl font-bold text-white">
                                    {simulation.newAttended} / {simulation.newTotal}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-textMuted mb-1">New Percentage</div>
                                <div className={`text-3xl font-bold ${simulation.newPercentage >= 75 ? 'text-green-400' : 'text-red-400'}`}>
                                    {simulation.newPercentage}%
                                </div>
                                <div className={`text-sm ${simulation.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {simulation.change >= 0 ? '+' : ''}{simulation.change}%
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
