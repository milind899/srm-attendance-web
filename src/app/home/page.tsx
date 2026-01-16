'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, ArrowRight, ChevronRight, User, Lock, AlertCircle } from 'lucide-react';
import { InteractiveGraph } from '@/components/InteractiveGraph';
import { DecryptText } from '@/components/DecryptText';
import { MatrixBackground } from '@/components/MatrixBackground';
import MagneticButton from '@/components/ui/MagneticButton';
import { InstallPWA } from '@/components/InstallPWA';

import Image from 'next/image';

export default function Home() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLoginMenu, setShowLoginMenu] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user has attendance data (is logged in)
    const hasData = localStorage.getItem('attendanceData');
    setIsLoggedIn(!!hasData);

    // Auto-redirect to dashboard if logged in
    if (hasData) {
      router.replace('/dashboard');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-background text-textMain selection:bg-primary/30 selection:text-white animate-scale-in origin-center">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 relative z-50">
            <Image
              src="/logo.png"
              alt="AttendX"
              width={40}
              height={40}
              className="rounded-xl shadow-lg shadow-indigo-500/20"
            />
            <span className="font-bold text-xl tracking-tight text-white/90">AttendX</span>
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
            <InstallPWA />

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
            <div className="px-4 py-2">
              <InstallPWA />
            </div>
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

          {/* 
             FIGMA-STYLE MAGIC LIGHT BEAM - REFINED & MOBILE OPTIMIZED
             Shoots UPWARDS from the product card. Responsive sizing for mobile.
          */}
          <div className="absolute top-[15%] sm:top-[10%] left-1/2 -translate-x-1/2 w-full h-[95vh] sm:h-[1200px] flex justify-center pointer-events-none z-0">

            {/* 1. Base / Splash Glow - Positioned lower (behind product card area) */}
            <div className="absolute top-[40%] sm:top-[50%] w-[90vw] sm:w-[600px] h-[50vw] sm:h-[400px] bg-primary/30 blur-[60px] sm:blur-[100px] rounded-full mix-blend-screen opacity-50" />

            {/* 2. Outer Beam Haze - Shooting UP */}
            <div className="absolute top-0 w-[60vw] sm:w-[300px] h-[60%] bg-gradient-to-t from-primary/20 via-primary/5 to-transparent blur-[40px] sm:blur-[60px] mix-blend-screen" />

            {/* 3. Medium Beam - The "Body" */}
            <div className="absolute top-0 w-[20vw] sm:w-[80px] h-[60%] bg-gradient-to-t from-primary/50 via-indigo-400/30 to-transparent blur-[20px] sm:blur-[30px] mix-blend-screen animate-pulse-slow opacity-20 sm:opacity-30" />

            {/* 4. Core Beam - The "Hot" Center (Fading as it goes up) */}
            <div className="absolute top-0 w-[1.5vw] sm:w-[6px] h-[60%] bg-gradient-to-t from-white via-indigo-200 to-transparent blur-[3px] sm:blur-[4px] mix-blend-screen opacity-10 sm:opacity-25" />
            <div className="absolute top-0 w-[0.5vw] sm:w-[2px] h-[60%] bg-gradient-to-t from-white via-white/80 to-transparent blur-[1px] mix-blend-screen opacity-20 sm:opacity-30" />

            {/* 5. Particles - Rising from the source */}
            <div className="absolute top-[40%] w-1 h-1 bg-white rounded-full blur-[1px] animate-particle-rise opacity-70" style={{ left: 'calc(50% - 40px)', animationDuration: '4s' }} />
            <div className="absolute top-[50%] w-1.5 h-1.5 bg-indigo-300 rounded-full blur-[1px] animate-particle-rise opacity-50" style={{ left: 'calc(50% + 30px)', animationDuration: '6s', animationDelay: '1s' }} />
            <div className="absolute top-[45%] w-1 h-1 bg-primary/50 rounded-full blur-[0px] animate-particle-rise opacity-60" style={{ left: 'calc(50% - 15px)', animationDuration: '5s', animationDelay: '2s' }} />

          </div>

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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
                <Link
                  href={isLoggedIn ? '/dashboard' : '/login?dept=FSH'}
                  className="whitespace-nowrap w-full h-14 px-8 text-base bg-[#EEEEF0] text-black hover:bg-white border border-transparent shadow-[0_0_20px_rgba(255,255,255,0.1)] inline-flex items-center justify-center rounded-full font-semibold transition-all justify-self-end"
                >
                  FSH Portal
                  <ArrowRight size={18} className="ml-2" />
                </Link>
                <Link
                  href={isLoggedIn ? '/dashboard' : '/login?dept=ENT'}
                  className="whitespace-nowrap relative w-full h-14 px-6 sm:px-8 text-base bg-transparent text-textMain border border-border hover:bg-surfaceHighlight hover:border-[#4B4E56] inline-flex items-center justify-center rounded-full font-semibold transition-all justify-self-start"
                >
                  ENT Portal
                  <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-500/30">
                    SOON
                  </span>
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

        {/* Features Section - Holographic Bento Grid */}
        <section className="py-20 sm:py-24 relative z-10 px-4 sm:px-6">

          <div className="max-w-6xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 mb-4">
                Everything you need.
              </h2>
              <p className="text-textMuted max-w-xl mx-auto">
                No more spreadsheets. No more guessing. AttendX handles the math so you can focus on learning.
              </p>
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 auto-rows-[minmax(200px,auto)]">

              {/* Card 1: Real-time Tracking (Large - Span 2 cols on Desktop) */}
              <div className="md:col-span-2 group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl transition-all hover:border-primary/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)]">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6 h-full">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/5 border border-green-500/20 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Real-time Analysis</h3>
                    <p className="text-textMuted leading-relaxed">
                      Your attendance data is parsed instantly. Visual graphs show you exactly where you stand in every subject with 100% accuracy.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 2: Margin Calculator (Tall - Span 1 col, 2 rows) */}
              <div className="md:row-span-2 group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl transition-all hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] flex flex-col justify-between">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative z-10">
                  <div className="w-12 h-12 mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/5 border border-blue-500/20 flex items-center justify-center group-hover:rotate-6 transition-transform duration-300">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Bunk Manager</h3>
                  <p className="text-textMuted text-sm leading-relaxed mb-4">
                    Know the exact number of classes you can skip while maintaining 75%. We do the math so you don't have to.
                  </p>
                </div>

                {/* Visual indicator for calculator */}
                <div className="relative z-10 mt-4 bg-background/50 rounded-lg p-3 border border-white/5">
                  <div className="flex justify-between text-xs text-textMuted mb-1">
                    <span>Current</span>
                    <span className="text-green-400">78%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="w-[78%] h-full bg-green-500 rounded-full" />
                  </div>
                  <div className="mt-2 text-[10px] text-right text-textMuted">
                    Safe to bunk: <span className="text-white">2 classes</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Grade Predictor (Standard) */}
              <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl transition-all hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="w-12 h-12 mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-fuchsia-500/5 border border-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Grade Predictor</h3>
                  <p className="text-textMuted text-sm">
                    Forecast your internal marks based on current attendance trends.
                  </p>
                </div>
              </div>

              {/* Card 4: Privacy (Standard - Span 1 col) */}
              <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl transition-all hover:border-orange-500/50 hover:shadow-[0_0_30px_rgba(249,115,22,0.15)]">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="w-12 h-12 mb-4 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/5 border border-orange-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Privacy First</h3>
                  <p className="text-textMuted text-sm">
                    Zero data collection. Your credentials never leave your device.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>


      </main>

      {/* 
        MAGNETIC MEGA FOOTER 
        Mobile First: Vertical stack with large touch targets.
        Desktop: Massive typography with magnetic hover effects.
      */}
      <footer className="relative border-t border-white/5 pt-20 pb-10 overflow-hidden">

        {/* Ambient Footer Glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/10 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-12 mb-20">

            {/* Brand / Main CTA */}
            <div className="max-w-2xl">
              <h2 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 mb-6 drop-shadow-lg">
                READY TO <br />
                GET SMART?
              </h2>
              <div className="flex flex-col sm:flex-row gap-4">
                <MagneticButton>
                  <Link
                    href="/login?dept=FSH"
                    className="h-14 px-8 bg-white text-black hover:bg-[#EEEEF0] rounded-full font-bold text-lg flex items-center justify-center gap-2"
                  >
                    Get Started
                    <ArrowRight size={20} />
                  </Link>
                </MagneticButton>

                <MagneticButton>
                  <a
                    href="https://github.com/milind899/srm-attendance-web"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-14 px-8 border border-white/20 hover:border-white text-white rounded-full font-bold text-lg flex items-center justify-center gap-2 hover:bg-white/5"
                  >
                    View Source
                  </a>
                </MagneticButton>
              </div>
            </div>

            {/* Mega Links - Vertical on Mobile, Grid on Desktop */}
            <div className="flex flex-col sm:flex-row gap-12 sm:gap-24">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-textMuted uppercase tracking-wider">Platform</h3>
                <ul className="space-y-3">
                  <li><Link href="/login" className="text-lg text-white hover:text-primary transition-colors block">Login</Link></li>
                  <li><Link href="/dashboard" className="text-lg text-white hover:text-primary transition-colors block">Dashboard</Link></li>

                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-textMuted uppercase tracking-wider">Connect</h3>
                <ul className="space-y-3">
                  <li className="block w-fit">
                    <MagneticButton>
                      <a href="https://github.com/milind899" target="_blank" className="text-lg text-white hover:text-primary transition-colors block px-2 py-1">GitHub</a>
                    </MagneticButton>
                  </li>
                  <li className="block w-fit">
                    <MagneticButton>
                      <a href="https://linkedin.com/in/milind899" target="_blank" className="text-lg text-white hover:text-primary transition-colors block px-2 py-1">LinkedIn</a>
                    </MagneticButton>
                  </li>

                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="flex flex-col-reverse md:flex-row justify-between items-center gap-6 pt-8 border-t border-white/5 text-sm text-textMuted">
            <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
              <span>© {new Date().getFullYear()} AttendX.</span>
              <span className="hidden sm:inline">•</span>
              <span>Crafted by Milind.</span>
            </div>

            <div className="flex items-center gap-6">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs font-medium text-white">All Systems Normal</span>
              </div>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}
