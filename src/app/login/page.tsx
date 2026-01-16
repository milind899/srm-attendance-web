'use client';

import { Suspense, useState, useEffect, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, ArrowRight, RotateCcw, ShieldCheck, Github, Globe } from 'lucide-react';
import LoginLoader from '@/components/LoginLoader';


function LoginForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const deptParam = searchParams.get('dept');
    const dept = deptParam || 'ENT';

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // FSH Specific State
    const [captchaImg, setCaptchaImg] = useState<string | null>(null);
    const [captchaVal, setCaptchaVal] = useState('');
    const [csrf, setCsrf] = useState('');
    const [cookies, setCookies] = useState('');

    // UI Loading state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch Captcha for FSH
    useEffect(() => {
        if (dept === 'FSH') {
            fetchCaptcha();
        }
    }, [dept]);

    const fetchCaptcha = async () => {
        try {
            setCaptchaImg(null);
            const res = await fetch('/api/captcha');
            if (res.ok) {
                const data = await res.json();
                setCaptchaImg(data.img);
                setCsrf(data.csrf);
                setCookies(data.cookie);
                setCaptchaVal('');
            } else {
                console.error('Failed to load captcha');
            }
        } catch (e) {
            console.error('Error fetching captcha:', e);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    department: dept,
                    username,
                    password,
                    captcha: dept === 'FSH' ? captchaVal : undefined,
                    csrfToken: dept === 'FSH' ? csrf : undefined,
                    cookies: dept === 'FSH' ? cookies : undefined
                })
            });

            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('attendanceData', JSON.stringify(data.data));
                localStorage.setItem('department', dept);
                localStorage.setItem('username', username);

                if (data.internalMarks) {
                    localStorage.setItem('internalMarksData', JSON.stringify(data.internalMarks));
                    localStorage.setItem('internalMarksDepartment', dept);
                }

                // Save master timetable for ENT (fetched during login)
                // Now only saves for the user's detected batch
                if (data.data?.userBatch && data.data?.masterTimetable) {
                    const userBatch = data.data.userBatch;
                    const masterSlots = data.data.masterTimetable[`batch${userBatch}`];
                    if (masterSlots?.length > 0) {
                        localStorage.setItem(`timetable_batch_${userBatch}`, JSON.stringify({ masterSlots }));
                    }
                    // Save user's batch for timetable page
                    localStorage.setItem('userBatch', userBatch);
                }

                const profileData = {
                    studentName: data.data?.studentName || '',
                    studentId: username,
                    registerNo: username,
                    emailId: `${username.toLowerCase()}@srmist.edu.in`,
                    program: dept === 'FSH' ? 'Faculty of Science & Humanities' : 'Engineering & Technology',
                    department: dept
                };
                localStorage.setItem('profileData', JSON.stringify(profileData));

                // Store Cookies for ENT Session Reuse (Phase 2)
                if (dept === 'ENT' && data.cookies) {
                    localStorage.setItem('entCookies', JSON.stringify(data.cookies));
                }

                if (dept === 'FSH' && cookies) {
                    localStorage.setItem('fshCookies', cookies);
                    localStorage.setItem('csrf', csrf || '');
                }
                router.push('/dashboard');
            } else {
                setError(data.error || 'Login failed');
                if (dept === 'FSH') fetchCaptcha();
            }
        } catch (err) {
            setError('An error occurred during login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-white flex flex-col lg:flex-row overflow-hidden font-sans">
            {/* Left Side - Branding (Desktop Only) */}
            <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-16 bg-surfaceHighlight overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0 bg-dot-grid opacity-10 pointer-events-none" />
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/10 to-transparent opacity-50 pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/20 rounded-full blur-[128px] pointer-events-none" />

                {/* Content */}
                <div className="relative z-10">
                    <Link href="/home" className="inline-flex items-center gap-3 group">
                        <div className="relative">
                            <div className="absolute -inset-4 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/logo.png" alt="AttendX Logo" className="w-16 h-16 relative z-10 drop-shadow-[0_0_15px_rgba(94,106,210,0.5)] rounded-2xl" />
                        </div>
                        <span className="text-3xl font-bold tracking-tight">AttendX</span>
                    </Link>
                </div>

                <div className="relative z-10 mt-0 max-w-lg block">
                    <h1 className="text-6xl font-bold tracking-tight leading-tight mb-6">
                        Track smart. <br />
                        <span className="text-primary">Stay ahead.</span>
                    </h1>
                    <p className="text-lg text-textMuted leading-relaxed max-w-sm">
                        The advanced attendance tracking platform aimed for students of SRMIST.
                        Secure, fast, and always up to date.
                    </p>
                </div>

                <div className="relative z-10 flex gap-6 text-sm font-medium text-textMuted">
                    {/* Desktop Footer Links if needed */}
                </div>
            </div>

            {/* Right Side - Form (Mobile & Desktop) */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-surface min-h-[100dvh] lg:h-auto lg:min-h-0 overflow-y-auto lg:overflow-hidden backdrop-blur-3xl">
                {/* Mobile Background Effects (Subtle, no lava beam here anymore) */}
                <div className="absolute inset-0 lg:hidden bg-gradient-to-b from-surfaceHighlight to-surface pointer-events-none" />
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

                {/* Main Content - Centered Block */}
                <div className="w-full max-w-md mx-auto relative z-10 flex flex-col gap-6 sm:gap-8 py-8 mb-12">

                    {/* Cloud/Mobile-Only Header */}
                    <div className="lg:hidden flex flex-col items-center gap-4 shrink-0">
                        <div className="relative">
                            <div className="absolute -inset-4 bg-primary/20 blur-xl rounded-full opacity-50" />
                            <img src="/logo.png" alt="AttendX Logo" className="w-14 h-14 relative z-10 drop-shadow-[0_0_15px_rgba(94,106,210,0.5)] rounded-2xl" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">AttendX</h1>
                    </div>

                    <div className="text-center lg:text-left shrink-0">
                        <h2 className="text-xl lg:text-3xl font-bold tracking-tight mb-1 sm:mb-2 text-textMain/90">Welcome Back</h2>
                        <p className="text-textMuted text-sm sm:text-base">Please sign in to access your dashboard.</p>
                    </div>

                    {/* Department Logic */}
                    <div className="flex bg-[#0B0C0E]/50 backdrop-blur-md p-1 rounded-xl border border-border/50 shrink-0 shadow-inner">
                        <button
                            type="button"
                            onClick={() => router.replace('/login?dept=ENT')}
                            className={`flex-1 py-2 sm:py-2.5 text-sm font-medium rounded-lg transition-all ${dept === 'ENT'
                                ? 'bg-surfaceHighlight text-white shadow-lg shadow-black/20 border border-border/50'
                                : 'text-textMuted hover:text-white'
                                }`}
                        >
                            ENT Portal
                        </button>
                        <button
                            type="button"
                            onClick={() => router.replace('/login?dept=FSH')}
                            className={`flex-1 py-2 sm:py-2.5 text-sm font-medium rounded-lg transition-all ${dept === 'FSH'
                                ? 'bg-surfaceHighlight text-white shadow-lg shadow-black/20 border border-border/50'
                                : 'text-textMuted hover:text-white'
                                }`}
                        >
                            FSH Portal
                        </button>
                    </div>

                    {loading && dept === 'ENT' ? (
                        <div className="py-12 flex justify-center">
                            <LoginLoader />
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4 shrink-0">
                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-xs flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-textMuted ml-1">
                                    {dept === 'ENT' ? 'Email Address' : "NetID"}
                                </label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-[#0B0C0E]/50 border border-border/50 rounded-xl px-4 py-3 text-base text-white outline-none focus:border-primary focus:shadow-[0_0_30px_rgba(99,102,241,0.25)] transition-all duration-300 placeholder:text-textMuted/50"
                                    placeholder={dept === 'ENT' ? "student@srmist.edu.in" : "NetID (e.g., ab1234)"}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-textMuted ml-1">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-[#0B0C0E]/50 border border-border/50 rounded-xl px-4 py-3 pr-12 text-base text-white outline-none focus:border-primary focus:shadow-[0_0_30px_rgba(99,102,241,0.25)] transition-all duration-300 placeholder:text-textMuted/50"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-textMuted hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {dept === 'FSH' && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-textMuted ml-1">Security Check</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={captchaVal}
                                            onChange={(e) => setCaptchaVal(e.target.value)}
                                            className="flex-1 min-w-0 bg-[#0B0C0E]/50 border border-border/50 rounded-xl px-4 py-3 text-base text-white outline-none focus:border-primary focus:shadow-[0_0_30px_rgba(99,102,241,0.25)] transition-all duration-300 placeholder:text-textMuted/50"
                                            placeholder="Enter code"
                                            required
                                        />
                                        <div className="flex items-center gap-2">
                                            <div className="h-[46px] w-[100px] bg-white rounded-xl flex items-center justify-center overflow-hidden border border-border/50">
                                                {captchaImg ? (
                                                    <img src={captchaImg} alt="Captcha" className="h-full w-full object-contain" />
                                                ) : (
                                                    <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={fetchCaptcha}
                                                className="w-[46px] h-[46px] bg-[#0B0C0E]/50 border border-border/50 rounded-xl flex items-center justify-center text-textMuted hover:text-white hover:border-primary/50 transition-all active:scale-95"
                                            >
                                                <RotateCcw size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary hover:bg-primaryHover text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm relative overflow-hidden group"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                <div className="relative flex items-center gap-2">
                                    {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Sign In'}
                                    {!loading && <ArrowRight size={16} />}
                                </div>
                            </button>
                        </form>
                    )}

                    <div className="text-center pt-2 space-y-3 shrink-0">
                        <div className="flex items-center justify-center gap-1.5 text-[10px] text-textMuted opacity-80">
                            <ShieldCheck size={12} className="text-green-500" />
                            <span>No passwords stored • Data stays in your browser</span>
                        </div>
                        <Link href="/home" className="inline-block text-xs text-textMuted hover:text-white transition-colors">
                            Back to Home
                        </Link>
                    </div>
                </div>

                {/* Footer */}

            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="text-primary animate-spin" /></div>}>
            <LoginForm />
        </Suspense>
    );
}
