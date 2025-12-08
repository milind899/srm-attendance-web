'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AttendanceData, AttendanceRecord } from '@/lib/types';
import styles from './dashboard.module.css';

export default function Dashboard() {
    const router = useRouter();
    const [data, setData] = useState<AttendanceData | null>(null);
    const [department, setDepartment] = useState<string>('ENT');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem('attendanceData');
        const dept = localStorage.getItem('department') || 'ENT';
        setDepartment(dept);

        if (!stored) {
            router.push('/');
            return;
        }
        try {
            setData(JSON.parse(stored));
        } catch {
            router.push('/');
        } finally {
            setLoading(false);
        }
    }, [router]);

    if (loading || !data) {
        return (
            <div className={styles.loadingContainer}>
                <div className="text-xl text-gray-400">Loading Dashboard...</div>
            </div>
        );
    }

    // Calculate overall stats for FSH
    const totalHours = data.records.reduce((sum, r) => sum + (r.totalHours || 0), 0);
    const attendedHours = data.records.reduce((sum, r) => sum + (r.attendedHours || 0), 0);

    // If we have actual hours data, use it; otherwise calculate from percentages
    let overallPercentage: number;
    if (totalHours > 0 && attendedHours > 0) {
        overallPercentage = Math.round((attendedHours / totalHours) * 100 * 100) / 100; // 2 decimal places
    } else {
        // Fallback: Simple average of percentages
        const sumPct = data.records.reduce((sum, r) => sum + (r.percentage || 0), 0);
        overallPercentage = Math.round((sumPct / data.records.length) * 100) / 100;
    }

    // FSH Formula: Allowable_Missed_Hours = A − (R × T)
    const requiredHours = Math.ceil(0.75 * totalHours);
    const allowableMissedHours = attendedHours - requiredHours;

    const canMissHours = allowableMissedHours > 0 ? Math.floor(allowableMissedHours) : 0;
    const needToAttendHours = allowableMissedHours < 0 ? Math.abs(Math.ceil(allowableMissedHours)) : 0;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.welcome}>Welcome Back, <span className="text-white">{data.studentName}</span></h1>
                    <p className={styles.regNo}>{data.registrationNumber}</p>
                </div>
                <button onClick={() => { localStorage.clear(); router.push('/'); }} className={styles.logoutBtn}>
                    Logout
                </button>
            </header>

            {/* FSH Overall Attendance Card */}
            {department === 'FSH' && (
                <div className={styles.overallCard}>
                    <div className={styles.overallHeader}>
                        <h2>📊 Overall Attendance (FSH)</h2>
                        <span className={styles.overallPct} style={{ color: overallPercentage >= 75 ? '#22c55e' : '#ef4444' }}>
                            {overallPercentage}%
                        </span>
                    </div>
                    <div className={styles.overallStats}>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Total Hours</span>
                            <span className={styles.statValue}>{totalHours}</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Attended</span>
                            <span className={styles.statValue}>{attendedHours}</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Required (75%)</span>
                            <span className={styles.statValue}>{requiredHours}</span>
                        </div>
                    </div>
                    <div className={styles.overallAdvice}>
                        {overallPercentage >= 75 ? (
                            <p style={{ color: '#22c55e', fontSize: '1.1rem', fontWeight: 'bold' }}>
                                ✅ Safe! You can miss <span style={{ color: 'white', fontSize: '1.3rem' }}>{canMissHours}</span> more hours and still maintain 75%.
                            </p>
                        ) : (
                            <p style={{ color: '#ef4444', fontSize: '1.1rem', fontWeight: 'bold' }}>
                                ⚠️ Alert! You need to attend <span style={{ color: 'white', fontSize: '1.3rem' }}>{needToAttendHours}</span> more hours to reach 75%.
                            </p>
                        )}
                    </div>
                    <p style={{ color: '#666', fontSize: '0.8rem', marginTop: '0.5rem', textAlign: 'center' }}>
                        Note: Calculation based on sum of all subject hours ({totalHours} total, {attendedHours} attended)
                    </p>
                </div>
            )}

            <div className={styles.grid}>
                {data.records.map((record, index) => (
                    <SubjectCard key={`${record.subjectCode}-${index}`} record={record} isFSH={department === 'FSH'} />
                ))}
            </div>
        </div>
    );
}

function SubjectCard({ record, isFSH }: { record: AttendanceRecord; isFSH: boolean }) {
    const isDanger = record.percentage < 75;
    const isWarning = record.percentage >= 75 && record.percentage < 80;
    const statusColor = isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e';

    const total = record.totalHours || 0;
    const attended = record.attendedHours || 0;
    const required = Math.ceil(0.75 * total);
    const allowable = attended - required;

    const canMiss = allowable > 0 ? Math.floor(allowable) : 0;
    const needToAttend = allowable < 0 ? Math.abs(Math.ceil(allowable)) : 0;

    return (
        <div className={`glass-panel ${styles.card}`}>
            <div className={styles.cardHeader}>
                <span className={styles.code}>{record.subjectCode}</span>
                <span className={styles.pct} style={{ color: statusColor }}>{record.percentage}%</span>
            </div>
            <h3 className={styles.subjectName}>{record.subjectName}</h3>

            <div className={styles.adviceBox}>
                {isFSH ? (
                    <p className="text-gray-400 text-sm">
                        {total > 0 && attended > 0
                            ? `${attended}/${total} hours`
                            : `${record.percentage}% attendance`}
                    </p>
                ) : (
                    record.percentage >= 75 ? (
                        <p className="text-green-400 text-sm">
                            {canMiss > 0 ? (
                                <>Safe! Can miss <b className="text-white">~{canMiss}</b> classes</>
                            ) : (
                                <>Good! But don't miss any classes yet.</>
                            )}
                        </p>
                    ) : (
                        <p className="text-red-400 text-sm">
                            Alert! Need to attend <b className="text-white">~{needToAttend}</b> classes
                        </p>
                    )
                )}
            </div>
        </div>
    );
}
