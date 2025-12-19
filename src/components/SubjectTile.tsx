
import { AttendanceRecord } from '@/lib/types';
import { BookOpen } from 'lucide-react';

interface SubjectTileProps {
    record: AttendanceRecord;
    department: string;
    onClick: () => void;
}

export function SubjectTile({ record, department, onClick }: SubjectTileProps) {
    const percentage = record.percentage || 0;
    const isSafe = percentage >= 75;
    const isExcellent = percentage >= 85;

    // Framer/Bento Style: Clean, solid/subtle backgrounds, crisp borders
    // Using opacity-20 for backgrounds to keep it readable but "glassy"
    const bgClass = isExcellent
        ? 'bg-emerald-500/10 hover:bg-emerald-500/20'
        : isSafe
            ? 'bg-green-500/10 hover:bg-green-500/20'
            : 'bg-red-500/10 hover:bg-red-500/20';

    const borderClass = isExcellent
        ? 'border-emerald-500/20'
        : isSafe
            ? 'border-green-500/20'
            : 'border-red-500/20';

    const textClass = isExcellent
        ? 'text-emerald-400'
        : isSafe
            ? 'text-green-400'
            : 'text-red-400';

    return (
        <button
            onClick={onClick}
            className={`
                relative w-full text-left p-5 rounded-3xl border ${borderClass} ${bgClass} 
                transition-all duration-300 active:scale-95 group overflow-hidden
                flex flex-col justify-between h-40
            `}
        >
            {/* Top: Icon + Code */}
            <div className="flex justify-between items-start w-full">
                <div className={`p-2 rounded-xl ${isSafe ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                    <BookOpen size={16} className={textClass} />
                </div>
                <span className="text-[10px] font-mono opacity-40 uppercase tracking-wider">
                    {record.subjectCode}
                </span>
            </div>

            {/* Middle: Big Percentage */}
            <div className="mt-2">
                <span className={`text-4xl font-black tracking-tighter ${textClass}`}>
                    {percentage}%
                </span>
            </div>

            {/* Bottom: Name */}
            <div className="mt-auto">
                <p className="text-xs font-medium text-white/70 line-clamp-1 group-hover:text-white transition-colors">
                    {record.subjectName}
                </p>
            </div>
        </button>
    );
}
