import React from 'react';
import { AuthProvider } from './context/AuthContext';
import LogSearchPage from './pages/LogSearchPage';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-100">
        <LogSearchPage />
      </div>
    </AuthProvider>
  );
}

export default App;