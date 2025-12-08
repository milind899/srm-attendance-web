import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from './ui/Button';
import { ButtonVariant } from '../types';

export const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Method', href: '#method' },
    { label: 'Customers', href: '#customers' },
    { label: 'Pricing', href: '#pricing' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-nav">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="w-6 h-6 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-md flex items-center justify-center text-[10px] font-bold text-white">
            A
          </div>
          <span className="font-semibold text-lg tracking-tight text-textMain">Academia</span>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a 
              key={link.label} 
              href={link.href} 
              className="text-sm text-textMuted hover:text-textMain transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-4">
          <Button variant={ButtonVariant.GHOST} className="text-xs">Log in</Button>
          <Button variant={ButtonVariant.SECONDARY} className="text-xs h-8 px-4">Sign up</Button>
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
        <div className="md:hidden absolute top-16 left-0 w-full bg-surface border-b border-border p-6 flex flex-col gap-4 animate-fade-in-up">
          {navLinks.map((link) => (
            <a 
              key={link.label} 
              href={link.href}
              className="text-sm text-textMuted hover:text-textMain py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="h-px bg-border my-2"></div>
          <Button variant={ButtonVariant.SECONDARY} className="w-full justify-center">Sign up</Button>
          <Button variant={ButtonVariant.GHOST} className="w-full justify-center">Log in</Button>
        </div>
      )}
    </nav>
  );
};
