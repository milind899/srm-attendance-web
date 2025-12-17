'use client';

import { useState, useMemo } from 'react';
import { SubjectMarks } from '@/lib/types';
import { calculateFinalMark, calculateGrade, getGradePoint, calculateRequiredExternal } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function GradePredictor({ internalMarks }: { internalMarks: SubjectMarks[] }) {
    // State to hold credits for each subject (defaulting to 3)
    const [credits, setCredits] = useState<{ [code: string]: number }>(
        Object.fromEntries(internalMarks.map(s => [s.subjectCode, 3]))
    );

    // State to hold predicted external marks for each subject (default 90)
    const [externalMarks, setExternalMarks] = useState<{ [code: string]: number }>(
        Object.fromEntries(internalMarks.map(s => [s.subjectCode, 90]))
    );

    const updateCredit = (code: string, credit: number) => {
        setCredits(prev => ({ ...prev, [code]: credit }));
    };

    const updateExternal = (code: string, mark: number) => {
        setExternalMarks(prev => ({ ...prev, [code]: mark }));
    };

    // Calculate SGPA
    const sgpa = useMemo(() => {
        let totalPoints = 0;
        let totalCredits = 0;

        internalMarks.forEach(s => {
            const ext = externalMarks[s.subjectCode] !== undefined ? externalMarks[s.subjectCode] : 90;
            const final = calculateFinalMark(s.totalMarks, ext, s.maxTotalMarks);
            const grade = calculateGrade(final);
            const point = getGradePoint(grade);
            const credit = credits[s.subjectCode] !== undefined ? credits[s.subjectCode] : 3;

            totalPoints += point * credit;
            totalCredits += credit;
        });

        return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";
    }, [internalMarks, externalMarks, credits]);

    return (
        <div className="space-y-8 animate-fade-in">
            {/* SGPA Header */}
            <div className="relative overflow-hidden rounded-3xl p-1 bg-gradient-to-r from-indigo-500/20 via-purple-500/10 to-transparent">
                <div className="relative bg-[#121214]/80 backdrop-blur-xl rounded-[22px] p-6 sm:p-8 border border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">Projected SGPA</h2>
                        <p className="text-white/50 text-sm max-w-md">
                            Based on your internal marks and projected exam scores. Adjust credits per subject for accuracy.
                        </p>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-purple-400 drop-shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                            {sgpa}
                        </span>
                        <span className="text-white/20 font-bold text-xl">/ 10</span>
                    </div>
                </div>
            </div>

            {/* Subject Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {internalMarks.map((subject, i) => (
                    <PredictorCard
                        key={i}
                        subject={subject}
                        credit={credits[subject.subjectCode] !== undefined ? credits[subject.subjectCode] : 3}
                        externalMark={externalMarks[subject.subjectCode] !== undefined ? externalMarks[subject.subjectCode] : 90}
                        onCreditChange={(c) => updateCredit(subject.subjectCode, c)}
                        onMarkChange={(m) => updateExternal(subject.subjectCode, m)}
                    />
                ))}
            </div>
        </div>
    );
}

function PredictorCard({
    subject,
    credit,
    externalMark,
    onCreditChange,
    onMarkChange
}: {
    subject: SubjectMarks,
    credit: number,
    externalMark: number,
    onCreditChange: (c: number) => void,
    onMarkChange: (m: number) => void
}) {
    // Helper to calculate grade from a raw mark
    const getGradeFromMark = (mark: number) => {
        const final = calculateFinalMark(subject.totalMarks, mark, subject.maxTotalMarks);
        return calculateGrade(final);
    };

    // Current Prediction based on prop
    const predictedGrade = getGradeFromMark(externalMark);
    const isPass = predictedGrade !== 'F';

    // Interactive Target State
    // We use a local state to track what the user is "focusing" on (Highlighted Button + Big Card)
    // - When Slider Moves: This syncs to the predicted grade (User Request 1)
    // - When Button Clicked: This locks to the clicked grade, even if impossible (User Request 2)
    const [activeTarget, setActiveTarget] = useState(predictedGrade);

    // Initial Sync: If externalMark changes externally (or on mount), we might want to sync?
    // Use an effect? 
    // Actually, if we use an effect, it overrides the "Button Click" action if the slider moves as a result of the click.
    // Better to handle it in the event handlers.

    const grades = ['C', 'B', 'B+', 'A', 'A+', 'O'];

    // Calculate required marks for Target
    const getMinMarksForGrade = (g: string) => {
        switch (g) {
            case 'O': return 91;
            case 'A+': return 81;
            case 'A': return 71;
            case 'B+': return 61;
            case 'B': return 56;
            case 'C': return 50;
            default: return 91;
        }
    };

    // "End Sem Needed" Logic:
    // Show requirements for the *Active Target*
    const displayTarget = activeTarget || 'C';
    const requiredForTarget = calculateRequiredExternal(subject.totalMarks, getMinMarksForGrade(displayTarget), subject.maxTotalMarks);
    const isTargetPossible = requiredForTarget <= 100;

    return (
        <div className="relative group p-6 rounded-3xl border border-white/5 bg-[#121214]/80 backdrop-blur-md transition-all duration-300 hover:border-primary/20 flex flex-col gap-6">

            {/* Header: Name & Projected Grade */}
            <div className="flex justify-between items-start">
                <div className="flex-1 pr-4">
                    <h4 className="font-bold text-white text-lg leading-tight line-clamp-1 mb-1" title={subject.subjectName}>{subject.subjectName}</h4>
                    <span className="text-[10px] uppercase tracking-wider text-white/40 font-mono bg-white/5 px-2 py-1 rounded-md">{subject.subjectCode}</span>
                </div>
                <div className="text-right flex flex-col items-end">
                    <span className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Projected</span>
                    <div className={`text-3xl font-black ${isPass ? 'text-white' : 'text-rose-400'} drop-shadow-lg`}>
                        {predictedGrade}
                    </div>
                </div>
            </div>

            {/* Target Grade Selector */}
            <div className="flex justify-between bg-black/20 p-1 rounded-xl">
                {grades.map((g) => (
                    <button
                        key={g}
                        onClick={() => {
                            // 1. Manually set target (allows viewing impossible grades)
                            setActiveTarget(g);

                            // 2. Move Slider to required mark (clamped)
                            const min = getMinMarksForGrade(g);
                            const req = calculateRequiredExternal(subject.totalMarks, min, subject.maxTotalMarks);
                            onMarkChange(Math.max(0, Math.min(100, req)));
                        }}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTarget === g
                            ? isTargetPossible
                                ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105'
                                : 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 scale-105'
                            : 'text-white/30 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {g}
                    </button>
                ))}
            </div>

            {/* The "Big Card" - Requirement Display */}
            <div className={`relative overflow-hidden rounded-2xl p-5 border transition-colors duration-300 ${isTargetPossible
                ? 'bg-emerald-500/10 border-emerald-500/20'
                : 'bg-rose-500/10 border-rose-500/20'
                }`}>
                <div className="flex justify-between items-center relative z-10">
                    <div>
                        <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${isTargetPossible ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isTargetPossible ? `Min Mark for ${displayTarget}` : `Impossible for ${displayTarget}`}
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className={`text-4xl font-black ${isTargetPossible ? 'text-emerald-300' : 'text-rose-300'}`}>
                                {Math.max(0, requiredForTarget)}
                            </span>
                            <span className={`text-sm font-bold opacity-60 ${isTargetPossible ? 'text-emerald-400' : 'text-rose-400'}`}>
                                / 100
                            </span>
                        </div>
                    </div>

                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isTargetPossible ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                        }`}>
                        {isTargetPossible ? <CheckCircle2 size={24} strokeWidth={3} /> : <AlertCircle size={24} strokeWidth={3} />}
                    </div>
                </div>
            </div>

            {/* Controls (Slider & Credits) */}
            <div className="space-y-4 pt-2 border-t border-white/5">
                {/* Internal Data */}
                <div className="flex justify-between items-end mb-2">
                    <div className="text-[10px] text-white/40">Internal Contribution</div>
                    <div className="text-[10px] font-mono text-white/50">Max: {subject.maxTotalMarks}</div>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-4 items-end">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Predicted External</label>
                            <span className="text-xs font-mono font-bold text-primary">{externalMark}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={externalMark}
                            onChange={(e) => {
                                const newVal = parseInt(e.target.value);
                                onMarkChange(newVal);
                                // Sync: When slider matches a new grade, update the highlight
                                const newGrade = getGradeFromMark(newVal);
                                if (grades.includes(newGrade)) {
                                    setActiveTarget(newGrade);
                                }
                            }}
                            className="w-full h-2 bg-white/5 rounded-full appearance-none cursor-pointer accent-primary hover:accent-primary/80 transition-all touch-none"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-wider text-white/40 font-bold block mb-1">Credits</label>
                        <select
                            value={credit}
                            onChange={(e) => onCreditChange(Number(e.target.value))}
                            className="bg-zinc-800 border border-white/10 rounded-lg px-2 py-1.5 text-xs font-bold text-white focus:border-primary/50 outline-none w-14 text-center appearance-none"
                        >
                            {[0, 1, 2, 3, 4, 5].map(c => <option key={c} value={c} className="bg-zinc-800 text-white">{c}</option>)}
                        </select>
                    </div>
                </div>
            </div>

        </div>
    );
}
