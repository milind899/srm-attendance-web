import { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, RotateCcw } from 'lucide-react';
import { GRADES_ENT, GRADES_FSH } from '@/lib/gradings';
import { DecryptText } from './DecryptText';

interface SubjectRow {
    id: string;
    grade: string;
    credits: number;
}

export function GPACalculator({ department }: { department: string }) {
    const GRADES = department === 'FSH' ? GRADES_FSH : GRADES_ENT;

    const [subjects, setSubjects] = useState<SubjectRow[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('gpa-calculator-subjects');
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch (e) {
                    console.error('Failed to parse saved subjects', e);
                }
            }
        }
        return [
            { id: '1', grade: 'O', credits: 4 },
            { id: '2', grade: 'A+', credits: 4 },
            { id: '3', grade: 'A', credits: 3 },
            { id: '4', grade: 'B+', credits: 3 },
            { id: '5', grade: 'B', credits: 2 },
        ];
    });

    useEffect(() => {
        localStorage.setItem('gpa-calculator-subjects', JSON.stringify(subjects));
    }, [subjects]);

    const addSubject = () => {
        setSubjects([
            ...subjects,
            { id: Math.random().toString(36).substr(2, 9), grade: 'A', credits: 3 }
        ]);
    };

    const removeSubject = (id: string) => {
        if (subjects.length > 1) {
            setSubjects(subjects.filter(s => s.id !== id));
        }
    };

    const updateSubject = (id: string, field: 'grade' | 'credits', value: string | number) => {
        setSubjects(subjects.map(s =>
            s.id === id ? { ...s, [field]: value } : s
        ));
    };

    const resetCalculator = () => {
        setSubjects([
            { id: '1', grade: 'O', credits: 4 },
            { id: '2', grade: 'A+', credits: 4 },
            { id: '3', grade: 'A', credits: 3 },
        ]);
    };

    const sgpa = useMemo(() => {
        let totalPoints = 0;
        let totalCredits = 0;

        subjects.forEach(s => {
            const gradeObj = GRADES.find(g => g.grade === s.grade);
            if (gradeObj) {
                totalPoints += gradeObj.gp * s.credits;
                totalCredits += s.credits;
            }
        });

        return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
    }, [subjects, GRADES]);

    return (
        <div className="space-y-8 animate-fade-in w-full max-w-4xl mx-auto">
            {/* Hero Result Section */}
            <div className="relative overflow-hidden rounded-3xl p-1 bg-gradient-to-r from-blue-500/20 via-cyan-500/10 to-transparent">
                <div className="relative bg-[#121214]/80 backdrop-blur-xl rounded-[22px] p-6 sm:p-8 border border-white/5 flex flex-col items-center justify-center gap-4 text-center">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#1A1825] border border-[#2D2B3D] px-4 py-1.5 mb-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                        <span className="text-sm font-medium text-[#8B8D98]">Manual Calculator</span>
                    </div>

                    <h1 className="text-7xl sm:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-blue-600 mb-2 tracking-tight">
                        <DecryptText text={sgpa} speed={50} delay={100} />
                    </h1>

                    <p className="text-sm text-[#52525B]">Calculated SGPA based on credits and grades below</p>
                </div>
            </div>

            {/* Calculator Controls */}
            <div className="bg-[#121214]/50 backdrop-blur-md border border-white/5 rounded-3xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-white">Subjects</h3>
                    <button
                        onClick={resetCalculator}
                        className="p-2 text-textMuted hover:text-white transition-colors rounded-full hover:bg-white/5"
                        title="Reset"
                    >
                        <RotateCcw size={18} />
                    </button>
                </div>

                <div className="space-y-3 mb-6">
                    {subjects.map((subject, index) => (
                        <div key={subject.id} className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                            <div className="w-8 text-center text-sm text-textMuted font-mono">
                                {index + 1}
                            </div>

                            {/* Grade Selector */}
                            <div className="flex-1">
                                <select
                                    value={subject.grade}
                                    onChange={(e) => updateSubject(subject.id, 'grade', e.target.value)}
                                    className="w-full bg-[#1A1825] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors appearance-none"
                                >
                                    {GRADES.map(g => (
                                        <option key={g.grade} value={g.grade}>
                                            {g.grade} (GP: {g.gp})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Credits Input */}
                            <div className="w-24">
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={subject.credits}
                                        onChange={(e) => updateSubject(subject.id, 'credits', parseInt(e.target.value) || 0)}
                                        className="w-full bg-[#1A1825] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors text-center"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-textMuted pointer-events-none">Cr</span>
                                </div>
                            </div>

                            {/* Remove Button */}
                            <button
                                onClick={() => removeSubject(subject.id)}
                                className="p-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
                                disabled={subjects.length <= 1}
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>

                <button
                    onClick={addSubject}
                    className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl text-textMuted hover:text-white hover:border-white/20 hover:bg-white/5 transition-all flex items-center justify-center gap-2 font-medium"
                >
                    <Plus size={20} />
                    Add Subject
                </button>
            </div>
        </div>
    );
}
