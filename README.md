# LabFlow Manager - React Application

Sistema de gestión de laboratorio desarrollado en React con Firebase como backend.

## 🚀 Características

- **Autenticación de usuarios** con roles (Administrador, Técnico, Investigador, Supervisor)
- **Dashboard interactivo** con estadísticas y gráficos
- **Gestión de inventario** (insumos, lotes, movimientos)
- **Control de equipos** con historial de mantenimiento
- **Sistema de pedidos** y punto de venta
- **Reportes y análisis** de datos
- **Tema claro/oscuro** adaptable
- **Diseño responsive** para móviles y desktop
- **Notificaciones en tiempo real**

## 🛠️ Tecnologías Utilizadas

- **React 18** - Framework de UI
- **React Router DOM** - Navegación SPA
- **Firebase** - Backend (Firestore, Authentication)
- **CSS Variables** - Sistema de temas
- **Material Design Icons** - Iconografía
- **Netlify** - Hosting y deployment

## 📋 Prerequisitos

- Node.js (v16 o superior)
- npm o yarn
- Cuenta de Firebase
- Cuenta de Netlify (opcional)

## 🔧 Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd labflow-manager
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar Firebase**
   ```bash
   # Copiar el archivo de configuración ejemplo
   cp src/config/firebase.example.js src/config/firebase.js
   
   # Editar firebase.js con tu configuración de Firebase
   ```

4. **Configurar variables de entorno** (opcional)
   ```bash
   # Crear archivo .env.local
   echo "REACT_APP_FIREBASE_API_KEY=tu-api-key" >> .env.local
   echo "REACT_APP_FIREBASE_AUTH_DOMAIN=tu-auth-domain" >> .env.local
   # ... más variables según necesites
   ```

## 🚀 Uso

### Desarrollo
```bash
npm start
```
La aplicación se abrirá en `http://localhost:3000`

### Producción
```bash
npm run build
```
Genera los archivos optimizados en la carpeta `build/`

### Testing
```bash
npm test
```

## 🔐 Configuración de Firebase

1. **Crear proyecto en Firebase**
   - Ve a [Firebase Console](https://console.firebase.google.com/)
   - Crea un nuevo proyecto
   - Habilita Firestore Database

2. **Configurar Firestore**
   ```javascript
   // Reglas de seguridad básicas
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

3. **Crear colecciones**
   - `usuarios` - Información de usuarios
   - `insumos` - Inventario de insumos
   - `equipos` - Equipos del laboratorio
   - `productos` - Productos para venta
   - `pedidos` - Pedidos de clientes
   - `movimientos` - Movimientos de inventario
   - `lotes` - Lotes de productos

## 👥 Roles de Usuario

### Administrador
- Acceso completo al sistema
- Gestión de usuarios
- Configuración del sistema

### Técnico
- Gestión de insumos y equipos
- Registro de movimientos
- Mantenimiento de equipos

### Investigador
- Consulta de inventario
- Creación de pedidos
- Visualización de reportes

### Supervisor
- Supervisión general
- Reportes avanzados
- Gestión de equipos

## 📱 Estructura de la Aplicación

```
src/
├── components/          # Componentes reutilizables
│   ├── Layout/         # Componentes de layout
│   ├── UI/             # Componentes de interfaz
│   └── Notifications/  # Sistema de notificaciones
├── contexts/           # Contextos de React
│   ├── AuthContext.js  # Autenticación
│   ├── ThemeContext.js # Temas
│   └── NotificationContext.js
├── pages/              # Páginas de la aplicación
│   ├── Login/          # Página de login
│   ├── Dashboard/      # Dashboard principal
│   ├── Usuarios/       # Gestión de usuarios
│   └── ...             # Otras páginas
├── services/           # Servicios
│   └── FirebaseService.js
├── config/             # Configuración
│   └── firebase.js     # Config de Firebase
└── App.js              # Componente principal
```

## 🎨 Sistema de Temas

La aplicación soporta tema claro y oscuro usando CSS Variables:

```css
:root {
  --background-primary: #ffffff;
  --text-primary: #1e293b;
  --accent-primary: #0ea5e9;
  /* ... más variables */
}

[data-theme="dark"] {
  --background-primary: rgba(255, 255, 255, 0.05);
  --text-primary: #e6f1ff;
  /* ... variables del tema oscuro */
}
```

## 📊 Funcionalidades del Dashboard

- **KPIs en tiempo real**: Total de insumos, stock bajo, productos por vencer
- **Gráficos interactivos**: Inventario por categoría, estado de pedidos
- **Acciones rápidas**: Enlaces directos a funciones principales
- **Alertas automáticas**: Notificaciones de stock bajo y vencimientos
- **Actividad reciente**: Últimas acciones en el sistema

## 🔔 Sistema de Notificaciones

```javascript
// Uso del sistema de notificaciones
const { showSuccess, showError, showWarning, showInfo } = useNotification();

showSuccess('Éxito', 'Operación completada correctamente');
showError('Error', 'Ha ocurrido un problema');
```

## 📱 Diseño Responsive

La aplicación está optimizada para:
- **Desktop**: Sidebar expandido, vista completa
- **Tablet**: Sidebar colapsable, layout adaptativo
- **Móvil**: Sidebar en overlay, navegación táctil

## 🚀 Deployment en Netlify

1. **Conectar repositorio**
   - Importa el proyecto en Netlify
   - Conecta con tu repositorio de Git

2. **Configurar build**
   ```
   Build command: npm run build
   Publish directory: build
   ```

3. **Variables de entorno**
   ```
   REACT_APP_FIREBASE_API_KEY=tu-api-key
   REACT_APP_FIREBASE_AUTH_DOMAIN=tu-auth-domain
   REACT_APP_FIREBASE_PROJECT_ID=tu-project-id
   REACT_APP_FIREBASE_STORAGE_BUCKET=tu-storage-bucket
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=tu-sender-id
   REACT_APP_FIREBASE_APP_ID=tu-app-id
   ```

## 🔧 Scripts Disponibles

```bash
npm start          # Inicia el servidor de desarrollo
npm run build      # Construye la aplicación para producción
npm test           # Ejecuta las pruebas
npm run eject      # Expone la configuración de Webpack
```

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ve el archivo [LICENSE](LICENSE) para más detalles.

## 📞 Soporte

Si necesitas ayuda:
- Crea un issue en GitHub
- Revisa la documentación de [React](https://reactjs.org/)
- Consulta la documentación de [Firebase](https://firebase.google.com/docs)

## 🚧 Roadmap

- [ ] Autenticación con Firebase Auth
- [ ] Integración con APIs externas
- [ ] Generación de reportes PDF
- [ ] Notificaciones push
- [ ] Modo offline
- [ ] Tests automatizados
- [ ] Documentación de API

---

Desarrollado con ❤️ para la gestión eficiente de laboratorios.
