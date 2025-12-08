import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { Workflow } from './components/Workflow';
import { Footer } from './components/Footer';
import { Loader } from './components/ui/Loader';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);

  return (
    <>
      {/* Loader overlay - Conditional rendering with exit animation logic handled inside Loader could be complex, 
          so we rely on React Key removal or CSS overlap. 
          Here we keep Loader in DOM until it finishes for smooth transition. */}
      {loading && <Loader onComplete={() => setLoading(false)} />}
      
      {/* Main Content: Hidden until loading is done? Or rendered behind? 
          For "Linear" feel, it usually loads then reveals. 
          We'll render it but invisible, or scale it in. */}
      
      {!loading && (
        <div className="min-h-screen bg-background text-textMain selection:bg-primary/30 selection:text-white animate-scale-in origin-center">
          <Navbar />
          <main>
            <Hero />
            <Features />
            <Workflow />
            
            {/* Simple Customers/Trust Section */}
            <section className="py-20 border-t border-border/30 text-center">
              <p className="text-sm font-medium text-textMuted mb-8 uppercase tracking-widest">Trusted by researchers at</p>
              <div className="flex flex-wrap justify-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                <span className="text-xl font-bold font-serif text-textMain">Harvard</span>
                <span className="text-xl font-bold font-serif text-textMain">MIT</span>
                <span className="text-xl font-bold font-serif text-textMain">Stanford</span>
                <span className="text-xl font-bold font-serif text-textMain">Oxford</span>
                <span className="text-xl font-bold font-serif text-textMain">Berkeley</span>
              </div>
            </section>

            {/* Bottom CTA */}
            <section className="py-32 px-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/5 pointer-events-none"></div>
              <div className="max-w-4xl mx-auto text-center relative z-10">
                <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                  Ready to accelerate your research?
                </h2>
                <p className="text-xl text-textMuted mb-10 max-w-xl mx-auto">
                  Join thousands of high-impact labs using Academia to manage their science.
                </p>
                <div className="flex justify-center gap-4">
                  <button className="bg-[#EEEEF0] text-black px-8 py-3 rounded-full font-medium hover:bg-white transition-colors">
                    Get started for free
                  </button>
                  <button className="bg-transparent text-[#EEEEF0] border border-[#2E2F33] px-8 py-3 rounded-full font-medium hover:bg-[#1C1D21] transition-colors">
                    Contact sales
                  </button>
                </div>
              </div>
            </section>
          </main>
          <Footer />
        </div>
      )}
    </>
  );
};

export default App;
