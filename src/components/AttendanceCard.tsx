'use client';

import { useEffect, useRef } from 'react';
import { Download, Share2, X } from 'lucide-react';
import html2canvas from 'html2canvas';

interface AttendanceCardProps {
    studentName: string;
    registrationNumber: string;
    overallPercentage: number;
    totalSubjects: number;
    onClose: () => void;
}

export default function AttendanceCard({ studentName, registrationNumber, overallPercentage, totalSubjects, onClose }: AttendanceCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);

    const getStatusColor = () => {
        if (overallPercentage >= 85) return 'from-green-500 to-emerald-600';
        if (overallPercentage >= 75) return 'from-yellow-500 to-orange-500';
        return 'from-red-500 to-pink-600';
    };

    const getStatusText = () => {
        if (overallPercentage >= 85) return 'Excellent';
        if (overallPercentage >= 75) return 'Safe';
        return 'At Risk';
    };

    const downloadCard = async () => {
        if (!cardRef.current) return;

        try {
            const canvas = await html2canvas(cardRef.current, {
                backgroundColor: '#0B0C0E',
                scale: 2,
                logging: false,
                useCORS: true,
            });

            // Convert to blob for better compatibility
            canvas.toBlob((blob) => {
                if (!blob) return;

                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = `attendance-${Date.now()}.png`;
                link.href = url;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 'image/png');
        } catch (error) {
            console.error('Failed to generate image:', error);
            alert('Failed to download image. Please try again.');
        }
    };

    const shareCard = async () => {
        if (!cardRef.current) return;

        try {
            const canvas = await html2canvas(cardRef.current, {
                backgroundColor: '#0B0C0E',
                scale: 2,
                logging: false,
            });

            canvas.toBlob(async (blob) => {
                if (!blob) return;

                const file = new File([blob], 'attendance.png', { type: 'image/png' });

                if (navigator.share && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: 'My Attendance Report',
                        text: `My overall attendance: ${overallPercentage.toFixed(1)}% 🎯`,
                        files: [file],
                    });
                } else {
                    // Fallback to download
                    downloadCard();
                }
            });
        } catch (error) {
            console.error('Failed to share:', error);
            downloadCard();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-md relative">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                {/* The Card to be captured */}
                <div ref={cardRef} className="bg-gradient-to-br from-[#0B0C0E] to-[#1C1D21] rounded-2xl p-8 border border-border shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                            <img src="/logo.png" alt="AttendX" className="w-8 h-8 rounded-lg" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">AttendX</h3>
                            <p className="text-xs text-textMuted">Attendance Report</p>
                        </div>
                    </div>

                    {/* Student Info */}
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-white mb-1">{studentName}</h2>
                        <p className="text-sm text-textMuted">{registrationNumber}</p>
                    </div>

                    {/* Main Stats */}
                    <div className="relative mb-6">
                        <div className={`bg-gradient-to-br ${getStatusColor()} rounded-2xl p-6 text-center`}>
                            <div className="text-6xl font-black text-white mb-2">
                                {overallPercentage.toFixed(1)}%
                            </div>
                            <div className="text-white/90 font-medium text-lg">
                                {getStatusText()} Attendance
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-surface/50 rounded-xl p-4 border border-border/50">
                            <div className="text-2xl font-bold text-white">{totalSubjects}</div>
                            <div className="text-xs text-textMuted">Total Subjects</div>
                        </div>
                        <div className="bg-surface/50 rounded-xl p-4 border border-border/50">
                            <div className="text-2xl font-bold text-primary">{getStatusText()}</div>
                            <div className="text-xs text-textMuted">Status</div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center text-xs text-textMuted">
                        Generated on {new Date().toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                        })}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex gap-3">
                    <button
                        onClick={shareCard}
                        className="flex-1 bg-primary hover:bg-primary/90 text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                        <Share2 size={18} />
                        Share
                    </button>
                    <button
                        onClick={downloadCard}
                        className="flex-1 bg-surface hover:bg-surface/80 text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors border border-border"
                    >
                        <Download size={18} />
                        Download
                    </button>
                </div>
            </div>
        </div>
    );
}
