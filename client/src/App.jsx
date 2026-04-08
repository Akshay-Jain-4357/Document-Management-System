import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { DocumentProvider } from './context/DocumentContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DocumentPage from './pages/DocumentPage';
import DiffPage from './pages/DiffPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DocumentProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1e293b',
                color: '#e2e8f0',
                border: '1px solid #334155',
                fontSize: '14px',
              },
            }}
          />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/document/:id"
              element={
                <ProtectedRoute>
                  <DocumentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/diff"
              element={
                <ProtectedRoute>
                  <DiffPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </DocumentProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}