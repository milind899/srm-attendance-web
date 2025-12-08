'use client';

import { useRef } from 'react';
import { AttendanceData } from '@/lib/types';

interface ShareCardProps {
    data: AttendanceData;
    overallPercentage: number;
}

export const ShareCard: React.FC<ShareCardProps> = ({ data, overallPercentage }) => {
    const cardRef = useRef<HTMLDivElement>(null);

    const handleExport = async () => {
        if (!cardRef.current) return;

        try {
            // Dynamic import html2canvas
            const html2canvas = (await import('html2canvas')).default;

            const canvas = await html2canvas(cardRef.current, {
                backgroundColor: '#0B0C0E',
                scale: 2,
            });

            // Create download link
            const link = document.createElement('a');
            link.download = `attendx-${data.studentName || 'attendance'}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed. Please try again.');
        }
    };

    const topSubjects = [...data.records]
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 5);

    const lowSubjects = data.records.filter(r => r.percentage < 75);

    return (
        <div className="space-y-6">
            {/* Preview Card */}
            <div
                ref={cardRef}
                className="bg-[#0B0C0E] p-6 rounded-xl border border-border max-w-md mx-auto"
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="AttendX" className="w-8 h-8" />
                        <span className="font-bold text-lg text-white">AttendX</span>
                    </div>
                    <span className="text-xs text-textMuted">
                        {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                </div>

                {/* Stats */}
                <div className="text-center mb-6">
                    <div className="text-6xl font-bold text-white mb-2">{overallPercentage}%</div>
                    <div className="text-textMuted">Overall Attendance</div>
                </div>

                {/* Subject Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6 text-center">
                    <div className="bg-surface rounded-lg p-3">
                        <div className="text-2xl font-bold text-green-400">{data.records.filter(r => r.percentage >= 75).length}</div>
                        <div className="text-xs text-textMuted">Safe</div>
                    </div>
                    <div className="bg-surface rounded-lg p-3">
                        <div className="text-2xl font-bold text-red-400">{lowSubjects.length}</div>
                        <div className="text-xs text-textMuted">At Risk</div>
                    </div>
                </div>

                {/* Top Subjects */}
                <div className="space-y-2">
                    {topSubjects.map((s, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-textMuted truncate max-w-[180px]">{s.subject}</span>
                            <span className={`font-medium ${s.percentage >= 75 ? 'text-green-400' : 'text-red-400'}`}>
                                {s.percentage}%
                            </span>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-border text-center text-xs text-textMuted">
                    {data.studentName && <span>{data.studentName} • </span>}
                    Generated with AttendX
                </div>
            </div>

            {/* Export Button */}
            <div className="text-center">
                <button
                    onClick={handleExport}
                    className="bg-primary hover:bg-primaryHover text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download as Image
                </button>
                <p className="text-xs text-textMuted mt-2">Share your attendance on social media!</p>
            </div>
        </div>
    );
};
