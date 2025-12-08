'use client';

import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.main}>
      {/* Background Gradients */}
      <div className={`${styles.blob} ${styles.blobPurple}`} />
      <div className={`${styles.blob} ${styles.blobBlue}`} />

      <div className={styles.hero}>
        <h1 className={styles.title}>
          <span className="gradient-text">SRM Attendance</span>
        </h1>
        <p className={styles.subtitle}>
          Track your attendance with precision. Select your department to continue.
        </p>
      </div>

      <div className={styles.grid}>
        <DepartmentCard
          title="ENT Department"
          desc="Engineering & Tech (Academia)"
          href="/login?dept=ENT"
          glowClass={styles.entGlow}
        />
        <DepartmentCard
          title="FSH Department"
          desc="Science & Humanities (Student Portal)"
          href="/login?dept=FSH"
          glowClass={styles.fshGlow}
        />
      </div>
    </main>
  );
}

function DepartmentCard({ title, desc, href, glowClass }: { title: string, desc: string, href: string, glowClass: string }) {
  return (
    <Link href={href} className={styles.cardLink}>
      <div className={`${styles.cardGlow} ${glowClass}`} />
      <div className={`glass-panel ${styles.cardContent}`}>
        <h2 className={styles.cardTitle}>{title}</h2>
        <p className={styles.cardDesc}>{desc}</p>
        <div className={styles.cardAction}>
          Proceed <span style={{ marginLeft: '0.5rem' }}>→</span>
        </div>
      </div>
    </Link>
  );
}
