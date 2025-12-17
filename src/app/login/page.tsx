'use client';

import { Suspense, useState, useEffect, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, ArrowRight, RotateCcw } from 'lucide-react';
import LoginLoader from '@/components/LoginLoader';

function LoginForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const deptParam = searchParams.get('dept');
    const dept = deptParam || 'FSH';

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

                // Save internal marks if returned (ENT optimization)
                if (data.internalMarks) {
                    localStorage.setItem('internalMarksData', JSON.stringify(data.internalMarks));
                    localStorage.setItem('internalMarksDepartment', dept);
                }

                // Save basic profile data from attendance response
                const profileData = {
                    studentName: data.data?.studentName || '',
                    studentId: username,
                    registerNo: username,
                    emailId: `${username.toLowerCase()}@srmist.edu.in`,
                    program: dept === 'FSH' ? 'Faculty of Science & Humanities' : 'Engineering & Technology',
                    department: dept
                };
                localStorage.setItem('profileData', JSON.stringify(profileData));

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
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-x-hidden overflow-y-auto">

            {/* Background Effects */}
            <div className="absolute inset-0 bg-dot-grid opacity-20 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-md relative animate-scale-in">
                {/* Card Glow */}
                <div className="absolute -inset-0.5 bg-gradient-to-b from-primary/30 to-transparent rounded-2xl blur opacity-30 pointer-events-none"></div>

                <div className="relative bg-surface border border-border rounded-xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="p-5 sm:p-8 pb-4 sm:pb-6 text-center">
                        <Link href="/" className="mx-auto w-20 h-20 bg-[#1C1D21] border border-border/50 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-indigo-500/10 hover:scale-105 transition-transform duration-300">
                            <img src="/logo.png" alt="AttendX" className="w-12 h-12 rounded-xl" />
                        </Link>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">Welcome to AttendX</h1>
                        <p className="text-xs sm:text-sm text-textMuted">Sign in to sync your attendance records</p>
                    </div>

                    {/* Portal Selector */}
                    <div className="px-6 sm:px-8 pb-4">
                        <div className="flex bg-[#0B0C0E] rounded-lg p-1.5 sm:p-1 border border-border">
                            <button
                                type="button"
                                onClick={() => router.push('/login?dept=FSH')}
                                className={`flex-1 py-3.5 sm:py-2.5 text-base sm:text-sm font-medium rounded-md transition-all touch-min ${dept === 'FSH' ? 'bg-primary text-white' : 'text-textMuted hover:text-white'}`}
                            >
                                FSH Portal
                            </button>
                            <button
                                type="button"
                                disabled
                                className="flex-1 py-3.5 sm:py-2.5 text-base sm:text-sm font-medium rounded-md transition-all relative cursor-not-allowed opacity-50"
                                title="Coming Soon - Under Development"
                            >
                                <span>ENT Portal</span>
                                <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                                    SOON
                                </span>
                            </button>
                        </div>
                        {dept === 'ENT' && (
                            <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                <p className="text-xs text-yellow-200 text-center">
                                    <strong>ENT Portal:</strong> Coming Soon! Currently under development. Use Manual Sync for now.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Form Area - Now inside the card */}
                    <div className="p-5 sm:p-8 pt-2 sm:pt-4">
                        {loading && dept === 'ENT' ? (
                            <LoginLoader />
                        ) : (
                            <>
                                {error && (
                                    <div className="mb-6 p-3 rounded bg-red-500/10 border border-red-500/20 text-red-200 text-xs flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="space-y-1.5">
                                        <label className="text-xs uppercase tracking-wider font-medium text-textMuted ml-1">
                                            {dept === 'ENT' ? 'Email Address' : "NetID (without '@srmist.edu.in')"}
                                        </label>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            autoComplete="username"
                                            className="w-full bg-[#0B0C0E] border border-border rounded-lg px-4 py-4 sm:py-3 text-base sm:text-sm text-white placeholder:text-gray-700 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all shadow-inner"
                                            placeholder={dept === 'ENT' ? "student@srmist.edu.in" : "NetID"}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs uppercase tracking-wider font-medium text-textMuted ml-1">Password</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                autoComplete="current-password"
                                                className="w-full bg-[#0B0C0E] border border-border rounded-lg px-4 py-4 sm:py-3 pr-12 text-base sm:text-sm text-white placeholder:text-gray-700 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all shadow-inner"
                                                placeholder="••••••••"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 sm:p-2 text-textMuted hover:text-white transition-colors touch-min"
                                            >
                                                {showPassword ? <EyeOff size={20} className="sm:w-4 sm:h-4" /> : <Eye size={20} className="sm:w-4 sm:h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {dept === 'FSH' && (
                                        <div className="space-y-1.5">
                                            <label className="text-xs uppercase tracking-wider font-medium text-textMuted ml-1">Security Check</label>
                                            <div className="flex gap-2 items-center">
                                                <input
                                                    type="text"
                                                    value={captchaVal}
                                                    onChange={(e) => setCaptchaVal(e.target.value)}
                                                    autoComplete="off"
                                                    className="flex-1 min-w-0 bg-[#0B0C0E] border border-border rounded-lg px-4 py-4 sm:py-3 text-base sm:text-sm text-white outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                                                    placeholder="Enter code"
                                                    required
                                                />
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <div className="relative group">
                                                        {captchaImg ? (
                                                            <div className="h-[50px] w-[110px] sm:h-[46px] sm:w-[120px] px-2 bg-white rounded-lg flex items-center justify-center overflow-hidden border-2 border-transparent">
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img src={captchaImg} alt="Captcha" className="h-full w-full object-contain" />
                                                            </div>
                                                        ) : (
                                                            <div className="h-[50px] w-[110px] sm:h-[46px] sm:w-[120px] bg-white/5 rounded-lg flex items-center justify-center animate-pulse">
                                                                <Loader2 className="w-5 h-5 sm:w-4 sm:h-4 text-textMuted animate-spin" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={fetchCaptcha}
                                                        className="p-3 bg-[#0B0C0E] border border-border rounded-lg text-textMuted hover:text-white hover:border-primary/50 transition-all active:scale-95 touch-min"
                                                        title="Refresh Captcha"
                                                    >
                                                        <RotateCcw size={20} className="sm:w-4 sm:h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-4 sm:py-3 text-base sm:text-sm rounded-lg transition-all shadow-[0_0_20px_rgba(94,106,210,0.3)] hover:shadow-[0_0_25px_rgba(94,106,210,0.5)] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-min"
                                    >
                                        {loading ? <Loader2 className="animate-spin w-5 h-5 sm:w-4 sm:h-4" /> : 'Sign In'}
                                        {!loading && <ArrowRight size={18} className="sm:w-4 sm:h-4" />}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>

                    <div className="mt-8 mb-4 text-center relative z-50">
                        <Link href="/" className="inline-block px-4 py-2 text-sm text-textMuted hover:text-white transition-colors">
                            ← Back to home
                        </Link>
                    </div>
                </div>
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
