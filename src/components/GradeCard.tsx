
import { SubjectMarks } from '@/lib/types';
import { useState, useEffect } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { GRADES_ENT, GRADES_FSH } from '@/lib/gradings';

interface GradeCardProps {
    subject: SubjectMarks;
    startCredits: number;
    department: string;
    onUpdate: (data: { subjectCode: string; credits: number; targetGrade: string; predictedPoint: number }) => void;
}

export function GradeCard({ subject, startCredits, department, onUpdate }: GradeCardProps) {
    const [targetGrade, setTargetGrade] = useState('A');
    const [credits, setCredits] = useState(startCredits);
    const [predictedExternal, setPredictedExternal] = useState(90); // Default guess

    // Select Grading Scale
    const GRADES = department === 'FSH' ? GRADES_FSH : GRADES_ENT;

    // Logic: Calculate required end sem marks to achieve target grade
    const calculateRequiredEndSem = (target: string): number => {
        const gradeInfo = GRADES.find(g => g.grade === target);
        if (!gradeInfo) return 0;

        const internalMark = subject.totalMarks;
        const endSemConvertedNeeded = Math.max(0, gradeInfo.min - internalMark);

        if (department === 'ENT') {
            return Math.ceil((endSemConvertedNeeded * 75) / 40);
        } else {
            return Math.ceil(endSemConvertedNeeded * 2);
        }
    };

    const isPossible = (target: string) => {
        const req = calculateRequiredEndSem(target);
        return req <= (department === 'ENT' ? 75 : 100);
    };

    // Sync Logic: Slider Change -> Update Target Grade
    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        setPredictedExternal(val);

        const internal = subject.totalMarks;
        let externalWeightage = 0;
        if (department === 'ENT') {
            externalWeightage = (val / 75) * 40;
        } else {
            externalWeightage = (val / 100) * 50;
        }
        const total = internal + externalWeightage;

        // Find matching grade
        // Note: Sort order of GRADES is O(100) -> F(0) so first match is highest applicable
        const foundGrade = GRADES.find(g => total >= g.min);
        if (foundGrade) {
            setTargetGrade(foundGrade.grade);
        }
    };

    // Sync Logic: Pill Click -> Update Slider to Min Req for that grade
    const handleGradeClick = (g: string) => {
        setTargetGrade(g);
        const reqMin = calculateRequiredEndSem(g);
        // Clamp to max possible
        const max = department === 'ENT' ? 75 : 100;
        setPredictedExternal(Math.min(reqMin, max));
    };


    // Report back to parent whenever local state changes
    useEffect(() => {
        // Calculate point based on TARGET GRADE (which is now synced with slider)
        // OR calculate based on predicted external?
        // Since they are synced, targetGrade should reflect state. 
        // But precise SGPA calculation is usually done on POINTS.
        // Grade 'O' is 10 points. 'A+' is 9.
        // If I slide to 95 marks, it's 'O' (10pts). 
        // If I slide to exactly 91 marks, it's 'O' (10pts).
        // SGPA should use the Grade Point.

        const gradeObj = GRADES.find(g => g.grade === targetGrade) || GRADES[GRADES.length - 1];

        onUpdate({
            subjectCode: subject.subjectCode,
            credits,
            targetGrade,
            predictedPoint: gradeObj.gp
        });
    }, [targetGrade, credits, predictedExternal, onUpdate, subject.subjectCode, GRADES]);

    const currentRequired = calculateRequiredEndSem(targetGrade);
    const maxEndSem = department === 'ENT' ? 75 : 100;
    const currentIsPossible = currentRequired <= maxEndSem;

    return (
        <div className="bg-[#0F1012] border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-white font-bold text-lg leading-tight mb-1 truncate max-w-[200px]" title={subject.subjectName}>
                        {subject.subjectName.toUpperCase()}
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-white/40 font-mono">
                            {subject.subjectCode}
                        </span>
                        <span className="text-[10px] text-white/30 uppercase tracking-widest">
                            Projected
                        </span>
                    </div>
                </div>

                {/* Result Grade based on slider (Synced via Target Grade) */}
                <div className="text-right">
                    <div className="text-4xl font-black text-white">
                        {targetGrade}
                    </div>
                </div>
            </div>

            {/* Target Grade Selector */}
            <div className="bg-[#1A1B1E] rounded-xl p-1 flex justify-between mb-6">
                {['C', 'B', 'B+', 'A', 'A+', 'O'].map((g) => {
                    const active = targetGrade === g;
                    return (
                        <button
                            key={g}
                            onClick={() => handleGradeClick(g)}
                            className={`
                                flex-1 py-2 rounded-lg text-xs font-bold transition-all
                                ${active ? 'bg-[#5B50E5] text-white shadow-lg shadow-indigo-500/25' : 'text-white/30 hover:text-white/60'}
                            `}
                        >
                            {g}
                        </button>
                    )
                })}
            </div>

            {/* Min Mark Box */}
            <div className={`
                rounded-2xl p-6 mb-8 flex items-center justify-between
                ${currentIsPossible ? 'bg-[#052e16] border border-green-900/50' : 'bg-[#2e0505] border border-red-900/50'}
            `}>
                <div>
                    <p className={`text-[10px] font-bold tracking-widest uppercase mb-1 ${currentIsPossible ? 'text-green-500' : 'text-red-500'}`}>
                        Min Mark for {targetGrade}
                    </p>
                    <div className="flex items-baseline gap-1">
                        <span className={`text-5xl font-black ${currentIsPossible ? 'text-white' : 'text-red-200'}`}>
                            {currentRequired}
                        </span>
                        <span className="text-white/30 font-medium">/ {maxEndSem}</span>
                    </div>
                </div>

                <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center
                    ${currentIsPossible ? 'bg-green-500 text-white shadow-lg shadow-green-900/50' : 'bg-red-500 text-white shadow-lg shadow-red-900/50'}
                `}>
                    {currentIsPossible ? <CheckCircle2 size={24} /> : <span className="font-bold text-xl">!</span>}
                </div>
            </div>

            {/* Sliders & Credits */}
            <div className="space-y-6">
                {/* Internal Info */}
                <div className="flex justify-between text-xs text-white/30 font-medium tracking-wide">
                    <span>Internal Contribution</span>
                    <span>Max: {subject.maxTotalMarks}</span>
                </div>

                {/* Credits Input */}
                <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Credits</span>
                    <div className="flex items-center gap-2 bg-[#1A1B1E] rounded-lg p-1">
                        <button onClick={() => setCredits(Math.max(1, credits - 1))} className="w-8 h-8 rounded-md hover:bg-white/10 text-white/50">-</button>
                        <span className="text-white font-mono font-bold w-4 text-center">{credits}</span>
                        <button onClick={() => setCredits(Math.min(10, credits + 1))} className="w-8 h-8 rounded-md hover:bg-white/10 text-white/50">+</button>
                    </div>
                </div>

                {/* Predicted External Slider */}
                <div>
                    <div className="flex justify-between mb-2">
                        <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Predicted External</span>
                        <span className="text-[#5B50E5] font-bold text-xs">{predictedExternal}</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max={maxEndSem}
                        value={predictedExternal}
                        onChange={handleSliderChange}
                        className="w-full h-1.5 bg-[#1A1B1E] rounded-full appearance-none cursor-pointer accent-[#5B50E5]"
                    />
                </div>
            </div>
        </div>
    );
}
