import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from './auth';
import { FileProcessorService } from '../services/fileProcessor';

const router = express.Router();

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  // Tipos de archivo permitidos
  const allowedTypes = [
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/gif',
    'image/bmp',
    'image/webp'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se permiten PDF, Excel, Word e imágenes.'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB límite
  }
});

// Almacenamiento temporal para archivos procesados
interface ProcessedFile {
  id: string;
  filename: string;
  originalName: string;
  type: 'ER' | 'BC';
  content: string;
  uploadDate: string;
}

const processedFiles: Map<string, ProcessedFile[]> = new Map();

// Endpoint para subir archivos de Estado de Resultados
router.post('/er', authenticate, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'No se subieron archivos' });
    }

    const sessionId = req.headers['session-id'] as string || 'default';
    const fileProcessor = new FileProcessorService();
    const processedFilesList: ProcessedFile[] = [];

    for (const file of req.files) {
      try {
        const content = await fileProcessor.processFile(file.path, file.mimetype);
        
        const processedFile: ProcessedFile = {
          id: file.filename,
          filename: file.filename,
          originalName: file.originalname,
          type: 'ER',
          content,
          uploadDate: new Date().toISOString()
        };

        processedFilesList.push(processedFile);
      } catch (error) {
        console.error(`Error procesando archivo ${file.originalname}:`, error);
        // Continuar con los otros archivos
      }
    }

    // Guardar en memoria temporal
    const existingFiles = processedFiles.get(sessionId) || [];
    const updatedFiles = existingFiles.filter(f => f.type !== 'ER').concat(processedFilesList);
    processedFiles.set(sessionId, updatedFiles);
    
    console.log('📁 Archivos ER guardados para sessionId:', sessionId, 'Total archivos:', updatedFiles.length);

    res.json({
      success: true,
      message: `${processedFilesList.length} archivos de ER procesados exitosamente`,
      files: processedFilesList.map(f => ({
        id: f.id,
        name: f.originalName,
        type: f.type
      }))
    });

  } catch (error) {
    console.error('Error en upload ER:', error);
    res.status(500).json({ error: 'Error procesando archivos de Estado de Resultados' });
  }
});

// Endpoint para subir archivos de Balanza de Comprobación
router.post('/bc', authenticate, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'No se subieron archivos' });
    }

    const sessionId = req.headers['session-id'] as string || 'default';
    const fileProcessor = new FileProcessorService();
    const processedFilesList: ProcessedFile[] = [];

    for (const file of req.files) {
      try {
        const content = await fileProcessor.processFile(file.path, file.mimetype);
        
        const processedFile: ProcessedFile = {
          id: file.filename,
          filename: file.filename,
          originalName: file.originalname,
          type: 'BC',
          content,
          uploadDate: new Date().toISOString()
        };

        processedFilesList.push(processedFile);
      } catch (error) {
        console.error(`Error procesando archivo ${file.originalname}:`, error);
      }
    }

    // Guardar en memoria temporal
    const existingFiles = processedFiles.get(sessionId) || [];
    const updatedFiles = existingFiles.filter(f => f.type !== 'BC').concat(processedFilesList);
    processedFiles.set(sessionId, updatedFiles);

    res.json({
      success: true,
      message: `${processedFilesList.length} archivos de BC procesados exitosamente`,
      files: processedFilesList.map(f => ({
        id: f.id,
        name: f.originalName,
        type: f.type
      }))
    });

  } catch (error) {
    console.error('Error en upload BC:', error);
    res.status(500).json({ error: 'Error procesando archivos de Balanza de Comprobación' });
  }
});

// Endpoint para obtener archivos procesados
router.get('/files/:sessionId', authenticate, (req, res) => {
  const sessionId = req.params.sessionId;
  const files = processedFiles.get(sessionId) || [];
  
  res.json({
    files: files.map(f => ({
      id: f.id,
      name: f.originalName,
      type: f.type,
      uploadDate: f.uploadDate
    }))
  });
});

// Función para obtener contenido de archivos (para uso interno)
export const getProcessedFiles = (sessionId: string): ProcessedFile[] => {
  return processedFiles.get(sessionId) || [];
};

export default router;
