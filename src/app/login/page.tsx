'use client';

import { Suspense, useState, useEffect, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';

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
                }

                if (dept === 'FSH' && cookies) {
                    localStorage.setItem('sessionCookies', cookies);
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
        <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-y-auto">

            {/* Background Effects */}
            <div className="absolute inset-0 bg-dot-grid opacity-20 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-md relative animate-scale-in">
                {/* Card Glow */}
                <div className="absolute -inset-0.5 bg-gradient-to-b from-primary/30 to-transparent rounded-2xl blur opacity-30"></div>

                <div className="relative bg-surface border border-border rounded-xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="p-6 sm:p-8 pb-4 sm:pb-6 text-center">
                        <Link href="/" className="mx-auto w-16 h-16 bg-[#1C1D21] border border-border rounded-xl flex items-center justify-center mb-6 shadow-inner hover:scale-105 transition-transform duration-300">
                            <img src="/logo.png" alt="AttendX" className="w-10 h-10 object-contain" />
                        </Link>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">Welcome to AttendX</h1>
                        <p className="text-xs sm:text-sm text-textMuted">Sign in to sync your attendance records</p>
                    </div>

                    {/* Portal Selector */}
                    <div className="px-6 sm:px-8 pb-4">
                        <div className="flex bg-[#0B0C0E] rounded-lg p-1 border border-border">
                            <button
                                type="button"
                                onClick={() => router.push('/login?dept=FSH')}
                                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all ${dept === 'FSH' ? 'bg-primary text-white' : 'text-textMuted hover:text-white'}`}
                            >
                                FSH Portal
                            </button>
                            <button
                                type="button"
                                disabled
                                className="flex-1 py-2.5 text-sm font-medium rounded-md transition-all text-white/20 cursor-not-allowed flex items-center justify-center gap-2"
                                title="Under Development"
                            >
                                ENT Portal
                                <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-500/20">Dev</span>
                            </button>
                        </div>
                    </div>

                    {/* Maintenance Notice for ENT */}
                    {dept === 'ENT' && (
                        <div className="mx-6 sm:mx-8 mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 text-xs flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></div>
                            ENT Portal is currently under development.
                        </div>
                    )}
                </div>

                {/* Form Area - Now inside the card */}
                <div className="p-6 sm:p-8 pt-2 sm:pt-4">
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
                                className="w-full bg-[#0B0C0E] border border-border rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-700 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all shadow-inner"
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
                                    className="w-full bg-[#0B0C0E] border border-border rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-700 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all shadow-inner"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {dept === 'FSH' && (
                            <div className="space-y-1.5">
                                <label className="text-xs uppercase tracking-wider font-medium text-textMuted ml-1">Security Check</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={captchaVal}
                                        onChange={(e) => setCaptchaVal(e.target.value)}
                                        className="flex-1 bg-[#0B0C0E] border border-border rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                                        placeholder="Enter code"
                                        required
                                    />
                                    <div className="relative group">
                                        {captchaImg ? (
                                            <div
                                                className="h-[46px] px-2 bg-white rounded-lg flex items-center cursor-pointer opacity-90 hover:opacity-100 transition-opacity border-2 border-transparent hover:border-primary/50"
                                                onClick={fetchCaptcha}
                                                title="Click to refresh"
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={captchaImg} alt="Captcha" className="h-full object-contain" />
                                            </div>
                                        ) : (
                                            <div className="h-[46px] w-24 bg-white/5 rounded-lg flex items-center justify-center animate-pulse">
                                                <Loader2 className="w-4 h-4 text-textMuted animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-lg transition-all shadow-[0_0_20px_rgba(94,106,210,0.3)] hover:shadow-[0_0_25px_rgba(94,106,210,0.5)] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Sign In'}
                            {!loading && <ArrowRight size={16} />}
                        </button>
                    </form>
                </div>
            </div>

            <div className="mt-8 text-center relative z-50">
                <Link href="/" className="inline-block px-4 py-2 text-sm text-textMuted hover:text-white transition-colors">
                    ← Back to home
                </Link>
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
