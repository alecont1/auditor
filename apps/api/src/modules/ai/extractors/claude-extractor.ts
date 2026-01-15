/**
 * Claude Vision Extractor
 *
 * Integrates with Claude API for real image extraction from thermography reports.
 */

import Anthropic from '@anthropic-ai/sdk';
import { THERMAL_IMAGE_SYSTEM_PROMPT, VISIBLE_PHOTO_SYSTEM_PROMPT, CERTIFICATE_SYSTEM_PROMPT } from '../prompts/thermography-extraction.prompts.js';

// Lazy initialization to allow env to be loaded first
let anthropicClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not set in environment');
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

export interface ExtractionResult {
  equipment?: {
    tag?: string;
    serial?: string;
    description?: string;
    location?: string;
    confidence: number;
  };
  temperatures?: {
    ambient?: number;
    reflected?: number;
    maxTemp?: number;
    minTemp?: number;
    deltaT?: number;
    confidence: number;
  };
  cameraParams?: {
    emissivity?: number;
    distance?: number;
    humidity?: number;
    confidence: number;
  };
  certificate?: {
    serial?: string;
    expiryDate?: string;
    calibrationDate?: string;
    laboratory?: string;
    confidence: number;
  };
  displayReading?: {
    value?: number;
    unit?: string;
    confidence: number;
  };
  rawResponse?: string;
  error?: string;
  tokensUsed?: number;
}

export type ImageType = 'thermal' | 'visible' | 'certificate';

/**
 * Extract data from a single image using Claude Vision
 */
export async function extractFromImage(
  imageBase64: string,
  imageType: ImageType,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg'
): Promise<ExtractionResult> {
  try {
    const systemPrompt = getSystemPrompt(imageType);
    const userPrompt = getUserPrompt(imageType);

    const response = await getClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: userPrompt,
            },
          ],
        },
      ],
    });

    const textContent = response.content.find(c => c.type === 'text');
    const rawText = textContent?.type === 'text' ? textContent.text : '';

    // Parse JSON response
    const parsed = parseClaudeResponse(rawText, imageType);

    return {
      ...parsed,
      rawResponse: rawText,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    };
  } catch (error: any) {
    console.error('Claude extraction error:', error);
    return {
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Extract data from multiple images and merge results
 */
export async function extractFromMultipleImages(
  images: Array<{ base64: string; type: ImageType; mediaType?: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' }>
): Promise<{
  merged: ExtractionResult;
  individual: ExtractionResult[];
  totalTokens: number;
}> {
  const results: ExtractionResult[] = [];
  let totalTokens = 0;

  for (const img of images) {
    const result = await extractFromImage(img.base64, img.type, img.mediaType || 'image/jpeg');
    results.push(result);
    totalTokens += result.tokensUsed || 0;
  }

  // Merge results, preferring higher confidence values
  const merged = mergeResults(results);

  return {
    merged,
    individual: results,
    totalTokens,
  };
}

/**
 * Extract from PDF pages (converted to images)
 */
export async function extractFromPDFPages(
  pages: Array<{ base64: string; pageNumber: number; mediaType?: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' }>
): Promise<{
  equipment: ExtractionResult['equipment'];
  temperatures: ExtractionResult['temperatures'];
  certificate: ExtractionResult['certificate'];
  displayReading: ExtractionResult['displayReading'];
  allResults: ExtractionResult[];
  totalTokens: number;
}> {
  const results: ExtractionResult[] = [];
  let totalTokens = 0;

  // Process each page - detect type based on content
  for (const page of pages) {
    // First pass: try thermal image extraction
    const thermalResult = await extractFromImage(page.base64, 'thermal', page.mediaType);
    results.push(thermalResult);
    totalTokens += thermalResult.tokensUsed || 0;

    // If we found certificate data, also try certificate extraction
    if (page.pageNumber >= pages.length - 2) {
      const certResult = await extractFromImage(page.base64, 'certificate', page.mediaType);
      results.push(certResult);
      totalTokens += certResult.tokensUsed || 0;
    }
  }

  const merged = mergeResults(results);

  return {
    equipment: merged.equipment,
    temperatures: merged.temperatures,
    certificate: merged.certificate,
    displayReading: merged.displayReading,
    allResults: results,
    totalTokens,
  };
}

function getSystemPrompt(imageType: ImageType): string {
  switch (imageType) {
    case 'thermal':
      return THERMAL_IMAGE_SYSTEM_PROMPT;
    case 'visible':
      return VISIBLE_PHOTO_SYSTEM_PROMPT;
    case 'certificate':
      return CERTIFICATE_SYSTEM_PROMPT;
    default:
      return THERMAL_IMAGE_SYSTEM_PROMPT;
  }
}

function getUserPrompt(imageType: ImageType): string {
  switch (imageType) {
    case 'thermal':
      return `Analyze this thermal image and extract all data points. Return a JSON object with the following structure:
{
  "equipment": {
    "tag": "equipment TAG/ID if visible",
    "serial": "serial number if visible",
    "description": "equipment type/description",
    "location": "location indicators if visible",
    "confidence": 0.0-1.0
  },
  "temperatures": {
    "ambient": ambient temperature in Celsius,
    "reflected": reflected temperature in Celsius,
    "maxTemp": maximum temperature reading,
    "minTemp": minimum temperature reading,
    "deltaT": temperature differential if shown,
    "confidence": 0.0-1.0
  },
  "cameraParams": {
    "emissivity": emissivity setting (0.0-1.0),
    "distance": distance in meters,
    "humidity": relative humidity percentage,
    "confidence": 0.0-1.0
  }
}

Return ONLY the JSON, no explanations.`;

    case 'visible':
      return `Analyze this photo and extract equipment identification data. Return a JSON object:
{
  "equipment": {
    "tag": "equipment TAG/ID from label/nameplate",
    "serial": "serial number",
    "description": "equipment type",
    "location": "location info",
    "confidence": 0.0-1.0
  },
  "displayReading": {
    "value": numeric value on display,
    "unit": "unit shown (C, ohm, etc)",
    "confidence": 0.0-1.0
  }
}

Return ONLY the JSON, no explanations.`;

    case 'certificate':
      return `Analyze this calibration certificate and extract data. Return a JSON object:
{
  "certificate": {
    "serial": "certificate serial/number",
    "expiryDate": "expiry date in YYYY-MM-DD format",
    "calibrationDate": "calibration date in YYYY-MM-DD format",
    "laboratory": "calibration laboratory name",
    "instrumentSerial": "instrument serial number",
    "confidence": 0.0-1.0
  },
  "equipment": {
    "serial": "equipment/instrument serial number",
    "description": "instrument model/description",
    "confidence": 0.0-1.0
  }
}

Return ONLY the JSON, no explanations.`;

    default:
      return 'Extract all relevant data from this image. Return as JSON.';
  }
}

function parseClaudeResponse(text: string, _imageType: ImageType): ExtractionResult {
  try {
    // Try to extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { error: 'No JSON found in response' };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      equipment: parsed.equipment,
      temperatures: parsed.temperatures,
      cameraParams: parsed.cameraParams,
      certificate: parsed.certificate,
      displayReading: parsed.displayReading,
    };
  } catch (e) {
    return { error: `JSON parse error: ${e}`, rawResponse: text };
  }
}

function mergeResults(results: ExtractionResult[]): ExtractionResult {
  const merged: ExtractionResult = {};

  for (const result of results) {
    // Merge equipment - prefer higher confidence
    if (result.equipment && (!merged.equipment || result.equipment.confidence > (merged.equipment.confidence || 0))) {
      merged.equipment = result.equipment;
    }

    // Merge temperatures - prefer higher confidence
    if (result.temperatures && (!merged.temperatures || result.temperatures.confidence > (merged.temperatures.confidence || 0))) {
      merged.temperatures = result.temperatures;
    }

    // Merge camera params
    if (result.cameraParams && (!merged.cameraParams || result.cameraParams.confidence > (merged.cameraParams.confidence || 0))) {
      merged.cameraParams = result.cameraParams;
    }

    // Merge certificate
    if (result.certificate && (!merged.certificate || result.certificate.confidence > (merged.certificate.confidence || 0))) {
      merged.certificate = result.certificate;
    }

    // Merge display reading
    if (result.displayReading && (!merged.displayReading || result.displayReading.confidence > (merged.displayReading.confidence || 0))) {
      merged.displayReading = result.displayReading;
    }
  }

  return merged;
}

/**
 * Convert extraction result to format expected by cross-validator
 */
export function toValidatorFormat(result: ExtractionResult, testDate?: string): {
  certificado?: { dataValidade?: string; serial?: string };
  relatorio?: { dataMedicao?: string; tag?: string; serial?: string };
  fotos?: { tag?: string; serial?: string; tempAmbiente?: number; tempRefletida?: number; valorDisplay?: number };
} {
  return {
    certificado: result.certificate ? {
      dataValidade: result.certificate.expiryDate,
      serial: result.certificate.serial,
    } : undefined,
    relatorio: {
      dataMedicao: testDate,
      tag: result.equipment?.tag,
      serial: result.equipment?.serial,
    },
    fotos: {
      tag: result.equipment?.tag,
      serial: result.equipment?.serial,
      tempAmbiente: result.temperatures?.ambient,
      tempRefletida: result.temperatures?.reflected,
      valorDisplay: result.displayReading?.value,
    },
  };
}
