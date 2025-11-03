import React from 'react';
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Home from './src/pages/Home';
import NotFound from './src/pages/NotFound';
import Dashboard from './src/pages/Dashboard';
import DonorDashboard from './src/pages/DonorDashboard';
import ImpactDashboard from './src/pages/ImpactDashboard';
import AadhaarVerificationPage from './src/pages/AadhaarVerificationPage';
import ProtectedRoute from './src/components/ProtectedRoute';
// AuthProvider now mounted at root (index.tsx)

const App: React.FC = () => {
  return (
    <Theme appearance="inherit" radius="large" scaling="100%">
      <Router>
          <main className="min-h-screen">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/impact" element={<ImpactDashboard />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/donor" element={<ProtectedRoute><DonorDashboard /></ProtectedRoute>} />
              <Route path="/verify-aadhaar" element={<ProtectedRoute><AadhaarVerificationPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <ToastContainer
              position="top-right"
              autoClose={3000}
              newestOnTop
              closeOnClick
              pauseOnHover
            />
          </main>
      </Router>
    </Theme>
  );
}

export default App;