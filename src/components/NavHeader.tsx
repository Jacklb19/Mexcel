import React, { useState } from 'react';
import { NavLink } from 'react-router';

export const NavHeader: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { to: '/', label: 'Home / Theory', icon: '📖' },
    { to: '/bad', label: '1. Blocking (/bad)', badge: 'Sync', badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
    { to: '/good', label: '2. Concurrent (/good)', badge: 'Chunked', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
    { to: '/worker', label: '3. Off-Thread (/worker)', badge: 'Web Worker', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    { to: '/event-loop-demo', label: 'Event Loop Lab', icon: '🔬' },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        {/* Brand logo & title */}
        <NavLink to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-indigo-600 flex items-center justify-center font-black text-white text-base shadow group-hover:scale-105 transition">
            ⊞
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-slate-100">
              Mini-Excel
            </span>
            <span className="ml-1.5 text-[10px] uppercase font-semibold tracking-wider text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/60">
              INP Lab
            </span>
          </div>
        </NavLink>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  isActive
                    ? 'bg-slate-800 text-emerald-400 font-semibold border border-slate-700 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              {item.icon && <span>{item.icon}</span>}
              <span>{item.label}</span>
              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded border ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Mobile menu hamburger button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-1.5 text-slate-400 hover:text-white rounded"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden px-3 pt-2 pb-3 space-y-1 bg-slate-900 border-b border-slate-800">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium ${
                  isActive
                    ? 'bg-slate-800 text-emerald-400 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`
              }
            >
              <div className="flex items-center gap-2">
                {item.icon && <span>{item.icon}</span>}
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded border ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </header>
  );
};
