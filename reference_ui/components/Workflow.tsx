import React from 'react';

export const Workflow: React.FC = () => {
  return (
    <section id="method" className="py-24 border-t border-border/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          
          <div className="lg:w-1/2">
            <h2 className="text-sm font-medium text-primary mb-2 uppercase tracking-wider">The Academia Method</h2>
            <h3 className="text-3xl md:text-4xl font-semibold mb-6 text-textMain">Build momentum. <br /> Don't lose track.</h3>
            <p className="text-lg text-textMuted mb-8">
              Traditional lab management tools are disconnected silos. Academia unifies your grants, data, and publications into a single stream of truth.
            </p>
            
            <ul className="space-y-8">
              {[
                { title: "Capture ideas instantly", desc: "Log hypothesis and quick notes from anywhere, linked to specific projects." },
                { title: "Connect the dots", desc: "Automated linking between raw data sets and manuscript figures." },
                { title: "Ship papers faster", desc: "One-click export to journal-specific formatting requirements." }
              ].map((item, idx) => (
                <li key={idx} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-surfaceHighlight border border-border flex items-center justify-center text-sm font-medium text-textMuted">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="text-textMain font-medium mb-1">{item.title}</h4>
                    <p className="text-textMuted text-sm">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:w-1/2 w-full">
            <div className="relative rounded-xl bg-surface border border-border p-1 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent rounded-xl pointer-events-none"></div>
              <img 
                src="https://picsum.photos/800/600?grayscale" 
                alt="Workflow Dashboard" 
                className="rounded-lg w-full h-auto"
              />
              
              {/* Floating Badge */}
              <div className="absolute -bottom-6 -left-6 bg-[#141518] border border-border p-4 rounded-lg shadow-xl flex items-center gap-4 max-w-xs">
                 <div className="flex -space-x-2">
                   <div className="w-8 h-8 rounded-full bg-gray-600 border-2 border-[#141518]"></div>
                   <div className="w-8 h-8 rounded-full bg-gray-500 border-2 border-[#141518]"></div>
                   <div className="w-8 h-8 rounded-full bg-gray-400 border-2 border-[#141518]"></div>
                 </div>
                 <div>
                   <div className="text-xs text-textMuted">Collaborating now</div>
                   <div className="text-sm font-medium text-white">3 Researchers</div>
                 </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
