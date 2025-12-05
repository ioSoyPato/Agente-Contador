import { useState, useEffect, useRef } from 'react'
import { Download, TrendingUp, TrendingDown, Send, MessageSquare, User, Bot, Calculator, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { analysisService, FinancialAnalysisResult, chatService, ChatMessage } from '../services/api'

interface FinancialAnalysisProps {
  sessionId: string
  hasFiles: boolean
}

interface RatioCard {
  label: string
  value: string
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  description: string
}

export default function FinancialAnalysis({ sessionId, hasFiles }: FinancialAnalysisProps) {
  const [analysis, setAnalysis] = useState<FinancialAnalysisResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [feedbackMessages, setFeedbackMessages] = useState<ChatMessage[]>([])
  const [feedbackInput, setFeedbackInput] = useState('')
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false)
  const [isAnalysisUpdated, setIsAnalysisUpdated] = useState(false)
  const [editingCell, setEditingCell] = useState<{rowIndex: number, field: 'current' | 'previous'} | null>(null)
  const [editValue, setEditValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (hasFiles) {
      generateAnalysis()
    }
  }, [sessionId, hasFiles])

  const generateAnalysis = async () => {
    setIsLoading(true)
    setIsAnalysisUpdated(false)
    try {
      console.log('🔍 Generando análisis para sessionId:', sessionId)
      const result = await analysisService.generateAnalysis(sessionId)
      setAnalysis(result)
      toast.success('Análisis generado exitosamente')
    } catch (error) {
      console.error('Error generando análisis:', error)
      const errorMessage = (error as any).response?.data?.error || 'Error generando análisis financiero'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const exportAnalysis = async () => {
    try {
      await analysisService.exportToPDF(sessionId)
      toast.success('Análisis exportado exitosamente')
    } catch (error) {
      toast.error('Error exportando análisis')
    }
  }

  const sendFeedback = async () => {
    if (!feedbackInput.trim() || isFeedbackLoading) return

    const userMessage = feedbackInput.trim()
    setFeedbackInput('')
    setIsFeedbackLoading(true)

    // Add user message
    const newUserMessage: ChatMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }
    setFeedbackMessages(prev => [...prev, newUserMessage])

    try {
      // Create context with current analysis for feedback
      const analysisContext = analysis ? `
        ANÁLISIS ACTUAL:
        Período: ${analysis.currentPeriod} vs ${analysis.previousPeriod}
        
        Ratios:
        - Margen Bruto: ${analysis.ratios.grossMargin}%
        - Margen Operativo: ${analysis.ratios.operatingMargin}%
        - Crecimiento Ventas: ${analysis.ratios.salesGrowth}%
        
        Resumen Ejecutivo: ${analysis.executiveSummary}
        
        Recomendaciones: ${analysis.recommendations.join(', ')}
        
        INSTRUCCIONES: El usuario quiere modificar o mejorar este análisis. Responde con sugerencias específicas o modificaciones basadas en su feedback.
      ` : ''

      const response = await chatService.sendMessage(
        `${analysisContext}\n\nFEEDBACK DEL USUARIO: ${userMessage}\n\nIMPORTANTE: Si el usuario solicita correcciones o cambios en los datos financieros, proporciona SOLO los valores que necesitan ser corregidos en formato JSON al final de tu respuesta. NO reemplaces toda la tabla, solo incluye los elementos específicos que cambian:\n\n<UPDATED_DATA>\n{"ratios": {"campo_a_cambiar": nuevo_valor}, "comparativeData": [{"concept": "Nombre exacto del concepto a actualizar", "current": nuevo_valor_2024, "previous": nuevo_valor_2023, "variation": nueva_variacion, "percentageChange": nuevo_porcentaje}]}\n</UPDATED_DATA>\n\nEjemplo: Si solo PTU cambia, incluye SOLO PTU en comparativeData, no todos los conceptos.`, 
        sessionId
      )
      
      if (response.success) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.response,
          timestamp: response.timestamp
        }
        setFeedbackMessages(prev => [...prev, assistantMessage])
        
        // Check if response contains updated data
        const updatedDataMatch = response.response.match(/<UPDATED_DATA>\s*(\{[\s\S]*?\})\s*<\/UPDATED_DATA>/)
        if (updatedDataMatch && analysis) {
          try {
            const updatedData = JSON.parse(updatedDataMatch[1])
            console.log('🔄 Datos recibidos del AI:', updatedData)
            console.log('📊 Datos actuales del análisis:', analysis.comparativeData)
            
            // Clean and process the updated data
            const processedData = {
              ratios: updatedData.ratios ? {
                ...analysis.ratios,
                ...Object.fromEntries(
                  Object.entries(updatedData.ratios).map(([key, value]) => [
                    key, 
                    typeof value === 'string' && value !== 'N/A' ? parseFloat(value) : value
                  ])
                )
              } : analysis.ratios,
              comparativeData: updatedData.comparativeData ? 
                // Merge updated items with existing data instead of replacing
                analysis.comparativeData.map(existingItem => {
                  // Find if this item has an update
                  const updatedItem = updatedData.comparativeData.find((newItem: any) => 
                    newItem.concept === existingItem.concept || 
                    existingItem.concept.toLowerCase().includes(newItem.concept.toLowerCase()) ||
                    newItem.concept.toLowerCase().includes(existingItem.concept.toLowerCase())
                  )
                  
                  if (updatedItem) {
                    // Update the existing item with new values
                    return {
                      ...existingItem,
                      current: typeof updatedItem.current === 'string' ? parseFloat(updatedItem.current) || existingItem.current : updatedItem.current,
                      previous: typeof updatedItem.previous === 'string' ? parseFloat(updatedItem.previous) || existingItem.previous : updatedItem.previous,
                      variation: typeof updatedItem.variation === 'string' ? parseFloat(updatedItem.variation) || existingItem.variation : updatedItem.variation,
                      percentageChange: typeof updatedItem.percentageChange === 'string' && updatedItem.percentageChange !== 'N/A' ? 
                        parseFloat(updatedItem.percentageChange) : (updatedItem.percentageChange || existingItem.percentageChange)
                    }
                  }
                  
                  return existingItem // Keep original if no update found
                }) : analysis.comparativeData
            }
            
            // Update the analysis with corrected data
            const updatedAnalysis = {
              ...analysis,
              ...processedData
            }
            
            setAnalysis(updatedAnalysis)
            setIsAnalysisUpdated(true)
            toast.success('Análisis actualizado con las correcciones')
          } catch (error) {
            console.error('Error parsing updated data:', error)
            toast.error('Error procesando datos actualizados')
          }
        }
        
        // Scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      } else {
        toast.error('Error enviando feedback')
      }
    } catch (error) {
      console.error('Error en feedback:', error)
      toast.error('Error procesando feedback')
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Lo siento, hubo un error procesando tu feedback. Por favor intenta de nuevo.',
        timestamp: new Date().toISOString()
      }
      setFeedbackMessages(prev => [...prev, errorMessage])
    } finally {
      setIsFeedbackLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendFeedback()
    }
  }

  const handleCellEdit = (rowIndex: number, field: 'current' | 'previous', currentValue: number) => {
    setEditingCell({ rowIndex, field })
    setEditValue(currentValue.toString())
  }

  const handleCellSave = () => {
    if (!editingCell || !analysis) return

    const newValue = parseFloat(editValue)
    if (isNaN(newValue)) {
      toast.error('Valor inválido')
      setEditingCell(null)
      return
    }

    // Update the analysis data
    const updatedComparativeData = [...analysis.comparativeData]
    updatedComparativeData[editingCell.rowIndex] = {
      ...updatedComparativeData[editingCell.rowIndex],
      [editingCell.field]: newValue,
      variation: editingCell.field === 'current' 
        ? newValue - updatedComparativeData[editingCell.rowIndex].previous
        : updatedComparativeData[editingCell.rowIndex].current - newValue,
      percentageChange: editingCell.field === 'current'
        ? updatedComparativeData[editingCell.rowIndex].previous !== 0 
          ? ((newValue - updatedComparativeData[editingCell.rowIndex].previous) / Math.abs(updatedComparativeData[editingCell.rowIndex].previous)) * 100
          : 0
        : newValue !== 0
          ? ((updatedComparativeData[editingCell.rowIndex].current - newValue) / Math.abs(newValue)) * 100
          : 0
    }

    // Recalculate dependent fields
    const recalculatedData = recalculateFinancialData(updatedComparativeData)

    setAnalysis({
      ...analysis,
      comparativeData: recalculatedData
    })

    setEditingCell(null)
    setIsAnalysisUpdated(true)
    toast.success('Valor actualizado y campos dependientes recalculados')
  }

  const recalculateFinancialData = (data: any[]) => {
    const updatedData = [...data]

    // Find key indices
    const ingresosIndex = updatedData.findIndex(item => item.concept === 'Ingresos')
    const costoVentasIndex = updatedData.findIndex(item => item.concept === 'Costo de Ventas')
    const utilidadBrutaIndex = updatedData.findIndex(item => item.concept === 'Utilidad Bruta')
    const totalIngresosIndex = updatedData.findIndex(item => item.concept === 'Total de Ingresos Operativos')
    const utilidadActivoFijoIndex = updatedData.findIndex(item => item.concept === 'Utilidad Activo Fijo')

    // Recalculate Utilidad Bruta = Ingresos - Costo de Ventas
    if (ingresosIndex >= 0 && costoVentasIndex >= 0 && utilidadBrutaIndex >= 0) {
      const ingresosCurrent = updatedData[ingresosIndex].current
      const ingresosePrevious = updatedData[ingresosIndex].previous
      const costoCurrent = updatedData[costoVentasIndex].current
      const costoPrevious = updatedData[costoVentasIndex].previous

      updatedData[utilidadBrutaIndex] = {
        ...updatedData[utilidadBrutaIndex],
        current: ingresosCurrent - costoCurrent,
        previous: ingresosePrevious - costoPrevious,
        variation: (ingresosCurrent - costoCurrent) - (ingresosePrevious - costoPrevious),
        percentageChange: (ingresosePrevious - costoPrevious) !== 0 
          ? (((ingresosCurrent - costoCurrent) - (ingresosePrevious - costoPrevious)) / Math.abs(ingresosePrevious - costoPrevious)) * 100
          : 0
      }
    }

    // Recalculate Utilidad Activo Fijo = Total Ingresos - Ingresos (Ventas Netas)
    if (totalIngresosIndex >= 0 && ingresosIndex >= 0 && utilidadActivoFijoIndex >= 0) {
      const totalCurrent = updatedData[totalIngresosIndex].current
      const totalPrevious = updatedData[totalIngresosIndex].previous
      const ventasCurrent = updatedData[ingresosIndex].current
      const ventasPrevious = updatedData[ingresosIndex].previous

      updatedData[utilidadActivoFijoIndex] = {
        ...updatedData[utilidadActivoFijoIndex],
        current: totalCurrent - ventasCurrent,
        previous: totalPrevious - ventasPrevious,
        variation: (totalCurrent - ventasCurrent) - (totalPrevious - ventasPrevious),
        percentageChange: (totalPrevious - ventasPrevious) !== 0 
          ? (((totalCurrent - ventasCurrent) - (totalPrevious - ventasPrevious)) / Math.abs(totalPrevious - ventasPrevious)) * 100
          : 0
      }
    }

    return updatedData
  }

  const handleCellCancel = () => {
    setEditingCell(null)
    setEditValue('')
  }

  if (!hasFiles) {
    return (
      <div className="p-6 text-center">
        <Calculator className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Análisis Financiero Automático
        </h3>
        <p className="text-gray-600">
          Sube tus Estados de Resultados para generar un análisis financiero completo con ratios y métricas clave.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Generando análisis financiero...</p>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="p-6 text-center">
        <button
          onClick={generateAnalysis}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center mx-auto"
        >
          <Calculator className="h-5 w-5 mr-2" />
          Generar Análisis Financiero
        </button>
      </div>
    )
  }

  const getRatioCards = (): RatioCard[] => [
    {
      label: 'Margen Bruto',
      value: `${analysis.ratios.grossMargin}%`,
      change: analysis.ratios.grossMarginChange,
      trend: analysis.ratios.grossMarginChange?.startsWith('+') ? 'up' : 'down',
      description: 'Utilidad Bruta / Ventas Netas'
    },
    {
      label: 'Margen Operativo',
      value: `${analysis.ratios.operatingMargin}%`,
      change: analysis.ratios.operatingMarginChange,
      trend: analysis.ratios.operatingMarginChange?.startsWith('+') ? 'up' : 'down',
      description: 'Utilidad Operativa / Ventas Netas'
    },
    {
      label: 'Margen Neto',
      value: `${analysis.ratios.netMargin}%`,
      change: analysis.ratios.netMarginChange,
      trend: analysis.ratios.netMarginChange?.startsWith('+') ? 'up' : 'down',
      description: 'Utilidad Neta / Ventas Netas'
    },
    {
      label: 'Crecimiento Ventas',
      value: `${analysis.ratios.salesGrowth}%`,
      trend: analysis.ratios.salesGrowth > 0 ? 'up' : 'down',
      description: 'Variación en Ventas vs Período Anterior'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">Análisis Financiero</h2>
            {isAnalysisUpdated && (
              <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                Actualizado por IA
              </span>
            )}
          </div>
          <p className="text-gray-600">Análisis automático de Estados de Resultados</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={generateAnalysis}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Actualizar
          </button>
          <button
            onClick={exportAnalysis}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Resumen Ejecutivo */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-blue-600" />
          Resumen Ejecutivo
        </h3>
        <p className="text-gray-700 leading-relaxed">
          {analysis.executiveSummary}
        </p>
      </div>

      {/* Ratios Financieros */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ratios Financieros Clave</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {getRatioCards().map((ratio, index) => (
            <div key={index} className="bg-white p-6 rounded-lg border shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{ratio.label}</h4>
                {ratio.trend && (
                  <div className={`p-1 rounded-full ${
                    ratio.trend === 'up' ? 'bg-green-100' : 
                    ratio.trend === 'down' ? 'bg-red-100' : 'bg-gray-100'
                  }`}>
                    {ratio.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : ratio.trend === 'down' ? (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    ) : null}
                  </div>
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {ratio.value}
              </div>
              {ratio.change && (
                <div className={`text-sm font-medium mb-2 ${
                  ratio.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {ratio.change} vs período anterior
                </div>
              )}
              <p className="text-xs text-gray-500">{ratio.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Análisis Comparativo */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Análisis Comparativo</h3>
          <div className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            💡 Haz clic en los valores para editarlos
          </div>
        </div>
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Concepto
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {analysis.currentPeriod}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {analysis.previousPeriod}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Variación
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    % Variación
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analysis.comparativeData.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.concept}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {editingCell?.rowIndex === index && editingCell?.field === 'current' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-24 px-2 py-1 border rounded text-right"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCellSave()
                              if (e.key === 'Escape') handleCellCancel()
                            }}
                          />
                          <button
                            onClick={handleCellSave}
                            className="text-green-600 hover:text-green-800"
                          >
                            ✓
                          </button>
                          <button
                            onClick={handleCellCancel}
                            className="text-red-600 hover:text-red-800"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleCellEdit(index, 'current', item.current || 0)}
                          className="hover:bg-blue-50 px-2 py-1 rounded w-full text-right"
                        >
                          ${(item.current || 0).toLocaleString()}
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {editingCell?.rowIndex === index && editingCell?.field === 'previous' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-24 px-2 py-1 border rounded text-right"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCellSave()
                              if (e.key === 'Escape') handleCellCancel()
                            }}
                          />
                          <button
                            onClick={handleCellSave}
                            className="text-green-600 hover:text-green-800"
                          >
                            ✓
                          </button>
                          <button
                            onClick={handleCellCancel}
                            className="text-red-600 hover:text-red-800"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleCellEdit(index, 'previous', item.previous || 0)}
                          className="hover:bg-blue-50 px-2 py-1 rounded w-full text-right"
                        >
                          ${(item.previous || 0).toLocaleString()}
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      ${(item.variation || 0).toLocaleString()}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                      typeof item.percentageChange === 'number' && item.percentageChange > 0 ? 'text-green-600' : 
                      typeof item.percentageChange === 'number' && item.percentageChange < 0 ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {typeof item.percentageChange === 'number' ? 
                        `${item.percentageChange > 0 ? '+' : ''}${item.percentageChange.toFixed(1)}%` : 
                        (item.percentageChange || 'N/A')
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recomendaciones */}
      {/* <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Recomendaciones Estratégicas
        </h3>
        <ul className="space-y-2">
          {analysis.recommendations.map((recommendation, index) => (
            <li key={index} className="flex items-start">
              <span className="flex-shrink-0 w-2 h-2 bg-yellow-400 rounded-full mt-2 mr-3"></span>
              <span className="text-gray-700">{recommendation}</span>
            </li>
          ))}
        </ul>
      </div> */}

      {/* Feedback Chat */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between p-4 border-b bg-blue-50">
          <div className="flex items-center">
            <MessageSquare className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">
              Feedback y Mejoras
            </h3>
          </div>
          <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
            Human-in-the-Loop
          </span>
        </div>

        <div className="p-4">
          <p className="text-sm text-gray-600 mb-4">
            ¿Quieres modificar algo del análisis? Comparte tu feedback y el AI ajustará las recomendaciones.
          </p>

          {/* Messages */}
          <div className="max-h-60 overflow-y-auto mb-4 space-y-3">
            {feedbackMessages.length === 0 ? (
              <div className="text-center text-gray-400 py-4">
                <Bot className="mx-auto h-8 w-8 mb-2" />
                <p className="text-sm">Inicia una conversación para mejorar el análisis</p>
              </div>
            ) : (
              feedbackMessages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`flex max-w-[80%] ${
                      message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white ml-2'
                          : 'bg-gray-200 text-gray-600 mr-2'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>
                    <div
                      className={`px-3 py-2 rounded-lg text-sm ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">
                        {message.content}
                      </div>
                      <div
                        className={`text-xs mt-1 ${
                          message.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                        }`}
                      >
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {isFeedbackLoading && (
              <div className="flex justify-start">
                <div className="flex flex-row">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-200 text-gray-600 mr-2 flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-gray-100 px-3 py-2 rounded-lg">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex space-x-2">
            <textarea
              value={feedbackInput}
              onChange={(e) => setFeedbackInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ej: 'Los márgenes parecen bajos, ¿qué estrategias recomiendas?' o 'Enfócate más en el análisis de liquidez'"
              className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              disabled={isFeedbackLoading}
            />
            <button
              onClick={sendFeedback}
              disabled={!feedbackInput.trim() || isFeedbackLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center text-sm"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
