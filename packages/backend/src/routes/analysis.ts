import { Router, Request, Response } from 'express'
import { authenticate } from './auth'
import { FinancialAnalyzer } from '../services/financialAnalyzer'
import { getProcessedFiles } from './upload'

const router = Router()

// Aplicar autenticación a todas las rutas
router.use(authenticate)

// Generar análisis financiero
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body

    console.log('🔍 Análisis solicitado para sessionId:', sessionId)

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'SessionId es requerido'
      })
    }

    // Verificar que existan archivos procesados para esta sesión
    const processedFiles = getProcessedFiles(sessionId)
    console.log('📁 Archivos encontrados:', processedFiles.length)
    
    if (!processedFiles || processedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No hay archivos procesados para esta sesión'
      })
    }

    const analyzer = new FinancialAnalyzer()
    const analysis = await analyzer.generateAnalysis(sessionId, processedFiles)

    res.json(analysis)
  } catch (error) {
    console.error('Error generando análisis:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
})

// Exportar análisis a PDF
router.get('/export/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params

    // Verificar que existan archivos procesados para esta sesión
    const processedFiles = getProcessedFiles(sessionId)
    if (!processedFiles || processedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No hay archivos procesados para esta sesión'
      })
    }

    const analyzer = new FinancialAnalyzer()
    const pdfBuffer = await analyzer.exportToPDF(sessionId, processedFiles)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="analisis-financiero-${sessionId}.pdf"`)
    res.send(pdfBuffer)
  } catch (error) {
    console.error('Error exportando análisis:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
})

export default router
