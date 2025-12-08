import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-border/30 bg-[#0B0C0E] pt-20 pb-10 px-6 text-sm">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-10 mb-16">
        
        <div className="col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded flex items-center justify-center text-[8px] font-bold text-white">
              A
            </div>
            <span className="font-semibold text-textMain">Academia</span>
          </div>
          <p className="text-textMuted max-w-xs">
            Designed for the future of scientific discovery. <br />
            San Francisco, CA.
          </p>
        </div>

        <div>
          <h4 className="font-medium text-textMain mb-4">Product</h4>
          <ul className="space-y-2 text-textMuted">
            <li><a href="#" className="hover:text-textMain transition-colors">Features</a></li>
            <li><a href="#" className="hover:text-textMain transition-colors">Integrations</a></li>
            <li><a href="#" className="hover:text-textMain transition-colors">Pricing</a></li>
            <li><a href="#" className="hover:text-textMain transition-colors">Changelog</a></li>
            <li><a href="#" className="hover:text-textMain transition-colors">Docs</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium text-textMain mb-4">Company</h4>
          <ul className="space-y-2 text-textMuted">
            <li><a href="#" className="hover:text-textMain transition-colors">About</a></li>
            <li><a href="#" className="hover:text-textMain transition-colors">Blog</a></li>
            <li><a href="#" className="hover:text-textMain transition-colors">Careers</a></li>
            <li><a href="#" className="hover:text-textMain transition-colors">Customers</a></li>
            <li><a href="#" className="hover:text-textMain transition-colors">Brand</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium text-textMain mb-4">Resources</h4>
          <ul className="space-y-2 text-textMuted">
            <li><a href="#" className="hover:text-textMain transition-colors">Community</a></li>
            <li><a href="#" className="hover:text-textMain transition-colors">Contact</a></li>
            <li><a href="#" className="hover:text-textMain transition-colors">DPA</a></li>
            <li><a href="#" className="hover:text-textMain transition-colors">Terms of Service</a></li>
          </ul>
        </div>

      </div>

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between pt-8 border-t border-border/30 text-textMuted text-xs">
        <p>&copy; 2024 Academia Inc. All rights reserved.</p>
        <div className="flex gap-6 mt-4 md:mt-0">
           <a href="#" className="hover:text-textMain">Twitter</a>
           <a href="#" className="hover:text-textMain">GitHub</a>
           <a href="#" className="hover:text-textMain">Slack</a>
        </div>
      </div>
    </footer>
  );
};
