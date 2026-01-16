import React from 'react';

export function DashboardSkeleton() {
    return (
        <div className="min-h-screen bg-background text-textMain font-sans overflow-hidden">
            {/* Navbar Skeleton */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-white/10 h-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 animate-pulse"></div>
                        <div className="w-24 h-6 rounded bg-white/10 animate-pulse hidden sm:block"></div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse"></div>
                        <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse"></div>
                        <div className="w-32 h-9 rounded-full bg-white/10 animate-pulse hidden sm:block"></div>
                        <div className="w-9 h-9 rounded-full bg-white/10 animate-pulse"></div>
                    </div>
                </div>
            </nav>

            <main className="pt-24 md:pt-32 px-4 sm:px-6 pb-10 max-w-6xl mx-auto">
                {/* Hero / Stats Skeleton */}
                <div className="mb-8 w-full h-40 sm:h-48 rounded-3xl bg-white/5 border border-white/10 animate-pulse relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                </div>

                {/* Grid Skeleton */}
                <div className="mb-6 flex gap-2">
                    <div className="w-32 h-4 rounded bg-white/10 animate-pulse"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-40 rounded-2xl bg-white/5 border border-white/10 animate-pulse relative overflow-hidden">
                            {/* Inner details */}
                            <div className="p-5 flex flex-col gap-3">
                                <div className="w-12 h-6 rounded-full bg-white/10"></div>
                                <div className="w-3/4 h-6 rounded bg-white/10"></div>
                                <div className="w-1/2 h-4 rounded bg-white/5"></div>
                                <div className="mt-4 w-full h-2 rounded-full bg-white/5"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
