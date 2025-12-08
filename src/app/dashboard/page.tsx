'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AttendanceData, AttendanceRecord, InternalMarksData, SubjectMarks } from '@/lib/types';
import styles from './dashboard.module.css';

type Tab = 'attendance' | 'marks' | 'predictor';

export default function Dashboard() {
    const router = useRouter();
    const [data, setData] = useState<AttendanceData | null>(null);
    const [marksData, setMarksData] = useState<InternalMarksData | null>(null);
    const [department, setDepartment] = useState<string>('ENT');
    const [loading, setLoading] = useState(true);
    const [marksLoading, setMarksLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('attendance');
    const [predictDays, setPredictDays] = useState(0);
    const [showProfile, setShowProfile] = useState(false);

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

    useEffect(() => {
        if (activeTab === 'marks' && department === 'FSH' && !marksData && !marksLoading) {
            fetchInternalMarks();
        }
    }, [activeTab, department]);

    const fetchInternalMarks = async () => {
        setMarksLoading(true);
        try {
            const cookies = localStorage.getItem('fshCookies') || '';
            const username = data?.registrationNumber || '';

            const res = await fetch('/api/internalmarks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cookies, username })
            });

            const result = await res.json();
            if (result.success) {
                setMarksData(result.data);
            }
        } catch (e) {
            console.error('Failed to fetch marks:', e);
        } finally {
            setMarksLoading(false);
        }
    };

    if (loading || !data) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p>Loading...</p>
            </div>
        );
    }

    // Calculate overall stats
    const totalHours = data.records.reduce((sum, r) => sum + (r.totalHours || 0), 0);
    const attendedHours = data.records.reduce((sum, r) => sum + (r.attendedHours || 0), 0);
    const overallPercentage = totalHours > 0 ? Math.round((attendedHours / totalHours) * 100 * 100) / 100 : 0;

    const buffer = attendedHours - (0.75 * totalHours);
    const canMissHours = buffer >= 0 ? Math.floor(buffer) : 0;
    const needToAttendHours = buffer < 0 ? Math.ceil(Math.abs(buffer) / 0.25) : 0;

    const predictorMaxMiss = Math.floor(buffer + 0.25 * predictDays);

    return (
        <div className={styles.layout}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.logo}>
                    <svg className={styles.logoIcon} viewBox="0 0 24 24" fill="none">
                        <rect x="2" y="4" width="6" height="16" rx="1" fill="#10b981" />
                        <rect x="9" y="8" width="6" height="12" rx="1" fill="#22d3ee" />
                        <rect x="16" y="2" width="6" height="18" rx="1" fill="#f472b6" />
                    </svg>
                    <span className={styles.logoText}>Attend</span>
                </div>

                <nav className={styles.nav}>
                    <button
                        className={`${styles.navItem} ${activeTab === 'attendance' ? styles.navActive : ''}`}
                        onClick={() => setActiveTab('attendance')}
                    >
                        <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="3" width="7" height="7" rx="1.5" fill="#22d3ee" />
                            <rect x="3" y="14" width="7" height="7" rx="1.5" fill="#22d3ee" opacity="0.5" />
                            <rect x="14" y="3" width="7" height="7" rx="1.5" fill="#22d3ee" opacity="0.5" />
                            <rect x="14" y="14" width="7" height="7" rx="1.5" fill="#22d3ee" opacity="0.3" />
                        </svg>
                        <span>Attendance</span>
                    </button>
                    {department === 'FSH' && (
                        <>
                            <button
                                className={`${styles.navItem} ${activeTab === 'marks' ? styles.navActive : ''}`}
                                onClick={() => setActiveTab('marks')}
                            >
                                <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none">
                                    <rect x="4" y="4" width="16" height="16" rx="2" fill="#f472b6" opacity="0.2" />
                                    <path d="M7 9h10M7 13h6M7 17h8" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                <span>Marks</span>
                            </button>
                            <button
                                className={`${styles.navItem} ${activeTab === 'predictor' ? styles.navActive : ''}`}
                                onClick={() => setActiveTab('predictor')}
                            >
                                <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="9" fill="#a855f7" opacity="0.2" />
                                    <circle cx="12" cy="12" r="5" fill="#a855f7" opacity="0.5" />
                                    <circle cx="12" cy="12" r="2" fill="#a855f7" />
                                </svg>
                                <span>Predictor</span>
                            </button>
                        </>
                    )}
                </nav>

                <div className={styles.userSection} onClick={() => setShowProfile(true)} style={{ cursor: 'pointer' }}>
                    <div className={styles.userAvatar}>
                        {data.studentName?.charAt(0) || 'U'}
                    </div>
                    <div className={styles.userInfo}>
                        <span className={styles.userName}>{data.studentName}</span>
                        <span className={styles.userReg}>{data.registrationNumber}</span>
                    </div>
                </div>
            </aside>

            {/* Profile Modal */}
            {showProfile && (
                <div className={styles.modalOverlay} onClick={() => setShowProfile(false)}>
                    <div className={styles.profileModal} onClick={(e) => e.stopPropagation()}>
                        <button className={styles.modalClose} onClick={() => setShowProfile(false)}>✕</button>

                        <h2 className={styles.profileName}>{data.studentName}</h2>
                        <p className={styles.profileReg}>{data.registrationNumber}</p>

                        <div className={styles.profileGrid}>
                            <div className={styles.profileItem}>
                                <span className={styles.profileLabel}>Year:</span>
                                <span className={styles.profileValue}>3</span>
                            </div>
                            <div className={styles.profileItem}>
                                <span className={styles.profileLabel}>Semester:</span>
                                <span className={styles.profileValue}>5</span>
                            </div>
                            <div className={styles.profileItem}>
                                <span className={styles.profileLabel}>Section:</span>
                                <span className={styles.profileValue}>A1</span>
                            </div>
                            <div className={styles.profileItem}>
                                <span className={styles.profileLabel}>Batch:</span>
                                <span className={styles.profileValue}>1</span>
                            </div>
                        </div>

                        <div className={styles.profileSection}>
                            <span className={styles.profileLabel}>Program:</span>
                            <span className={styles.profileValue}>B.Tech</span>
                        </div>
                        <div className={styles.profileSection}>
                            <span className={styles.profileLabel}>Department:</span>
                            <span className={styles.profileValue}>{department === 'FSH' ? 'Computer Science and Engineering (CS)' : 'Engineering & Technology'}</span>
                        </div>

                        <button
                            className={styles.logoutBtn}
                            onClick={() => { localStorage.clear(); router.push('/'); }}
                        >
                            Logout
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className={styles.main}>
                {/* === ATTENDANCE TAB === */}
                {activeTab === 'attendance' && (
                    <div className={styles.content}>
                        <header className={styles.pageHeader}>
                            <h1>Attendance</h1>
                            {department === 'FSH' && (
                                <div className={styles.overallBadge} style={{
                                    background: overallPercentage >= 75 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                    color: overallPercentage >= 75 ? '#22c55e' : '#ef4444'
                                }}>
                                    <span className={styles.overallPct}>{overallPercentage}%</span>
                                    <span className={styles.overallLabel}>Overall</span>
                                </div>
                            )}
                        </header>

                        {/* Stats Row */}
                        {department === 'FSH' && (
                            <div className={styles.statsRow}>
                                <div className={styles.statCard}>
                                    <span className={styles.statNum}>{totalHours}</span>
                                    <span className={styles.statLabel}>Total</span>
                                </div>
                                <div className={styles.statCard}>
                                    <span className={styles.statNum}>{attendedHours}</span>
                                    <span className={styles.statLabel}>Present</span>
                                </div>
                                <div className={styles.statCard}>
                                    <span className={styles.statNum} style={{ color: overallPercentage >= 75 ? '#22c55e' : '#ef4444' }}>
                                        {overallPercentage >= 75 ? `+${canMissHours}` : `-${needToAttendHours}`}
                                    </span>
                                    <span className={styles.statLabel}>{overallPercentage >= 75 ? 'Can Miss' : 'Need'}</span>
                                </div>
                            </div>
                        )}

                        {/* Attendance List */}
                        <div className={styles.attendanceList}>
                            <div className={styles.listHeader}>
                                <span>Subject</span>
                                <span>Margin</span>
                                <span>Hours</span>
                                <span>%</span>
                            </div>
                            {data.records.map((record, index) => (
                                <AttendanceRow key={`${record.subjectCode}-${index}`} record={record} />
                            ))}
                        </div>
                    </div>
                )}

                {/* === MARKS TAB === */}
                {activeTab === 'marks' && (
                    <div className={styles.content}>
                        <header className={styles.pageHeader}>
                            <h1>Internal Marks</h1>
                        </header>

                        {marksLoading ? (
                            <div className={styles.loadingContainer}><div className={styles.spinner}></div></div>
                        ) : marksData ? (
                            <div className={styles.marksGrid}>
                                {marksData.subjects.map((subject, index) => (
                                    <MarksCard key={`${subject.subjectCode}-${index}`} subject={subject} />
                                ))}
                            </div>
                        ) : (
                            <div className={styles.emptyState}>
                                <p>Could not load marks. Try logging in again.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* === PREDICTOR TAB === */}
                {activeTab === 'predictor' && (
                    <div className={styles.content}>
                        <header className={styles.pageHeader}>
                            <h1>Attendance Predictor</h1>
                        </header>

                        <div className={styles.predictorBox}>
                            <p className={styles.predictorLabel}>If next classes conducted:</p>
                            <div className={styles.predictorInputRow}>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={predictDays}
                                    onChange={(e) => setPredictDays(Math.max(0, parseInt(e.target.value) || 0))}
                                    className={styles.predictorInput}
                                />
                                <span>hours</span>
                            </div>

                            <div className={styles.predictorResult}>
                                <div className={styles.predictorCalc}>
                                    <span>Buffer: {Math.floor(buffer)}</span>
                                    <span>+ Bonus: {Math.floor(0.25 * predictDays)}</span>
                                </div>
                                <div className={styles.predictorAnswer}>
                                    <span className={styles.predictorBig}>{predictorMaxMiss}</span>
                                    <span>classes can be missed</span>
                                </div>
                            </div>

                            <p className={styles.predictorFormula}>
                                Formula: A ≤ {Math.floor(buffer)} + (0.25 × {predictDays}) = {predictorMaxMiss}
                            </p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

// Attendance Row Component
function AttendanceRow({ record }: { record: AttendanceRecord }) {
    const total = record.totalHours || 0;
    const attended = record.attendedHours || 0;
    const buffer = attended - (0.75 * total);
    const margin = buffer >= 0 ? Math.floor(buffer) : Math.ceil(buffer);
    const isGood = record.percentage >= 75;

    return (
        <div className={styles.attendanceRow}>
            <div className={styles.rowSubject}>
                <span className={styles.rowCode}>{record.subjectCode}</span>
                <span className={styles.rowName}>{record.subjectName}</span>
            </div>
            <div className={styles.rowMargin} style={{ color: isGood ? '#22c55e' : '#ef4444' }}>
                {margin >= 0 ? `+${margin}` : margin}
            </div>
            <div className={styles.rowHours}>
                <span className={styles.hoursPresent}>{attended}</span>
                <span className={styles.hoursDivider}>/</span>
                <span className={styles.hoursTotal}>{total}</span>
            </div>
            <div className={styles.rowPct} style={{ color: isGood ? '#22c55e' : record.percentage >= 70 ? '#f59e0b' : '#ef4444' }}>
                {record.percentage}%
            </div>
        </div>
    );
}

// Marks Card Component
function MarksCard({ subject }: { subject: SubjectMarks }) {
    const percentage = subject.maxTotalMarks > 0
        ? Math.round((subject.totalMarks / subject.maxTotalMarks) * 100)
        : 0;

    return (
        <div className={styles.marksCard}>
            <div className={styles.marksHeader}>
                <span className={styles.marksSubject}>{subject.subjectName}</span>
                <span className={styles.marksCode}>{subject.subjectCode}</span>
            </div>
            <div className={styles.marksScore}>
                <span className={styles.marksObtained}>{subject.totalMarks}</span>
                <span className={styles.marksMax}>/ {subject.maxTotalMarks}</span>
            </div>
            <div className={styles.marksBar}>
                <div className={styles.marksBarFill} style={{
                    width: `${percentage}%`,
                    background: percentage >= 80 ? '#22c55e' : percentage >= 60 ? '#f59e0b' : '#ef4444'
                }}></div>
            </div>
            <div className={styles.marksPercent}>{percentage}%</div>
        </div>
    );
}
