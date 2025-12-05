# 📊 Analizador Financiero - Estados de Resultados

Una aplicación web moderna para el análisis automatizado de Estados de Resultados usando IA. Permite subir documentos financieros en múltiples formatos y obtener análisis inteligente mediante un chatbot especializado.

## ✨ Características

- **📁 Upload Múltiple**: Soporte para PDF, Excel, Word e imágenes
- **🤖 IA Especializada**: Chatbot con GPT-4 para análisis financiero
- **📊 Análisis Automático**: Procesamiento de Estados de Resultados y Balanzas de Comprobación
- **🔐 Autenticación Simple**: Sistema básico de login
- **💻 UI Moderna**: Interfaz responsive con React y TailwindCSS
- **⚡ Monorepo**: Arquitectura organizada con workspaces

## 🏗️ Arquitectura

```
financial-analyzer/
├── packages/
│   ├── backend/          # API Node.js + Express
│   │   ├── src/
│   │   │   ├── routes/   # Rutas de API
│   │   │   ├── services/ # Lógica de negocio
│   │   │   └── index.ts  # Servidor principal
│   │   └── uploads/      # Archivos subidos
│   └── frontend/         # React + TypeScript
│       ├── src/
│       │   ├── components/
│       │   ├── contexts/
│       │   └── services/
│       └── public/
├── .env                  # Variables de entorno
└── package.json         # Configuración del workspace
```

## 🚀 Instalación Rápida

### 1. Clonar e Instalar Dependencias

```bash
# Instalar dependencias del monorepo
npm install

# Instalar dependencias del backend
cd packages/backend && npm install

# Instalar dependencias del frontend
cd ../frontend && npm install
```

### 2. Configurar Variables de Entorno

Edita el archivo `.env` en la raíz del proyecto:

```env
# Autenticación básica
USERNAME=admin
PASSWORD=admin123

# OpenAI Configuration (REQUERIDO)
OPENAI_API_KEY=tu_api_key_de_openai_aqui

# Server Configuration
PORT=3001
NODE_ENV=development

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

**⚠️ IMPORTANTE**: Debes obtener una API key de OpenAI en https://platform.openai.com/api-keys

### 3. Ejecutar la Aplicación

```bash
# Desde la raíz del proyecto, ejecutar ambos servicios
npm run dev
```

Esto iniciará:
- **Backend**: http://localhost:3001
- **Frontend**: http://localhost:3000

## 🔧 Scripts Disponibles

```bash
# Desarrollo (ambos servicios)
npm run dev

# Solo backend
npm run dev:backend

# Solo frontend
npm run dev:frontend

# Build para producción
npm run build

# Iniciar en producción
npm run start
```

## 📝 Uso de la Aplicación

### 1. **Login**
- Usuario: `admin`
- Contraseña: `admin123`
- (Configurable en `.env`)

### 2. **Subir Archivos**
- **Estados de Resultados** (Obligatorio): Sube al menos un archivo
- **Balanzas de Comprobación** (Opcional): Para análisis más completo

**Formatos soportados:**
- 📄 PDF
- 📊 Excel (.xls, .xlsx)
- 📝 Word (.doc, .docx)
- 🖼️ Imágenes (.jpg, .png, .gif, .bmp, .webp)

### 3. **Análisis con IA**
Una vez subidos los archivos, puedes hacer preguntas como:
- "¿Cuál es mi margen de utilidad bruta?"
- "Analiza mis gastos operativos"
- "¿Cómo puedo mejorar mi rentabilidad?"
- "Compara mis ingresos vs gastos"

## 🛠️ Tecnologías Utilizadas

### Backend
- **Node.js** + **Express** - Servidor web
- **TypeScript** - Tipado estático
- **Multer** - Upload de archivos
- **OpenAI API** - Análisis con IA (GPT-4)
- **pdf-parse** - Procesamiento de PDFs
- **xlsx** - Procesamiento de Excel
- **mammoth** - Procesamiento de Word
- **tesseract.js** - OCR para imágenes
- **sharp** - Optimización de imágenes

### Frontend
- **React 18** + **TypeScript** - UI Framework
- **Vite** - Build tool
- **TailwindCSS** - Estilos
- **Lucide React** - Iconos
- **React Dropzone** - Upload de archivos
- **Axios** - Cliente HTTP
- **React Hot Toast** - Notificaciones

## 🔒 Seguridad

- Autenticación básica configurable
- Rate limiting en API
- Validación de tipos de archivo
- Límite de tamaño de archivos (50MB)
- Headers de seguridad con Helmet

## 📊 Procesamiento de Archivos

La aplicación puede procesar:

1. **PDFs**: Extracción directa de texto
2. **Excel**: Lectura de todas las hojas
3. **Word**: Extracción de contenido
4. **Imágenes**: OCR con Tesseract (español + inglés)

Los archivos se procesan y almacenan temporalmente en memoria para análisis.

## 🤖 Integración con OpenAI

- Utiliza **GPT-4 Turbo** para mejor análisis matemático
- Prompts especializados en análisis financiero
- Contexto automático de documentos subidos
- Historial de conversación persistente

## 🐛 Solución de Problemas

### Error: "Cannot find module"
```bash
# Reinstalar dependencias
rm -rf node_modules packages/*/node_modules
npm install
cd packages/backend && npm install
cd ../frontend && npm install
```

### Error: "OPENAI_API_KEY no configurada"
- Asegúrate de tener una API key válida de OpenAI
- Verifica que esté correctamente configurada en `.env`

### Error de CORS
- Verifica que `FRONTEND_URL` en `.env` coincida con la URL del frontend

### Archivos no se procesan
- Verifica que el formato sea soportado
- Revisa el tamaño del archivo (máx. 50MB)
- Consulta los logs del servidor para más detalles

## 📈 Próximas Mejoras

- [ ] Persistencia en base de datos
- [ ] Autenticación JWT
- [ ] Análisis de múltiples períodos
- [ ] Exportación de reportes
- [ ] Dashboard con gráficos
- [ ] API para integraciones

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 📞 Soporte

Si tienes problemas o preguntas:
1. Revisa la sección de solución de problemas
2. Consulta los logs del servidor
3. Abre un issue en GitHub

---

**¡Listo para analizar tus estados financieros! 🚀**
