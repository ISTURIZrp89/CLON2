import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { SidebarProvider } from './contexts/SidebarContext';
import { ConfigProvider } from './contexts/ConfigContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout/Layout';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Usuarios from './pages/Usuarios/Usuarios';
import Insumos from './pages/Insumos/Insumos';
import Equipos from './pages/Equipos/Equipos';
import Productos from './pages/Productos/Productos';
import Pedidos from './pages/Pedidos/Pedidos';
import RegistroPedidos from './pages/RegistroPedidos/RegistroPedidos';
import Envios from './pages/Envios/Envios';
import Movimientos from './pages/Movimientos/Movimientos';
import Reportes from './pages/Reportes/Reportes';
import HistorialEquipos from './pages/HistorialEquipos/HistorialEquipos';
import Configuracion from './pages/Configuracion/Configuracion';
import Ajustes from './pages/Ajustes/Ajustes';
import Perfil from './pages/Perfil/Perfil';
import Migracion from './pages/Migracion/Migracion';
import './App.css';

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
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                
                {/* Protected Routes */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout>
                      <Navigate to="/dashboard" replace />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/usuarios" element={
                  <ProtectedRoute requiredRole="administrador">
                    <Layout>
                      <Usuarios />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/insumos" element={
                  <ProtectedRoute>
                    <Layout>
                      <Insumos />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/equipos" element={
                  <ProtectedRoute>
                    <Layout>
                      <Equipos />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/productos" element={
                  <ProtectedRoute>
                    <Layout>
                      <Productos />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/pedidos" element={
                  <ProtectedRoute>
                    <Layout>
                      <Pedidos />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/registro-pedidos" element={
                  <ProtectedRoute>
                    <Layout>
                      <RegistroPedidos />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/envios" element={
                  <ProtectedRoute>
                    <Layout>
                      <Envios />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/movimientos" element={
                  <ProtectedRoute>
                    <Layout>
                      <Movimientos />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/reportes" element={
                  <ProtectedRoute>
                    <Layout>
                      <Reportes />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/historial-equipos" element={
                  <ProtectedRoute>
                    <Layout>
                      <HistorialEquipos />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/configuracion" element={
                  <ProtectedRoute requiredRole="administrador">
                    <Layout>
                      <Configuracion />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/ajustes" element={
                  <ProtectedRoute>
                    <Layout>
                      <Ajustes />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/perfil" element={
                  <ProtectedRoute>
                    <Layout>
                      <Perfil />
                    </Layout>
                  </ProtectedRoute>
                } />

                <Route path="/migracion" element={
                  <ProtectedRoute requiredRole="administrador">
                    <Layout>
                      <Migracion />
                    </Layout>
                  </ProtectedRoute>
                } />

                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
