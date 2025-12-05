import axios from 'axios'

const API_BASE_URL = '/api'

// Configurar axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 segundos para uploads grandes
})

// Interceptor para agregar token de autenticación
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Basic ${token}`
  }
  return config
})

// Tipos
export interface LoginResponse {
  success: boolean
  token: string
  message: string
}

export interface UploadResponse {
  success: boolean
  message: string
  files: Array<{
    id: string
    name: string
    type: 'er' | 'bc'
  }>
}

export interface ChatResponse {
  success: boolean
  response: string
  timestamp: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface FinancialAnalysisResult {
  currentPeriod: string
  previousPeriod: string
  executiveSummary: string
  ratios: {
    grossMargin: number
    grossMarginChange?: string
    operatingMargin: number
    operatingMarginChange?: string
    netMargin: number
    netMarginChange?: string
    salesGrowth: number
  }
  comparativeData: Array<{
    concept: string
    current: number
    previous: number
    variation: number
    percentageChange: number
  }>
  recommendations: string[]
}

// Servicios de autenticación
export const authService = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await api.post('/auth/login', { username, password })
    return response.data
  }
}

// Servicios de upload
export const uploadService = {
  async uploadER(files: FileList, sessionId: string): Promise<UploadResponse> {
    const formData = new FormData()
    Array.from(files).forEach(file => {
      formData.append('files', file)
    })
    
    const response = await api.post('/upload/er', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'session-id': sessionId
      }
    })
    return response.data
  },

  async uploadBC(files: FileList, sessionId: string): Promise<UploadResponse> {
    const formData = new FormData()
    Array.from(files).forEach(file => {
      formData.append('files', file)
    })
    
    const response = await api.post('/upload/bc', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'session-id': sessionId
      }
    })
    return response.data
  },

  async getFiles(sessionId: string) {
    const response = await api.get(`/upload/files/${sessionId}`)
    return response.data
  }
}

// Servicios de chat
export const chatService = {
  async sendMessage(message: string, sessionId: string): Promise<ChatResponse> {
    const response = await api.post('/chat/message', { message, sessionId })
    return response.data
  },

  async getHistory(sessionId: string): Promise<{ messages: ChatMessage[] }> {
    const response = await api.get(`/chat/history/${sessionId}`)
    return response.data
  },

  async clearHistory(sessionId: string): Promise<{ success: boolean }> {
    const response = await api.delete(`/chat/history/${sessionId}`)
    return response.data
  }
}

// Servicios de análisis financiero
export const analysisService = {
  async generateAnalysis(sessionId: string): Promise<FinancialAnalysisResult> {
    const response = await api.post('/analysis/generate', { sessionId })
    return response.data
  },

  async exportToPDF(sessionId: string): Promise<Blob> {
    const response = await api.get(`/analysis/export/${sessionId}`, {
      responseType: 'blob'
    })
    
    // Crear y descargar el archivo
    const blob = new Blob([response.data], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `analisis-financiero-${sessionId}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    return blob
  }
}

export default api
