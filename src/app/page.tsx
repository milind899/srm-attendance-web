'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowRight, ChevronRight } from 'lucide-react';
import { InteractiveGraph } from '@/components/InteractiveGraph';
import { DecryptText } from '@/components/DecryptText';
import { MatrixBackground } from '@/components/MatrixBackground';

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLoginMenu, setShowLoginMenu] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user has attendance data (is logged in)
    const hasData = localStorage.getItem('attendanceData');
    setIsLoggedIn(!!hasData);
  }, []);

  return (
    <div className="min-h-screen bg-background text-textMain selection:bg-primary/30 selection:text-white animate-scale-in origin-center">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="AttendX" className="w-8 h-8" />
            <span className="font-semibold text-lg tracking-tight text-textMain">AttendX</span>
          </Link>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3 relative">
            {isLoggedIn && (
              <Link
                href="/dashboard"
                className="bg-primary text-white hover:bg-primaryHover text-sm h-9 px-5 inline-flex items-center justify-center rounded-full transition-all font-medium"
              >
                Dashboard
              </Link>
            )}
            <button
              onClick={() => setShowLoginMenu(!showLoginMenu)}
              className="bg-transparent text-textMain border border-border hover:bg-surfaceHighlight hover:border-[#4B4E56] text-sm h-9 px-5 inline-flex items-center justify-center rounded-full transition-all"
            >
              Log in
            </button>

            {showLoginMenu && (
              <div className="absolute top-12 right-0 bg-surface border border-border rounded-lg shadow-xl overflow-hidden min-w-[160px] animate-fade-in-up">
                <Link
                  href="/login?dept=ENT"
                  className="block px-4 py-3 text-sm text-textMuted hover:text-white hover:bg-surfaceHighlight transition-colors border-b border-border"
                  onClick={() => setShowLoginMenu(false)}
                >
                  ENT Portal
                </Link>
                <Link
                  href="/login?dept=FSH"
                  className="block px-4 py-3 text-sm text-textMuted hover:text-white hover:bg-surfaceHighlight transition-colors"
                  onClick={() => setShowLoginMenu(false)}
                >
                  FSH Portal
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-textMuted hover:text-textMain"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-surface border-b border-border p-4 flex flex-col gap-2 animate-fade-in-up">
            {isLoggedIn && (
              <Link
                href="/dashboard"
                className="text-sm text-accent-yellow font-medium py-3 px-4 rounded-lg bg-primary/20 border border-primary/30 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                → Dashboard
              </Link>
            )}
            <Link
              href="/login?dept=ENT"
              className="text-sm text-textMuted hover:text-textMain py-3 px-4 rounded-lg hover:bg-surfaceHighlight transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              ENT Portal
            </Link>
            <Link
              href="/login?dept=FSH"
              className="text-sm text-textMuted hover:text-textMain py-3 px-4 rounded-lg hover:bg-surfaceHighlight transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              FSH Portal
            </Link>
            <div className="h-px bg-border my-2"></div>
            <Link
              href="/privacy"
              className="text-xs text-textMuted hover:text-textMain py-2 px-4"
              onClick={() => setIsMenuOpen(false)}
            >
              Privacy Policy
            </Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <main>
        <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-8 px-4 sm:px-6 overflow-hidden">

          {/* Background Glow Effects */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-glow-gradient opacity-50 pointer-events-none" />
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

          {/* Content */}
          <div className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center">

            {/* Announcement Badge */}
            <div className="opacity-0 animate-blur-in">
              <a href="#" className="mb-8 inline-flex items-center gap-1 rounded-full border border-border bg-surface/50 px-3 py-1 text-xs text-textMuted transition-colors hover:border-[#4B4E56] hover:text-textMain backdrop-blur-sm">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                  <DecryptText text="AttendX 1.0 is now live" speed={40} delay={500} />
                </span>
                <ChevronRight size={12} />
              </a>
            </div>

            {/* Headline */}
            <h1 className="opacity-0 animate-blur-in delay-100 text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-[#EEEEF0] via-[#EEEEF0] to-[#EEEEF0]/60 mb-6 sm:mb-8 leading-[1.1] px-2">
              The new standard for <br className="hidden sm:block" />
              attendance tracking.
            </h1>

            {/* Subheadline */}
            <p className="opacity-0 animate-blur-in delay-200 text-base sm:text-lg md:text-xl text-textMuted max-w-2xl mb-8 sm:mb-12 leading-relaxed tracking-tight px-2">
              Track your SRM attendance in real-time. Calculate margins,
              predict grades, and never miss a crucial class again.
            </p>

            {/* CTA Buttons */}
            <div className="opacity-0 animate-blur-in delay-300 flex flex-col items-center gap-4 w-full sm:w-auto">
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Link
                  href="/login?dept=FSH"
                  className="w-full sm:w-auto h-14 px-8 text-base bg-[#EEEEF0] text-black hover:bg-white border border-transparent shadow-[0_0_20px_rgba(255,255,255,0.1)] inline-flex items-center justify-center rounded-full font-semibold transition-all"
                >
                  FSH Portal
                  <ArrowRight size={18} className="ml-2" />
                </Link>
                <Link
                  href="/login?dept=ENT"
                  className="w-full sm:w-auto h-14 px-8 text-base bg-transparent text-textMain border border-border hover:bg-surfaceHighlight hover:border-[#4B4E56] inline-flex items-center justify-center rounded-full font-semibold transition-all"
                >
                  ENT Portal
                  <ArrowRight size={18} className="ml-2" />
                </Link>
              </div>
              <p className="text-sm text-textMuted">Uses your SRM portal credentials</p>
            </div>

            {/* Hero Image / Product Shot - Interactive Graph */}
            <div className="opacity-0 animate-blur-in delay-500 mt-10 sm:mt-16 lg:mt-20 relative w-full max-w-6xl rounded-lg border border-border/40 bg-surfaceHighlight/30 p-1 sm:p-2 shadow-2xl backdrop-blur-sm transform-gpu">
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none"></div>

              {/* Interactive Graph Component */}
              <InteractiveGraph />

              {/* Floating elements to simulate depth */}
              <div className="absolute -right-8 top-12 hidden lg:block p-4 bg-[#1C1D21] border border-[#2E2F33] rounded-lg shadow-2xl max-w-xs animate-pulse-slow z-20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                  <span className="text-xs text-textMuted font-medium">Attendance Safe</span>
                </div>
                <div className="h-2 w-32 bg-border/80 rounded mb-1"></div>
                <div className="h-2 w-20 bg-border/50 rounded"></div>
              </div>
            </div>

          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 sm:py-16 lg:py-20 border-t border-border/30">
          {/* Small Matrix Effect Card */}
          <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-8">
            <div className="relative h-24 sm:h-32 rounded-xl border border-border/50 overflow-hidden bg-[#0B0C0E]">
              <MatrixBackground className="opacity-40" />
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="flex items-center gap-3 bg-surface/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-sm font-medium text-textMuted">🔒 Your data stays local • No passwords stored</span>
                </div>
              </div>
            </div>
          </div>
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 text-center">
              <div className="p-4 sm:p-6">
                <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Real-time Tracking</h3>
                <p className="text-sm text-textMuted">See your attendance percentage update instantly after each class.</p>
              </div>
              <div className="p-6">
                <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Margin Calculator</h3>
                <p className="text-sm text-textMuted">Know exactly how many classes you can miss or need to attend.</p>
              </div>
              <div className="p-6">
                <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Grade Predictor</h3>
                <p className="text-sm text-textMuted">Predict your final grades based on current performance.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-16 sm:py-24 lg:py-32 px-4 sm:px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/5 pointer-events-none"></div>
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 tracking-tight px-2">
              Ready to track smarter?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-textMuted mb-8 sm:mb-10 max-w-xl mx-auto px-4">
              Stop worrying about attendance. Start tracking it.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/login?dept=FSH"
                className="bg-[#EEEEF0] text-black px-8 py-4 rounded-full font-semibold hover:bg-white transition-colors"
              >
                FSH Portal →
              </Link>
              <Link
                href="/login?dept=ENT"
                className="bg-transparent text-[#EEEEF0] border border-[#2E2F33] px-8 py-4 rounded-full font-semibold hover:bg-[#1C1D21] transition-colors"
              >
                ENT Portal →
              </Link>
            </div>
            <p className="text-sm text-textMuted mt-4">Login with your SRM credentials</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 py-16 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="AttendX" className="w-6 h-6" />
            <span className="font-semibold text-textMain">AttendX</span>
            <span className="text-textMuted text-sm ml-2">• Smart attendance tracking</span>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="https://github.com/milind899"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-textMuted hover:text-textMain transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
              GitHub
            </a>
            <a
              href="https://www.linkedin.com/in/milind899/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-textMuted hover:text-textMain transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
              LinkedIn
            </a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-border/30 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-textMuted">
          <span>🔒 No passwords stored • Data stays in your browser</span>
          <span className="hidden sm:inline">•</span>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <span className="hidden sm:inline">•</span>
          <a href="https://milind899.github.io/portfolio/#" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Built by Milind</a>
          <span className="hidden sm:inline">•</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
