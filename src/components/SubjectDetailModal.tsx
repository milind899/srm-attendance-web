
import { AttendanceRecord } from '@/lib/types';
import { X, Calendar, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SubjectDetailModalProps {
    record: AttendanceRecord;
    department: string;
    onClose: () => void;
}

export function SubjectDetailModal({ record, department, onClose }: SubjectDetailModalProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
            setIsVisible(false);
        };
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation
    };

    const percentage = record.percentage || 0;
    const isSafe = percentage >= 75;

    // Calculations
    const calculateCanMiss = () => {
        const { attendedHours, totalHours } = record;
        if (!totalHours || !attendedHours) return 0;
        return Math.max(0, Math.floor((attendedHours - 0.75 * totalHours) / 0.75));
    };

    const calculateNeedToAttend = () => {
        const { attendedHours, totalHours } = record;
        if (!totalHours || !attendedHours) return 0;
        return Math.max(0, Math.ceil((0.75 * totalHours - attendedHours) / 0.25));
    };

    const canMiss = calculateCanMiss();
    const needToAttend = calculateNeedToAttend();

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
                onClick={handleClose}
            />

            {/* Modal Content */}
            <div
                className={`
                    relative w-full max-w-md bg-[#141416] sm:rounded-3xl rounded-t-3xl border border-white/10 shadow-2xl 
                    transform transition-all duration-300 ease-out
                    ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-full opacity-0 scale-95'}
                `}
            >
                {/* Drag Handle (Mobile) */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/10 rounded-full sm:hidden" />

                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="p-6 sm:p-8 pt-8">
                    {/* Header */}
                    <div className="mb-6">
                        <div className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-white/50 mb-3">
                            {record.subjectCode}
                        </div>
                        <h2 className="text-2xl font-bold text-white leading-tight pr-8">
                            {record.subjectName}
                        </h2>
                    </div>

                    {/* Main Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        {/* Percentage Card */}
                        <div className={`col-span-2 p-6 rounded-2xl border ${isSafe ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'} flex items-center justify-between`}>
                            <div>
                                <p className={`text-sm font-medium ${isSafe ? 'text-emerald-400' : 'text-red-400'}`}>Current Attendance</p>
                                <p className={`text-4xl font-black ${isSafe ? 'text-emerald-400' : 'text-red-400'}`}>{percentage}%</p>
                            </div>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isSafe ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                {isSafe ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                            </div>
                        </div>

                        {/* Hours Attended */}
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-2 mb-2 text-white/50">
                                <CheckCircle2 size={16} />
                                <span className="text-xs font-medium">Attended</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{record.attendedHours}</p>
                        </div>

                        {/* Total Hours */}
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-2 mb-2 text-white/50">
                                <Clock size={16} />
                                <span className="text-xs font-medium">Total (Conduct.)</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{record.totalHours}</p>
                        </div>
                    </div>

                    {/* Status Message / Margin */}
                    <div className="p-5 rounded-2xl bg-surface border border-border">
                        <h3 className="text-sm font-medium text-white/70 mb-3">Attendance Status</h3>

                        {isSafe ? (
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <p className="text-white font-medium">You are Safe! 🎉</p>
                                    <p className="text-sm text-textMuted mt-1">
                                        You can miss <span className="text-emerald-400 font-bold">{canMiss}</span> more {canMiss === 1 ? 'hour' : 'hours'}
                                        and still maintain 75%.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-xl bg-red-500/10 text-red-400">
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <p className="text-white font-medium">Attendance Shortage ⚠️</p>
                                    <p className="text-sm text-textMuted mt-1">
                                        You need to attend <span className="text-red-400 font-bold">{needToAttend}</span> more {needToAttend === 1 ? 'hour' : 'hours'}
                                        consecutively to reach 75%.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
