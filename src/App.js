import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { SidebarProvider } from './contexts/SidebarContext';
import { ConfigProvider } from './contexts/ConfigContext';
import Login from './pages/Login/Login';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <SidebarProvider>
              <ConfigProvider>
                <div className="App">
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="*" element={
                      <div>
                        <h1>LabFlow Manager - Working!</h1>
                        <p>Navigate to <a href="/login">/login</a> to test Login component</p>
                      </div>
                    } />
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
