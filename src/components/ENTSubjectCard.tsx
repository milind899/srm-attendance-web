'use client';

import { AttendanceRecord } from '@/lib/types';
import { MapPin, User, GraduationCap } from 'lucide-react';

interface ENTSubjectCardProps {
    record: AttendanceRecord;
    onClick?: () => void;
}

// Refined slot colors - softer, more sophisticated palette
const getSlotStyle = (slot: string) => {
    const baseSlot = slot?.charAt(0)?.toUpperCase() || '';
    const styles: Record<string, { accent: string; bg: string }> = {
        'A': { accent: 'text-blue-400', bg: 'from-blue-500/10 to-transparent' },
        'B': { accent: 'text-green-400', bg: 'from-green-500/10 to-transparent' },
        'C': { accent: 'text-violet-400', bg: 'from-violet-500/10 to-transparent' },
        'D': { accent: 'text-amber-400', bg: 'from-amber-500/10 to-transparent' },
        'E': { accent: 'text-pink-400', bg: 'from-pink-500/10 to-transparent' },
        'F': { accent: 'text-cyan-400', bg: 'from-cyan-500/10 to-transparent' },
        'G': { accent: 'text-yellow-400', bg: 'from-yellow-500/10 to-transparent' },
        'P': { accent: 'text-emerald-400', bg: 'from-emerald-500/10 to-transparent' },
        'L': { accent: 'text-teal-400', bg: 'from-teal-500/10 to-transparent' },
    };
    return styles[baseSlot] || { accent: 'text-gray-400', bg: 'from-gray-500/10 to-transparent' };
};

export function ENTSubjectCard({ record, onClick }: ENTSubjectCardProps) {
    const slotStyle = getSlotStyle(record.slot || '');
    const isPractical = record.category === 'Practical' ||
        record.subjectName?.toLowerCase().includes('lab') ||
        record.subjectName?.toLowerCase().includes('practical');

    return (
        <button
            onClick={onClick}
            className={`
                relative w-full text-left p-4 sm:p-5 rounded-xl 
                bg-gradient-to-br ${slotStyle.bg} bg-[#0D0E12]
                border border-white/[0.06] hover:border-white/15
                transition-all duration-200 active:scale-[0.99] group
                shadow-sm hover:shadow-md
            `}
        >
            {/* Lab Badge - Floating */}
            {isPractical && (
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">
                    Lab
                </span>
            )}

            {/* Subject Name */}
            <h3 className="text-[15px] sm:text-base font-semibold text-white/95 leading-snug mb-2 pr-12 line-clamp-2">
                {record.subjectName}
            </h3>

            {/* Code */}
            <p className="text-[11px] font-mono text-white/35 mb-3 tracking-wide">
                {record.subjectCode}
            </p>

            {/* Slot + Room Row */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
                {record.slot && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${slotStyle.accent} bg-white/5`}>
                        {record.slot}
                    </span>
                )}
                {record.room && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-white/50">
                        <MapPin size={10} className="opacity-60" />
                        {record.room}
                    </span>
                )}
            </div>

            {/* Footer: Faculty + Credits */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
                {record.faculty ? (
                    <span className="flex items-center gap-1.5 text-[11px] text-white/40 max-w-[65%]">
                        <User size={10} className="flex-shrink-0 opacity-60" />
                        <span className="truncate">{record.faculty}</span>
                    </span>
                ) : <span />}
                {record.credits !== undefined && record.credits > 0 && (
                    <span className="text-[11px] text-white/35 font-medium">
                        {record.credits} Cr
                    </span>
                )}
            </div>
        </button>
    );
}
