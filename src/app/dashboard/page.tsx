'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { AttendanceData, AttendanceRecord, InternalMarksData, SubjectMarks } from '@/lib/types';
import { DecryptText } from '@/components/DecryptText';
import { Loader2, Share2, BarChart3, Award, FileText, RefreshCw } from 'lucide-react';
import AttendanceCard from '@/components/AttendanceCard';

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

    // Share card state
    const [showShareCard, setShowShareCard] = useState(false);

    // Refresh state
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    useEffect(() => {
        document.documentElement.classList.add('dark');

        const stored = localStorage.getItem('attendanceData');
        const dept = localStorage.getItem('department') || 'ENT';
        setDepartment(dept);

        // Load last updated timestamp
        const timestamp = localStorage.getItem('lastUpdated');
        if (timestamp) {
            setLastUpdated(new Date(timestamp));
        }

        // Load cached internal marks - but only if they match current department
        const cachedMarks = localStorage.getItem('internalMarksData');
        const cachedMarksDept = localStorage.getItem('internalMarksDepartment');

        if (cachedMarks && cachedMarksDept === dept) {
            try {
                setInternalMarks(JSON.parse(cachedMarks));
            } catch (e) {
                console.error('Failed to parse cached marks:', e);
            }
        } else if (cachedMarks && cachedMarksDept !== dept) {
            // Clear mismatched cached marks
            localStorage.removeItem('internalMarksData');
            localStorage.removeItem('internalMarksDepartment');
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
            if (dept === 'FSH' && (!cachedMarks || cachedMarksDept !== dept)) {
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
                localStorage.setItem('internalMarksDepartment', 'FSH');
            } else {
                setMarksError(result.error || 'Failed to fetch marks');
            }
        } catch {
            setMarksError('Network error. Please try again.');
        } finally {
            setMarksLoading(false);
        }
    };

    const handleRefresh = async () => {
        const username = localStorage.getItem('username');
        const password = localStorage.getItem('password');
        const cookies = localStorage.getItem('sessionCookies');
        const dept = localStorage.getItem('department') || 'ENT';

        if (!username) {
            setMarksError('Session expired. Redirecting to login...');
            setTimeout(() => router.push(`/login?dept=${dept}`), 1500);
            return;
        }

        setIsRefreshing(true);
        setMarksError(null);

        try {
            // For FSH, we need cookies; for ENT, we need password
            const requestBody: any = {
                department: dept,
                username
            };

            if (dept === 'FSH') {
                if (!cookies) {
                    throw new Error('Session expired');
                }
                // Re-use existing session for FSH
                const csrf = localStorage.getItem('csrf');
                requestBody.cookies = cookies;
                requestBody.csrfToken = csrf;
                requestBody.captcha = ''; // Not needed for refresh
            } else {
                // For ENT, password would be needed (but we don't store it)
                throw new Error('Auto-refresh not supported for ENT portal. Please log in again.');
            }

            const response = await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const result = await response.json();

            if (result.success && result.data) {
                setData(result.data);
                localStorage.setItem('attendanceData', JSON.stringify(result.data));

                const now = new Date();
                setLastUpdated(now);
                localStorage.setItem('lastUpdated', now.toISOString());

                // Also refresh marks for FSH
                if (dept === 'FSH' && result.internalMarks) {
                    setInternalMarks(result.internalMarks);
                    localStorage.setItem('internalMarksData', JSON.stringify(result.internalMarks));
                    localStorage.setItem('internalMarksDepartment', 'FSH');
                }

                // Show success (could add toast notification here)
                console.log('Data refreshed successfully');
            } else {
                throw new Error(result.error || 'Failed to refresh data');
            }
        } catch (err: any) {
            setMarksError(err.message || 'Failed to refresh. Please try logging in again.');
            // If session expired, redirect to login after a short delay
            if (err.message?.includes('expired') || err.message?.includes('Session')) {
                setTimeout(() => router.push(`/login?dept=${dept}`), 2000);
            }
        } finally {
            setIsRefreshing(false);
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
        <div className="min-h-screen bg-background text-textMain selection:bg-primary/30 selection:text-white font-sans animate-scale-in origin-center overflow-x-hidden">
            {/* Background Glow Effects - like homepage */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-glow-gradient opacity-40 pointer-events-none z-0" />
            <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none z-0" />

            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-white/10">
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
                        {/* Refresh Button */}
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className={`p-2 rounded-full bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isRefreshing ? 'animate-spin' : ''}`}
                            title="Refresh Data"
                        >
                            <RefreshCw size={18} />
                        </button>

                        {/* Share Button */}
                        <button
                            onClick={() => setShowShareCard(true)}
                            className="p-2 rounded-full bg-primary/20 hover:bg-primary/30 text-primary transition-colors"
                            title="Share Attendance"
                        >
                            <Share2 size={18} />
                        </button>

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
            <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-background border-b border-border px-4 py-2">
                <div className="flex bg-surface p-1 rounded-lg">
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
                        {/* Compact Status Bar - Mobile First */}
                        <div className="mb-4 opacity-0 animate-blur-in">
                            <div className={`flex items-center justify-between p-4 rounded-xl border-2 ${overallPercentage >= 75 ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'
                                }`}>
                                {/* Left: Percentage */}
                                <div className="flex items-center gap-3">
                                    <div className={`text-4xl font-black ${overallPercentage >= 75 ? 'text-green-400' : 'text-red-400'}`}>
                                        {overallPercentage}%
                                    </div>
                                    <div className="hidden sm:block">
                                        <div className="text-xs text-white/40">Overall</div>
                                        <div className="text-sm text-white/60">{attendedHours} / {totalHours} hrs</div>
                                    </div>
                                </div>

                                {/* Right: Action */}
                                <div className={`px-4 py-2 rounded-lg border-2 ${overallPercentage >= 75
                                    ? 'bg-green-500/15 border-green-500/30 text-green-300'
                                    : 'bg-red-500/15 border-red-500/30 text-red-300'
                                    }`}>
                                    <div className="text-sm font-black whitespace-nowrap">
                                        {overallPercentage >= 75
                                            ? `✓ Safe ${Math.max(0, overallCanMiss)}`
                                            : `! Need ${Math.max(0, overallNeedToAttend)}`}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Subject Cards - Vertical Stack on Mobile */}
                        <div className="opacity-0 animate-blur-in delay-200">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
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
                        {/* Hero Section - Mobile Optimized */}
                        {/* Compact Header */}
                        <div className="mb-4 opacity-0 animate-blur-in">
                            <h2 className="text-2xl font-bold text-white">Internal Marks</h2>
                            <p className="text-sm text-white/40">Tests & assignments</p>
                        </div>

                        {department === 'ENT' ? (
                            <div className="text-center py-12 opacity-0 animate-blur-in delay-200">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                                    <span className="text-2xl">🚧</span>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Coming Soon</h3>
                                <p className="text-textMuted max-w-sm mx-auto">
                                    Internal marks for ENT department are currently under development. Please check back later!
                                </p>
                            </div>
                        ) : !internalMarks || !subjectsWithMarks.length ? (
                            <div className="text-center py-12 opacity-0 animate-blur-in delay-200">
                                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
                                    <FileText size={28} className="text-primary" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">No Marks Data Yet</h3>
                                <p className="text-textMuted mb-6 max-w-sm mx-auto text-sm">
                                    {marksLoading ? 'Fetching your internal marks...' : 'Click below to fetch your latest internal marks from the portal'}
                                </p>
                                {!marksLoading && (
                                    <button
                                        onClick={fetchInternalMarks}
                                        disabled={marksLoading}
                                        className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-full font-medium transition-colors disabled:opacity-50"
                                    >
                                        Fetch Marks →
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
                                <button onClick={() => router.push(`/login?dept=${department}`)} className="bg-red-500 text-white px-6 py-3 rounded-full font-medium hover:bg-red-600 transition-colors">
                                    Login Again →
                                </button>
                            </div>
                        ) : (
                            <div className="opacity-0 animate-blur-in delay-200">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {subjectsWithMarks.map((subject, i) => (
                                        <MarksCard key={`${subject.subjectCode}-${i}`} subject={subject} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}


                {/* Grades Tab */}
                {activeTab === 'grades' && (
                    <div className="max-w-6xl mx-auto px-4">
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

                        {/* Grades Cards Grid - Mobile Optimized */}
                        {subjectsWithMarks.length > 0 ? (
                            <div className="opacity-0 animate-blur-in delay-200">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                                    {subjectsWithMarks.map((subject, i) => {
                                        const targetGrade = targetGrades[subject.subjectCode] || 'A';
                                        const requiredEndSem = calculateRequiredEndSem(subject.totalMarks, targetGrade);
                                        const maxEndSem = department === 'ENT' ? 75 : 100;
                                        const isPossible = requiredEndSem <= maxEndSem;
                                        const gradeInfo = GRADES.find(g => g.grade === targetGrade) || GRADES[2];
                                        const percentage = subject.maxTotalMarks > 0 ? (subject.totalMarks / subject.maxTotalMarks) * 100 : 0;

                                        // Color coding
                                        const borderColor = percentage >= 80 ? 'border-emerald-500/30' : percentage >= 60 ? 'border-yellow-500/30' : 'border-red-500/30';
                                        const bgColor = percentage >= 80 ? 'bg-emerald-950/40' : percentage >= 60 ? 'bg-yellow-950/40' : 'bg-red-950/40';

                                        return (
                                            <div
                                                key={`grade-${subject.subjectCode}-${i}`}
                                                className={`relative p-5 rounded-2xl border-2 ${borderColor} ${bgColor} transition-all duration-300`}
                                            >
                                                {/* Header: Subject + Current Marks */}
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex-1 min-w-0 mr-3">
                                                        <h3 className="text-lg font-bold text-white leading-tight mb-1.5">
                                                            {subject.subjectName}
                                                        </h3>
                                                        <div className="px-2 py-1 rounded-md bg-black/30 text-[11px] text-white/60 font-medium inline-block">
                                                            {subject.subjectCode}
                                                        </div>
                                                    </div>

                                                    {/* Internal Marks - Large */}
                                                    <div className="text-right">
                                                        <div className="text-3xl font-black text-white leading-none">
                                                            {subject.totalMarks.toFixed(0)}
                                                            <span className="text-xl text-white/40">/{subject.maxTotalMarks}</span>
                                                        </div>
                                                        <div className="text-xs text-white/40 mt-1">Internal</div>
                                                    </div>
                                                </div>

                                                {/* Target Grade Selector - BIG TOUCH TARGETS */}
                                                <div className="mb-5">
                                                    <div className="text-white/50 text-xs font-medium mb-3">Target Grade</div>

                                                    {/* Grade Pills - Mobile Friendly */}
                                                    <div className="grid grid-cols-6 gap-2 mb-3">
                                                        {['C', 'B', 'B+', 'A', 'A+', 'O'].map((g) => (
                                                            <button
                                                                key={g}
                                                                onClick={() => setTargetGrades(prev => ({ ...prev, [subject.subjectCode]: g }))}
                                                                className={`py-2 rounded-lg font-bold text-sm transition-all ${targetGrade === g
                                                                    ? `${gradeInfo.bg} text-white scale-110 shadow-lg`
                                                                    : 'bg-white/5 text-white/40 hover:bg-white/10'
                                                                    }`}
                                                            >
                                                                {g}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {/* BIG Slider for Mobile */}
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="5"
                                                        value={['C', 'B', 'B+', 'A', 'A+', 'O'].indexOf(targetGrade)}
                                                        onChange={(e) => {
                                                            const grades = ['C', 'B', 'B+', 'A', 'A+', 'O'];
                                                            setTargetGrades(prev => ({ ...prev, [subject.subjectCode]: grades[parseInt(e.target.value)] }));
                                                        }}
                                                        className="w-full h-3 bg-white/10 rounded-full appearance-none cursor-pointer"
                                                    />
                                                </div>

                                                {/* Required End Sem Score - Prominent */}
                                                <div className={`p-4 rounded-xl border-2 ${isPossible ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/15 border-red-500/30'
                                                    }`}>
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <div className="text-white/50 text-xs font-medium mb-1">End Sem Needed</div>
                                                            <div className={`text-2xl font-black ${isPossible ? 'text-emerald-300' : 'text-red-300'}`}>
                                                                {requiredEndSem.toFixed(0)}
                                                                <span className="text-sm text-white/40 font-normal"> / {maxEndSem}</span>
                                                            </div>
                                                        </div>
                                                        <div className={`px-3 py-2 rounded-lg ${gradeInfo.bg} text-white font-black text-lg`}>
                                                            {isPossible ? targetGrade : '!'}
                                                        </div>
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
                    </div>
                )
                }

            </main>

            {/* Footer / Disclaimer */}
            <footer className="py-8 text-center opacity-60 hover:opacity-100 transition-opacity">
                <p className="text-[10px] text-textMuted uppercase tracking-widest font-medium">
                    Disclaimer
                </p>
                <p className="text-xs text-textMuted mt-1 max-w-sm mx-auto">
                    This site is under active development. Attendance and marks data may not be 100% accurate or up-to-date. Please verify on the official portal.
                </p>
            </footer>

            {/* Share Card Modal */}
            {showShareCard && (
                <AttendanceCard
                    studentName={data.studentName || 'Student'}
                    registrationNumber={data.registrationNumber || ''}
                    overallPercentage={overallPercentage}
                    totalSubjects={data.records.length}
                    onClose={() => setShowShareCard(false)}
                />
            )}

        </div>
    );
}

// Subject Card for Attendance - Mobile-First with Consumer Psychology
function SubjectCard({ record }: { record: AttendanceRecord; department: string }) {
    const percentage = record.percentage || 0;
    const isSafe = percentage >= 75;
    const isExcellent = percentage >= 85;

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

    // Color psychology - SOLID backgrounds, no glass
    const bgColor = isExcellent ? 'bg-emerald-950/40' : isSafe ? 'bg-green-950/40' : 'bg-red-950/40';
    const borderColor = isExcellent ? 'border-emerald-500/30' : isSafe ? 'border-green-500/30' : 'border-red-500/30';
    const textColor = isExcellent ? 'text-emerald-400' : isSafe ? 'text-green-400' : 'text-red-400';
    const barColor = isExcellent ? 'bg-emerald-500' : isSafe ? 'bg-green-500' : 'bg-red-500';

    return (
        <div className={`relative p-5 rounded-2xl border-2 ${borderColor} ${bgColor} transition-all duration-300 active:scale-[0.98]`}>
            {/* Top Row: Subject Name + Huge Percentage */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0 mr-3">
                    <h3 className="text-lg font-bold text-white leading-tight mb-1.5">
                        {record.subjectName}
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded-md bg-black/30 text-[11px] text-white/60 font-medium">
                            {record.subjectCode}
                        </span>
                        {record.category && (
                            <span className="text-[11px] text-white/40">
                                {record.category}
                            </span>
                        )}
                    </div>
                </div>

                {/* HUGE Percentage - Psychology: Largest element = most important */}
                <div className={`text-5xl font-black ${textColor} leading-none`}>
                    {percentage.toFixed(0)}
                    <span className="text-2xl">%</span>
                </div>
            </div>

            {/* Progress Bar - Thick & Clear */}
            <div className="relative w-full h-3 bg-white/5 rounded-full overflow-hidden mb-4">
                <div
                    className={`absolute inset-y-0 left-0 rounded-full ${barColor} transition-all duration-700 ease-out`}
                    style={{ width: `${Math.min(100, percentage)}%` }}
                />
                {/* 75% Threshold Marker */}
                <div className="absolute top-0 bottom-0 w-1 bg-white/30" style={{ left: '75%' }} />
            </div>

            {/* Bottom Row: Hours + Action (Psychology: Clear CTA) */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-white/40 text-xs font-medium mb-0.5">Attended</div>
                    <div className="text-white text-base font-bold">
                        {record.attendedHours}
                        <span className="text-white/30 font-normal"> / {record.totalHours}</span>
                    </div>
                </div>


                {/* Psychology: Action-oriented text in colored pill */}
                <div className={`px-4 py-2.5 rounded-xl ${isSafe ? 'bg-emerald-500/15' : 'bg-red-500/15'} border-2 ${isSafe ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
                    <div className={`text-sm font-black ${isSafe ? 'text-emerald-300' : 'text-red-300'} whitespace-nowrap`}>
                        {isSafe ? (
                            <>✓ Safe to miss {canMiss}</>
                        ) : (
                            <>! Need {needToAttend} more</>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Marks Card - Mobile First
function MarksCard({ subject }: { subject: SubjectMarks }) {
    const percentage = subject.maxTotalMarks > 0 ? (subject.totalMarks / subject.maxTotalMarks) * 100 : 0;

    // Color psychology
    const isExcellent = percentage >= 80;
    const isGood = percentage >= 60;
    const bgColor = isExcellent ? 'bg-emerald-950/40' : isGood ? 'bg-yellow-950/40' : 'bg-red-950/40';
    const borderColor = isExcellent ? 'border-emerald-500/30' : isGood ? 'border-yellow-500/30' : 'border-red-500/30';
    const textColor = isExcellent ? 'text-emerald-400' : isGood ? 'text-yellow-400' : 'text-red-400';
    const barColor = isExcellent ? 'bg-emerald-500' : isGood ? 'bg-yellow-500' : 'bg-red-500';

    return (
        <div className={`relative p-5 rounded-2xl border-2 ${borderColor} ${bgColor} transition-all duration-300`}>
            {/* Top Row: Subject Name + Huge Percentage */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0 mr-3">
                    <h3 className="text-lg font-bold text-white leading-tight mb-1.5">
                        {subject.subjectName}
                    </h3>
                    <div className="px-2 py-1 rounded-md bg-black/30 text-[11px] text-white/60 font-medium inline-block">
                        {subject.subjectCode}
                    </div>
                </div>

                {/* HUGE Percentage */}
                <div className={`text-5xl font-black ${textColor} leading-none`}>
                    {percentage.toFixed(0)}
                    <span className="text-2xl">%</span>
                </div>
            </div>

            {/* Progress Bar - Thick */}
            <div className="relative w-full h-3 bg-white/5 rounded-full overflow-hidden mb-4">
                <div
                    className={`absolute inset-y-0 left-0 rounded-full ${barColor} transition-all duration-700 ease-out`}
                    style={{ width: `${Math.min(100, percentage)}%` }}
                />
            </div>

            {/* Bottom Row: Marks */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-white/40 text-xs font-medium mb-0.5">Scored</div>
                    <div className="text-white text-2xl font-bold">
                        {subject.totalMarks.toFixed(1)}
                        <span className="text-white/30 font-normal text-base"> / {subject.maxTotalMarks}</span>
                    </div>
                </div>

                {/* Status Badge */}
                <div className={`px-4 py-2 rounded-xl ${isExcellent ? 'bg-emerald-500/15 border-2 border-emerald-500/30' : isGood ? 'bg-yellow-500/15 border-2 border-yellow-500/30' : 'bg-red-500/15 border-2 border-red-500/30'}`}>
                    <div className={`text-sm font-black ${isExcellent ? 'text-emerald-300' : isGood ? 'text-yellow-300' : 'text-red-300'}`}>
                        {isExcellent ? '✓ Excellent' : isGood ? '○ Good' : '! Low'}
                    </div>
                </div>
            </div>
        </div>
    );
}

