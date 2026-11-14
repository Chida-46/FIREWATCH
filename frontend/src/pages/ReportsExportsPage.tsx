import React, { useState } from 'react';
import { api } from '../services/api';
import { RegionSelector } from '../components/RegionSelector';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
  FileDown,
  FileSpreadsheet,
  MapPin,
  FileText,
  Download,
  Eye,
  CheckCircle,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

interface ReportsProps {
  currentRegion: string;
  currentSubdivision?: string;
  onSelectRegion: (region: string, subdivision?: string) => void;
}

export const ReportsExportsPage: React.FC<ReportsProps> = ({
  currentRegion,
  currentSubdivision,
  onSelectRegion
}) => {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [previewPDFUrl, setPreviewPDFUrl] = useState<string | null>(null);

  const regionParam = currentRegion === 'India (National)' ? 'India' : currentRegion;
  const displayName = currentSubdivision ? `${currentSubdivision}, ${currentRegion}` : currentRegion;

  const handleDownloadCSV = async (type: string, filename: string) => {
    try {
      setDownloading(type);
      const blob = await api.exportCSV(type, regionParam, currentSubdivision);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV export failed:', err);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadGeoJSON = async (type: 'grid' | 'points', filename: string) => {
    try {
      setDownloading(type);
      const data = await api.exportGeoJSON(type, regionParam, currentSubdivision);
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/geo+json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('GeoJSON export failed:', err);
    } finally {
      setDownloading(null);
    }
  };

  const handleGeneratePDF = async (preview: boolean = false) => {
    try {
      setDownloading('pdf');
      const blob = await api.exportPDF(regionParam, currentSubdivision);
      const url = window.URL.createObjectURL(blob);
      if (preview) {
        setPreviewPDFUrl(url);
      } else {
        const a = document.createElement('a');
        a.href = url;
        const cleanName = displayName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        a.download = `firewatch_report_${cleanName}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#090d16] p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <FileDown className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-bold tracking-tight text-white">
              Data Exports & Analytical Report Generator
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Export standardized scientific datasets in CSV and GeoJSON formats, or generate publication-grade PDF intelligence dossiers with interactive preview.
          </p>
        </div>

        <RegionSelector
          selectedRegion={currentRegion}
          selectedSubdivision={currentSubdivision}
          onSelectRegion={onSelectRegion}
        />
      </div>

      {/* PDF Dossier Generator Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0f172a] to-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Comprehensive Analytical PDF Report ({displayName})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Includes executive summary, multi-sensor KPIs, historical monthly anomaly tables, calibration diagnostics, and NASA citations.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              disabled={downloading === 'pdf'}
              onClick={() => handleGeneratePDF(true)}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors"
            >
              <Eye className="w-4 h-4 text-slate-400" />
              <span>Live Preview</span>
            </button>
            <button
              disabled={downloading === 'pdf'}
              onClick={() => handleGeneratePDF(false)}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs shadow-md shadow-orange-950/40 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>{downloading === 'pdf' ? 'Generating PDF...' : 'Download PDF Dossier'}</span>
            </button>
          </div>
        </div>

        {/* Live PDF Preview Pane */}
        {previewPDFUrl && (
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-300">
              <span className="font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                Live PDF Report Preview
              </span>
              <button
                onClick={() => setPreviewPDFUrl(null)}
                className="text-slate-400 hover:text-white"
              >
                Close Preview
              </button>
            </div>
            <iframe
              src={previewPDFUrl}
              className="w-full h-[480px] rounded-xl border border-slate-700 bg-white"
              title="Report Preview"
            />
          </div>
        )}
      </div>

      {/* Structured Datasets Export Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CSV Datasets */}
        <div className="bg-[#090d16] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <FileSpreadsheet className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-100">
              CSV Analytical Datasets
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800/80">
              <div>
                <span className="font-bold text-slate-200 block">
                  Monthly Calendar & Anomaly Matrix
                </span>
                <span className="text-slate-400 text-[11px]">
                  Year × Month harmonized counts, historical medians, and anomaly percentages.
                </span>
              </div>
              <button
                disabled={downloading !== null}
                onClick={() =>
                  handleDownloadCSV(
                    'monthly_calendar',
                    `firewatch_monthly_calendar_${regionParam.toLowerCase()}.csv`
                  )
                }
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800/80">
              <div>
                <span className="font-bold text-slate-200 block">
                  Annual Multi-Decadal Time Series
                </span>
                <span className="text-slate-400 text-[11px]">
                  Yearly totals for MODIS, VIIRS, and Harmonized estimates with YoY change.
                </span>
              </div>
              <button
                disabled={downloading !== null}
                onClick={() =>
                  handleDownloadCSV(
                    'annual_trends',
                    `firewatch_annual_trends_${regionParam.toLowerCase()}.csv`
                  )
                }
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800/80">
              <div>
                <span className="font-bold text-slate-200 block">
                  Raw Hotspot Telemetry Records
                </span>
                <span className="text-slate-400 text-[11px]">
                  Point observations with coordinates, FRP, confidence, brightness, day/night.
                </span>
              </div>
              <button
                disabled={downloading !== null}
                onClick={() =>
                  handleDownloadCSV(
                    'raw_hotspots',
                    `firewatch_raw_hotspots_${regionParam.toLowerCase()}.csv`
                  )
                }
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* GeoJSON Datasets */}
        <div className="bg-[#090d16] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <MapPin className="w-5 h-5 text-orange-500" />
            <h3 className="text-sm font-bold text-slate-100">
              Geospatial GeoJSON Layers
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800/80">
              <div>
                <span className="font-bold text-slate-200 block">
                  0.1° Harmonized Spatial Polygon Grid
                </span>
                <span className="text-slate-400 text-[11px]">
                  Aggregated grid cells with sub-pixel counts, mean FRP, and cell boundaries.
                </span>
              </div>
              <button
                disabled={downloading !== null}
                onClick={() =>
                  handleDownloadGeoJSON(
                    'grid',
                    `firewatch_grid_0.1deg_${regionParam.toLowerCase()}.geojson`
                  )
                }
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>GeoJSON</span>
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800/80">
              <div>
                <span className="font-bold text-slate-200 block">
                  Active Fire Point Locations
                </span>
                <span className="text-slate-400 text-[11px]">
                  Point features with telemetry attributes for GIS applications (QGIS, ArcGIS).
                </span>
              </div>
              <button
                disabled={downloading !== null}
                onClick={() =>
                  handleDownloadGeoJSON(
                    'points',
                    `firewatch_hotspot_points_${regionParam.toLowerCase()}.geojson`
                  )
                }
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>GeoJSON</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
