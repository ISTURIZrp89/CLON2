import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <div className="App">
            <h1>LabFlow Manager - Test with Router + Theme + Auth</h1>
            <p>If you can see this, Router, Theme, and Auth are working!</p>
            <Routes>
              <Route path="*" element={<div>Default route working</div>} />
            </Routes>
          </div>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
