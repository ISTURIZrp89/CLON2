import firebaseService from '../services/FirebaseService';

/**
 * Función para corregir el rol de administrador de usuarios específicos
 */
export const fixAdminRole = async (email) => {
  try {
    console.log('🔧 Corrigiendo rol de administrador para:', email);
    
    // Buscar usuario por email
    const usersResult = await firebaseService.getAll('usuarios');
    if (!usersResult.success) {
      throw new Error('No se pudieron cargar los usuarios');
    }
    
    const user = usersResult.data.find(u => u.email === email);
    if (!user) {
      throw new Error(`Usuario con email ${email} no encontrado`);
    }
    
    // Actualizar rol a administrador
    const updateResult = await firebaseService.update('usuarios', user.id, {
      rol: 'administrador',
      role: 'administrador' // Por si acaso usa ambos campos
    });
    
    if (updateResult.success) {
      console.log('✅ Rol de administrador asignado correctamente');
      return { success: true, message: 'Rol actualizado correctamente' };
    } else {
      throw new Error(updateResult.error || 'Error actualizando rol');
    }
    
  } catch (error) {
    console.error('❌ Error corrigiendo rol:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Función para verificar y corregir automáticamente roles de administrador
 */
export const autoFixAdminRoles = async () => {
  const adminEmails = [
    'zeyla@admin.com',
    'admin@labflow.com',
    'victoristurizrosas@gmail.com'
  ];
  
  for (const email of adminEmails) {
    try {
      await fixAdminRole(email);
    } catch (error) {
      console.warn(`No se pudo corregir rol para ${email}:`, error.message);
    }
  }
};

// Función de emergencia que se puede llamar desde la consola
window.fixMyAdminRole = async (email) => {
  const result = await fixAdminRole(email || 'admin@labflow.com');
  console.log('Resultado:', result);
  if (result.success) {
    alert('Rol de administrador asignado. Por favor, cierra sesión y vuelve a iniciar sesión.');
  } else {
    alert(`Error: ${result.error}`);
  }
  return result;
};

console.log('🛠️ Función de emergencia disponible: window.fixMyAdminRole("tu-email@ejemplo.com")');
