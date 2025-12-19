'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { AttendanceData, AttendanceRecord, InternalMarksData, SubjectMarks } from '@/lib/types';
import { DecryptText } from '@/components/DecryptText';
import { Loader2, Share2, BarChart3, Award, FileText, RefreshCw, User, CalendarCheck, ClipboardList, GraduationCap } from 'lucide-react';
import AttendanceCard from '@/components/AttendanceCard';
import { SubjectTile } from '@/components/SubjectTile';
import { SubjectDetailModal } from '@/components/SubjectDetailModal';
import { GradeCard } from '@/components/GradeCard';
import { GPACalculator } from '@/components/GPACalculator';
import { GRADES_ENT, GRADES_FSH } from '@/lib/gradings';
import Image from 'next/image';

type Tab = 'attendance' | 'marks' | 'grades';
type GradeMode = 'predictor' | 'calculator';

import { InstallPWA } from '@/components/InstallPWA';

export default function Dashboard() {
    const router = useRouter();
    const [data, setData] = useState<AttendanceData | null>(null);
    const [department, setDepartment] = useState<string>('ENT');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('attendance');
    const [gradeMode, setGradeMode] = useState<GradeMode>('predictor');

    // Selected Subject for Modal
    const [selectedSubject, setSelectedSubject] = useState<AttendanceRecord | null>(null);

    // Internal Marks State
    const [internalMarks, setInternalMarks] = useState<InternalMarksData | null>(null);
    const [marksLoading, setMarksLoading] = useState(false);
    const [marksError, setMarksError] = useState<string | null>(null);

    // Grade goal state - target grade for each subject
    // We now store more detailed projection info
    interface Projection {
        credits: number;
        point: number;
    }
    const [projections, setProjections] = useState<Record<string, Projection>>({});

    const handleGradeUpdate = (data: { subjectCode: string; credits: number; targetGrade: string; predictedPoint: number }) => {
        setProjections(prev => ({
            ...prev,
            [data.subjectCode]: {
                credits: data.credits,
                point: data.predictedPoint
            }
        }));
    };

    const overallSGPA = () => {
        let totalPoints = 0;
        let totalCredits = 0;

        Object.values(projections).forEach(p => {
            totalPoints += p.point * p.credits;
            totalCredits += p.credits;
        });

        return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
    };

    // Share card state
    const [showShareCard, setShowShareCard] = useState(false);

    // Refresh state
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Toast notification state
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    const showToastNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setToastMessage(message);
        setToastType(type);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

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
        const dept = localStorage.getItem('department') || 'FSH';
        const cookies = localStorage.getItem(`${dept.toLowerCase()}Cookies`);
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
        const dept = localStorage.getItem('department') || 'ENT';
        const username = localStorage.getItem('username');
        const password = localStorage.getItem('password');
        const cookies = localStorage.getItem(`${dept.toLowerCase()}Cookies`);

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

                // Show success toast
                showToastNotification('Data refreshed successfully! ✓', 'success');
            } else {
                // Check if it's a session expiration error
                const errorMsg = result.error || 'Failed to refresh data';
                const isSessionError = errorMsg.toLowerCase().includes('session') ||
                    errorMsg.toLowerCase().includes('login') ||
                    errorMsg.toLowerCase().includes('invalid') ||
                    errorMsg.toLowerCase().includes('expired') ||
                    errorMsg.toLowerCase().includes('credentials');

                if (isSessionError) {
                    showToastNotification('Session expired. Please login again.', 'error');
                    setMarksError('Your session has expired. Redirecting to login...');
                    // Clear stored data
                    localStorage.removeItem('sessionCookies');
                    localStorage.removeItem('csrf');
                    // Redirect after 2 seconds
                    setTimeout(() => {
                        router.push(`/login?dept=${dept}`);
                    }, 2000);
                } else {
                    throw new Error(errorMsg);
                }
            }
        } catch (err: any) {
            const errorMessage = err.message || 'Failed to refresh. Please try logging in again.';
            showToastNotification(errorMessage, 'error');
            setMarksError(errorMessage);

            // If it looks like a session error, redirect to login
            if (errorMessage.toLowerCase().includes('session') ||
                errorMessage.toLowerCase().includes('expired') ||
                errorMessage.toLowerCase().includes('invalid')) {
                setTimeout(() => {
                    router.push(`/login?dept=${dept}`);
                }, 2000);
            }
        } finally {
            setIsRefreshing(false);
        }
    };

    const calculateGrade = (total: number) => {
        const GRADES = department === 'FSH' ? GRADES_FSH : GRADES_ENT;
        for (const g of GRADES) {
            if (total >= g.min) return g;
        }
        return GRADES[GRADES.length - 1];
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
        <>
            {/* Background Glow Effects - like homepage */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-glow-gradient opacity-40 pointer-events-none z-0" />
            <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none z-0" />

            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3">
                        <Image src="/logo.png" alt="AttendX" width={40} height={40} className="rounded-xl shadow-lg shadow-indigo-500/20" />
                        <span className="font-bold text-xl tracking-tight text-white/90">AttendX</span>
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
                        {/* Share Button */}
                        <button
                            onClick={() => setShowShareCard(true)}
                            className="flex items-center justify-center p-3 sm:p-2 rounded-full bg-primary/20 hover:bg-primary/30 text-primary transition-colors touch-min"
                            title="Share Attendance"
                        >
                            <Share2 size={22} className="sm:w-[18px] sm:h-[18px]" />
                        </button>

                        <InstallPWA minimal />

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

            {/* Minimal Refresh Notice */}
            <div className="fixed top-16 left-0 right-0 z-40 bg-background/80 border-b border-border/50 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 py-1.5">
                    <p className="text-xs text-textMuted text-center">
                        To refresh data, <Link href="/login" className="text-primary hover:underline">login again</Link>
                    </p>
                </div>
            </div>

            <main className="min-h-screen bg-background text-textMain selection:bg-primary/30 selection:text-white font-sans overflow-x-hidden relative z-10 pt-28 md:pt-32 pb-32 md:pb-10 animate-scale-in origin-center">
                {/* Attendance Tab */}
                {activeTab === 'attendance' && (
                    <div className="max-w-6xl mx-auto px-4">
                        {/* Overall Attendance - Bento Style */}
                        <div className="mb-6 opacity-0 animate-blur-in">
                            <div className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 border shadow-xl ${overallPercentage >= 75
                                ? 'bg-emerald-500/5 border-emerald-500/20'
                                : 'bg-red-500/5 border-red-500/20'
                                }`}>

                                <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6">
                                    {/* Left: Giant Stats */}
                                    <div className="flex flex-col sm:flex-row items-center gap-6">
                                        <div className="relative text-center sm:text-left">
                                            <div className="text-sm font-medium text-white/50 uppercase tracking-widest mb-1">Overall Attendance</div>
                                            <div className={`text-6xl sm:text-7xl font-black leading-none tracking-tight ${overallPercentage >= 75 ? 'text-emerald-400' : 'text-red-400'
                                                }`}>
                                                <DecryptText text={String(overallPercentage)} speed={100} delay={500} />
                                                <span className="text-3xl sm:text-4xl text-white/30">%</span>
                                            </div>
                                        </div>

                                        {/* Divider */}
                                        <div className="hidden sm:block w-px h-16 bg-white/10"></div>

                                        {/* Hours Pill */}
                                        <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/5">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-white/40 font-medium uppercase">Attended</span>
                                                <span className="text-lg font-bold text-white">{attendedHours}h</span>
                                            </div>
                                            <div className="w-px h-6 bg-white/10"></div>
                                            <div className="flex flex-col">
                                                <span className="text-xs text-white/40 font-medium uppercase">Total</span>
                                                <span className="text-lg font-bold text-white/70">{totalHours}h</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border backdrop-blur-md ${overallPercentage >= 75
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                                        }`}>
                                        <span className="text-xl font-bold">
                                            {overallPercentage >= 75 ? '✓' : '⚠'}
                                        </span>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold whitespace-nowrap">
                                                {overallPercentage >= 75
                                                    ? `Safe Margin: ${department === 'FSH' ? Math.max(0, overallCanMiss) : ''}`
                                                    : `Attendance Lag: ${department === 'FSH' ? Math.max(0, overallNeedToAttend) : '0'}`
                                                }
                                            </span>
                                            <span className="text-xs opacity-70">
                                                {overallPercentage >= 75 ? 'Classes you can miss' : 'Classes to attend'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bento Grid - Subjects */}
                        <div className="opacity-0 animate-blur-in delay-200 mb-24">
                            <h3 className="text-sm font-medium text-white/50 mb-4 px-1 uppercase tracking-widest">
                                Your Subjects
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                                {data.records.map((record, i) => (
                                    <SubjectTile
                                        key={`${record.subjectCode}-${i}`}
                                        record={record}
                                        department={department}
                                        onClick={() => setSelectedSubject(record)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Subject Detail Modal */}
                        {selectedSubject && (
                            <SubjectDetailModal
                                record={selectedSubject}
                                department={department}
                                onClose={() => setSelectedSubject(null)}
                            />
                        )}
                    </div>
                )}

                {/* Marks Tab */}
                {activeTab === 'marks' && (
                    <div className="max-w-6xl mx-auto px-4">
                        {/* Hero Section - Mobile Optimized */}
                        {/* Compact Header */}
                        <div className="mb-4 opacity-0 animate-blur-in">
                            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/50 px-3 py-1.5 text-xs text-textMuted mb-4 backdrop-blur-sm">
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                <DecryptText text="Internal Marks" speed={30} delay={200} />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Tests & Assignments</h2>
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
                    <div className="max-w-6xl mx-auto px-4 pb-20">
                        {/* Grade Mode Toggle */}
                        <div className="flex justify-center mb-10 opacity-0 animate-blur-in">
                            <div className="bg-[#1A1825] p-1 rounded-full border border-white/10 flex relative">
                                <div
                                    className={`absolute top-1 bottom-1 w-[120px] bg-[#5B50E5] rounded-full transition-all duration-300 ${gradeMode === 'predictor' ? 'left-1' : 'left-[125px]'
                                        }`}
                                />
                                <button
                                    onClick={() => setGradeMode('predictor')}
                                    className={`relative z-10 w-[120px] py-2 text-sm font-medium rounded-full transition-colors ${gradeMode === 'predictor' ? 'text-white' : 'text-textMuted hover:text-white'
                                        }`}
                                >
                                    Predictor
                                </button>
                                <button
                                    onClick={() => setGradeMode('calculator')}
                                    className={`relative z-10 w-[120px] py-2 text-sm font-medium rounded-full transition-colors ${gradeMode === 'calculator' ? 'text-white' : 'text-textMuted hover:text-white'
                                        }`}
                                >
                                    Calculator
                                </button>
                            </div>
                        </div>

                        {gradeMode === 'calculator' ? (
                            <GPACalculator department={department} />
                        ) : (
                            <>
                                {/* Projected SGPA Card - From Image */}
                                {/* Grade Predictor Hero - Centered per new design */}
                                <div className="flex flex-col items-center justify-center py-10 opacity-0 animate-blur-in text-center">
                                    {/* Pill */}
                                    <div className="inline-flex items-center gap-2 rounded-full bg-[#1A1825] border border-[#2D2B3D] px-4 py-1.5 mb-6">
                                        <div className="w-2 h-2 rounded-full bg-[#8B5CF6]"></div>
                                        <span className="text-sm font-medium text-[#8B8D98]">Grade Predictor</span>
                                    </div>

                                    {/* Huge Grade */}
                                    <h1 className="text-7xl sm:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#FDE047] to-[#EAB308] mb-2 tracking-tight">
                                        <DecryptText text={overallSGPA()} speed={50} delay={200} />
                                    </h1>

                                    {/* Subtext */}
                                    <h2 className="text-xl text-[#8B8D98] font-medium mb-1">Predicted GPA</h2>
                                    <p className="text-sm text-[#52525B]">Based on target grades below. Adjust credits per subject for accuracy.</p>
                                </div>

                                {/* Grades Cards Grid - New Components */}
                                {subjectsWithMarks.length > 0 ? (
                                    <div className="opacity-0 animate-blur-in delay-200">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {subjectsWithMarks.map((subject, i) => (
                                                <GradeCard
                                                    key={`${subject.subjectCode}-${i}`}
                                                    subject={subject}
                                                    startCredits={subjectsWithMarks.length === 5 ? 4 : 3} // Heuristic default
                                                    department={department}
                                                    onUpdate={handleGradeUpdate}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 opacity-0 animate-blur-in delay-200">
                                        <p className="text-textMuted mb-6">No marks data available to predict grades.</p>
                                        <button onClick={() => setActiveTab('marks')} className="bg-[#EEEEF0] text-black px-6 py-3 rounded-full font-medium hover:bg-white transition-colors">
                                            Go to Marks →
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Footer / Disclaimer */}
                <footer className="py-8 text-center opacity-60 hover:opacity-100 transition-opacity">
                    <p className="text-[10px] text-textMuted uppercase tracking-widest font-medium">
                        Disclaimer
                    </p>
                    <p className="text-xs text-textMuted mt-1 max-w-sm mx-auto">
                        This site is under active development. Attendance and marks data may not be 100% accurate or up-to-date. Please verify on the official portal.
                    </p>
                </footer>
            </main>

            {/* Toast Notification */}
            {showToast && (
                <div className="fixed bottom-28 left-0 right-0 z-50 animate-fade-in-up flex justify-center pointer-events-none">
                    <div className={`mx-4 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 border-2 pointer-events-auto ${toastType === 'success'
                        ? 'bg-[#141518] border-green-500/30 text-green-300'
                        : 'bg-[#141518] border-red-500/30 text-red-300'
                        }`}>
                        <span className="text-2xl">
                            {toastType === 'success' ? '✓' : '✗'}
                        </span>
                        <span className="font-medium">{toastMessage}</span>
                    </div>
                </div>
            )}

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

            {/* Mobile Bottom Tab Bar - Floating Pill Style */}
            <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none md:hidden">
                <div className="pointer-events-auto flex w-[90%] max-w-sm bg-[#141518]/90 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl justify-around items-center py-3 px-6 animate-fade-in-up">
                    <button
                        onClick={() => setActiveTab('attendance')}
                        className={`flex flex-col items-center justify-center p-2 rounded-full transition-all duration-300 ${activeTab === 'attendance'
                            ? 'text-primary bg-primary/20 scale-110'
                            : 'text-textMuted hover:text-white'
                            }`}
                    >
                        <CalendarCheck size={24} strokeWidth={activeTab === 'attendance' ? 2.5 : 2} />
                    </button>
                    <div className="w-px h-8 bg-white/10"></div>
                    <button
                        onClick={() => setActiveTab('marks')}
                        className={`flex flex-col items-center justify-center p-2 rounded-full transition-all duration-300 ${activeTab === 'marks'
                            ? 'text-primary bg-primary/20 scale-110'
                            : 'text-textMuted hover:text-white'
                            }`}
                    >
                        <ClipboardList size={24} strokeWidth={activeTab === 'marks' ? 2.5 : 2} />
                    </button>
                    <div className="w-px h-8 bg-white/10"></div>
                    <button
                        onClick={() => setActiveTab('grades')}
                        className={`flex flex-col items-center justify-center p-2 rounded-full transition-all duration-300 ${activeTab === 'grades'
                            ? 'text-primary bg-primary/20 scale-110'
                            : 'text-textMuted hover:text-white'
                            }`}
                    >
                        <GraduationCap size={24} strokeWidth={activeTab === 'grades' ? 2.5 : 2} />
                    </button>
                </div>
            </div>
        </>
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

                {/* HUGE Percentage with Decrypt */}
                <div className={`text-5xl font-black ${textColor} leading-none`}>
                    <DecryptText text={percentage.toFixed(0)} speed={30} delay={0} />
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

