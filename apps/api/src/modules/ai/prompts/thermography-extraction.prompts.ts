/**
 * Thermography Extraction Prompts
 *
 * Structured prompts for extracting data from thermography report images.
 * Uses GPT-4o Vision API with JSON mode for structured outputs.
 *
 * @version 1.0.0
 * @author AI Engineering Team
 */

// =============================================================================
// SYSTEM PROMPTS
// =============================================================================

/**
 * System prompt for thermal image analysis
 * Configures the AI as a Level III Thermographer with specific extraction criteria
 */
export const THERMAL_IMAGE_SYSTEM_PROMPT = `You are a Level III Certified Thermographer with 15+ years of experience analyzing infrared images for electrical systems in data centers and industrial facilities. Your expertise includes:

- FLIR, FLUKE, and Testo thermal imaging equipment
- NETA ATS-2021 and IEEE standards for thermal analysis
- Microsoft Data Center commissioning requirements (CxPOR)
- Electrical distribution systems (switchgear, transformers, PDUs, breakers)

## YOUR TASK
Extract specific data points from thermal images with high precision. You must identify:

1. **Equipment Identification**
   - TAG/ID visible on equipment labels or nameplates
   - Serial number if visible
   - Equipment type and location indicators

2. **Camera Parameters** (typically shown in image overlay/sidebar)
   - Ambient temperature (Tatm, Ta, or "Ambient")
   - Reflected temperature (Trefl, Tr, or "Reflected")
   - Emissivity setting (E, Eps, or epsilon symbol)
   - Distance setting (D, Dist)
   - Humidity (RH, Hum)

3. **Temperature Readings**
   - Maximum temperature (often marked as Sp1, Max, or hottest point)
   - Spot readings (Sp1, Sp2, Sp3, etc.)
   - Delta T if calculated in image
   - Temperature scale range

4. **Instrument Info** (if visible)
   - Camera serial number
   - Camera model

## MICROSOFT DATA CENTER CRITERIA
Temperature thresholds for electrical connections:
| Delta T (C) | Classification | Action Required |
|-------------|---------------|-----------------|
| <= 10       | Normal        | None            |
| 10-25       | Attention     | Monitor         |
| 25-40       | Critical      | Maint. 30 days  |
| > 40        | Emergency     | Immediate       |

## OUTPUT REQUIREMENTS
- Return ONLY valid JSON matching the schema
- Use null for fields that cannot be found
- Confidence scores: 0.95+ for clearly visible, 0.80-0.95 for partially visible, <0.80 for inferred
- Always include the source description of where you found the data

## CRITICAL RULES
1. Do NOT invent or guess values - use null if not visible
2. Temperature values must be numbers (not strings like "25C")
3. Pay attention to temperature units (C vs F) and convert to Celsius
4. For emissivity, typical range is 0.80-0.98 for electrical components
5. Reflected temperature is often close to ambient (within 1-2C)`;

/**
 * System prompt for visible photo analysis (equipment labels, displays)
 */
export const VISIBLE_PHOTO_SYSTEM_PROMPT = `You are an expert data extraction specialist analyzing photos of electrical equipment for audit purposes. Your task is to extract identifying information from equipment labels, nameplates, and instrument displays.

## YOUR TASK
Extract the following from visible photos:

1. **Equipment Identification**
   - TAG/ID on nameplates (format varies: "PDU-A-01", "SWBD-103", "MCC-B-2", etc.)
   - Serial numbers (usually alphanumeric, 6-20 characters)
   - Manufacturer and model information
   - Voltage/amperage ratings if visible

2. **Display Readings** (for test instruments)
   - Numeric value shown on LCD/LED display
   - Units displayed (C, F, ohm, kohm, Mohm, A, V, etc.)
   - Mode/function indicator

3. **Label Information**
   - Warning labels
   - QR codes or barcodes (note presence, cannot decode)
   - Calibration stickers with dates

## COMMON EQUIPMENT TAG FORMATS
- Data Center: PDU-[Building]-[Row]-[Number], UPS-[Area]-[Number]
- Industrial: SWBD-[Area]-[Number], MCC-[Section]-[Number]
- Microsoft specific: Often includes building codes like "BLD-XX-YY"

## OUTPUT REQUIREMENTS
- Return ONLY valid JSON matching the schema
- Use null for fields that cannot be read
- For partially visible text, include what you can see with lower confidence
- Note image quality issues that affect extraction

## CRITICAL RULES
1. If text is blurry or partially obscured, provide what's visible with confidence < 0.80
2. Do NOT guess at obscured characters
3. Serial numbers are case-sensitive - preserve exact casing
4. TAGs often have specific formats - preserve formatting (hyphens, underscores)`;

/**
 * System prompt for calibration certificate analysis
 */
export const CERTIFICATE_SYSTEM_PROMPT = `You are a metrology specialist analyzing calibration certificates for test instruments. Your expertise includes ISO 17025 accredited calibration requirements and certificate interpretation.

## YOUR TASK
Extract key information from calibration certificates:

1. **Certificate Details**
   - Certificate number/ID
   - Issue date (calibration date)
   - Due date / Expiry date
   - Calibration interval (if stated)

2. **Instrument Information**
   - Instrument serial number (CRITICAL - must match equipment)
   - Instrument model
   - Manufacturer
   - Description

3. **Laboratory Information**
   - Laboratory name
   - Accreditation number (A2LA, UKAS, NVLAP, etc.)
   - Accreditation body

4. **Validity Check**
   - Look for "void if not signed" indicators
   - Check for revision numbers
   - Note any limitations or conditions

## COMMON DATE FORMATS
- US: MM/DD/YYYY or MM-DD-YYYY
- International: DD/MM/YYYY or DD-MM-YYYY
- ISO: YYYY-MM-DD
Always convert to ISO format (YYYY-MM-DD) in output

## OUTPUT REQUIREMENTS
- Return ONLY valid JSON matching the schema
- Dates must be in ISO format (YYYY-MM-DD)
- Use null for fields not found
- Serial numbers must be exact - this is used for cross-validation

## CRITICAL RULES
1. Serial number extraction is highest priority - used to verify instrument match
2. Expiry date is critical for compliance checking
3. If date format is ambiguous, note it in warnings
4. Preserve exact serial number format (including any leading zeros)`;

// =============================================================================
// USER PROMPTS (TEMPLATES)
// =============================================================================

/**
 * User prompt template for thermal image extraction
 * @param imageContext Additional context about the image
 */
export function buildThermalImageUserPrompt(imageContext?: {
  pageNumber?: number;
  reportSection?: string;
  expectedEquipmentTag?: string;
}): string {
  let prompt = `Analyze this thermal image and extract all visible data points.

Return a JSON object with this exact structure:
{
  "equipment": {
    "tag": {
      "value": "string or null",
      "confidence": 0.0-1.0,
      "source": "description of where found"
    },
    "serial": {
      "value": "string or null",
      "confidence": 0.0-1.0,
      "source": "description of where found"
    },
    "description": {
      "value": "string or null",
      "confidence": 0.0-1.0,
      "source": "description"
    },
    "location": {
      "value": "string or null",
      "confidence": 0.0-1.0,
      "source": "description"
    }
  },
  "cameraParameters": {
    "ambientTemperature": {
      "value": number or null,
      "confidence": 0.0-1.0,
      "source": "e.g., 'image overlay - top right'"
    },
    "reflectedTemperature": {
      "value": number or null,
      "confidence": 0.0-1.0,
      "source": "description"
    },
    "emissivity": {
      "value": number or null,
      "confidence": 0.0-1.0,
      "source": "description"
    },
    "distance": {
      "value": number or null,
      "confidence": 0.0-1.0,
      "source": "description"
    },
    "humidity": {
      "value": number or null,
      "confidence": 0.0-1.0,
      "source": "description"
    }
  },
  "readings": {
    "maxTemperature": {
      "value": number or null,
      "confidence": 0.0-1.0,
      "source": "description"
    },
    "minTemperature": {
      "value": number or null,
      "confidence": 0.0-1.0,
      "source": "description"
    },
    "avgTemperature": {
      "value": number or null,
      "confidence": 0.0-1.0,
      "source": "description"
    },
    "spotReadings": [
      {
        "label": "Sp1",
        "temperature": {
          "value": number,
          "confidence": 0.0-1.0,
          "source": "description"
        }
      }
    ],
    "deltaT": {
      "value": number or null,
      "confidence": 0.0-1.0,
      "source": "description"
    }
  },
  "instrument": {
    "serialNumber": {
      "value": "string or null",
      "confidence": 0.0-1.0,
      "source": "description"
    },
    "model": {
      "value": "string or null",
      "confidence": 0.0-1.0,
      "source": "description"
    },
    "manufacturer": {
      "value": "string or null",
      "confidence": 0.0-1.0,
      "source": "description"
    }
  },
  "timestamp": {
    "value": "ISO date string or null",
    "confidence": 0.0-1.0,
    "source": "description"
  },
  "overallConfidence": 0.0-1.0,
  "warnings": ["array of any issues or concerns"]
}`;

  if (imageContext?.pageNumber) {
    prompt += `\n\nThis is from page ${imageContext.pageNumber} of the report.`;
  }

  if (imageContext?.reportSection) {
    prompt += `\nReport section: ${imageContext.reportSection}`;
  }

  if (imageContext?.expectedEquipmentTag) {
    prompt += `\nExpected equipment TAG for verification: ${imageContext.expectedEquipmentTag}`;
  }

  return prompt;
}

/**
 * User prompt template for visible photo extraction
 */
export function buildVisiblePhotoUserPrompt(imageContext?: {
  pageNumber?: number;
  expectedTag?: string;
  photoType?: 'nameplate' | 'display' | 'general';
}): string {
  let prompt = `Analyze this photo and extract equipment identification and any display readings.

Return a JSON object with this exact structure:
{
  "equipment": {
    "tag": {
      "value": "string or null",
      "confidence": 0.0-1.0,
      "source": "e.g., 'nameplate top left'"
    },
    "serial": {
      "value": "string or null",
      "confidence": 0.0-1.0,
      "source": "description"
    },
    "description": {
      "value": "string or null",
      "confidence": 0.0-1.0,
      "source": "description"
    },
    "location": {
      "value": "string or null",
      "confidence": 0.0-1.0,
      "source": "description"
    }
  },
  "displayReadings": [
    {
      "value": {
        "value": number,
        "confidence": 0.0-1.0,
        "source": "e.g., 'LCD display center'"
      },
      "unit": {
        "value": "string or null",
        "confidence": 0.0-1.0,
        "source": "description"
      },
      "readingType": "temperature|resistance|voltage|current|other"
    }
  ],
  "additionalInfo": {
    "manufacturer": "string or null",
    "model": "string or null",
    "ratings": "string or null"
  },
  "imageQuality": "good|fair|poor",
  "warnings": ["array of any issues"]
}`;

  if (imageContext?.pageNumber) {
    prompt += `\n\nThis is from page ${imageContext.pageNumber} of the report.`;
  }

  if (imageContext?.expectedTag) {
    prompt += `\nExpected equipment TAG for verification: ${imageContext.expectedTag}`;
  }

  if (imageContext?.photoType) {
    prompt += `\nPhoto type: ${imageContext.photoType} - focus extraction accordingly.`;
  }

  return prompt;
}

/**
 * User prompt template for calibration certificate extraction
 */
export function buildCertificateUserPrompt(imageContext?: {
  expectedSerial?: string;
  instrumentModel?: string;
}): string {
  let prompt = `Analyze this calibration certificate and extract all relevant information.

Return a JSON object with this exact structure:
{
  "certificateNumber": {
    "value": "string or null",
    "confidence": 0.0-1.0,
    "source": "e.g., 'header top right'"
  },
  "instrumentSerial": {
    "value": "string or null",
    "confidence": 0.0-1.0,
    "source": "description"
  },
  "instrumentModel": {
    "value": "string or null",
    "confidence": 0.0-1.0,
    "source": "description"
  },
  "calibrationDate": {
    "value": "YYYY-MM-DD or null",
    "confidence": 0.0-1.0,
    "source": "description"
  },
  "expiryDate": {
    "value": "YYYY-MM-DD or null",
    "confidence": 0.0-1.0,
    "source": "description"
  },
  "laboratoryName": {
    "value": "string or null",
    "confidence": 0.0-1.0,
    "source": "description"
  },
  "accreditationNumber": {
    "value": "string or null",
    "confidence": 0.0-1.0,
    "source": "description"
  },
  "overallConfidence": 0.0-1.0,
  "warnings": ["array of any issues, especially date format ambiguities"]
}`;

  if (imageContext?.expectedSerial) {
    prompt += `\n\nIMPORTANT: Verify if the instrument serial matches: ${imageContext.expectedSerial}`;
  }

  if (imageContext?.instrumentModel) {
    prompt += `\nExpected instrument model: ${imageContext.instrumentModel}`;
  }

  return prompt;
}

// =============================================================================
// FEW-SHOT EXAMPLES
// =============================================================================

/**
 * Few-shot example for thermal image extraction
 * Use this to improve accuracy on complex thermal images
 */
export const THERMAL_IMAGE_FEW_SHOT_EXAMPLE = {
  description: "Example thermal image of electrical panel with FLIR camera",
  expectedOutput: {
    equipment: {
      tag: {
        value: "PDU-A-01",
        confidence: 0.95,
        source: "Label visible on panel door, white text on blue background"
      },
      serial: {
        value: null,
        confidence: 0,
        source: "not_found",
        reason: "Serial number not visible in thermal image"
      },
      description: {
        value: "Power Distribution Unit - Section A",
        confidence: 0.85,
        source: "Inferred from TAG and visible components"
      },
      location: {
        value: "Row A",
        confidence: 0.80,
        source: "Part of TAG designation"
      }
    },
    cameraParameters: {
      ambientTemperature: {
        value: 23.5,
        confidence: 0.98,
        source: "Image overlay sidebar - 'Tatm: 23.5C'"
      },
      reflectedTemperature: {
        value: 23.0,
        confidence: 0.98,
        source: "Image overlay sidebar - 'Trefl: 23.0C'"
      },
      emissivity: {
        value: 0.95,
        confidence: 0.98,
        source: "Image overlay sidebar - 'E: 0.95'"
      },
      distance: {
        value: 1.5,
        confidence: 0.95,
        source: "Image overlay sidebar - 'D: 1.5m'"
      },
      humidity: {
        value: 45,
        confidence: 0.90,
        source: "Image overlay sidebar - 'RH: 45%'"
      }
    },
    readings: {
      maxTemperature: {
        value: 67.8,
        confidence: 0.99,
        source: "Sp1 marker on image - brightest point on breaker connection"
      },
      minTemperature: {
        value: 24.2,
        confidence: 0.95,
        source: "Color scale minimum"
      },
      avgTemperature: {
        value: null,
        confidence: 0,
        source: "not_found",
        reason: "Average not displayed on image"
      },
      spotReadings: [
        {
          label: "Sp1",
          temperature: {
            value: 67.8,
            confidence: 0.99,
            source: "Hotspot marker on phase B connection"
          }
        },
        {
          label: "Sp2",
          temperature: {
            value: 45.2,
            confidence: 0.97,
            source: "Reference point on phase A connection"
          }
        }
      ],
      deltaT: {
        value: 22.6,
        confidence: 0.95,
        source: "Calculated from Sp1 (67.8) - Sp2 (45.2)"
      }
    },
    instrument: {
      serialNumber: {
        value: "63050178",
        confidence: 0.85,
        source: "Partial serial visible in image metadata overlay"
      },
      model: {
        value: "FLIR E96",
        confidence: 0.90,
        source: "Image overlay header"
      },
      manufacturer: {
        value: "FLIR",
        confidence: 0.95,
        source: "Logo visible in image overlay"
      }
    },
    timestamp: {
      value: "2024-03-15T14:32:00",
      confidence: 0.92,
      source: "Image overlay timestamp"
    },
    overallConfidence: 0.91,
    warnings: [
      "Equipment serial not visible in thermal image - recommend checking visible photo",
      "Delta T of 22.6C indicates ATTENTION condition per Microsoft criteria"
    ]
  }
};

/**
 * JSON schema for validation (Zod-compatible structure)
 */
export const THERMAL_EXTRACTION_JSON_SCHEMA = {
  type: "object",
  required: ["equipment", "cameraParameters", "readings", "instrument", "overallConfidence", "warnings"],
  properties: {
    equipment: {
      type: "object",
      properties: {
        tag: { $ref: "#/definitions/extractedFieldString" },
        serial: { $ref: "#/definitions/extractedFieldString" },
        description: { $ref: "#/definitions/extractedFieldString" },
        location: { $ref: "#/definitions/extractedFieldString" }
      }
    },
    cameraParameters: {
      type: "object",
      properties: {
        ambientTemperature: { $ref: "#/definitions/extractedFieldNumber" },
        reflectedTemperature: { $ref: "#/definitions/extractedFieldNumber" },
        emissivity: { $ref: "#/definitions/extractedFieldNumber" },
        distance: { $ref: "#/definitions/extractedFieldNumber" },
        humidity: { $ref: "#/definitions/extractedFieldNumber" }
      }
    },
    readings: {
      type: "object",
      properties: {
        maxTemperature: { $ref: "#/definitions/extractedFieldNumber" },
        minTemperature: { $ref: "#/definitions/extractedFieldNumber" },
        avgTemperature: { $ref: "#/definitions/extractedFieldNumber" },
        spotReadings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              temperature: { $ref: "#/definitions/extractedFieldNumber" }
            }
          }
        },
        deltaT: { $ref: "#/definitions/extractedFieldNumber" }
      }
    },
    instrument: {
      type: "object",
      properties: {
        serialNumber: { $ref: "#/definitions/extractedFieldString" },
        model: { $ref: "#/definitions/extractedFieldString" },
        manufacturer: { $ref: "#/definitions/extractedFieldString" }
      }
    },
    timestamp: { $ref: "#/definitions/extractedFieldString" },
    overallConfidence: { type: "number", minimum: 0, maximum: 1 },
    warnings: { type: "array", items: { type: "string" } }
  },
  definitions: {
    extractedFieldString: {
      type: "object",
      properties: {
        value: { type: ["string", "null"] },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        source: { type: "string" }
      }
    },
    extractedFieldNumber: {
      type: "object",
      properties: {
        value: { type: ["number", "null"] },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        source: { type: "string" }
      }
    }
  }
};

// =============================================================================
// PROMPT VERSIONING
// =============================================================================

export const PROMPT_VERSIONS = {
  THERMAL_IMAGE_SYSTEM: "1.0.0",
  VISIBLE_PHOTO_SYSTEM: "1.0.0",
  CERTIFICATE_SYSTEM: "1.0.0",
  THERMAL_USER: "1.0.0",
  VISIBLE_USER: "1.0.0",
  CERTIFICATE_USER: "1.0.0"
} as const;

/**
 * Get prompt metadata for logging
 */
export function getPromptMetadata(promptType: keyof typeof PROMPT_VERSIONS) {
  return {
    type: promptType,
    version: PROMPT_VERSIONS[promptType],
    timestamp: new Date().toISOString()
  };
}
