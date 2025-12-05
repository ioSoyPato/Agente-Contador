import express from 'express';
import { authenticate } from './auth';
import { getProcessedFiles } from './upload';
import { OpenAIService } from '../services/openai';

const router = express.Router();

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Almacenamiento temporal para conversaciones
const conversations: Map<string, ChatMessage[]> = new Map();

// Endpoint para enviar mensaje al chatbot
router.post('/message', authenticate, async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    if (!message || !sessionId) {
      return res.status(400).json({ error: 'Mensaje y sessionId son requeridos' });
    }

    // Obtener archivos procesados para esta sesión
    const processedFiles = getProcessedFiles(sessionId);
    
    if (processedFiles.length === 0) {
      return res.status(400).json({ 
        error: 'No hay archivos procesados. Por favor sube al menos un Estado de Resultados.' 
      });
    }

    // Obtener conversación existente
    const conversation = conversations.get(sessionId) || [];
    
    // Agregar mensaje del usuario
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    conversation.push(userMessage);

    // Preparar contexto para OpenAI
    const context = prepareContext(processedFiles);
    
    // Obtener respuesta de OpenAI
    const openaiService = new OpenAIService();
    const response = await openaiService.getChatResponse(message, context, conversation);

    // Agregar respuesta del asistente
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: response,
      timestamp: new Date()
    };
    conversation.push(assistantMessage);

    // Guardar conversación actualizada
    conversations.set(sessionId, conversation);

    res.json({
      success: true,
      response,
      timestamp: assistantMessage.timestamp
    });

  } catch (error) {
    console.error('Error en chat:', error);
    res.status(500).json({ 
      error: 'Error procesando mensaje',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Endpoint para obtener historial de conversación
router.get('/history/:sessionId', authenticate, (req, res) => {
  const sessionId = req.params.sessionId;
  const conversation = conversations.get(sessionId) || [];
  
  res.json({
    messages: conversation.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp
    }))
  });
});

// Endpoint para limpiar conversación
router.delete('/history/:sessionId', authenticate, (req, res) => {
  const sessionId = req.params.sessionId;
  conversations.delete(sessionId);
  
  res.json({
    success: true,
    message: 'Conversación eliminada'
  });
});

// Función para preparar contexto de archivos procesados
function prepareContext(processedFiles: any[]): string {
  let context = '';
  
  const erFiles = processedFiles.filter(f => f.type === 'er');
  const bcFiles = processedFiles.filter(f => f.type === 'bc');
  
  if (erFiles.length > 0) {
    context += '\n=== ESTADOS DE RESULTADOS ===\n';
    erFiles.forEach((file, index) => {
      context += `\n--- Estado de Resultados ${index + 1} (${file.originalName}) ---\n`;
      context += file.content + '\n';
    });
  }
  
  if (bcFiles.length > 0) {
    context += '\n=== BALANZAS DE COMPROBACIÓN ===\n';
    bcFiles.forEach((file, index) => {
      context += `\n--- Balanza de Comprobación ${index + 1} (${file.originalName}) ---\n`;
      context += file.content + '\n';
    });
  }
  
  return context;
}

export default router;
