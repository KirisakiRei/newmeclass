// @ts-nocheck
import React from 'react';
import { ChevronDown, Menu } from 'lucide-react';
import { Button } from './button';
import { cn } from '../../lib/utils';

/**
 * ResponsiveTabs
 * - Mobile  (<md):  styled <select> dropdown
 * - Tablet+ (≥md):  horizontal Button tab bar
 *
 * Props:
 *  tabs        — array of { id, label, icon (Lucide component) }
 *  activeTab   — current active tab id string
 *  onTabChange — (id: string) => void
 *  className   — optional wrapper class
 */
const ResponsiveTabs = ({ tabs, activeTab, onTabChange, className }) => {
  return (
    <div className={cn('mb-6', className)}>
      {/* Mobile: dropdown select with visual indicators */}
      <div className="block md:hidden">
        <div className="relative">
          {/* Left: hamburger icon — signals this is a navigation menu */}
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-[3px]">
            <span className="block w-4 h-0.5 bg-yellow-400 rounded-full" />
            <span className="block w-3 h-0.5 bg-yellow-400/70 rounded-full" />
            <span className="block w-4 h-0.5 bg-yellow-400 rounded-full" />
          </div>
          {/* Right: chevron — signals this opens a dropdown */}
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-400" />
          <select
            value={activeTab}
            onChange={(e) => onTabChange(e.target.value)}
            className="w-full bg-[#2a2a2a] text-white border border-yellow-400/40 rounded-lg pl-10 pr-10 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400/50 appearance-none cursor-pointer hover:border-yellow-400/70 transition-colors"
            aria-label="Pilih menu"
          >
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tablet+: horizontal tab bar */}
      <div
        className="hidden md:flex gap-2 overflow-x-auto pb-1 scrollbar-none"
        role="tablist"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => onTabChange(tab.id)}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              className={cn(
                'whitespace-nowrap shrink-0',
                activeTab === tab.id ?
                   'bg-yellow-400 text-black hover:bg-yellow-500'
                  : 'border-yellow-400/30 text-gray-400 hover:bg-yellow-400/10 bg-transparent'
              )}
            >
              {Icon && <Icon className="w-4 h-4 mr-2" />}
              {tab.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default ResponsiveTabs;

