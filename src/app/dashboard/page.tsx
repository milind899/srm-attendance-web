'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AttendanceData, AttendanceRecord, InternalMarksData, SubjectMarks } from '@/lib/types';
import { DecryptText } from '@/components/DecryptText';
import { Loader2 } from 'lucide-react';

type Tab = 'attendance' | 'marks' | 'grades';

// Grade thresholds for 100-based total
const GRADES = [
    { grade: 'O', min: 91, gp: 10, color: 'text-emerald-400', bg: 'bg-emerald-500' },
    { grade: 'A+', min: 81, gp: 9, color: 'text-green-400', bg: 'bg-green-500' },
    { grade: 'A', min: 71, gp: 8, color: 'text-lime-400', bg: 'bg-lime-500' },
    { grade: 'B+', min: 61, gp: 7, color: 'text-yellow-400', bg: 'bg-yellow-500' },
    { grade: 'B', min: 51, gp: 6, color: 'text-orange-400', bg: 'bg-orange-500' },
    { grade: 'C', min: 40, gp: 5, color: 'text-red-400', bg: 'bg-red-500' },
    { grade: 'F', min: 0, gp: 0, color: 'text-red-600', bg: 'bg-red-600' },
];

export default function Dashboard() {
    const router = useRouter();
    const [data, setData] = useState<AttendanceData | null>(null);
    const [department, setDepartment] = useState<string>('ENT');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('attendance');

    // Internal Marks State
    const [internalMarks, setInternalMarks] = useState<InternalMarksData | null>(null);
    const [marksLoading, setMarksLoading] = useState(false);
    const [marksError, setMarksError] = useState<string | null>(null);

    // Grade goal state - target grade for each subject
    const [targetGrades, setTargetGrades] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        document.documentElement.classList.add('dark');

        const stored = localStorage.getItem('attendanceData');
        const dept = localStorage.getItem('department') || 'ENT';
        setDepartment(dept);

        // Load cached internal marks
        const cachedMarks = localStorage.getItem('internalMarksData');
        if (cachedMarks) {
            try {
                setInternalMarks(JSON.parse(cachedMarks));
            } catch (e) {
                console.error('Failed to parse cached marks:', e);
            }
        }

        if (!stored) {
            router.push('/');
            return;
        }
        try {
            const parsedData: AttendanceData = JSON.parse(stored);
            setData(parsedData);

            // Initialize target grades to 'A' for all subjects
            const initialTargets: { [key: string]: string } = {};
            parsedData.records.forEach(r => {
                initialTargets[r.subjectCode] = 'A';
            });
            setTargetGrades(initialTargets);

            // Fetch internal marks for FSH department only if not already present
            if (dept === 'FSH' && !cachedMarks) {
                fetchInternalMarks();
            }

        } catch {
            router.push('/');
        } finally {
            setLoading(false);
        }
    }, [router]);

    const fetchInternalMarks = async () => {
        const cookies = localStorage.getItem('sessionCookies');
        const username = localStorage.getItem('username');

        if (!cookies || !username) {
            setMarksError('Session expired. Please login again.');
            return;
        }

        setMarksLoading(true);
        setMarksError(null);

        try {
            const response = await fetch('/api/internalmarks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cookies, username })
            });

            const result = await response.json();

            if (result.success && result.data) {
                setInternalMarks(result.data);
                localStorage.setItem('internalMarksData', JSON.stringify(result.data));
            } else {
                setMarksError(result.error || 'Failed to fetch marks');
            }
        } catch {
            setMarksError('Network error. Please try again.');
        } finally {
            setMarksLoading(false);
        }
    };

    const calculateGrade = (total: number) => {
        for (const g of GRADES) {
            if (total >= g.min) return g;
        }
        return GRADES[GRADES.length - 1];
    };

    // Calculate required end sem marks to achieve target grade - NO CAP
    const calculateRequiredEndSem = (internalMark: number, targetGrade: string): number => {
        const gradeInfo = GRADES.find(g => g.grade === targetGrade);
        if (!gradeInfo) return 0;

        const endSemConverted = gradeInfo.min - internalMark;

        // Logic for ENT: End sem out of 75, converted to 40
        // endSemConverted = (endSemActual / 75) * 40
        // endSemActual = (endSemConverted * 75) / 40

        // Logic for others (FSH): End sem out of 100, converted to 50
        // endSemConverted = (endSemActual / 100) * 50 = endSemActual / 2
        // endSemActual = endSemConverted * 2

        if (department === 'ENT') {
            return Math.max(0, (endSemConverted * 75) / 40);
        }

        return Math.max(0, endSemConverted * 2);
    };

    // Calculate predicted GPA based on current marks and target grades
    const calculatePredictedGPA = () => {
        if (!internalMarks?.subjects || internalMarks.subjects.length === 0) return { gpa: 0, totalCredits: 0 };

        let totalPoints = 0;
        let totalCredits = 0;

        internalMarks.subjects.forEach(subject => {
            const targetGrade = targetGrades[subject.subjectCode] || 'A';
            const gradeInfo = GRADES.find(g => g.grade === targetGrade);
            const credit = 4; // Default credit

            if (gradeInfo) {
                totalPoints += gradeInfo.gp * credit;
                totalCredits += credit;
            }
        });

        return {
            gpa: totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00',
            totalCredits
        };
    };

    if (loading || !data) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
                <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4"></div>
                <p className="text-textMuted animate-pulse">Syncing your data...</p>
            </div>
        );
    }

    // Calculate overall attendance
    const totalHours = data.records.reduce((s, r) => s + (r.totalHours || 0), 0);
    const attendedHours = data.records.reduce((s, r) => s + (r.attendedHours || 0), 0);
    const overallPercentage = totalHours ? Math.round((attendedHours / totalHours) * 100) : 0;

    // FSH: Calculate overall can-miss
    const overallCanMiss = Math.floor((attendedHours - 0.75 * totalHours) / 0.75);
    const overallNeedToAttend = Math.ceil((0.75 * totalHours - attendedHours) / 0.25);

    // Subjects with actual marks (not estimated)
    const allSubjects = internalMarks?.subjects || [];
    const subjectsWithMarks = allSubjects.filter(s => {
        const hasComponents = s.components && s.components.length > 0;
        const hasTotal = s.totalMarks > 0;
        return hasComponents || hasTotal;
    });

    return (
        <div className="min-h-screen bg-background text-textMain selection:bg-primary/30 selection:text-white font-sans animate-scale-in origin-center">
            {/* Background Glow Effects - like homepage */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-glow-gradient opacity-40 pointer-events-none z-0" />
            <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none z-0" />

            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 glass-nav">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <img src="/logo.png" alt="AttendX" className="w-8 h-8" />
                        <span className="font-semibold text-lg tracking-tight text-textMain">AttendX</span>
                    </Link>

                    {/* Desktop Tabs */}
                    <div className="hidden md:flex items-center gap-1 bg-surface/50 border border-border rounded-full p-1 backdrop-blur-sm">
                        {(['attendance', 'marks', 'grades'] as Tab[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-5 py-2 text-sm font-medium rounded-full transition-all ${activeTab === tab
                                    ? 'bg-[#EEEEF0] text-black'
                                    : 'text-textMuted hover:text-white'
                                    }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm text-textMuted hidden sm:block">{data.studentName || 'Student'}</span>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent-yellow flex items-center justify-center text-white text-sm font-bold">
                            {data.studentName?.charAt(0) || 'S'}
                        </div>
                        <button
                            onClick={() => {
                                localStorage.clear();
                                router.push('/');
                            }}
                            className="ml-2 p-2 rounded-full bg-white/5 hover:bg-white/10 text-textMuted hover:text-white transition-colors"
                            title="Log Out"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Tab Bar - Top Sticky */}
            <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-2">
                <div className="flex bg-surface/50 p-1 rounded-lg">
                    {(['attendance', 'marks', 'grades'] as Tab[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === tab
                                ? 'bg-primary/20 text-white shadow-sm'
                                : 'text-textMuted hover:text-white'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <main className="relative z-10 pt-32 md:pt-24 pb-10">
                {/* Attendance Tab */}
                {activeTab === 'attendance' && (
                    <div className="max-w-6xl mx-auto px-4">
                        {/* Hero Stats - Mobile First */}
                        <div className="text-center mb-6 opacity-0 animate-blur-in">
                            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/50 px-3 py-1.5 text-xs text-textMuted mb-4 backdrop-blur-sm">
                                <span className={`w-2 h-2 rounded-full ${overallPercentage >= 75 ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
                                <DecryptText
                                    text={overallPercentage >= 75 ? 'Attendance Safe' : 'Attendance Critical'}
                                    speed={30}
                                    delay={200}
                                />
                            </div>

                            <h1 className="text-5xl sm:text-6xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-[#EEEEF0] via-[#EEEEF0] to-[#EEEEF0]/60 mb-2">
                                {overallPercentage}%
                            </h1>

                            <p className="text-sm text-textMuted mb-1">
                                {attendedHours} / {totalHours} hours
                            </p>

                            <div className={`inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full border ${overallPercentage >= 75
                                ? 'border-green-500/30 bg-green-500/10 text-green-400'
                                : 'border-red-500/30 bg-red-500/10 text-red-400'
                                }`}>
                                <span className="text-lg font-bold">
                                    {overallPercentage >= 75 ? Math.max(0, overallCanMiss) : Math.max(0, overallNeedToAttend)}
                                </span>
                                <span className="text-xs">
                                    {overallPercentage >= 75 ? 'can skip' : 'need'}
                                </span>
                            </div>
                        </div>

                        {/* Subject Cards - Horizontal Scroll on Mobile */}
                        {/* Subject Cards - Vertical Stack on Mobile */}
                        <div className="opacity-0 animate-blur-in delay-200">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {data.records.map((record, i) => (
                                    <SubjectCard key={`${record.subjectCode}-${i}`} record={record} department={department} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Marks Tab */}
                {activeTab === 'marks' && (
                    <div className="max-w-6xl mx-auto px-4">
                        {department === 'ENT' ? (
                            <div className="flex flex-col items-center justify-center py-20 opacity-0 animate-blur-in">
                                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                    <Loader2 className="w-8 h-8 text-primary animate-pulse" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Coming Soon</h3>
                                <p className="text-textMuted text-center max-w-xs">
                                    This feature is currently under development for ENT students and will be available shortly.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Hero Section - Mobile Optimized */}
                                <div className="text-center mb-6 opacity-0 animate-blur-in">
                                    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/50 px-3 py-1.5 text-xs text-textMuted mb-4 backdrop-blur-sm">
                                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                        <DecryptText text="Internal Assessment" speed={30} delay={200} />
                                    </div>

                                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-[#EEEEF0] via-[#EEEEF0] to-[#EEEEF0]/60 mb-2">
                                        Internal Marks
                                    </h1>

                                    <p className="text-sm text-textMuted">
                                        Tests & assignments
                                    </p>
                                </div>

                                {!subjectsWithMarks.length ? (
                                    <div className="text-center py-8 opacity-0 animate-blur-in delay-200">
                                        <p className="text-textMuted mb-4 text-sm">
                                            {department === 'ENT'
                                                ? 'No marks found. Please login again to refresh.'
                                                : 'No marks data available.'}
                                        </p>
                                        {department === 'FSH' ? (
                                            <button onClick={fetchInternalMarks} className="bg-[#EEEEF0] text-black px-5 py-2.5 rounded-full font-medium text-sm hover:bg-white transition-colors">
                                                Fetch Marks →
                                            </button>
                                        ) : (
                                            <button onClick={() => router.push('/login?dept=ENT')} className="bg-[#EEEEF0] text-black px-5 py-2.5 rounded-full font-medium text-sm hover:bg-white transition-colors">
                                                Login Again →
                                            </button>
                                        )}
                                    </div>
                                ) : marksLoading ? (
                                    <div className="flex justify-center py-12">
                                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : marksError ? (
                                    <div className="text-center py-12 opacity-0 animate-blur-in delay-200">
                                        <p className="text-red-400 mb-6">{marksError}</p>
                                        <button onClick={() => router.push('/login?dept=FSH')} className="bg-red-500 text-white px-6 py-3 rounded-full font-medium hover:bg-red-600 transition-colors">
                                            Login Again →
                                        </button>
                                    </div>
                                ) : subjectsWithMarks.length > 0 ? (
                                    <div className="opacity-0 animate-blur-in delay-200">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {subjectsWithMarks.map((subject, i) => (
                                                <MarksCard key={`${subject.subjectCode}-${i}`} subject={subject} />
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 opacity-0 animate-blur-in delay-200">
                                        <p className="text-textMuted mb-4 text-sm">No marks data available.</p>
                                        <button onClick={fetchInternalMarks} className="bg-[#EEEEF0] text-black px-5 py-2.5 rounded-full font-medium text-sm hover:bg-white transition-colors">
                                            Fetch Marks →
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}


                {/* Grades Tab */}
                {activeTab === 'grades' && (
                    <div className="max-w-6xl mx-auto px-4">
                        {department === 'ENT' ? (
                            <div className="flex flex-col items-center justify-center py-20 opacity-0 animate-blur-in">
                                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                    <Loader2 className="w-8 h-8 text-primary animate-pulse" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Coming Soon</h3>
                                <p className="text-textMuted text-center max-w-xs">
                                    This feature is currently under development for ENT students and will be available shortly.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Hero Section - Mobile Optimized */}
                                <div className="text-center mb-6 opacity-0 animate-blur-in">
                                    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/50 px-3 py-1.5 text-xs text-textMuted mb-4 backdrop-blur-sm">
                                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                                        <DecryptText text="Grade Predictor" speed={30} delay={200} />
                                    </div>

                                    {subjectsWithMarks.length > 0 ? (
                                        <>
                                            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-accent-yellow via-accent-yellow to-accent-yellow/60 mb-2">
                                                {calculatePredictedGPA().gpa}
                                            </h1>
                                            <p className="text-base sm:text-lg text-textMuted mb-1">Predicted GPA</p>
                                            <p className="text-xs sm:text-sm text-textMuted/70">Based on target grades below</p>
                                        </>
                                    ) : (
                                        <>
                                            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-[#EEEEF0] via-[#EEEEF0] to-[#EEEEF0]/60 mb-4">
                                                Grade Predictor
                                            </h1>
                                            <p className="text-lg text-textMuted">Calculate your target grades</p>
                                        </>
                                    )}
                                </div>

                                {/* Grades Cards Grid - Horizontal Scroll on Mobile */}
                                {subjectsWithMarks.length > 0 ? (
                                    <div className="opacity-0 animate-blur-in delay-200">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {subjectsWithMarks.map((subject, i) => {
                                                const targetGrade = targetGrades[subject.subjectCode] || 'A';
                                                const requiredEndSem = calculateRequiredEndSem(subject.totalMarks, targetGrade);
                                                const maxEndSem = department === 'ENT' ? 75 : 100;
                                                const isPossible = requiredEndSem <= maxEndSem;
                                                const gradeInfo = GRADES.find(g => g.grade === targetGrade) || GRADES[2];

                                                return (
                                                    <div
                                                        key={`grade-${subject.subjectCode}-${i}`}
                                                        className="bg-surface border border-border rounded-xl p-4"
                                                    >
                                                        {/* Header */}
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div className="flex-1 min-w-0 mr-2">
                                                                <h3 className="font-semibold text-white text-sm truncate">
                                                                    {subject.subjectName}
                                                                </h3>
                                                                <p className="text-xs text-textMuted">{subject.subjectCode}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-xs text-textMuted">{subject.totalMarks.toFixed(0)}</span>
                                                                <span className="text-base font-bold text-white ml-1">{subject.maxTotalMarks}</span>
                                                            </div>
                                                        </div>

                                                        {/* Internal Display */}
                                                        <div className="flex justify-between text-sm mb-3 pb-3 border-b border-border">
                                                            <span className="text-textMuted">Internal</span>
                                                            <span className="text-white">{subject.totalMarks.toFixed(2)} / {subject.maxTotalMarks}</span>
                                                        </div>

                                                        {/* Grade Selector */}
                                                        <div className="mb-3">
                                                            <div className="flex justify-between text-[10px] text-textMuted mb-1">
                                                                {['C', 'B', 'B+', 'A', 'A+', 'O'].map((g) => (
                                                                    <span
                                                                        key={g}
                                                                        className={`cursor-pointer ${targetGrade === g ? gradeInfo.color + ' font-bold' : ''}`}
                                                                        onClick={() => setTargetGrades(prev => ({ ...prev, [subject.subjectCode]: g }))}
                                                                    >
                                                                        {g}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                            <input
                                                                type="range"
                                                                min="0"
                                                                max="5"
                                                                value={['C', 'B', 'B+', 'A', 'A+', 'O'].indexOf(targetGrade)}
                                                                onChange={(e) => {
                                                                    const grades = ['C', 'B', 'B+', 'A', 'A+', 'O'];
                                                                    setTargetGrades(prev => ({ ...prev, [subject.subjectCode]: grades[parseInt(e.target.value)] }));
                                                                }}
                                                                className="w-full h-1.5 bg-surfaceHighlight rounded-full appearance-none cursor-pointer slider-thumb"
                                                            />
                                                        </div>

                                                        {/* Goal for End Sem */}
                                                        <div className="flex justify-between items-center p-2.5 rounded-lg bg-background border border-border">
                                                            <span className="text-sm text-textMuted">Goal end sem</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`font-bold ${isPossible ? 'text-white' : 'text-red-400'}`}>
                                                                    {requiredEndSem.toFixed(0)}
                                                                </span>
                                                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isPossible ? gradeInfo.bg + ' text-white' : 'bg-red-600 text-white'
                                                                    }`}>
                                                                    {isPossible ? '100' : '!'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 opacity-0 animate-blur-in delay-200">
                                        <p className="text-textMuted mb-6">No marks data. Fetch marks first to use Grade Predictor.</p>
                                        <button onClick={() => setActiveTab('marks')} className="bg-[#EEEEF0] text-black px-6 py-3 rounded-full font-medium hover:bg-white transition-colors">
                                            Go to Marks →
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )
                }

            </main>

            {/* Footer / Disclaimer */}
            <footer className="py-8 text-center opacity-60 hover:opacity-100 transition-opacity mb-20 md:mb-0">
                <p className="text-[10px] text-textMuted uppercase tracking-widest font-medium">
                    Disclaimer
                </p>
                <p className="text-xs text-textMuted mt-1 max-w-sm mx-auto">
                    This site is under active development. Attendance and marks data may not be 100% accurate or up-to-date. Please verify on the official portal.
                </p>
            </footer>

        </div>
    );
}

// Subject Card for Attendance
function SubjectCard({ record }: { record: AttendanceRecord; department: string }) {
    const isSafe = record.percentage >= 75;

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

    return (
        <div className="group relative p-4 bg-[#09090b] border border-white/5 rounded-xl hover:border-white/10 transition-all duration-300 hover:shadow-[0_0_40px_rgba(0,0,0,0.4)] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />

            <div className="relative flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0 mr-4">
                    <h3 className="font-medium text-white text-base truncate leading-snug tracking-wide">{record.subjectName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] text-white/50 font-mono tracking-wider">
                            {record.subjectCode}
                        </span>
                        {record.category && (
                            <span className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] text-white/40">
                                {record.category}
                            </span>
                        )}
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-bold tracking-tighter text-white">
                        {record.percentage?.toFixed(0)}%
                    </div>
                </div>
            </div>

            <div className="relative w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-3">
                <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${isSafe ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' : 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]'}`}
                    style={{ width: `${Math.min(100, record.percentage)}%` }}
                ></div>
                {/* 75% Marker */}
                <div className="absolute top-0 bottom-0 w-0.5 bg-white/20 z-10" style={{ left: '75%' }}></div>
            </div>

            <div className="flex justify-between items-end">
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-0.5">Status</span>
                    <span className="text-sm text-textMuted font-medium">
                        <span className="text-white">{record.attendedHours}</span> <span className="text-white/30">/</span> {record.totalHours} hrs
                    </span>
                </div>
                <div className={`px-3 py-1.5 rounded-lg border ${isSafe ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                    <span className="text-xs font-bold whitespace-nowrap">
                        {isSafe ? `${calculateCanMiss()} can miss` : `${calculateNeedToAttend()} needed`}
                    </span>
                </div>
            </div>
        </div>
    );
}

// Marks Card
function MarksCard({ subject }: { subject: SubjectMarks }) {
    const percentage = subject.maxTotalMarks > 0 ? (subject.totalMarks / subject.maxTotalMarks) * 100 : 0;

    const getColor = (pct: number) => {
        if (pct >= 80) return 'text-emerald-400';
        if (pct >= 60) return 'text-yellow-400';
        if (pct >= 40) return 'text-orange-400';
        return 'text-red-400';
    };

    const getGlowColor = (pct: number) => {
        if (pct >= 80) return 'shadow-[0_0_12px_rgba(52,211,153,0.4)] bg-emerald-500';
        if (pct >= 60) return 'shadow-[0_0_12px_rgba(250,204,21,0.4)] bg-yellow-500';
        if (pct >= 40) return 'shadow-[0_0_12px_rgba(251,146,60,0.4)] bg-orange-500';
        return 'shadow-[0_0_12px_rgba(248,113,113,0.4)] bg-red-500';
    };

    return (
        <div className="group relative p-4 bg-[#09090b] border border-white/5 rounded-xl hover:border-white/10 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,0,0,0.4)] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />

            <div className="relative flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0 mr-4">
                    <h3 className="font-medium text-white text-base truncate leading-snug tracking-wide">{subject.subjectName}</h3>
                    <p className="text-[11px] text-white/40 mt-0.5 font-mono">{subject.subjectCode}</p>
                </div>
                <div className="text-right">
                    <div className={`text-3xl font-bold tracking-tighter ${getColor(percentage)}`}>
                        {percentage.toFixed(0)}%
                    </div>
                </div>
            </div>

            <div className="relative w-full h-2 bg-white/5 rounded-full overflow-hidden mb-3">
                <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${getGlowColor(percentage)}`}
                    style={{ width: `${Math.min(100, percentage)}%` }}
                ></div>
            </div>

            <div className="flex justify-between items-end border-t border-white/5 pt-4">
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-0.5">Scored</span>
                    <span className="text-lg font-bold text-white tracking-tight">
                        {subject.totalMarks.toFixed(1)}
                    </span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-0.5">Total</span>
                    <span className="text-lg font-medium text-white/60">
                        / {subject.maxTotalMarks}
                    </span>
                </div>
            </div>
        </div>
    );
}

