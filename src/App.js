import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <div className="App">
          <h1>LabFlow Manager - Test with Router + Theme</h1>
          <p>If you can see this, Router and Theme are working!</p>
          <Routes>
            <Route path="*" element={<div>Default route working</div>} />
          </Routes>
        </div>
      </ThemeProvider>
    </Router>
  );
}

export default App;
