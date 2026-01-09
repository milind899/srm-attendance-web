'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, RefreshCw, KeyRound, AlertCircle } from 'lucide-react';
import html2canvas from 'html2canvas';

export default function TimetablePage() {
    const router = useRouter();
    const tableRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);
    const [batch, setBatch] = useState('1');
    const [password, setPassword] = useState('');
    const [needsPassword, setNeedsPassword] = useState(true);
    const [timetableData, setTimetableData] = useState<any>(null);
    const [error, setError] = useState('');

    const slots = [
        "8:00 - 8:50", "8:50 - 9:40", "9:45 - 10:35", "10:40 - 11:30", "11:35 - 12:25",
        "12:30 - 1:20", "1:25 - 2:15", "2:20 - 3:10", "3:10 - 4:00", "4:00 - 4:50"
    ];

    const fetchTimetable = async () => {
        const username = localStorage.getItem('username');
        if (!username || !password) {
            setError('Please enter your password to fetch the timetable.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    department: 'ENT',
                    action: 'timetable',
                    username,
                    password,
                    batch
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setTimetableData(data.data);
                setNeedsPassword(false);
            } else {
                setError(data.error || 'Failed to fetch timetable');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!tableRef.current) return;
        const canvas = await html2canvas(tableRef.current, {
            backgroundColor: '#111',
            scale: 2
        });
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `Timetable_Batch${batch}.png`;
        link.href = url;
        link.click();
    };

    const getCellData = (dayOrder: number, periodIndex: number) => {
        if (!timetableData) return null;

        // Find master slot for this day/period
        // Periods in master are usually 1-indexed strings "1", "2"...
        // Our loop uses 0-index.
        const pStr = (periodIndex + 1).toString();
        const dStr = dayOrder.toString();

        const masterSlot = timetableData.masterSlots.find((s: any) => s.dayOrder === dStr && s.period === pStr);
        if (!masterSlot) return null;

        // Find enrolled subject for this slot type
        const enrolled = timetableData.enrolledSlots.find((e: any) => e.slot === masterSlot.slotType);

        return {
            slotType: masterSlot.slotType,
            subject: enrolled
        };
    };

    // Color mapping for slots
    const getSlotColor = (subjectName: string | undefined, slotType: string) => {
        if (!subjectName) return 'bg-gray-800/50 text-gray-500 hover:bg-gray-800/70 border-gray-700/50'; // Empty

        // Use consistent colors for same subjects (hash based or simple category)
        if (subjectName.toLowerCase().includes('lab') || subjectName.toLowerCase().includes('practical')) {
            return 'bg-emerald-900/60 text-emerald-100 border-emerald-700/50 hover:bg-emerald-800/60';
        }
        return 'bg-amber-900/40 text-amber-100 border-amber-700/50 hover:bg-amber-800/50';
    };

    return (
        <main className="min-h-screen bg-black text-white p-4 md:p-6 pb-24">
            {/* Header */}
            <header className="flex items-center justify-between mb-8 max-w-7xl mx-auto">
                <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                    Class Timetable
                </h1>
                <div className="w-10"></div> {/* Spacer */}
            </header>

            <div className="max-w-7xl mx-auto space-y-6">

                {/* Controls */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-md">
                    <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
                        <button
                            onClick={() => { setBatch('1'); if (!needsPassword) fetchTimetable(); }}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${batch === '1' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-gray-400 hover:text-white'}`}
                        >
                            Batch 1
                        </button>
                        <button
                            onClick={() => { setBatch('2'); if (!needsPassword) fetchTimetable(); }}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${batch === '2' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-gray-400 hover:text-white'}`}
                        >
                            Batch 2
                        </button>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        {!needsPassword && (
                            <button onClick={fetchTimetable} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors">
                                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                                <span>Refresh</span>
                            </button>
                        )}
                        {timetableData && (
                            <button onClick={handleDownload} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-colors">
                                <Download size={18} />
                                <span>Save Image</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Password Prompt */}
                {needsPassword && !timetableData && (
                    <div className="max-w-md mx-auto mt-12 p-8 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md text-center">
                        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-400">
                            <KeyRound size={32} />
                        </div>
                        <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
                        <p className="text-gray-400 text-sm mb-6">
                            Please enter your NetID password to fetch your personalized timetable. We do not store your credentials.
                        </p>
                        <form onSubmit={(e) => { e.preventDefault(); fetchTimetable(); }} className="space-y-4">
                            <div className="relative">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 outline-none focus:border-emerald-500/50 transition-colors text-center tracking-widest"
                                    autoFocus
                                />
                            </div>
                            {error && (
                                <div className="text-red-400 text-sm flex items-center justify-center gap-2">
                                    <AlertCircle size={14} />
                                    <span>{error}</span>
                                </div>
                            )}
                            <button
                                type="submit"
                                disabled={loading || !password}
                                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading && <RefreshCw size={18} className="animate-spin" />}
                                {loading ? 'Fetching...' : 'Fetch Timetable'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Timetable Grid */}
                {timetableData && (
                    <div className="overflow-x-auto pb-4 custom-scrollbar">
                        <div ref={tableRef} className="min-w-[1000px] bg-[#111] p-6 rounded-xl border border-white/10 shadow-2xl">
                            {/* Header Row */}
                            <div className="grid grid-cols-[80px_repeat(10,1fr)] gap-1 mb-1">
                                <div className="text-center text-xs font-bold text-gray-500 uppercase tracking-wider py-2">Day/Time</div>
                                {slots.map((time, i) => (
                                    <div key={i} className="text-center py-2 bg-white/5 rounded text-[10px] text-gray-400 font-medium border border-white/5 flex flex-col justify-center">
                                        <span className="mb-0.5">{time.split(' - ')[0]}</span>
                                        <span className="opacity-50">{time.split(' - ')[1]}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Rows */}
                            {[1, 2, 3, 4, 5].map((dayOrder) => (
                                <div key={dayOrder} className="grid grid-cols-[80px_repeat(10,1fr)] gap-1 mb-1">
                                    {/* Day Header */}
                                    <div className="flex items-center justify-center bg-white/5 rounded text-sm font-bold text-gray-400 border border-white/5">
                                        Day {dayOrder}
                                    </div>

                                    {/* Period Cells */}
                                    {Array.from({ length: 10 }).map((_, i) => {
                                        const data = getCellData(dayOrder, i);
                                        return (
                                            <div
                                                key={i}
                                                className={`min-h-[100px] p-2 rounded border flex flex-col justify-between transition-all group relative overflow-hidden ${getSlotColor(data?.subject?.subjectName, data?.slotType || '')}`}
                                            >
                                                {data ? (
                                                    <>
                                                        {data.subject ? (
                                                            <>
                                                                <div className="text-[10px] uppercase tracking-wider opacity-70 mb-1 line-clamp-2 leading-tight">
                                                                    {data.subject.subjectName}
                                                                </div>
                                                                <div className="flex items-center justify-between mt-auto">
                                                                    <span className="text-[10px] font-mono bg-black/20 px-1.5 py-0.5 rounded text-white/80">
                                                                        {data.subject.subjectCode}
                                                                    </span>
                                                                    <span className="text-xs font-bold opacity-50">
                                                                        {data.slotType}
                                                                    </span>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="flex items-center justify-center h-full opacity-30 text-lg font-black">
                                                                {data.slotType}
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="h-full w-full opacity-5"></div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}

                            <div className="mt-4 flex justify-between items-center text-[10px] text-gray-600 border-t border-white/5 pt-4">
                                <div className="font-mono">Generated via AttendX • {new Date().toLocaleDateString()}</div>
                                <div>Batch {batch} • Day Order System</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
