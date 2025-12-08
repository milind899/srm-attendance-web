import Link from 'next/link';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-background text-textMain py-20 px-6">
            <div className="max-w-3xl mx-auto">
                <Link href="/" className="inline-flex items-center gap-2 text-sm text-textMuted hover:text-white mb-8 transition-colors">
                    ← Back to home
                </Link>

                <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

                <div className="space-y-8 text-textMuted">
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">🔒 Your Data is Safe</h2>
                        <p className="leading-relaxed">
                            AttendX does <span className="text-green-400 font-medium">NOT store any passwords</span>.
                            Your credentials are used only to authenticate with the official SRM portals and are
                            never saved, logged, or transmitted to any third-party servers.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">📊 What We Store</h2>
                        <ul className="list-disc list-inside space-y-2">
                            <li>Attendance records (stored locally in your browser)</li>
                            <li>No personal identification data</li>
                            <li>No cookies for tracking</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">🔐 How It Works</h2>
                        <p className="leading-relaxed">
                            When you log in, your credentials are sent directly to the official SRM Academia or FSH portal.
                            We act as a secure middleman to fetch your attendance data. Once fetched, the data is stored
                            only in your browser's local storage - it never touches our servers.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">🗑️ Data Deletion</h2>
                        <p className="leading-relaxed">
                            All your data is stored locally in your browser. To delete it, simply clear your browser's
                            local storage or click "Logout" in the dashboard. We have no access to delete your data
                            because we never had it in the first place.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">📬 Contact</h2>
                        <p className="leading-relaxed">
                            Questions about privacy? Reach out via{' '}
                            <a href="https://github.com/milind899" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                GitHub
                            </a>{' '}
                            or{' '}
                            <a href="https://www.linkedin.com/in/milind899/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                LinkedIn
                            </a>.
                        </p>
                    </section>
                </div>

                <div className="mt-16 pt-8 border-t border-border text-center text-sm text-textMuted">
                    <a href="https://milind899.github.io/portfolio/#" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Built by Milind</a> • © {new Date().getFullYear()}
                </div>
            </div>
        </div>
    );
}
