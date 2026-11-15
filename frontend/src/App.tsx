import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, TabType } from './components/Sidebar';
import { OverviewDashboard } from './pages/OverviewDashboard';
import { LiveFireMap } from './pages/LiveFireMap';
import { Earth3DPage } from './pages/Earth3DPage';
import { BurningCalendarPage } from './pages/BurningCalendarPage';
import { HistoricalAnalyticsPage } from './pages/HistoricalAnalyticsPage';
import { AOIAnalysisPage } from './pages/AOIAnalysisPage';
import { HarmonizationPage } from './pages/HarmonizationPage';
import { DataExplorerPage } from './pages/DataExplorerPage';
import { ReportsExportsPage } from './pages/ReportsExportsPage';
import { MethodologyPage } from './pages/MethodologyPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('overview');
  const [currentRegion, setCurrentRegion] = useState<string>('Global');
  const [currentSubdivision, setCurrentSubdivision] = useState<string | undefined>(undefined);

  const handleSelectRegion = (country: string, subdivision?: string) => {
    setCurrentRegion(country);
    setCurrentSubdivision(subdivision);
  };

  const renderActivePage = () => {
    switch (currentTab) {
      case 'overview':
        return (
          <OverviewDashboard
            currentRegion={currentRegion}
            currentSubdivision={currentSubdivision}
            onSelectRegion={handleSelectRegion}
            onNavigateToTab={setCurrentTab}
          />
        );
      case 'map':
        return (
          <LiveFireMap
            currentRegion={currentRegion}
            currentSubdivision={currentSubdivision}
            onSelectRegion={handleSelectRegion}
          />
        );
      case 'earth3d':
        return (
          <Earth3DPage
            currentRegion={currentRegion}
            currentSubdivision={currentSubdivision}
            onSelectRegion={handleSelectRegion}
            onNavigateToTab={setCurrentTab}
          />
        );
      case 'calendar':
        return (
          <BurningCalendarPage
            currentRegion={currentRegion}
            currentSubdivision={currentSubdivision}
            onSelectRegion={handleSelectRegion}
            onNavigateToTab={setCurrentTab}
          />
        );
      case 'analytics':
        return (
          <HistoricalAnalyticsPage
            currentRegion={currentRegion}
            currentSubdivision={currentSubdivision}
            onSelectRegion={handleSelectRegion}
          />
        );
      case 'aoi':
        return (
          <AOIAnalysisPage
            currentRegion={currentRegion}
            currentSubdivision={currentSubdivision}
            onSelectRegion={handleSelectRegion}
          />
        );
      case 'harmonization':
        return (
          <HarmonizationPage
            currentRegion={currentRegion}
            currentSubdivision={currentSubdivision}
          />
        );
      case 'explorer':
        return (
          <DataExplorerPage
            currentRegion={currentRegion}
            currentSubdivision={currentSubdivision}
            onSelectRegion={handleSelectRegion}
          />
        );
      case 'reports':
        return (
          <ReportsExportsPage
            currentRegion={currentRegion}
            currentSubdivision={currentSubdivision}
            onSelectRegion={handleSelectRegion}
          />
        );
      case 'methodology':
        return <MethodologyPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return (
          <OverviewDashboard
            currentRegion={currentRegion}
            currentSubdivision={currentSubdivision}
            onSelectRegion={handleSelectRegion}
            onNavigateToTab={setCurrentTab}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      {/* Top Universal Navbar */}
      <Navbar
        currentRegion={currentRegion}
        currentSubdivision={currentSubdivision}
      />

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
        />

        {/* Dynamic Main Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[#070b14]">
          <div className="max-w-7xl mx-auto">
            {renderActivePage()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
