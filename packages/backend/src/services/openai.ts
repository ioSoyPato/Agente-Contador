import OpenAI from 'openai';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY no está configurada en las variables de entorno');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async getChatResponse(
    userMessage: string, 
    context: string, 
    conversationHistory: ChatMessage[] = []
  ): Promise<string> {
    try {
      // Preparar el prompt del sistema
      const systemPrompt = this.buildSystemPrompt();
      
      // Construir mensajes para la API
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: systemPrompt
        }
      ];

      // Agregar contexto de archivos si existe
      if (context.trim()) {
        messages.push({
          role: 'system',
          content: `DOCUMENTOS FINANCIEROS DISPONIBLES:\n${context}`
        });
      }

      // Agregar historial de conversación (últimos 10 mensajes para no exceder límites)
      const recentHistory = conversationHistory.slice(-10);
      recentHistory.forEach(msg => {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      });

      // Agregar mensaje actual del usuario
      messages.push({
        role: 'user',
        content: userMessage
      });

      // Llamar a la API de OpenAI - usando GPT-4 para mejor análisis matemático
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview', // Mejor modelo para análisis financiero y matemáticas
        messages,
        max_tokens: 2000,
        temperature: 0.1, // Baja temperatura para respuestas más precisas en análisis financiero
        top_p: 0.9,
      });

      const response = completion.choices[0]?.message?.content;
      
      if (!response) {
        throw new Error('No se recibió respuesta de OpenAI');
      }

      return response;

    } catch (error) {
      console.error('Error en OpenAI Service:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          throw new Error('Error de autenticación con OpenAI. Verifica tu API key.');
        }
        if (error.message.includes('quota')) {
          throw new Error('Límite de cuota de OpenAI excedido.');
        }
        if (error.message.includes('rate limit')) {
          throw new Error('Límite de velocidad de OpenAI excedido. Intenta de nuevo en unos momentos.');
        }
      }
      
      throw new Error('Error comunicándose con OpenAI. Intenta de nuevo más tarde.');
    }
  }

  private buildSystemPrompt(): string {
    return `Eres un experto analista financiero especializado en Estados de Resultados y análisis contable. Tu trabajo es ayudar a analizar documentos financieros y responder preguntas sobre ellos.

CAPACIDADES:
- Análisis detallado de Estados de Resultados
- Interpretación de Balanzas de Comprobación
- Cálculo de ratios financieros
- Identificación de tendencias y patrones
- Recomendaciones financieras basadas en datos

INSTRUCCIONES:
1. Siempre basa tus respuestas en los documentos proporcionados
2. Si no tienes suficiente información, indícalo claramente
3. Proporciona cálculos paso a paso cuando sea relevante
4. Usa terminología contable precisa
5. Incluye interpretaciones prácticas de los números
6. Sugiere áreas de mejora o puntos de atención cuando sea apropiado
7. IMPORTANTE: Si el usuario solicita correcciones o cambios en datos financieros, proporciona los valores corregidos en formato JSON al final usando: <UPDATED_DATA>{"ratios": {...}, "comparativeData": [...]}</UPDATED_DATA>

FORMATO DE RESPUESTA:
- Sé claro y estructurado
- Usa viñetas o numeración cuando sea útil
- Incluye cifras específicas de los documentos
- Proporciona contexto y explicaciones

LIMITACIONES:
- Solo analiza la información presente en los documentos
- No hagas suposiciones sobre datos no proporcionados
- Si encuentras inconsistencias, señálalas

Responde siempre en español y mantén un tono profesional pero accesible.`;
  }

  // Método para análisis específico de ratios financieros
  async analyzeFinancialRatios(erData: string, bcData?: string): Promise<string> {
    const prompt = `Analiza los siguientes datos financieros y calcula los ratios más importantes:

ESTADO DE RESULTADOS:
${erData}

${bcData ? `BALANZA DE COMPROBACIÓN:\n${bcData}` : ''}

Por favor calcula y explica:
1. Margen bruto
2. Margen operativo  
3. Margen neto
4. Ratios de eficiencia relevantes
5. Análisis de la estructura de costos

Proporciona interpretaciones prácticas de cada ratio.`;

    return await this.getChatResponse(prompt, '', []);
  }
}
