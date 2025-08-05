import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <div className="App">
        <h1>LabFlow Manager - Test with Router</h1>
        <p>If you can see this, React Router is working!</p>
        <Routes>
          <Route path="*" element={<div>Default route working</div>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
