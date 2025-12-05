import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { uploadService } from '../services/api'

interface FileUploadProps {
  sessionId: string
  onFileUpload: (files: any[]) => void
}

interface UploadFile {
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

export default function FileUpload({ sessionId, onFileUpload }: FileUploadProps) {
  const [erFiles, setErFiles] = useState<UploadFile[]>([])
  const [bcFiles, setBcFiles] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const acceptedFileTypes = {
    'application/pdf': ['.pdf'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/bmp': ['.bmp'],
    'image/webp': ['.webp']
  }

  const { getRootProps: getERRootProps, getInputProps: getERInputProps, isDragActive: isERDragActive } = useDropzone({
    accept: acceptedFileTypes,
    maxSize: 50 * 1024 * 1024, // 50MB
    onDrop: (acceptedFiles) => {
      const newFiles = acceptedFiles.map(file => ({
        file,
        status: 'pending' as const
      }))
      setErFiles(prev => [...prev, ...newFiles])
    }
  })

  const { getRootProps: getBCRootProps, getInputProps: getBCInputProps, isDragActive: isBCDragActive } = useDropzone({
    accept: acceptedFileTypes,
    maxSize: 50 * 1024 * 1024, // 50MB
    onDrop: (acceptedFiles) => {
      const newFiles = acceptedFiles.map(file => ({
        file,
        status: 'pending' as const
      }))
      setBcFiles(prev => [...prev, ...newFiles])
    }
  })

  const removeFile = (type: 'er' | 'bc', index: number) => {
    if (type === 'er') {
      setErFiles(prev => prev.filter((_, i) => i !== index))
    } else {
      setBcFiles(prev => prev.filter((_, i) => i !== index))
    }
  }

  const uploadFiles = async () => {
    if (erFiles.length === 0) {
      toast.error('Debes subir al menos un Estado de Resultados')
      return
    }

    setIsUploading(true)
    const uploadedFiles: any[] = []

    try {
      // Subir archivos ER
      if (erFiles.length > 0) {
        setErFiles(prev => prev.map(f => ({ ...f, status: 'uploading' })))
        
        const erFileList = new DataTransfer()
        erFiles.forEach(({ file }) => erFileList.items.add(file))
        
        try {
          const response = await uploadService.uploadER(erFileList.files, sessionId)
          if (response.success) {
            setErFiles(prev => prev.map(f => ({ ...f, status: 'success' })))
            uploadedFiles.push(...response.files)
          }
        } catch (error) {
          setErFiles(prev => prev.map(f => ({ 
            ...f, 
            status: 'error', 
            error: 'Error subiendo archivo' 
          })))
          throw error
        }
      }

      // Subir archivos BC
      if (bcFiles.length > 0) {
        setBcFiles(prev => prev.map(f => ({ ...f, status: 'uploading' })))
        
        const bcFileList = new DataTransfer()
        bcFiles.forEach(({ file }) => bcFileList.items.add(file))
        
        try {
          const response = await uploadService.uploadBC(bcFileList.files, sessionId)
          if (response.success) {
            setBcFiles(prev => prev.map(f => ({ ...f, status: 'success' })))
            uploadedFiles.push(...response.files)
          }
        } catch (error) {
          setBcFiles(prev => prev.map(f => ({ 
            ...f, 
            status: 'error', 
            error: 'Error subiendo archivo' 
          })))
        }
      }

      onFileUpload(uploadedFiles)
      
      // Limpiar archivos después de un delay
      setTimeout(() => {
        setErFiles([])
        setBcFiles([])
      }, 2000)

    } catch (error) {
      console.error('Error en upload:', error)
      toast.error('Error procesando archivos')
    } finally {
      setIsUploading(false)
    }
  }

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'uploading':
        return <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Subir Documentos Financieros
        </h2>
        <p className="text-gray-600">
          Sube tus Estados de Resultados y Balanzas de Comprobación en formato PDF, Excel, Word o imagen.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Estados de Resultados */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            Estados de Resultados <span className="text-red-500">*</span>
          </h3>
          <div
            {...getERRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isERDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getERInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-600">
              {isERDragActive
                ? 'Suelta los archivos aquí...'
                : 'Arrastra archivos aquí o haz clic para seleccionar'}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              PDF, Excel, Word, Imágenes (máx. 50MB)
            </p>
          </div>

          {/* Lista de archivos ER */}
          {erFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              {erFiles.map((uploadFile, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center">
                    {getStatusIcon(uploadFile.status)}
                    <span className="ml-2 text-sm text-gray-700 truncate">
                      {uploadFile.file.name}
                    </span>
                  </div>
                  {uploadFile.status === 'pending' && (
                    <button
                      onClick={() => removeFile('er', index)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Balanzas de Comprobación */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            Balanzas de Comprobación <span className="text-gray-500">(Opcional)</span>
          </h3>
          <div
            {...getBCRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isBCDragActive
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getBCInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-600">
              {isBCDragActive
                ? 'Suelta los archivos aquí...'
                : 'Arrastra archivos aquí o haz clic para seleccionar'}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              PDF, Excel, Word, Imágenes (máx. 50MB)
            </p>
          </div>

          {/* Lista de archivos BC */}
          {bcFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              {bcFiles.map((uploadFile, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center">
                    {getStatusIcon(uploadFile.status)}
                    <span className="ml-2 text-sm text-gray-700 truncate">
                      {uploadFile.file.name}
                    </span>
                  </div>
                  {uploadFile.status === 'pending' && (
                    <button
                      onClick={() => removeFile('bc', index)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Botón de subida */}
      <div className="flex justify-center">
        <button
          onClick={uploadFiles}
          disabled={erFiles.length === 0 || isUploading}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isUploading ? 'Procesando archivos...' : 'Procesar Documentos'}
        </button>
      </div>
    </div>
  )
}
