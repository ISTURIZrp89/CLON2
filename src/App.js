import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { SidebarProvider } from './contexts/SidebarContext';
import { ConfigProvider } from './contexts/ConfigContext';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <SidebarProvider>
              <ConfigProvider>
                <div className="App">
                  <h1>LabFlow Manager - Test with All Providers</h1>
                  <p>If you can see this, all providers are working!</p>
                  <Routes>
                    <Route path="*" element={<div>Default route working</div>} />
                  </Routes>
                </div>
              </ConfigProvider>
            </SidebarProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
