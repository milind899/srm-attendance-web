import React, { useEffect, useState } from 'react';
import { fetchFeatures } from '../services/api';
import { Feature } from '../types';
import * as Icons from 'lucide-react';
import { InteractiveGraph } from './InteractiveGraph';

export const Features: React.FC = () => {
  const [features, setFeatures] = useState<Feature[]>([]);

  useEffect(() => {
    fetchFeatures().then(setFeatures);
  }, []);

  const getIcon = (iconName: string) => {
    // Dynamic icon rendering
    const IconComponent = (Icons as any)[iconName.charAt(0).toUpperCase() + iconName.slice(1)];
    return IconComponent ? <IconComponent size={24} className="text-primary mb-4" /> : null;
  };

  return (
    <section id="features" className="py-24 px-6 relative border-t border-border/30">
       <div className="max-w-7xl mx-auto">
         
         <div className="mb-16">
           <h2 className="text-3xl md:text-4xl font-semibold mb-6">Designed for breakthrough moments.</h2>
           <p className="text-xl text-textMuted max-w-2xl">
             Every feature is crafted to remove friction from the research process, 
             so you can focus on the science, not the administration.
           </p>
         </div>

         {/* Hero Feature: Graph */}
         <div className="mb-8 w-full">
            <InteractiveGraph />
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {features.map((feature) => (
             <div 
              key={feature.id} 
              className={`group relative p-8 rounded-2xl bg-surface border border-border/50 hover:bg-surfaceHighlight transition-all duration-300 ${feature.gridArea || ''} overflow-hidden`}
             >
               {/* Hover Gradient Effect */}
               <div className="absolute inset-0 bg-feature-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
               
               <div className="relative z-10 flex flex-col h-full justify-between">
                 <div>
                   {getIcon(feature.icon)}
                   <h3 className="text-xl font-medium text-textMain mb-2">{feature.title}</h3>
                   <p className="text-textMuted leading-relaxed">{feature.description}</p>
                 </div>
                 
                 {/* Decorative graphic placeholder at bottom of cards */}
                 <div className="mt-8 h-32 w-full bg-gradient-to-tr from-background to-surface rounded-lg border border-border/30 opacity-50 group-hover:opacity-70 transition-opacity relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center opacity-10">
                       {/* Subtle geometric pattern */}
                       <div className="w-full h-px bg-white transform rotate-45"></div>
                       <div className="w-full h-px bg-white transform -rotate-45"></div>
                    </div>
                 </div>
               </div>
             </div>
           ))}
         </div>

       </div>
    </section>
  );
};
