// src/components/layout/layout-redesign.tsx
import React, { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './Header';

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      <Header sidebarOpen={sidebarOpen} />
      
      <main
        className="transition-all duration-300 ease-in-out pt-16"
        style={{
          marginLeft: sidebarOpen ? '256px' : '64px',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}