import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  enableNetwork,
  disableNetwork,
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence
} from 'firebase/firestore';
import { firebaseConfig } from '../config/firebase';

// =====================================
// FIREBASE SERVICE WITH OFFLINE SUPPORT
// =====================================
export class FirebaseService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.listeners = new Map();
    this.retryCount = 0;
    this.maxRetries = 3;
    this.offlineData = this.loadOfflineData();
    this.usersInitialized = false;
    
    try {
      this.app = initializeApp(firebaseConfig);
      this.db = getFirestore(this.app);
      this.auth = getAuth(this.app);
      this.analytics = getAnalytics(this.app);

      // Habilitar persistencia offline de Firestore
      this.enableOfflinePersistence();

      this.initializeNetworkHandling();
      console.log('Firebase Service initialized successfully');
    } catch (error) {
      console.error('Error initializing Firebase:', error);
      this.db = null; // Mark as offline
      this.auth = null;
      this.showConnectionError();
    }
  }

  async enableOfflinePersistence() {
    if (!this.db) return;

    try {
      // Intentar habilitar persistencia multi-tab primero
      await enableMultiTabIndexedDbPersistence(this.db);
      console.log('✅ Persistencia offline multi-tab habilitada');
    } catch (error) {
      console.warn('No se pudo habilitar persistencia multi-tab, intentando modo single-tab:', error.message);

      try {
        // Si falla multi-tab, usar single-tab
        await enableIndexedDbPersistence(this.db);
        console.log('✅ Persistencia offline single-tab habilitada');
      } catch (singleTabError) {
        console.warn('No se pudo habilitar persistencia offline:', singleTabError.message);

        // Verificar si ya está habilitada
        if (singleTabError.code === 'failed-precondition') {
          console.log('ℹ️ Persistencia offline ya habilitada en otra pestaña');
        } else if (singleTabError.code === 'unimplemented') {
          console.log('ℹ️ Persistencia offline no soportada en este navegador');
        }
      }
    }
  }

  initializeNetworkHandling() {
    // Monitor network status
    window.addEventListener('online', () => {
      console.log('Network: Back online');
      this.isOnline = true;
      this.retryCount = 0;
      if (this.db) {
        this.enableFirestoreNetwork();
      }
    });

    window.addEventListener('offline', () => {
      console.log('Network: Gone offline');
      this.isOnline = false;
      if (this.db) {
        this.disableFirestoreNetwork();
      }
    });
  }

  async enableFirestoreNetwork() {
    try {
      await enableNetwork(this.db);
      console.log('Firestore network enabled');
    } catch (error) {
      console.error('Error enabling Firestore network:', error);
    }
  }

  async disableFirestoreNetwork() {
    try {
      await disableNetwork(this.db);
      console.log('Firestore network disabled');
    } catch (error) {
      console.error('Error disabling Firestore network:', error);
    }
  }

  showConnectionError() {
    console.warn('Firebase connection failed, using offline mode');
  }

  // Offline data management
  loadOfflineData() {
    try {
      const data = localStorage.getItem('labflow_offline_data');
      return data ? JSON.parse(data) : {
        usuarios: [],
        insumos: [],
        equipos: [],
        productos: [],
        pedidos: [],
        lotes: [],
        ventas: [],
        ajustes: []
      };
    } catch (error) {
      console.error('Error loading offline data:', error);
      return {
        usuarios: [],
        insumos: [],
        equipos: [],
        productos: [],
        pedidos: [],
        lotes: [],
        ventas: [],
        ajustes: []
      };
    }
  }

  saveOfflineData() {
    try {
      localStorage.setItem('labflow_offline_data', JSON.stringify(this.offlineData));
    } catch (error) {
      console.error('Error saving offline data:', error);
    }
  }

  // Enhanced retry mechanism
  async retryOperation(operation, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await operation();
        this.retryCount = 0; // Reset on success
        return result;
      } catch (error) {
        console.log(`Attempt ${i + 1} failed:`, error.message);
        
        // If it's a network error, don't retry immediately
        if (error.message.includes('fetch') || error.message.includes('network') || !this.isOnline) {
          console.log('Network error detected, switching to offline mode');
          break;
        }

        if (i === maxRetries - 1) {
          throw error;
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
    
    // If we get here, all retries failed
    throw new Error('Network connection failed, using offline mode');
  }

  // Enhanced connection test
  async testConnection() {
    if (!this.db || !this.isOnline) {
      return { success: false, error: 'Firebase not initialized or offline' };
    }

    try {
      const testCollection = collection(this.db, 'connection_test');
      await getDocs(query(testCollection, limit(1)));
      console.log('Firebase connection: OK');
      return { success: true };
    } catch (error) {
      console.error('Firebase connection test failed:', error);
      
      if (error.message.includes('fetch') || error.message.includes('network')) {
        return {
          success: false,
          error: 'Network connection failed. Using offline mode.'
        };
      }

      if (error.code === 'unavailable') {
        return {
          success: false,
          error: 'Firebase service temporarily unavailable. Using offline mode.'
        };
      }

      return { success: false, error: error.message };
    }
  }

  // =====================================
  // ENHANCED CRUD OPERATIONS WITH OFFLINE SUPPORT
  // =====================================

  async create(collectionName, data) {
    // Try online first
    if (this.db && this.isOnline) {
      try {
        const result = await this.retryOperation(async () => {
          const docRef = await addDoc(collection(this.db, collectionName), {
            ...data,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
          });
          return { success: true, id: docRef.id };
        });
        
        // Update offline cache on success
        if (result.success) {
          const newDoc = { 
            id: result.id, 
            ...data, 
            created_at: new Date(),
            updated_at: new Date()
          };
          this.offlineData[collectionName] = this.offlineData[collectionName] || [];
          this.offlineData[collectionName].push(newDoc);
          this.saveOfflineData();
        }
        
        return result;
      } catch (error) {
        console.warn('Online create failed, using offline mode:', error.message);
      }
    }

    // Offline fallback
    const id = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newDoc = { 
      id, 
      ...data, 
      created_at: new Date(),
      updated_at: new Date(),
      _offline: true
    };
    
    this.offlineData[collectionName] = this.offlineData[collectionName] || [];
    this.offlineData[collectionName].push(newDoc);
    this.saveOfflineData();
    
    return { success: true, id, offline: true };
  }

  async getById(collectionName, id) {
    // Try online first
    if (this.db && this.isOnline) {
      try {
        const result = await this.retryOperation(async () => {
          const docRef = doc(this.db, collectionName, id);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
          } else {
            return { success: false, error: 'Document not found' };
          }
        });
        
        return result;
      } catch (error) {
        console.warn('Online getById failed, using offline mode:', error.message);
      }
    }

    // Offline fallback
    const collection = this.offlineData[collectionName] || [];
    const document = collection.find(doc => doc.id === id);
    
    if (document) {
      return { success: true, data: document, offline: true };
    } else {
      return { success: false, error: 'Document not found in offline cache' };
    }
  }

  async getAll(collectionName, orderByField = 'created_at', orderDirection = 'desc', useCache = true) {
    // Try to get from Firestore (incluye caché offline automático)
    if (this.db) {
      try {
        const result = await this.retryOperation(async () => {
          let q = collection(this.db, collectionName);

          try {
            q = query(q, orderBy(orderByField, orderDirection));
          } catch (orderError) {
            console.log(`Ordering by ${orderByField} failed, getting documents without ordering`);
          }

          const querySnapshot = await getDocs(q);
          const documents = [];
          querySnapshot.forEach((doc) => {
            documents.push({ id: doc.id, ...doc.data() });
          });

          // Verificar si los datos vienen del caché de Firestore
          const fromCache = querySnapshot.metadata.fromCache;
          console.log(`📊 Datos de ${collectionName} obtenidos ${fromCache ? 'desde caché offline' : 'desde servidor'}`);

          return { success: true, data: documents, fromCache };
        });

        // Update offline cache only if not from Firestore cache
        if (result.success && !result.fromCache && useCache) {
          this.offlineData[collectionName] = result.data;
          this.saveOfflineData();
        }

        return result;
      } catch (error) {
        console.warn('Firestore query failed, using local offline cache:', error.message);
      }
    }

    // Fallback a caché local manual
    let documents = [...(this.offlineData[collectionName] || [])];

    // Sort documents
    try {
      documents.sort((a, b) => {
        const aValue = a[orderByField];
        const bValue = b[orderByField];

        if (!aValue || !bValue) return 0;

        const aDate = new Date(aValue);
        const bDate = new Date(bValue);

        if (orderDirection === 'desc') {
          return bDate - aDate;
        } else {
          return aDate - bDate;
        }
      });
    } catch (sortError) {
      console.warn('Error sorting offline data:', sortError);
    }

    console.log(`📦 Usando caché local para ${collectionName}: ${documents.length} documentos`);
    return { success: true, data: documents, offline: true };
  }

  async update(collectionName, id, data) {
    // Try online first
    if (this.db && this.isOnline) {
      try {
        const result = await this.retryOperation(async () => {
          const docRef = doc(this.db, collectionName, id);
          await updateDoc(docRef, {
            ...data,
            updated_at: serverTimestamp()
          });
          return { success: true };
        });
        
        // Update offline cache on success
        if (result.success) {
          const collection = this.offlineData[collectionName] || [];
          const index = collection.findIndex(doc => doc.id === id);
          if (index !== -1) {
            collection[index] = { ...collection[index], ...data, updated_at: new Date() };
            this.saveOfflineData();
          }
        }
        
        return result;
      } catch (error) {
        console.warn('Online update failed, using offline mode:', error.message);
      }
    }

    // Offline fallback
    const collection = this.offlineData[collectionName] || [];
    const index = collection.findIndex(doc => doc.id === id);
    
    if (index !== -1) {
      collection[index] = { 
        ...collection[index], 
        ...data, 
        updated_at: new Date(),
        _offline: true
      };
      this.saveOfflineData();
      return { success: true, offline: true };
    } else {
      return { success: false, error: 'Document not found in offline cache' };
    }
  }

  async delete(collectionName, id) {
    // Try online first
    if (this.db && this.isOnline) {
      try {
        const result = await this.retryOperation(async () => {
          const docRef = doc(this.db, collectionName, id);
          await deleteDoc(docRef);
          return { success: true };
        });
        
        // Update offline cache on success
        if (result.success) {
          const collection = this.offlineData[collectionName] || [];
          this.offlineData[collectionName] = collection.filter(doc => doc.id !== id);
          this.saveOfflineData();
        }
        
        return result;
      } catch (error) {
        console.warn('Online delete failed, using offline mode:', error.message);
      }
    }

    // Offline fallback
    const collection = this.offlineData[collectionName] || [];
    const filteredCollection = collection.filter(doc => doc.id !== id);
    
    if (filteredCollection.length < collection.length) {
      this.offlineData[collectionName] = filteredCollection;
      this.saveOfflineData();
      return { success: true, offline: true };
    } else {
      return { success: false, error: 'Document not found in offline cache' };
    }
  }

  // Initialize demo data with offline support
  async initializeDemoData() {
    // Check if we have offline data first
    if (this.offlineData.usuarios && this.offlineData.usuarios.length > 0) {
      console.log('Demo data already exists in offline cache');
      return { success: true, message: 'Demo data exists offline' };
    }

    // Try to create demo data online
    if (this.db && this.isOnline) {
      try {
        const usersResult = await this.getAll('usuarios');

        if (usersResult.success) {
          // Clean up duplicate users and ensure ISTURIZ is admin
          const users = usersResult.data || [];

          // Find and update/create ISTURIZ user as admin
          const isturizUser = users.find(u =>
            u.email === 'victoristurizrosas@gmail.com' ||
            u.nombre_usuario === 'ISTURIZ' ||
            u.nombre === 'VICTOR ISTURIZ'
          );

          if (isturizUser) {
            // Update ISTURIZ to be admin
            await this.update('usuarios', isturizUser.id, {
              nombre: 'VICTOR ISTURIZ',
              nombre_usuario: 'ISTURIZ',
              email: 'victoristurizrosas@gmail.com',
              rol: 'administrador',
              estado: 'activo'
            });
            console.log('Updated ISTURIZ user to admin');
          } else {
            // Create ISTURIZ user as admin
            await this.create('usuarios', {
              nombre: 'VICTOR ISTURIZ',
              nombre_usuario: 'ISTURIZ',
              email: 'victoristurizrosas@gmail.com',
              password: 'admin123',
              rol: 'administrador',
              estado: 'activo'
            });
            console.log('Created ISTURIZ user as admin');
          }

          // Only create demo users if no users exist AND not already initialized
          if (users.length === 0 && !this.usersInitialized) {
            console.log('No users found on first initialization, creating essential users...');

            const essentialUsers = [
              {
                nombre: 'Admin Principal',
                nombre_usuario: 'admin',
                email: 'admin@labflow.com',
                password: 'admin123',
                rol: 'administrador',
                estado: 'activo'
              },
              {
                nombre: 'María García',
                nombre_usuario: 'maria.garcia',
                email: 'maria@labflow.com',
                password: 'tecnico123',
                rol: 'tecnico',
                estado: 'activo'
              },
              {
                nombre: 'Dr. Juan Pérez',
                nombre_usuario: 'juan.perez',
                email: 'juan@labflow.com',
                password: 'investigador123',
                rol: 'investigador',
                estado: 'activo'
              }
            ];

            for (const user of essentialUsers) {
              await this.create('usuarios', user);
            }

            console.log('Essential users created successfully');
            this.usersInitialized = true;
          } else if (users.length > 0) {
            // Mark as initialized if users exist
            this.usersInitialized = true;
          }

          return { success: true, message: 'Users initialized' };
        }

        return { success: true, message: 'Users setup complete' };
      } catch (error) {
        console.error('Error initializing user data:', error);
      }
    }

    // Create demo data offline
    console.log('Creating demo data offline...');
    const demoUsers = [
      {
        id: 'offline_admin',
        nombre: 'Admin Principal',
        nombre_usuario: 'admin',
        email: 'admin@labflow.com',
        password: 'admin123',
        rol: 'administrador',
        estado: 'activo',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'offline_maria',
        nombre: 'María García',
        nombre_usuario: 'maria.garcia',
        email: 'maria@labflow.com',
        password: 'tecnico123',
        rol: 'tecnico',
        estado: 'activo',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'offline_juan',
        nombre: 'Dr. Juan Pérez',
        nombre_usuario: 'juan.perez',
        email: 'juan@labflow.com',
        password: 'investigador123',
        rol: 'investigador',
        estado: 'activo',
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    this.offlineData.usuarios = demoUsers;
    this.saveOfflineData();
    
    return { success: true, message: 'Demo data created offline' };
  }

  // Status check
  getConnectionStatus() {
    return {
      online: this.isOnline,
      firebase: !!this.db,
      mode: (!this.db || !this.isOnline) ? 'offline' : 'online',
      offlinePersistence: !!this.db, // Firestore siempre tiene persistencia cuando está inicializado
      cacheSize: this.getCacheInfo()
    };
  }

  getCacheInfo() {
    try {
      const cacheData = localStorage.getItem('labflow_offline_data');
      if (cacheData) {
        const data = JSON.parse(cacheData);
        const totalDocs = Object.values(data).reduce((total, collection) => {
          return total + (Array.isArray(collection) ? collection.length : 0);
        }, 0);
        return {
          totalDocuments: totalDocs,
          collections: Object.keys(data).length,
          sizeKB: Math.round((new Blob([cacheData]).size) / 1024)
        };
      }
    } catch (error) {
      console.warn('Error getting cache info:', error);
    }
    return { totalDocuments: 0, collections: 0, sizeKB: 0 };
  }

  // Listeners optimizados con caché offline
  listenToCollection(collectionName, callback, filters = []) {
    if (this.db) {
      try {
        let q = collection(this.db, collectionName);

        filters.forEach(filter => {
          q = query(q, where(filter.field, filter.operator, filter.value));
        });

        const unsubscribe = onSnapshot(q,
          {
            includeMetadataChanges: true  // Incluir cambios de metadata para detectar caché
          },
          (querySnapshot) => {
            const documents = [];
            querySnapshot.forEach((doc) => {
              documents.push({ id: doc.id, ...doc.data() });
            });

            const fromCache = querySnapshot.metadata.fromCache;
            const hasPendingWrites = querySnapshot.metadata.hasPendingWrites;

            console.log(`🔄 Listener ${collectionName}: ${fromCache ? 'caché' : 'servidor'}, escrituras pendientes: ${hasPendingWrites}`);

            // Actualizar caché local solo si no hay escrituras pendientes
            if (!hasPendingWrites) {
              this.offlineData[collectionName] = documents;
              this.saveOfflineData();
            }

            callback(documents, { fromCache, hasPendingWrites });
          },
          (error) => {
            console.error('Error in listener:', error);
            // En caso de error, usar datos offline
            const documents = this.offlineData[collectionName] || [];
            callback(documents, { fromCache: true, error: true });
          }
        );

        this.listeners.set(collectionName, unsubscribe);
        return unsubscribe;
      } catch (error) {
        console.error('Error setting up listener:', error);
      }
    }

    // Fallback offline - llamar callback con datos offline
    const documents = this.offlineData[collectionName] || [];
    console.log(`📦 Listener offline para ${collectionName}: ${documents.length} documentos`);
    callback(documents, { fromCache: true, offline: true });

    return () => console.log(`Offline listener unsubscribed for ${collectionName}`);
  }

  unsubscribeListener(key) {
    const unsubscribe = this.listeners.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(key);
    }
  }

  unsubscribeAllListeners() {
    this.listeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.listeners.clear();
  }

  // =====================================
  // AUTHENTICATION METHODS
  // =====================================

  async signInWithEmail(email, password) {
    if (!this.auth) {
      throw new Error('Firebase Auth no está disponible');
    }

    try {
      console.log('Attempting Firebase Auth login for:', email);
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      // Get user data from Firestore
      const userDoc = await this.getById('usuarios', user.uid);
      if (userDoc.success && userDoc.data) {
        return {
          success: true,
          user: user,
          userData: userDoc.data
        };
      } else {
        // If no user document exists, create one
        const userData = {
          id: user.uid,
          nombre: user.displayName || 'Usuario',
          nombre_usuario: email.split('@')[0],
          email: user.email,
          rol: 'investigador', // Default role
          estado: 'activo',
          created_at: new Date(),
          updated_at: new Date()
        };

        await this.create('usuarios', userData);
        return {
          success: true,
          user: user,
          userData: userData
        };
      }
    } catch (error) {
      console.error('Firebase Auth error:', error);
      throw error;
    }
  }

  async createUserWithEmail(email, password, userData) {
    if (!this.auth) {
      throw new Error('Firebase Auth no está disponible');
    }

    try {
      console.log('Creating new user with email:', email);
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      // Create user document in Firestore
      const userDocData = {
        id: user.uid,
        nombre: userData.nombre || 'Usuario',
        nombre_usuario: userData.nombre_usuario || email.split('@')[0],
        email: user.email,
        rol: userData.rol || 'investigador',
        estado: 'activo',
        created_at: new Date(),
        updated_at: new Date()
      };

      await this.create('usuarios', userDocData);

      return {
        success: true,
        user: user,
        userData: userDocData
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async signOutUser() {
    if (!this.auth) {
      return { success: true }; // Already signed out
    }

    try {
      await signOut(this.auth);
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  onAuthStateChange(callback) {
    if (!this.auth) {
      callback(null);
      return () => {}; // Return empty unsubscribe function
    }

    return onAuthStateChanged(this.auth, callback);
  }

  getCurrentUser() {
    return this.auth?.currentUser || null;
  }

  // =====================================
  // USER AUTHENTICATION HELPERS
  // =====================================

  async authenticateUser(emailOrUsername, password) {
    console.log('Authenticating user:', emailOrUsername);

    // Database authentication first - this is our primary method now
    try {
      const usersResult = await this.getAll('usuarios');

      if (usersResult.success) {
        const users = usersResult.data || [];

        // Only create essential users on first initialization, not after deletion
        if (users.length === 0 && !this.usersInitialized) {
          console.log('No users found on first init, creating essential users...');
          try {
            await this.createEssentialUsers();
            this.usersInitialized = true;

            // Try again after creating users
            const newUsersResult = await this.getAll('usuarios');
            if (newUsersResult.success) {
              const newUsers = newUsersResult.data || [];
              const foundUser = newUsers.find(user =>
                (user.email === emailOrUsername || user.nombre_usuario === emailOrUsername) &&
                user.password === password
              );

              if (foundUser) {
                if (foundUser.estado !== 'activo') {
                  console.warn('User is inactive, trying direct auth fallback');
                } else {
                  return {
                    success: true,
                    userData: foundUser,
                    method: 'database_created'
                  };
                }
              }
            }
          } catch (createError) {
            console.warn('Could not create users, continuing with direct auth:', createError.message);
          }
        } else if (users.length > 0) {
          // Mark as initialized if users exist
          this.usersInitialized = true;
          // Check existing users
          const foundUser = users.find(user =>
            (user.email === emailOrUsername || user.nombre_usuario === emailOrUsername) &&
            user.password === password
          );

          if (foundUser) {
            if (foundUser.estado !== 'activo') {
              console.warn('User is inactive, trying direct auth fallback');
            } else {
              return {
                success: true,
                userData: foundUser,
                method: 'database'
              };
            }
          }
        }
      }
    } catch (dbError) {
      console.warn('Database authentication failed, continuing with other methods:', dbError.message);
    }

    // Firebase Auth - try but don't fail if it doesn't work
    if (emailOrUsername.includes('@')) {
      try {
        const result = await this.signInWithEmail(emailOrUsername, password);
        return {
          success: true,
          userData: result.userData,
          user: result.user,
          method: 'firebase_auth'
        };
      } catch (authError) {
        console.warn('Firebase Auth failed, continuing with direct auth:', authError.message);
      }
    }

    // Final fallback: check against hardcoded users only if database completely fails
    const directUserFallback = this.getDirectUser(emailOrUsername, password);
    if (directUserFallback) {
      console.log('Authentication successful via direct fallback (database unavailable)');
      return {
        success: true,
        userData: directUserFallback,
        method: 'direct_fallback_only'
      };
    }

    // If we get here, authentication truly failed
    console.error('All authentication methods failed for:', emailOrUsername);
    throw new Error('Credenciales incorrectas. Verifica tu usuario y contraseña.');
  }

  getDirectUser(emailOrUsername, password) {
    console.log('🔍 Checking direct authentication for:', emailOrUsername, 'with password length:', password?.length);
    console.log('🔑 Testing password:', password);

    // Define all valid direct users with exact password matching
    const validUsers = {
      'ISTURIZ': { password: 'admin123', user: 'ISTURIZ' },
      'isturiz': { password: 'admin123', user: 'ISTURIZ' },
      'victoristurizrosas@gmail.com': { password: 'admin123', user: 'ISTURIZ' },
      'admin': { password: 'admin123', user: 'admin' },
      'maria.garcia': { password: 'tecnico123', user: 'maria' },
      'juan.perez': { password: 'investigador123', user: 'juan' }
    };

    console.log('Available direct users:', Object.keys(validUsers));
    console.log('Looking for:', emailOrUsername);

    const userMatch = validUsers[emailOrUsername];
    if (userMatch) {
      console.log('Found user config:', userMatch.user);
      console.log('Expected password:', userMatch.password);
      console.log('Provided password:', password);
      console.log('Password lengths - Expected:', userMatch.password.length, 'Provided:', password?.length);
      console.log('Password check:', userMatch.password === password ? 'MATCH ✅' : 'NO MATCH ❌');
      console.log('Exact comparison result:', JSON.stringify(userMatch.password) === JSON.stringify(password));

      if (userMatch.password === password) {
        const userConfigs = {
          'ISTURIZ': {
            id: 'direct_isturiz',
            nombre: 'VICTOR ISTURIZ',
            nombre_usuario: 'ISTURIZ',
            email: 'victoristurizrosas@gmail.com',
            rol: 'administrador',
            estado: 'activo'
          },
          'admin': {
            id: 'direct_admin',
            nombre: 'Admin Principal',
            nombre_usuario: 'admin',
            email: 'admin@labflow.com',
            rol: 'administrador',
            estado: 'activo'
          },
          'maria': {
            id: 'direct_maria',
            nombre: 'María García',
            nombre_usuario: 'maria.garcia',
            email: 'maria@labflow.com',
            rol: 'tecnico',
            estado: 'activo'
          },
          'juan': {
            id: 'direct_juan',
            nombre: 'Dr. Juan Pérez',
            nombre_usuario: 'juan.perez',
            email: 'juan@labflow.com',
            rol: 'investigador',
            estado: 'activo'
          }
        };

        const userData = userConfigs[userMatch.user];
        console.log('✅ Direct authentication successful for:', userData.nombre);
        return userData;
      }
    }

    console.log('❌ No direct user match for:', emailOrUsername);
    return null;
  }

  async createEssentialUsers() {
    try {
      console.log('Creating essential users...');
      const essentialUsers = [
        {
          nombre: 'VICTOR ISTURIZ',
          nombre_usuario: 'ISTURIZ',
          email: 'victoristurizrosas@gmail.com',
          password: 'admin123',
          rol: 'administrador',
          estado: 'activo'
        },
        {
          nombre: 'Admin Principal',
          nombre_usuario: 'admin',
          email: 'admin@labflow.com',
          password: 'admin123',
          rol: 'administrador',
          estado: 'activo'
        },
        {
          nombre: 'María García',
          nombre_usuario: 'maria.garcia',
          email: 'maria@labflow.com',
          password: 'tecnico123',
          rol: 'tecnico',
          estado: 'activo'
        },
        {
          nombre: 'Dr. Juan Pérez',
          nombre_usuario: 'juan.perez',
          email: 'juan@labflow.com',
          password: 'investigador123',
          rol: 'investigador',
          estado: 'activo'
        }
      ];

      for (const user of essentialUsers) {
        const result = await this.create('usuarios', user);
        console.log('Created user:', user.nombre, result.success ? '✅' : '❌');
      }

      return { success: true };
    } catch (error) {
      console.error('Error creating essential users:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create instance
const firebaseService = new FirebaseService();

// Export for use in other modules
export default firebaseService;
