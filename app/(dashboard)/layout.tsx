'use client';

import { SidebarProvider, useSidebar } from '@/components/SidebarContext';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

const SIDEBAR_W    = 256;  // expanded
const SIDEBAR_MINI = 0;    // fully hidden (overlay-style toggle)

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}>
      <Header />
      <div style={{ display: 'flex', flex: 1, marginTop: '70px' }}>
        <Sidebar />
        <main
          style={{
            flex: 1,
            marginLeft: collapsed ? 0 : `${SIDEBAR_W}px`,
            padding: '2rem',
            backgroundColor: 'var(--bg)',
            transition: 'margin-left 0.3s cubic-bezier(0.4,0,0.2,1)',
            minWidth: 0,
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}
