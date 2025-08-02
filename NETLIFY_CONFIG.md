# Configuración para Netlify - LabFlow Manager

## Variables de Entorno Requeridas

Agrega estas variables en Netlify (Site settings > Environment variables):

### Firebase Client Configuration
```
REACT_APP_FIREBASE_API_KEY=AIzaSyCxJOpBEXZUo7WrAqDTrlJV_2kJBsL8Ym0
REACT_APP_FIREBASE_AUTH_DOMAIN=labflow-manager.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=labflow-manager
REACT_APP_FIREBASE_STORAGE_BUCKET=labflow-manager.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=742212306654
REACT_APP_FIREBASE_APP_ID=1:742212306654:web:a53bf890fc63cd5d05e44f
REACT_APP_FIREBASE_MEASUREMENT_ID=G-YVZDBCJR3B
```

### Firebase Admin SDK (Para funciones serverless)
```
FIREBASE_SERVICE_ACCOUNT_BASE64=[TU_SERVICE_ACCOUNT_BASE64]
```

## Cómo obtener FIREBASE_SERVICE_ACCOUNT_BASE64

1. **Ve a Firebase Console**: https://console.firebase.google.com/
2. **Selecciona tu proyecto**: labflow-manager
3. **Ve a Project Settings** (ícono de engranaje)
4. **Pestaña "Service accounts"**
5. **Haz clic en "Generate new private key"**
6. **Descarga el archivo JSON**
7. **Convierte a Base64**:

### En Mac/Linux:
```bash
base64 -i tu-archivo-service-account.json | tr -d '\n'
```

### En Windows (PowerShell):
```powershell
[Convert]::ToBase64String([System.IO.File]::ReadAllBytes("tu-archivo-service-account.json"))
```

### Online (opción segura):
- Usa https://www.base64encode.org/
- Pega el contenido completo del JSON
- Copia el resultado

## Build Settings para Netlify

### Build Command:
```
npm run build
```

### Publish Directory:
```
build
```

### Functions Directory:
```
netlify/functions
```

## Estructura de Service Account JSON

Tu archivo service-account.json debe tener esta estructura:
```json
{
  "type": "service_account",
  "project_id": "labflow-manager",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-...@labflow-manager.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-...%40labflow-manager.iam.gserviceaccount.com"
}
```

## Verificación

Una vez configurado, puedes verificar que funciona visitando:
- `https://tu-sitio.netlify.app/.netlify/functions/users`

Si todo está correcto, deberías ver datos de usuarios o un mensaje de estado.
