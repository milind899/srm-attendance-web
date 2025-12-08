'use client';

import { Suspense, useState, useEffect, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './login.module.css';

function LoginForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const dept = searchParams.get('dept') || 'ENT'; // Default to ENT if missing

    // Tab state
    const [mode, setMode] = useState<'auto' | 'manual'>('auto');
    const [manualData, setManualData] = useState('');

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

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
        if (dept === 'FSH' && mode === 'auto') {
            fetchCaptcha();
        }
    }, [dept, mode]);

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
                // Success! Save data and redirect
                localStorage.setItem('attendanceData', JSON.stringify(data.data));
                localStorage.setItem('department', dept);
                // Save cookies for internal marks fetch
                if (dept === 'FSH' && cookies) {
                    localStorage.setItem('fshCookies', cookies);
                }
                router.push('/dashboard');
            } else {
                setError(data.error || 'Login failed');
                // Refresh captcha on failure if FSH
                if (dept === 'FSH') fetchCaptcha();
            }
        } catch (err) {
            setError('An error occurred during login');
        } finally {
            setLoading(false);
        }
    };

    const handleManualSubmit = (e: FormEvent) => {
        e.preventDefault();
        try {
            const parsed = JSON.parse(manualData);
            if (!Array.isArray(parsed)) throw new Error('Invalid data format (must be JSON array)');

            const records = parsed.map((p: any) => ({
                subjectCode: p.subjectCode,
                subjectName: p.subjectName,
                totalHours: p.totalHours,
                attendedHours: p.attendedHours,
                percentage: p.percentage,
                classesToMiss: p.totalHours && p.attendedHours ? Math.floor(((p.attendedHours / 0.75) - p.totalHours) * -1) : 0,
                classesToAttend: 0
            }));

            const dataToSave = {
                studentName: 'Manual User',
                registrationNumber: 'Unknown',
                records: records
            };

            localStorage.setItem('attendanceData', JSON.stringify(dataToSave));
            localStorage.setItem('department', dept);
            router.push('/dashboard');
        } catch (err) {
            setError('Invalid JSON data. Please make sure you copied it correctly.');
        }
    };

    const BOOKMARKLET_CODE = `javascript:(function(){var d=[],t=document.querySelectorAll('table');t.forEach(x=>{if(x.innerText.includes('Course Code')){x.querySelectorAll('tr').forEach(r=>{var c=r.querySelectorAll('td');if(c.length>5&&c[0].innerText.trim()!=='Course Code'){d.push({subjectCode:c[0].innerText.trim(),subjectName:c[1].innerText.trim(),totalHours:parseFloat(c[2].innerText),attendedHours:parseFloat(c[3].innerText),percentage:parseFloat(c[5].innerText)})}})}});if(d.length>0){navigator.clipboard.writeText(JSON.stringify(d)).then(()=>alert('Copied to clipboard! Paste it in the app.')).catch(()=>prompt('Copy this JSON:',JSON.stringify(d)))}else{alert('No attendance table found on this page.')}})()`;

    return (
        <div className={styles.container}>
            <div className={`glass-panel ${styles.formCard}`}>
                <div className="flex gap-4 border-b border-white/10 mb-6 pb-2" style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
                    <button
                        type="button"
                        onClick={() => setMode('auto')}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            opacity: mode === 'auto' ? 1 : 0.5,
                            fontWeight: 'bold',
                            borderBottom: mode === 'auto' ? '2px solid white' : 'none'
                        }}
                    >
                        Auto Login
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('manual')}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            opacity: mode === 'manual' ? 1 : 0.5,
                            fontWeight: 'bold',
                            borderBottom: mode === 'manual' ? '2px solid white' : 'none'
                        }}
                    >
                        Manual / Mobile
                    </button>
                </div>

                <h1 className={styles.title}>
                    {dept} Attendance
                </h1>

                {error && <div className={styles.errorBanner}>{error}</div>}

                {mode === 'auto' ? (
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <p className={styles.subtitle}>Enter your credentials to continue</p>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Username / Reg No.</label>
                            <input
                                type="text"
                                className="input-field"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="e.g. RA21..."
                                required
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Password</label>
                            <input
                                type="password"
                                className="input-field"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        {dept === 'FSH' && (
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Captcha</label>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        className="input-field"
                                        style={{ flex: 1 }}
                                        value={captchaVal}
                                        onChange={(e) => setCaptchaVal(e.target.value)}
                                        placeholder="Enter Captcha"
                                        required
                                    />
                                    {captchaImg ? (
                                        <div style={{ position: 'relative' }}>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={captchaImg}
                                                alt="Captcha"
                                                style={{ height: '40px', borderRadius: '4px', cursor: 'pointer' }}
                                                onClick={fetchCaptcha}
                                                title="Click to refresh"
                                            />
                                        </div>
                                    ) : (
                                        <div style={{ width: '100px', height: '40px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>
                                            Loading...
                                        </div>
                                    )}
                                    <button type='button' onClick={fetchCaptcha} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }} title="Refresh">↻</button>
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn-primary"
                            style={{ width: '100%', marginTop: '1rem' }}
                            disabled={loading}
                        >
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleManualSubmit} className={styles.form}>
                        <div style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '1rem' }}>
                            <p style={{ marginBottom: '0.5rem' }}><strong>Step 1:</strong> Log in to SRM Portal in a new tab/browser.</p>
                            <p style={{ marginBottom: '0.5rem' }}><strong>Step 2:</strong> Navigate to "Attendance Details".</p>
                            <p style={{ marginBottom: '0.5rem' }}><strong>Step 3:</strong> Run this script (Console / Bookmarklet):</p>
                            <div style={{ background: 'black', padding: '0.5rem', borderRadius: '4px', overflowX: 'auto', whiteSpace: 'nowrap', marginBottom: '0.5rem' }}>
                                <code style={{ fontFamily: 'monospace', color: '#0f0' }}>{BOOKMARKLET_CODE.substring(0, 50)}...</code>
                            </div>
                            <button
                                type="button"
                                onClick={() => navigator.clipboard.writeText(BOOKMARKLET_CODE)}
                                style={{
                                    background: 'transparent',
                                    border: '1px solid #aaa',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    marginBottom: '1rem'
                                }}
                            >
                                Copy Full Script
                            </button>
                            <p style={{ marginTop: '1rem', marginBottom: '0.5rem' }}><strong>Step 4:</strong> Paste the copied JSON below:</p>
                        </div>

                        <textarea
                            className="input-field"
                            value={manualData}
                            onChange={(e) => setManualData(e.target.value)}
                            placeholder='Paste JSON here... [{"subjectCode":...}]'
                            rows={6}
                            required
                            style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                        />

                        <button
                            type="submit"
                            className="btn-primary"
                            style={{ width: '100%', marginTop: '1rem' }}
                        >
                            Load Data
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="text-center p-10">Loading...</div>}>
            <LoginForm />
        </Suspense>
    );
}
