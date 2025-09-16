import React, { useState } from 'react'
import { Header } from './Header'
import { Sidebar } from './sidebar'

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false) // Start with sidebar closed
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900">
      <Header toggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
      
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main
        className="transition-all duration-300 ease-in-out"
        style={{
          paddingTop: '60px', // Account for fixed header height
          marginLeft: sidebarOpen ? '280px' : '0px'
        }}
      >
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}