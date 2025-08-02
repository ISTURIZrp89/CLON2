import React, { createContext, useContext, useState, useEffect } from 'react';
import firebaseService from '../services/FirebaseService';

const ConfigContext = createContext();

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState({
    companyName: 'LabFlow',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    currency: 'MXN',
    taxRate: '16',
    timezone: 'America/Mexico_City',
    dateFormat: 'dd/mm/yyyy',
    language: 'es',
    logoIcon: 'mdi-beaker-outline',
    logoType: 'laboratorio'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const result = await firebaseService.getAll('system_config');
      if (result.success && result.data.length > 0) {
        setConfig(prev => ({
          ...prev,
          ...result.data[0]
        }));
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (newConfig) => {
    try {
      const configData = { ...config, ...newConfig, updated_at: new Date() };
      
      // Try to update existing config
      const existingResult = await firebaseService.getAll('system_config');
      
      if (existingResult.success && existingResult.data.length > 0) {
        const configId = existingResult.data[0].id;
        await firebaseService.update('system_config', configId, configData);
      } else {
        // Create new config if none exists
        configData.created_at = new Date();
        await firebaseService.create('system_config', configData);
      }
      
      setConfig(configData);
      return { success: true };
    } catch (error) {
      console.error('Error updating config:', error);
      return { success: false, error };
    }
  };

  const value = {
    config,
    updateConfig,
    loading
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};
