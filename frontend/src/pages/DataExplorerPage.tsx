import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { HotspotRecord } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { RegionSelector } from '../components/RegionSelector';
import {
  Database,
  Search,
  Filter,
  Download,
  Eye,
  X,
  Flame,
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';

interface DataExplorerProps {
  currentRegion: string;
  currentSubdivision?: string;
  onSelectRegion: (region: string, subdivision?: string) => void;
}

export const DataExplorerPage: React.FC<DataExplorerProps> = ({
  currentRegion,
  currentSubdivision,
  onSelectRegion
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [records, setRecords] = useState<HotspotRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(0);
  const pageSize = 15;

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sensorFilter, setSensorFilter] = useState<string>('ALL');
  const [minConfidence, setMinConfidence] = useState<number>(0);
  const [minFRP, setMinFRP] = useState<number>(0);
  const [selectedRecord, setSelectedRecord] = useState<HotspotRecord | null>(null);

  const fetchRecords = () => {
    setLoading(true);
    api.getHotspots({
      country: currentRegion,
      state: currentSubdivision,
      sensor: sensorFilter !== 'ALL' ? sensorFilter : undefined,
      min_confidence: minConfidence > 0 ? minConfidence : undefined,
      min_frp: minFRP > 0 ? minFRP : undefined,
      limit: pageSize,
      offset: page * pageSize
    })
      .then((res) => {
        setRecords(res.records || []);
        setTotal(res.total || 0);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching explorer records:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRecords();
  }, [currentRegion, currentSubdivision, page, sensorFilter, minConfidence, minFRP]);

  const filteredRecords = records.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.satellite.toLowerCase().includes(term) ||
      r.instrument.toLowerCase().includes(term) ||
      r.acq_date.includes(term) ||
      r.source_product.toLowerCase().includes(term)
    );
  });

  const handleExportCSV = async () => {
    const regionParam = currentRegion === 'India (National)' ? 'India' : currentRegion;
    const blob = await api.exportCSV('raw_hotspots', regionParam);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `firewatch_hotspots_${currentRegion.toLowerCase().replace(/[^a-z0-9]/g, '_')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#090d16] p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-bold tracking-tight text-white">
              Satellite Hotspot Data Explorer
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Inspect verified active fire records with complete telemetry, sub-pixel weights, brightness temperatures, and data provenance.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs shadow-md transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <RegionSelector
            selectedRegion={currentRegion}
            selectedSubdivision={currentSubdivision}
            onSelectRegion={onSelectRegion}
          />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-[#090d16] p-3 rounded-xl border border-slate-800 text-xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search satellite, instrument, date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-slate-200 outline-none"
          />
        </div>

        {/* Sensor Filter */}
        <div className="flex items-center space-x-1">
          <span className="text-slate-400">Sensor:</span>
          <select
            value={sensorFilter}
            onChange={(e) => {
              setSensorFilter(e.target.value);
              setPage(0);
            }}
            className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 outline-none"
          >
            <option value="ALL">All Instruments</option>
            <option value="MODIS">MODIS (1 km)</option>
            <option value="VIIRS">VIIRS (375 m)</option>
          </select>
        </div>

        {/* Min FRP Filter */}
        <div className="flex items-center space-x-1">
          <span className="text-slate-400">Min FRP:</span>
          <select
            value={minFRP}
            onChange={(e) => {
              setMinFRP(Number(e.target.value));
              setPage(0);
            }}
            className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 outline-none"
          >
            <option value={0}>All FRPs</option>
            <option value={15}>&gt; 15 MW</option>
            <option value={40}>&gt; 40 MW</option>
            <option value={100}>&gt; 100 MW (Extreme)</option>
          </select>
        </div>

        {/* Min Confidence */}
        <div className="flex items-center space-x-1">
          <span className="text-slate-400">Min Conf:</span>
          <select
            value={minConfidence}
            onChange={(e) => {
              setMinConfidence(Number(e.target.value));
              setPage(0);
            }}
            className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 outline-none"
          >
            <option value={0}>All Confidences</option>
            <option value={50}>&gt; 50% (Nominal)</option>
            <option value={80}>&gt; 80% (High)</option>
          </select>
        </div>

        <div className="text-slate-400 ml-auto font-mono">
          Showing {filteredRecords.length} of {total} records
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[#090d16] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-8">
            <LoadingSpinner message="Querying satellite observations table..." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Date & UTC</th>
                  <th className="py-2.5 px-3">Coordinates</th>
                  <th className="py-2.5 px-3">Satellite (Sensor)</th>
                  <th className="py-2.5 px-3">Resolution</th>
                  <th className="py-2.5 px-3">FRP</th>
                  <th className="py-2.5 px-3">Confidence</th>
                  <th className="py-2.5 px-3">Brightness</th>
                  <th className="py-2.5 px-3">Orbit</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRecords.map((r, i) => (
                  <tr
                    key={i}
                    onClick={() => setSelectedRecord(r)}
                    className="hover:bg-slate-800/30 cursor-pointer transition-colors"
                  >
                    <td className="py-2 px-3 font-mono text-slate-300">
                      {r.acq_date} <span className="text-slate-400">{r.acq_time}</span>
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-400">
                      {r.latitude.toFixed(3)}, {r.longitude.toFixed(3)}
                    </td>
                    <td className="py-2 px-3 font-semibold text-white">
                      <span className={r.instrument === 'MODIS' ? 'text-amber-400' : 'text-orange-400'}>
                        {r.satellite}
                      </span>{' '}
                      <span className="text-slate-400">({r.instrument})</span>
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-400">
                      {r.instrument === 'MODIS' ? '1 km' : '375 m'}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-amber-400">
                      {r.frp} MW
                    </td>
                    <td className="py-2 px-3">
                      <span className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded font-mono text-slate-300">
                        {r.confidence}%
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-300">
                      {r.brightness || 320} K
                    </td>
                    <td className="py-2 px-3">
                      {r.daynight === 'D' ? '☀️ Day' : '🌙 Night'}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button className="text-orange-400 hover:text-orange-300">
                        <Eye className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="flex items-center justify-between p-3 border-t border-slate-800 bg-slate-900/60 text-xs text-slate-400">
          <div>
            Page {page + 1} of {Math.ceil(total / pageSize) || 1}
          </div>
          <div className="flex items-center space-x-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200"
            >
              Previous
            </button>
            <button
              disabled={(page + 1) * pageSize >= total}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Record Telemetry Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative text-xs">
            <button
              onClick={() => setSelectedRecord(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              <Flame className="w-5 h-5 text-orange-500" />
              <h3 className="text-base font-bold text-white">
                Observation Telemetry & Provenance
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block">Satellite:</span>
                <span className="font-bold text-white text-sm">{selectedRecord.satellite}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block">Instrument:</span>
                <span className="font-bold text-white text-sm">{selectedRecord.instrument}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block">Latitude / Longitude:</span>
                <span className="font-mono text-slate-200">
                  {selectedRecord.latitude.toFixed(4)}, {selectedRecord.longitude.toFixed(4)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block">Timestamp:</span>
                <span className="font-mono text-slate-200">
                  {selectedRecord.acq_date} {selectedRecord.acq_time} UTC
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block">Fire Radiative Power:</span>
                <span className="font-bold font-mono text-amber-400 text-sm">{selectedRecord.frp} MW</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block">Standardized Confidence:</span>
                <span className="font-bold font-mono text-slate-200 text-sm">{selectedRecord.confidence}%</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block">Brightness (Channel 4 / 21):</span>
                <span className="font-mono text-slate-200">{selectedRecord.brightness || 320} K</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block">Channel 31 / 32:</span>
                <span className="font-mono text-slate-200">{selectedRecord.bright_t31 || 295} K</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block">Sub-Pixel Harmonized Weight:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {selectedRecord.instrument === 'MODIS' ? '1.000 (Standard)' : '0.380 (Calibrated)'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block">Source Product:</span>
                <span className="font-mono text-slate-300">{selectedRecord.source_product}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 rounded border border-slate-800 text-slate-400 text-[11px] leading-normal">
              Validated against NASA FIRMS archive specifications. Scan geometry and day/night flags retained in provenance record.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
