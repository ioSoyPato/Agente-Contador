import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import sharp from 'sharp';
import Tesseract from 'tesseract.js';

export class FileProcessorService {
  
  async processFile(filePath: string, mimeType: string): Promise<string> {
    try {
      switch (mimeType) {
        case 'application/pdf':
          return await this.processPDF(filePath);
        
        case 'application/vnd.ms-excel':
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
          return await this.processExcel(filePath);
        
        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.processWord(filePath);
        
        case 'image/jpeg':
        case 'image/png':
        case 'image/jpg':
        case 'image/gif':
        case 'image/bmp':
        case 'image/webp':
          return await this.processImage(filePath);
        
        default:
          throw new Error(`Tipo de archivo no soportado: ${mimeType}`);
      }
    } catch (error) {
      console.error(`Error procesando archivo ${filePath}:`, error);
      throw new Error(`Error procesando archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  private async processPDF(filePath: string): Promise<string> {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return this.cleanText(data.text);
  }

  private async processExcel(filePath: string): Promise<string> {
    const workbook = XLSX.readFile(filePath);
    let allText = '';
    
    // Procesar todas las hojas
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      allText += `\n--- Hoja: ${sheetName} ---\n`;
      jsonData.forEach((row: any) => {
        if (Array.isArray(row) && row.length > 0) {
          allText += row.join('\t') + '\n';
        }
      });
    });
    
    return this.cleanText(allText);
  }

  private async processWord(filePath: string): Promise<string> {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return this.cleanText(result.value);
  }

  private async processImage(filePath: string): Promise<string> {
    try {
      // Optimizar imagen para OCR
      const optimizedImagePath = await this.optimizeImageForOCR(filePath);
      
      // Realizar OCR
      const { data: { text } } = await Tesseract.recognize(optimizedImagePath, 'spa+eng', {
        logger: m => console.log(m)
      });
      
      // Limpiar archivo temporal si es diferente al original
      if (optimizedImagePath !== filePath) {
        fs.unlinkSync(optimizedImagePath);
      }
      
      return this.cleanText(text);
    } catch (error) {
      console.error('Error en OCR:', error);
      throw new Error('Error procesando imagen con OCR');
    }
  }

  private async optimizeImageForOCR(filePath: string): Promise<string> {
    try {
      const outputPath = filePath.replace(path.extname(filePath), '_optimized.png');
      
      await sharp(filePath)
        .resize(null, 1200, { withoutEnlargement: true })
        .grayscale()
        .normalize()
        .sharpen()
        .png({ quality: 100 })
        .toFile(outputPath);
      
      return outputPath;
    } catch (error) {
      console.error('Error optimizando imagen:', error);
      return filePath; // Usar imagen original si falla la optimización
    }
  }

  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\t+/g, '\t')
      .replace(/[ ]{2,}/g, ' ')
      .trim();
  }

  // Método para extraer información específica de Estados de Resultados
  extractFinancialData(text: string): any {
    const patterns = {
      ingresos: /(?:ingresos?|ventas?|revenue)[\s\S]*?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
      costos: /(?:costos?|cost)[\s\S]*?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
      gastos: /(?:gastos?|expenses?)[\s\S]*?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
      utilidad: /(?:utilidad|profit|ganancia)[\s\S]*?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi
    };

    const extracted: any = {};
    
    for (const [key, pattern] of Object.entries(patterns)) {
      const matches = text.match(pattern);
      if (matches) {
        extracted[key] = matches.map(match => {
          const numbers = match.match(/\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g);
          return numbers ? numbers[0] : null;
        }).filter(Boolean);
      }
    }

    return extracted;
  }
}
