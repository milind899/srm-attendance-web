'use client';

import { AttendanceRecord } from '@/lib/types';
import { BookOpen, MapPin, User, Clock } from 'lucide-react';

interface ENTSubjectCardProps {
    record: AttendanceRecord;
    onClick?: () => void;
}

// Slot color mapping for visual distinction
const getSlotColor = (slot: string) => {
    const baseSlot = slot?.charAt(0)?.toUpperCase() || '';
    const colors: Record<string, { bg: string; text: string; border: string }> = {
        'A': { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
        'B': { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
        'C': { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
        'D': { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
        'E': { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30' },
        'F': { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
        'G': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
        'P': { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
        'L': { bg: 'bg-teal-500/20', text: 'text-teal-400', border: 'border-teal-500/30' },
        'T': { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30' },
    };
    return colors[baseSlot] || { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' };
};

export function ENTSubjectCard({ record, onClick }: ENTSubjectCardProps) {
    const slotColors = getSlotColor(record.slot || '');
    const isPractical = record.category === 'Practical' ||
        record.subjectName?.toLowerCase().includes('lab') ||
        record.subjectName?.toLowerCase().includes('practical');

    return (
        <button
            onClick={onClick}
            className={`
                relative w-full text-left p-5 rounded-2xl 
                bg-[#12131A] hover:bg-[#1A1B24]
                border border-white/10 hover:border-white/20
                transition-all duration-300 active:scale-[0.98] group
                flex flex-col gap-3
            `}
        >
            {/* Header: Subject Name + Code */}
            <div className="flex flex-col gap-1">
                <h3 className="text-base font-semibold text-white line-clamp-2 leading-tight group-hover:text-white/90">
                    {record.subjectName}
                </h3>
                <span className="text-xs font-mono text-white/40">
                    {record.subjectCode}
                </span>
            </div>

            {/* Slot Badge + Room */}
            <div className="flex items-center gap-2 flex-wrap">
                {record.slot && (
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${slotColors.bg} ${slotColors.text} ${slotColors.border} border`}>
                        Slot {record.slot}
                    </span>
                )}
                {record.room && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 text-white/60 text-xs">
                        <MapPin size={12} />
                        {record.room}
                    </span>
                )}
            </div>

            {/* Footer: Faculty + Credits */}
            <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
                {record.faculty && (
                    <span className="flex items-center gap-1.5 text-xs text-white/50 truncate max-w-[60%]">
                        <User size={12} className="flex-shrink-0" />
                        <span className="truncate">{record.faculty}</span>
                    </span>
                )}
                {record.credits !== undefined && record.credits > 0 && (
                    <span className="flex items-center gap-1 text-xs text-white/40 font-medium">
                        {record.credits} Credits
                    </span>
                )}
            </div>

            {/* Category indicator */}
            {isPractical && (
                <div className="absolute top-3 right-3">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold uppercase tracking-wide">
                        Lab
                    </span>
                </div>
            )}
        </button>
    );
}
