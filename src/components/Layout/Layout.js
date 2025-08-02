import React from 'react';
import Sidebar from './Sidebar';
import NotificationContainer from '../Notifications/NotificationContainer';
import { useSidebar } from '../../contexts/SidebarContext';
import './Layout.css';

const Layout = ({ children }) => {
  const { isCollapsed } = useSidebar();

  return (
    <div className="app-container">
      <Sidebar />
      <main className={`main-content ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        {children}
      </main>
      <NotificationContainer />
    </div>
  );
};

export default Layout;
