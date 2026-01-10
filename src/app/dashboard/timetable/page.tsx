'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, MapPin, Sparkles } from 'lucide-react';
import html2canvas from 'html2canvas';
import { AttendanceRecord } from '@/lib/types';

// Color Psychology: Soft blue for Labs (focus/productivity), Warm sand for Theory (comfort/learning)
const getSlotColor = (slot: string, isLab: boolean) => {
    if (isLab) {
        // Soft blue-teal: promotes focus and calm productivity
        return 'bg-sky-600/60 text-white border-sky-500/70';
    }
    // Warm sand/beige: comfortable, easy on eyes, promotes learning
    return 'bg-amber-600/50 text-white border-amber-500/60';
};

const PERIODS = [
    '08:00-08:50', '08:50-09:40', '09:45-10:35', '10:40-11:30', '11:35-12:25',
    '12:30-01:20', '01:25-02:15', '02:20-03:10', '03:10-04:00', '04:00-04:50'
];

const DAY_NAMES = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'];

interface MasterSlot {
    dayOrder: string;
    period: string;
    slotType: string;
}

export default function TimetablePage() {
    const router = useRouter();
    const tableRef = useRef<HTMLDivElement>(null);
    const [batch, setBatch] = useState('1');
    const [subjects, setSubjects] = useState<AttendanceRecord[]>([]);
    const [masterSlots, setMasterSlots] = useState<MasterSlot[]>([]);
    const [loading, setLoading] = useState(true);

    // Load data from localStorage on mount
    useEffect(() => {
        // Load subjects
        const stored = localStorage.getItem('attendanceData');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                // Deduplicate subjects by subjectCode + slot
                const records = data.records || [];
                const seen = new Set<string>();
                const uniqueRecords = records.filter((r: AttendanceRecord) => {
                    const key = `${r.subjectCode}-${r.slot}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
                setSubjects(uniqueRecords);
            } catch (e) {
                console.error('Failed to parse attendance data:', e);
            }
        }

        // Use saved userBatch from login (detected from portal)
        const savedBatch = localStorage.getItem('userBatch') || '1';
        setBatch(savedBatch);
        loadMasterSlots(savedBatch);
        setLoading(false);
    }, []);

    const loadMasterSlots = (batchNum: string) => {
        const cached = localStorage.getItem(`timetable_batch_${batchNum}`);
        if (cached) {
            try {
                const data = JSON.parse(cached);
                setMasterSlots(data.masterSlots || []);
            } catch (e) {
                console.error('Failed to parse cached timetable:', e);
                setMasterSlots([]);
            }
        } else {
            setMasterSlots([]);
        }
    };

    // Find subject for a given slot type
    const getSubjectForSlot = (slotType: string): AttendanceRecord | null => {
        if (!slotType || slotType === '-') return null;

        const cleanSlot = slotType.toUpperCase().trim();

        for (const subject of subjects) {
            const subjectSlot = (subject.slot || '').toUpperCase().trim();
            if (!subjectSlot) continue;

            // Exact match
            if (subjectSlot === cleanSlot) return subject;

            // Range match (P11-P12-, L51-L52-)
            if (subjectSlot.includes('-')) {
                const parts = subjectSlot.replace(/-$/, '').split('-');
                if (parts.some(p => p === cleanSlot)) return subject;

                // Numeric range check
                const startMatch = parts[0].match(/([A-Z]+)(\d+)/);
                const slotMatch = cleanSlot.match(/([A-Z]+)(\d+)/);

                if (startMatch && slotMatch && startMatch[1] === slotMatch[1]) {
                    const nums = parts.map(p => parseInt(p.replace(/[A-Z]/g, '')));
                    const slotNum = parseInt(slotMatch[2]);
                    if (slotNum >= Math.min(...nums) && slotNum <= Math.max(...nums)) {
                        return subject;
                    }
                }
            }
        }
        return null;
    };

    const [optionalSlots, setOptionalSlots] = useState<Record<string, boolean>>({});

    const toggleOptional = (dayOrder: number, periodIndex: number) => {
        const key = `${dayOrder}-${periodIndex}`;
        setOptionalSlots(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // Get cell data for a specific day and period
    const getCellData = (dayOrder: number, periodIndex: number) => {
        const periodNum = periodIndex + 1;
        const slot = masterSlots.find(
            s => s.dayOrder === dayOrder.toString() && s.period === periodNum.toString()
        );

        const key = `${dayOrder}-${periodIndex}`;
        const isOptional = !!optionalSlots[key];

        if (!slot) return { slotType: '-', subject: null, isLab: false, isOptional };

        const subject = getSubjectForSlot(slot.slotType);
        const isLab = slot.slotType.startsWith('P') || slot.slotType.startsWith('L');
        return { slotType: slot.slotType, subject, isLab, isOptional };
    };

    const handleDownload = async () => {
        if (!tableRef.current) return;
        const canvas = await html2canvas(tableRef.current, {
            backgroundColor: '#0f0f17',
            scale: 2
        });
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `My_Timetable_Batch${batch}_Optional.png`;
        link.href = url;
        link.click();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0f0f17] to-[#0a0a0f] text-white p-4 md:p-6 pb-24">
            {/* Header */}
            <header className="flex items-center justify-between mb-6 max-w-7xl mx-auto">
                <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary via-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-2">
                    <Sparkles size={24} className="text-primary" />
                    My Timetable
                </h1>
                <div className="w-10"></div>
            </header>

            <div className="max-w-7xl mx-auto space-y-4">
                {/* Controls */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                    {/* Batch Label */}
                    <div className="px-4 py-2 bg-primary/20 rounded-xl border border-primary/30 text-primary font-medium text-sm">
                        Batch {batch}
                    </div>

                    {/* Download Button */}
                    {masterSlots.length > 0 && (
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/25"
                        >
                            <Download size={18} />
                            Download Image
                        </button>
                    )}
                </div>

                {/* No Data Message */}
                {masterSlots.length === 0 && (
                    <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
                        <p className="text-gray-400 mb-4">Timetable data not found. Please login again to fetch it.</p>
                        <button
                            onClick={() => router.push('/login')}
                            className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
                        >
                            Go to Login
                        </button>
                    </div>
                )}

                {/* Timetable Grid */}
                {masterSlots.length > 0 && (
                    <div className="overflow-x-auto pb-4 -mx-4 px-4">
                        <div
                            ref={tableRef}
                            className="min-w-[1300px] bg-[#0f0f17] p-4 rounded-2xl border border-white/10"
                        >
                            {/* Compact Title */}
                            <div className="text-center mb-3 pb-2 border-b border-white/10">
                                <h2 className="text-sm font-bold text-white">
                                    My Class Schedule • Batch {batch} • SRM Day Order
                                </h2>
                            </div>

                            {/* Header Row */}
                            <div className="grid grid-cols-[80px_repeat(10,1fr)] gap-1 mb-1">
                                <div className="text-center text-xs font-semibold text-gray-400 py-2">Time</div>
                                {PERIODS.map((time, i) => (
                                    <div
                                        key={i}
                                        className="text-center py-2 bg-gradient-to-b from-white/10 to-white/5 rounded-lg text-[11px] text-gray-200 font-semibold border border-white/5"
                                    >
                                        <div>{time.split('-')[0]}</div>
                                        <div className="opacity-60 text-[10px]">{time.split('-')[1]}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Day Rows */}
                            {[1, 2, 3, 4, 5].map((dayOrder) => (
                                <div key={dayOrder} className="grid grid-cols-[80px_repeat(10,1fr)] gap-1 mb-1">
                                    {/* Day Header */}
                                    <div className="flex items-center justify-center bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-lg text-sm font-bold text-white border border-primary/20">
                                        {DAY_NAMES[dayOrder - 1]}
                                    </div>

                                    {/* Period Cells */}
                                    {Array.from({ length: 10 }).map((_, i) => {
                                        const data = getCellData(dayOrder, i);
                                        const hasSubject = !!data.subject;
                                        const isEmpty = !hasSubject && (!data.slotType || data.slotType === '-');
                                        const isOptional = data.isOptional;

                                        // Optional overrides default colors
                                        const cellColor = isOptional
                                            ? 'bg-slate-800/80 border-slate-600/50 text-slate-400'
                                            : hasSubject
                                                ? getSlotColor(data.slotType, data.isLab || false)
                                                : 'bg-gray-800/50 border-gray-700/50';

                                        return (
                                            <div
                                                key={i}
                                                onClick={() => toggleOptional(dayOrder, i)}
                                                className={`
                                                    min-h-[85px] p-2 rounded-lg border flex flex-col justify-between 
                                                    transition-all select-none cursor-pointer relative
                                                    ${cellColor}
                                                    ${isOptional ? 'opacity-80 grayscale-[0.3]' : ''}
                                                `}
                                            >
                                                {isOptional && (
                                                    <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-slate-500/50"></div>
                                                )}
                                                {data && (
                                                    <>
                                                        {hasSubject ? (
                                                            <>
                                                                <div className={`text-[11px] font-semibold leading-snug ${isOptional ? 'line-through opacity-70' : ''}`}>
                                                                    {data.subject!.subjectName}
                                                                </div>
                                                                {data.subject!.room && (
                                                                    <div className="flex items-center gap-1 mt-auto text-[11px] font-bold opacity-90">
                                                                        <MapPin size={10} />
                                                                        {data.subject!.room}
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <div className="flex items-center justify-center h-full">
                                                                <span className="text-sm font-bold opacity-25">
                                                                    {data.slotType}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}

                            {/* Footer */}
                            <div className="mt-3 flex justify-between items-center text-[10px] text-gray-400 border-t border-white/10 pt-3">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-sky-600/60 rounded text-white font-medium">Lab</span>
                                    <span className="px-2 py-0.5 bg-amber-600/50 rounded text-white font-medium">Theory</span>
                                </div>
                                <div className="font-bold text-white/80">
                                    Made with AttendX
                                </div>
                                <div className="text-gray-500">{new Date().toLocaleDateString()}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Legend */}
                {subjects.filter(s => s.slot).length > 0 && (
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                        <h3 className="text-sm font-medium text-gray-400 mb-3">Your Enrolled Subjects</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {subjects.filter(s => s.slot).map((s, i) => {
                                const isLab = s.slot?.startsWith('P') || s.slot?.startsWith('L');
                                return (
                                    <div
                                        key={i}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getSlotColor(s.slot || '', isLab || false)}`}
                                    >
                                        <span className="font-mono text-xs bg-black/40 px-1.5 py-0.5 rounded">
                                            {s.slot}
                                        </span>
                                        <span className="text-xs truncate">{s.subjectName}</span>
                                        {s.room && (
                                            <span className="text-[10px] opacity-70 ml-auto flex-shrink-0">
                                                {s.room}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
