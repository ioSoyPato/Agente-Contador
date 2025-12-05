import { useState, useEffect } from 'react'
import { LogOut, Calculator, Upload, MessageSquare, Trash2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import FileUpload from './FileUpload'
import ChatInterface from './ChatInterface'
import FinancialAnalysis from './FinancialAnalysis'
import { uploadService } from '../services/api'
import toast from 'react-hot-toast'

interface UploadedFile {
  id: string
  name: string
  type: 'er' | 'bc'
  uploadedAt: string
}

export default function Dashboard() {
  const { logout } = useAuth()
  const [sessionId] = useState(() => `session_${Date.now()}`)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [activeTab, setActiveTab] = useState<'upload' | 'analysis' | 'chat'>('upload')

  useEffect(() => {
    loadFiles()
  }, [])

  const loadFiles = async () => {
    try {
      const response = await uploadService.getFiles(sessionId)
      setUploadedFiles(response.files || [])
    } catch (error) {
      console.error('Error cargando archivos:', error)
    }
  }

  const handleFileUpload = (newFiles: UploadedFile[]) => {
    setUploadedFiles(prev => [...prev, ...newFiles])
    toast.success('Archivos procesados exitosamente')
    
    // Cambiar a análisis si hay archivos ER
    const hasER = newFiles.some(f => f.type === 'er')
    if (hasER) {
      setActiveTab('analysis')
    }
  }

  const clearFiles = () => {
    setUploadedFiles([])
    toast.success('Archivos eliminados')
  }

  const erFiles = uploadedFiles.filter(f => f.type === 'er')
  const bcFiles = uploadedFiles.filter(f => f.type === 'bc')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Calculator className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">
                Analizador Financiero
              </h1>
            </div>
            <button
              onClick={logout}
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('upload')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'upload'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Upload className="h-4 w-4 inline mr-2" />
              Subir Archivos
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analysis'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              disabled={erFiles.length === 0}
            >
              <Calculator className="h-4 w-4 inline mr-2" />
              Análisis Financiero
              {erFiles.length === 0 && (
                <span className="ml-2 text-xs text-gray-400">(Requiere ER)</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'chat'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              disabled={erFiles.length === 0}
            >
              <MessageSquare className="h-4 w-4 inline mr-2" />
              Chat IA
              {erFiles.length === 0 && (
                <span className="ml-2 text-xs text-gray-400">(Requiere ER)</span>
              )}
            </button>
          </nav>
        </div>

        {/* Files Summary */}
        {uploadedFiles.length > 0 && (
          <div className="mb-6 bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Archivos Procesados
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">
                      Estados de Resultados ({erFiles.length})
                    </h4>
                    {erFiles.map(file => (
                      <p key={file.id} className="text-sm text-blue-700 truncate">
                        {file.name}
                      </p>
                    ))}
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">
                      Balanzas de Comprobación ({bcFiles.length})
                    </h4>
                    {bcFiles.map(file => (
                      <p key={file.id} className="text-sm text-green-700 truncate">
                        {file.name}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={clearFiles}
                className="flex items-center px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Limpiar
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          {activeTab === 'upload' ? (
            <FileUpload 
              sessionId={sessionId} 
              onFileUpload={handleFileUpload}
            />
          ) : activeTab === 'analysis' ? (
            <FinancialAnalysis 
              sessionId={sessionId}
              hasFiles={erFiles.length > 0}
            />
          ) : (
            <ChatInterface 
              sessionId={sessionId}
              hasFiles={uploadedFiles.length > 0}
            />
          )}
        </div>
      </div>
    </div>
  )
}
