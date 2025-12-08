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

    // Predictor state
    const [predictDays, setPredictDays] = useState(0);

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

    // Fetch internal marks when tab changes to marks
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
                <div className="text-xl text-gray-400">Loading Dashboard...</div>
            </div>
        );
    }

    // Calculate overall stats
    const totalHours = data.records.reduce((sum, r) => sum + (r.totalHours || 0), 0);
    const attendedHours = data.records.reduce((sum, r) => sum + (r.attendedHours || 0), 0);
    const overallPercentage = totalHours > 0 ? Math.round((attendedHours / totalHours) * 100 * 100) / 100 : 0;

    // Correct formula: (attended + (T - A)) / (total + T) >= 0.75
    // Solving: A <= (attended - 0.75*total) + 0.25*T
    // For current buffer (T=0): buffer = attended - 0.75*total
    const buffer = attendedHours - (0.75 * totalHours);
    const canMissHours = buffer >= 0 ? Math.floor(buffer) : 0;
    const needToAttendHours = buffer < 0 ? Math.ceil(Math.abs(buffer) / 0.25) : 0;
    const requiredHours = Math.ceil(0.75 * totalHours);

    // Predictor: If T more classes conducted and you miss A of them
    // Max missable = floor(buffer + 0.25*T)
    const predictorMaxMiss = Math.floor(buffer + 0.25 * predictDays);
    const predictedTotal = totalHours + predictDays;
    const predictedAttended = attendedHours + predictDays; // Attending all future
    const predictedPercentage = predictedTotal > 0 ? Math.round((predictedAttended / predictedTotal) * 100 * 100) / 100 : 0;

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

            {/* Tab Navigation (FSH only) */}
            {department === 'FSH' && (
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'attendance' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('attendance')}
                    >
                        📊 Attendance
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'marks' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('marks')}
                    >
                        📝 Internal Marks
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'predictor' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('predictor')}
                    >
                        🔮 Predictor
                    </button>
                </div>
            )}

            {/* === ATTENDANCE TAB === */}
            {activeTab === 'attendance' && (
                <div className={styles.dashboardGrid}>
                    {/* FSH Overall Card - Sidebar on desktop */}
                    {department === 'FSH' && (
                        <div className={styles.overallCard}>
                            <div className={styles.overallHeader}>
                                <h2>📊 Overall</h2>
                                <span className={styles.overallPct} style={{ color: overallPercentage >= 75 ? '#22c55e' : '#ef4444' }}>
                                    {overallPercentage}%
                                </span>
                            </div>

                            <div className={styles.progressContainer}>
                                <div
                                    className={styles.progressBar}
                                    style={{
                                        width: `${Math.min(100, overallPercentage)}%`,
                                        background: overallPercentage >= 85 ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                                            : overallPercentage >= 75 ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                                                : 'linear-gradient(90deg, #ef4444, #dc2626)'
                                    }}
                                />
                            </div>

                            <div className={styles.overallStats}>
                                <div className={styles.statItem}>
                                    <span className={styles.statLabel}>Total</span>
                                    <span className={styles.statValue}>{totalHours}</span>
                                </div>
                                <div className={styles.statItem}>
                                    <span className={styles.statLabel}>Present</span>
                                    <span className={styles.statValue}>{attendedHours}</span>
                                </div>
                                <div className={styles.statItem}>
                                    <span className={styles.statLabel}>Need</span>
                                    <span className={styles.statValue}>{requiredHours}</span>
                                </div>
                            </div>

                            <div className={styles.overallAdvice}>
                                {overallPercentage >= 75 ? (
                                    <p style={{ color: '#22c55e' }}>
                                        ✅ Can miss <b>{canMissHours}</b> more
                                    </p>
                                ) : (
                                    <p style={{ color: '#ef4444' }}>
                                        ⚠️ Attend <b>{needToAttendHours}</b> more
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Subject Cards Grid */}
                    <div className={styles.grid}>
                        {data.records.map((record, index) => (
                            <SubjectCard key={`${record.subjectCode}-${index}`} record={record} showProgressBar={department === 'FSH'} />
                        ))}
                    </div>
                </div>
            )}

            {/* === INTERNAL MARKS TAB === */}
            {activeTab === 'marks' && (
                <div className={styles.marksContainer}>
                    {marksLoading ? (
                        <div className={styles.loadingContainer}>Loading marks...</div>
                    ) : marksData ? (
                        <div className={styles.grid}>
                            {marksData.subjects.map((subject, index) => (
                                <MarksCard key={`${subject.subjectCode}-${index}`} subject={subject} />
                            ))}
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <p>Could not load internal marks. Please try logging in again.</p>
                        </div>
                    )}
                </div>
            )}

            {/* === PREDICTOR TAB === */}
            {activeTab === 'predictor' && (
                <div className={styles.predictorContainer}>
                    <div className={styles.predictorCard}>
                        <h2>🔮 Attendance Predictor</h2>
                        <p className={styles.predictorDesc}>Calculate how many classes you can safely miss</p>

                        <div className={styles.predictorInput}>
                            <label>Upcoming classes:</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={predictDays}
                                onChange={(e) => setPredictDays(Math.max(0, parseInt(e.target.value) || 0))}
                                className={styles.inputField}
                            />
                            <span>hours</span>
                        </div>

                        <div className={styles.predictorResult}>
                            <div className={styles.predictorCurrent}>
                                <span>Buffer</span>
                                <span className={styles.bigPct} style={{ color: buffer >= 0 ? '#22c55e' : '#ef4444' }}>
                                    {Math.floor(buffer)}
                                </span>
                            </div>
                            <div className={styles.predictorArrow}>+</div>
                            <div className={styles.predictorFuture}>
                                <span>Bonus (0.25×{predictDays})</span>
                                <span className={styles.bigPct} style={{ color: '#22c55e' }}>
                                    {Math.floor(0.25 * predictDays)}
                                </span>
                            </div>
                        </div>

                        <div className={styles.predictorAdvice} style={{ marginTop: '1rem' }}>
                            <p style={{ color: predictorMaxMiss >= 0 ? '#22c55e' : '#ef4444', fontSize: '1.1rem' }}>
                                {predictorMaxMiss >= 0
                                    ? `✅ Can miss ${predictorMaxMiss} out of next ${predictDays} classes`
                                    : `⚠️ Need to attend all ${predictDays} classes`}
                            </p>
                            <p style={{ color: '#666', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                                A ≤ {Math.floor(buffer)} + (0.25 × {predictDays}) = {predictorMaxMiss}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Subject Card with Progress Bar
function SubjectCard({ record, showProgressBar }: { record: AttendanceRecord; showProgressBar: boolean }) {
    const isDanger = record.percentage < 75;
    const isWarning = record.percentage >= 75 && record.percentage < 85;
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

            {/* Progress Bar */}
            {showProgressBar && (
                <div className={styles.progressContainer}>
                    <div
                        className={styles.progressBar}
                        style={{
                            width: `${Math.min(100, record.percentage)}%`,
                            background: record.percentage >= 85 ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                                : record.percentage >= 75 ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                                    : 'linear-gradient(90deg, #ef4444, #dc2626)'
                        }}
                    />
                </div>
            )}

            <div className={styles.adviceBox}>
                {total > 0 ? (
                    <p className="text-gray-400 text-sm">{attended}/{total} hours</p>
                ) : (
                    record.percentage >= 75 ? (
                        <p className="text-green-400 text-sm">
                            {canMiss > 0 ? <>Can miss ~{canMiss} classes</> : <>Don't miss any</>}
                        </p>
                    ) : (
                        <p className="text-red-400 text-sm">Need ~{needToAttend} more classes</p>
                    )
                )}
            </div>
        </div>
    );
}

// Internal Marks Card
function MarksCard({ subject }: { subject: SubjectMarks }) {
    const percentage = subject.maxTotalMarks > 0
        ? Math.round((subject.totalMarks / subject.maxTotalMarks) * 100)
        : 0;
    const statusColor = percentage >= 80 ? '#22c55e' : percentage >= 60 ? '#f59e0b' : '#ef4444';

    return (
        <div className={`glass-panel ${styles.card}`}>
            <div className={styles.cardHeader}>
                <span className={styles.code}>{subject.subjectCode}</span>
                <span className={styles.pct} style={{ color: statusColor }}>
                    {subject.totalMarks}/{subject.maxTotalMarks}
                </span>
            </div>
            <h3 className={styles.subjectName}>{subject.subjectName}</h3>

            {/* Marks Progress Bar */}
            <div className={styles.progressContainer}>
                <div
                    className={styles.progressBar}
                    style={{
                        width: `${Math.min(100, percentage)}%`,
                        background: percentage >= 80 ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                            : percentage >= 60 ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                                : 'linear-gradient(90deg, #ef4444, #dc2626)'
                    }}
                />
            </div>

            <div className={styles.adviceBox}>
                <p className="text-gray-400 text-sm">{percentage}% scored</p>
            </div>
        </div>
    );
}
