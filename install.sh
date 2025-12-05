#!/bin/bash

echo "🚀 Instalando Analizador Financiero..."
echo "======================================"

# Verificar que Node.js esté instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Por favor instala Node.js 18+ desde https://nodejs.org/"
    exit 1
fi

# Verificar versión de Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Se requiere Node.js 18 o superior. Versión actual: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detectado"

# Instalar dependencias del proyecto raíz
echo "📦 Instalando dependencias del monorepo..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Error instalando dependencias del monorepo"
    exit 1
fi

# Instalar dependencias del backend
echo "📦 Instalando dependencias del backend..."
cd packages/backend
npm install

if [ $? -ne 0 ]; then
    echo "❌ Error instalando dependencias del backend"
    exit 1
fi

# Instalar dependencias del frontend
echo "📦 Instalando dependencias del frontend..."
cd ../frontend
npm install

if [ $? -ne 0 ]; then
    echo "❌ Error instalando dependencias del frontend"
    exit 1
fi

# Volver al directorio raíz
cd ../..

# Verificar que el archivo .env existe
if [ ! -f ".env" ]; then
    echo "⚠️  Archivo .env no encontrado. Copiando desde .env.example..."
    cp .env.example .env
fi

echo ""
echo "🎉 ¡Instalación completada!"
echo "=========================="
echo ""
echo "📝 Próximos pasos:"
echo "1. Edita el archivo .env y agrega tu OPENAI_API_KEY"
echo "2. Ejecuta 'npm run dev' para iniciar la aplicación"
echo ""
echo "🌐 URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo ""
echo "🔐 Credenciales por defecto:"
echo "   Usuario: admin"
echo "   Contraseña: admin123"
echo ""
echo "📚 Para más información, consulta el README.md"
