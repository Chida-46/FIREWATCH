import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Globe, MapPin, ChevronDown, Search, Check, X } from 'lucide-react';
import { CountryCatalogItem } from '../types';

interface RegionSelectorProps {
  selectedRegion: string;
  selectedSubdivision?: string;
  onSelectRegion: (country: string, subdivision?: string) => void;
}

// Popular benchmark countries for instant 1-click access
const QUICK_BENCHMARKS = [
  "Global",
  "United States",
  "Brazil",
  "Australia",
  "South Africa",
  "Indonesia",
  "India",
  "Canada",
  "France",
  "Germany",
  "Argentina",
  "Nigeria",
  "Japan"
];

export const RegionSelector: React.FC<RegionSelectorProps> = ({
  selectedRegion,
  selectedSubdivision,
  onSelectRegion
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [catalog, setCatalog] = useState<CountryCatalogItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load dynamic countries catalog
  useEffect(() => {
    let isMounted = true;
    fetch('/data/countries_catalog.json')
      .then((res) => res.json())
      .then((data: CountryCatalogItem[]) => {
        if (isMounted && Array.isArray(data)) {
          setCatalog(data);
        }
      })
      .catch((err) => {
        console.warn('Could not load local countries catalog, trying API:', err);
        fetch('/api/aoi/countries')
          .then((res) => res.json())
          .then((meta) => {
            if (isMounted) {
              const items: CountryCatalogItem[] = Object.values(meta);
              setCatalog(items);
            }
          })
          .catch((e) => console.error('Failed to load countries:', e));
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Find active country details
  const activeCountryItem = useMemo(() => {
    const clean = selectedRegion.trim().toLowerCase();
    return (
      catalog.find(
        (c) =>
          c.name.toLowerCase() === clean ||
          c.official_name?.toLowerCase() === clean ||
          c.iso3.toLowerCase() === clean
      ) || {
        name: selectedRegion || 'Global (Worldwide)',
        iso3: 'WLD',
        continent: 'Global',
        bbox: [-180, -60, 180, 75] as [number, number, number, number],
        center: [20, 0] as [number, number],
        zoom: 2,
        subdivisions: []
      }
    );
  }, [catalog, selectedRegion]);

  const subdivisions = activeCountryItem.subdivisions || [];

  // Filtered countries based on search
  const filteredCountries = useMemo(() => {
    if (!searchTerm.trim()) {
      return catalog;
    }
    const q = searchTerm.toLowerCase().trim();
    return catalog.filter((c) => {
      return (
        c.name.toLowerCase().includes(q) ||
        (c.official_name && c.official_name.toLowerCase().includes(q)) ||
        c.iso3.toLowerCase().includes(q) ||
        c.continent.toLowerCase().includes(q)
      );
    });
  }, [catalog, searchTerm]);

  return (
    <div className="flex flex-wrap items-center gap-2" ref={dropdownRef}>
      {/* Quick Access Badges for International Benchmark Countries */}
      <div className="hidden 2xl:flex items-center space-x-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800 text-[11px]">
        {QUICK_BENCHMARKS.map((cName) => {
          const isSelected =
            (selectedRegion === cName ||
              (cName === 'Global' && selectedRegion === 'Global (Worldwide)')) &&
            !selectedSubdivision;

          return (
            <button
              key={cName}
              onClick={() => onSelectRegion(cName, undefined)}
              className={`px-2 py-0.5 rounded transition-colors ${
                isSelected
                  ? 'bg-orange-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {cName === 'Global' ? '🌍 Global' : cName}
            </button>
          );
        })}
      </div>

      {/* Main Dynamic Searchable Country Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 bg-slate-900 border border-slate-700/80 hover:border-slate-500 rounded-lg px-3 py-1.5 shadow-sm text-xs text-slate-200 font-semibold transition-colors"
        >
          <Globe className="w-4 h-4 text-orange-400 flex-shrink-0" />
          <span className="truncate max-w-[170px] text-left">
            {activeCountryItem.name}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
            {activeCountryItem.iso3}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-10 z-[1500] w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2.5 space-y-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search 250+ countries, ISO-3, continents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 focus:border-orange-500 rounded-md pl-8 pr-7 py-1.5 text-xs text-slate-100 placeholder-slate-500 outline-none"
                autoFocus
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Results Header */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 border-b border-slate-800 pb-1">
              <span>Worldwide Directory</span>
              <span>{filteredCountries.length} countries found</span>
            </div>

            {/* Country List (scrollable) */}
            <div className="max-h-64 overflow-y-auto space-y-0.5 pr-1">
              {filteredCountries.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No matching country or territory found.
                </div>
              ) : (
                filteredCountries.map((c) => {
                  const isSelected =
                    selectedRegion.toLowerCase() === c.name.toLowerCase() ||
                    (c.name === 'Global (Worldwide)' && selectedRegion === 'Global');

                  return (
                    <button
                      key={c.name}
                      onClick={() => {
                        onSelectRegion(c.name, undefined);
                        setIsOpen(false);
                        setSearchTerm('');
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors text-left ${
                        isSelected
                          ? 'bg-orange-600 text-white font-bold'
                          : 'text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        {isSelected && <Check className="w-3.5 h-3.5 text-white flex-shrink-0" />}
                        <span className="truncate">{c.name}</span>
                      </div>
                      <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
                        <span
                          className={`text-[9px] px-1 py-0.5 rounded font-mono ${
                            isSelected
                              ? 'bg-orange-700 text-white'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {c.iso3}
                        </span>
                        <span
                          className={`text-[9px] px-1 py-0.5 rounded ${
                            isSelected
                              ? 'bg-orange-700 text-orange-200'
                              : 'bg-slate-800/80 text-slate-400'
                          }`}
                        >
                          {c.continent}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Subdivisions Dropdown (if selected country has states/provinces) */}
      {subdivisions.length > 0 && (
        <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs shadow-sm">
          <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <select
            value={selectedSubdivision || 'All'}
            onChange={(e) => {
              const val = e.target.value === 'All' ? undefined : e.target.value;
              onSelectRegion(selectedRegion, val);
            }}
            className="bg-transparent text-xs font-semibold text-slate-200 outline-none cursor-pointer"
          >
            <option value="All" className="bg-slate-900 text-slate-300">
              All States / Provinces
            </option>
            {subdivisions.map((sub) => (
              <option key={sub} value={sub} className="bg-slate-900 text-slate-200">
                {sub}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};
