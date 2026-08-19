import React from 'react';
import { Routes, Route } from 'react-router';
import { NavHeader } from './components/NavHeader';
import { HomePage } from './pages/HomePage';
import { BadPage } from './pages/BadPage';
import { GoodPage } from './pages/GoodPage';
import { WorkerPage } from './pages/WorkerPage';
import { EventLoopDemoPage } from './pages/EventLoopDemoPage';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-white">
      <NavHeader />
      <main className="flex-1 flex flex-col min-h-0">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/bad" element={<BadPage />} />
          <Route path="/good" element={<GoodPage />} />
          <Route path="/worker" element={<WorkerPage />} />
          <Route path="/event-loop-demo" element={<EventLoopDemoPage />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
