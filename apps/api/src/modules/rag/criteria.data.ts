/**
 * Analysis Criteria Data
 *
 * Structured criteria for all test types used in AuditEng analysis.
 * These criteria are indexed into the RAG system for context-aware validation.
 *
 * @module rag/criteria-data
 */

import type { TestType } from './types.js';

// =============================================================================
// TYPES
// =============================================================================

export type CriteriaCategory = 'GROUNDING' | 'THERMOGRAPHY' | 'MEGGER' | 'UNIVERSAL';

export type CriteriaSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface CriteriaDocument {
  id: string;
  type: 'STANDARD' | 'CRITERIA' | 'LIMIT' | 'FORMULA' | 'VALIDATION_RULE';
  category: CriteriaCategory;
  title: string;
  content: string;
  metadata: {
    normas?: string[];
    severity?: CriteriaSeverity;
    limit?: string;
    formula?: string;
    applicableTestTypes?: TestType[];
    source?: string;
    priority?: number;
  };
}

// =============================================================================
// UNIVERSAL VALIDATION CRITERIA
// =============================================================================

export const UNIVERSAL_CRITERIA: CriteriaDocument[] = [
  {
    id: 'UNIV-001',
    type: 'VALIDATION_RULE',
    category: 'UNIVERSAL',
    title: 'Calibration Certificate Validity',
    content: `Validation Rule: Calibration Certificate Date Check

The measurement date (data_medicao) MUST be on or before the calibration certificate expiry date (data_validade).

Validation Logic:
- IF data_medicao > data_validade THEN CRITICAL non-conformity
- The report is automatically REJECTED if calibration was expired at time of measurement

Evidence Required:
- Certificate number and expiry date clearly visible
- Measurement date from report header

Common Issues:
- Expired certificates used unknowingly
- Date format confusion (MM/DD vs DD/MM)
- Multiple certificates with different expiry dates`,
    metadata: {
      severity: 'CRITICAL',
      applicableTestTypes: ['GROUNDING', 'MEGGER', 'THERMOGRAPHY'],
      source: 'AuditEng Internal Standard',
      priority: 1,
    },
  },
  {
    id: 'UNIV-002',
    type: 'VALIDATION_RULE',
    category: 'UNIVERSAL',
    title: 'Serial Number Cross-Validation',
    content: `Validation Rule: Equipment Serial Number Consistency

The serial number visible in the equipment photo (serial_foto) MUST exactly match the serial number in the calibration certificate (serial_certificado).

Validation Logic:
- IF serial_foto != serial_certificado THEN CRITICAL non-conformity
- Partial matches or similar numbers are NOT acceptable
- Report is REJECTED if serial numbers do not match

Why This Matters:
- Ensures the calibrated equipment was actually used
- Prevents fraudulent certificate usage
- Required for audit trail compliance

Common Issues:
- Photo quality too low to read serial
- Wrong equipment photographed
- Certificate for different equipment attached`,
    metadata: {
      severity: 'CRITICAL',
      applicableTestTypes: ['GROUNDING', 'MEGGER', 'THERMOGRAPHY'],
      source: 'AuditEng Internal Standard',
      priority: 1,
    },
  },
  {
    id: 'UNIV-003',
    type: 'VALIDATION_RULE',
    category: 'UNIVERSAL',
    title: 'TAG Consistency Validation',
    content: `Validation Rule: TAG Identifier Consistency

The equipment TAG must be consistent across all report sections:
- tag_header: TAG from report header
- tag_foto: TAG visible in equipment photo
- tag_tabela: TAG in data table

Validation Logic:
- IF tag_header != tag_foto OR tag_header != tag_tabela THEN CRITICAL non-conformity
- All three TAGs must be identical
- Report is REJECTED if TAGs are inconsistent

Purpose:
- Ensures data integrity across the report
- Confirms all photos/data relate to same equipment
- Prevents mix-ups in multi-equipment reports

Common Formats:
- Alphanumeric: "EQ-001", "CB-A12", "QGBT-01"
- Location-based: "SS1-QGBT-001"
- Hierarchical: "DATA-CENTER-A/ROOM-1/PDU-01"`,
    metadata: {
      severity: 'CRITICAL',
      applicableTestTypes: ['GROUNDING', 'MEGGER', 'THERMOGRAPHY'],
      source: 'AuditEng Internal Standard',
      priority: 1,
    },
  },
  {
    id: 'UNIV-004',
    type: 'VALIDATION_RULE',
    category: 'UNIVERSAL',
    title: 'Photo Requirements',
    content: `Validation Rule: Mandatory Photo Documentation

All reports MUST include required photographic evidence that is:
- Present: All mandatory photos attached
- Legible: Text and values readable
- Timestamped: Date/time visible when required
- Relevant: Shows the equipment/measurement being reported

Photo Requirements by Test Type:
1. GROUNDING:
   - Equipment setup photo
   - Measurement instrument display
   - Ground rod/connection points
   - Calibration certificate

2. THERMOGRAPHY:
   - Thermal image (infrared)
   - Visual reference image
   - Equipment identification plate
   - Camera/instrument used

3. MEGGER:
   - Test setup photo
   - Instrument reading display
   - Connection points
   - Calibration certificate

Non-Conformity Severity:
- Missing photo: HIGH
- Illegible photo: MEDIUM
- Missing timestamp: LOW (context dependent)`,
    metadata: {
      severity: 'HIGH',
      applicableTestTypes: ['GROUNDING', 'MEGGER', 'THERMOGRAPHY'],
      source: 'AuditEng Internal Standard',
      priority: 2,
    },
  },
];

// =============================================================================
// GROUNDING (ATERRAMENTO) CRITERIA
// =============================================================================

export const GROUNDING_CRITERIA: CriteriaDocument[] = [
  {
    id: 'GND-001',
    type: 'STANDARD',
    category: 'GROUNDING',
    title: 'NBR 5410 - Low Voltage Electrical Installations',
    content: `NBR 5410 - Electrical Installations in Buildings (Low Voltage)

Scope: Applies to low voltage electrical installations in buildings (up to 1000V AC / 1500V DC).

Key Requirements for Grounding:
1. All exposed conductive parts must be connected to ground
2. Ground resistance must ensure safe touch voltage
3. Ground electrodes must be suitable for soil conditions
4. Periodic testing required

Grounding System Types:
- TN-S: Separate neutral and protective conductors
- TN-C-S: Combined in part of system
- TT: Independent ground electrodes
- IT: Isolated or impedance-grounded system

Recommended Ground Resistance: <= 10 ohms for general installations`,
    metadata: {
      normas: ['NBR 5410'],
      applicableTestTypes: ['GROUNDING'],
      source: 'ABNT',
      priority: 1,
    },
  },
  {
    id: 'GND-002',
    type: 'STANDARD',
    category: 'GROUNDING',
    title: 'NBR 5419 - Lightning Protection Systems (SPDA)',
    content: `NBR 5419 - Protection Against Lightning

Scope: Lightning Protection System (SPDA) requirements for buildings and structures.

Parts:
- Part 1: General principles
- Part 2: Risk management
- Part 3: Physical damage and life hazard
- Part 4: Electrical and electronic systems

Grounding Requirements for SPDA:
1. Ground electrode resistance: <= 10 ohms (recommended <= 1 ohm for critical facilities)
2. All down conductors connected to grounding system
3. Equipotential bonding at ground level
4. Minimum 10m spacing between down conductors

Measurement Requirements:
- Annual testing recommended
- After any structural changes
- Post-lightning strike verification

Critical: SPDA ground resistance <= 10 ohms is MANDATORY. Values <= 1 ohm recommended for data centers and critical infrastructure.`,
    metadata: {
      normas: ['NBR 5419'],
      limit: '10 ohms (mandatory), 1 ohm (recommended)',
      applicableTestTypes: ['GROUNDING'],
      source: 'ABNT',
      priority: 1,
    },
  },
  {
    id: 'GND-003',
    type: 'STANDARD',
    category: 'GROUNDING',
    title: 'IEEE 80 - Substation Grounding',
    content: `IEEE 80 - Guide for Safety in AC Substation Grounding

Scope: Safety criteria for grounding in AC substations, including:
- Step voltage limits
- Touch voltage limits
- Ground grid design
- Ground resistance requirements

Key Safety Limits:
1. Step Voltage: Voltage between feet 1m apart
2. Touch Voltage: Voltage between hand and feet
3. Mesh Voltage: Maximum touch voltage within grid

Ground Resistance Guidelines:
- High voltage substations: <= 1 ohm recommended
- Critical substations: <= 0.5 ohms
- Fault current clearing time affects limits

Design Parameters:
- Soil resistivity measurement required
- Grid conductor sizing for fault current
- Surface layer (gravel) considerations

Formula: Ground resistance target depends on:
R <= V_touch / I_fault (simplified)`,
    metadata: {
      normas: ['IEEE 80'],
      limit: '1 ohm (HV substations)',
      applicableTestTypes: ['GROUNDING'],
      source: 'IEEE',
      priority: 1,
    },
  },
  {
    id: 'GND-004',
    type: 'STANDARD',
    category: 'GROUNDING',
    title: 'IEEE 81 - Ground Testing Methods',
    content: `IEEE 81 - Guide for Measuring Earth Resistivity, Ground Impedance, and Earth Surface Potentials

Scope: Test methods for grounding system evaluation.

Measurement Methods:
1. Fall-of-Potential (3-point): Most common
   - Current electrode at 62% of distance
   - Reference voltage measurement
   - Multiple readings for accuracy

2. Wenner Array (4-point): Soil resistivity
   - Equal spacing between electrodes
   - Multiple depths measured
   - Used for grid design

3. Clamp-on Method: In-service testing
   - No disconnection required
   - Measures loop impedance
   - Less accurate than fall-of-potential

Best Practices:
- Test during dry season (worst case)
- Avoid proximity to underground utilities
- Document ambient conditions
- Multiple measurements for validation`,
    metadata: {
      normas: ['IEEE 81'],
      applicableTestTypes: ['GROUNDING'],
      source: 'IEEE',
      priority: 2,
    },
  },
  {
    id: 'GND-005',
    type: 'LIMIT',
    category: 'GROUNDING',
    title: 'Ground Resistance Limits - General Systems',
    content: `Ground Resistance Acceptance Limits - General Installations

Standard Limit (NBR 5410):
- Maximum: 10 ohms
- Recommended: < 5 ohms for better protection

Classification by Application:
| Application                | Max Resistance | Target    |
|----------------------------|----------------|-----------|
| General building           | 10 ohms        | < 5 ohms  |
| Industrial facility        | 5 ohms         | < 2 ohms  |
| Sensitive equipment        | 5 ohms         | < 1 ohm   |
| Telecommunications         | 5 ohms         | < 2 ohms  |

Validation Logic:
- Resistance <= 10 ohms: APPROVED
- Resistance > 10 ohms: REJECTED

Note: Always verify customer-specific requirements which may be more stringent.`,
    metadata: {
      normas: ['NBR 5410', 'NBR 5419'],
      limit: '10 ohms',
      severity: 'HIGH',
      applicableTestTypes: ['GROUNDING'],
      priority: 1,
    },
  },
  {
    id: 'GND-006',
    type: 'LIMIT',
    category: 'GROUNDING',
    title: 'Ground Resistance Limits - SPDA Systems',
    content: `Ground Resistance Acceptance Limits - Lightning Protection (SPDA)

Standard Limit (NBR 5419):
- Maximum mandatory: 10 ohms
- Recommended: <= 1 ohm

Classification:
| Facility Type              | Max Resistance | Recommended |
|----------------------------|----------------|-------------|
| Standard SPDA              | 10 ohms        | < 5 ohms    |
| Data center SPDA           | 10 ohms        | <= 1 ohm    |
| Critical infrastructure    | 5 ohms         | <= 1 ohm    |
| Explosive atmospheres      | 5 ohms         | <= 1 ohm    |

Validation Logic:
- SPDA resistance <= 10 ohms: APPROVED
- SPDA resistance > 10 ohms: REJECTED
- SPDA resistance > 1 ohm (data center): APPROVED_WITH_COMMENTS

Microsoft Data Center Requirement: SPDA <= 1 ohm is MANDATORY for approval without comments.`,
    metadata: {
      normas: ['NBR 5419'],
      limit: '10 ohms (max), 1 ohm (recommended)',
      severity: 'CRITICAL',
      applicableTestTypes: ['GROUNDING'],
      priority: 1,
    },
  },
  {
    id: 'GND-007',
    type: 'LIMIT',
    category: 'GROUNDING',
    title: 'Ground Resistance Limits - Data Centers (Microsoft)',
    content: `Ground Resistance Limits - Microsoft Data Center Standards

Microsoft Data Center Grounding Requirements:

MANDATORY Limits:
| System Type                | Maximum Resistance |
|----------------------------|-------------------|
| Building ground grid       | 1 ohm             |
| SPDA ground                | 1 ohm             |
| Equipment ground           | 1 ohm             |
| Isolated ground            | 1 ohm             |

Validation Logic (Microsoft Standard):
- Resistance <= 1 ohm: APPROVED
- Resistance > 1 ohm and <= 5 ohms: APPROVED_WITH_COMMENTS (requires Energy Marshal review)
- Resistance > 5 ohms: REJECTED

Additional Requirements:
- Test performed with calibrated fall-of-potential method
- Soil moisture conditions documented
- Ground rod material and installation depth verified
- Equipotential bonding resistance < 0.1 ohms

CRITICAL: Microsoft standard is more stringent than NBR. Always verify which standard applies before validation.`,
    metadata: {
      normas: ['Microsoft Data Center Standard'],
      limit: '1 ohm',
      severity: 'CRITICAL',
      applicableTestTypes: ['GROUNDING'],
      source: 'Microsoft',
      priority: 1,
    },
  },
  {
    id: 'GND-008',
    type: 'LIMIT',
    category: 'GROUNDING',
    title: 'Ground Resistance Limits - HV Substations',
    content: `Ground Resistance Limits - High Voltage Substations

IEEE 80 Based Requirements:

Resistance Targets:
| Substation Class           | Maximum Resistance | Target    |
|----------------------------|-------------------|-----------|
| 69kV and below             | 5 ohms            | < 1 ohm   |
| 138kV - 230kV              | 1 ohm             | < 0.5 ohm |
| 345kV and above            | 0.5 ohms          | < 0.25 ohm|

Critical Factors:
- Fault current magnitude
- Fault clearing time
- Soil resistivity
- Grid configuration

Validation Logic:
- Depends on fault current study
- Touch/step voltage compliance required
- Documentation of design parameters mandatory

Note: Substation grounding requires engineering analysis beyond simple resistance check.`,
    metadata: {
      normas: ['IEEE 80', 'IEEE 81'],
      limit: '1 ohm (typical)',
      severity: 'CRITICAL',
      applicableTestTypes: ['GROUNDING'],
      source: 'IEEE',
      priority: 1,
    },
  },
];

// =============================================================================
// THERMOGRAPHY CRITERIA
// =============================================================================

export const THERMOGRAPHY_CRITERIA: CriteriaDocument[] = [
  {
    id: 'THERM-001',
    type: 'STANDARD',
    category: 'THERMOGRAPHY',
    title: 'NBR 15424 - Thermographic Inspection',
    content: `NBR 15424 - Non-destructive Testing - Thermography - Terminology

Scope: Defines terminology and basic concepts for infrared thermography in predictive maintenance.

Key Definitions:
1. Apparent Temperature: Temperature indicated by camera without corrections
2. Emissivity: Surface property affecting IR emission (0-1 scale)
3. Reflected Temperature: IR radiation reflected from surroundings
4. Delta T (ΔT): Temperature difference between points

Measurement Parameters Required:
- Emissivity setting used
- Ambient temperature
- Reflected temperature
- Distance to target
- Humidity (for long distances)

Camera Requirements:
- Calibrated infrared camera
- Valid calibration certificate
- Appropriate spectral range (typically 7.5-14 micrometers)`,
    metadata: {
      normas: ['NBR 15424'],
      applicableTestTypes: ['THERMOGRAPHY'],
      source: 'ABNT',
      priority: 1,
    },
  },
  {
    id: 'THERM-002',
    type: 'STANDARD',
    category: 'THERMOGRAPHY',
    title: 'NBR 15572 - Thermographic Inspection of Electrical Equipment',
    content: `NBR 15572 - Thermographic Inspection of Electrical Equipment in Industrial Plants

Scope: Guidelines for thermographic inspection of electrical systems.

Equipment Categories:
1. Low Voltage: < 1000V
2. Medium Voltage: 1kV - 36kV
3. High Voltage: > 36kV

Inspection Requirements:
- Minimum 40% of rated load during inspection
- Visual inspection before thermal
- Environmental conditions documented
- Equipment energized for meaningful results

Temperature Rise Classification:
Based on temperature rise above reference (ambient or similar component):

| Delta T (ΔT)  | Priority | Recommended Action                    |
|---------------|----------|---------------------------------------|
| < 10 C        | Normal   | Continue routine monitoring           |
| 10-25 C       | Medium   | Investigate at next opportunity       |
| 25-40 C       | High     | Repair as soon as possible            |
| > 40 C        | Critical | Immediate repair required             |

Documentation Required:
- Thermal image with scale
- Visual reference image
- Component identification
- Temperature values and delta T
- Recommended actions`,
    metadata: {
      normas: ['NBR 15572'],
      applicableTestTypes: ['THERMOGRAPHY'],
      source: 'ABNT',
      priority: 1,
    },
  },
  {
    id: 'THERM-003',
    type: 'STANDARD',
    category: 'THERMOGRAPHY',
    title: 'IEEE 1584 - Arc Flash Hazard',
    content: `IEEE 1584 - Guide for Performing Arc Flash Hazard Calculations

Scope: While primarily for arc flash, thermal anomalies can indicate conditions that increase arc flash risk.

Relevance to Thermography:
- Hot connections increase arc flash risk
- Thermal anomalies may indicate loose connections
- Elevated temperatures can indicate overloading

Integration with Thermography:
1. Document thermal anomalies in arc flash assessment
2. Consider increased incident energy at hot spots
3. Update PPE requirements based on findings

Risk Correlation:
| Thermal Finding           | Arc Flash Impact                     |
|---------------------------|--------------------------------------|
| Loose connection (hot)    | Increased arc probability            |
| Overloaded conductor      | Higher available fault current       |
| Damaged insulation        | Reduced withstand capability         |
| Phase imbalance           | Increased neutral current            |

Action: Thermal anomalies should trigger arc flash reassessment.`,
    metadata: {
      normas: ['IEEE 1584'],
      applicableTestTypes: ['THERMOGRAPHY'],
      source: 'IEEE',
      priority: 2,
    },
  },
  {
    id: 'THERM-004',
    type: 'LIMIT',
    category: 'THERMOGRAPHY',
    title: 'Temperature Rise Classification - NETA Standard',
    content: `Temperature Rise Classification - NETA MTS Standard

Delta T (ΔT) Classification:

| Priority   | ΔT Range  | Description           | Action Required                       |
|------------|-----------|----------------------|---------------------------------------|
| Normal     | <= 10 C   | Normal operation     | Continue routine monitoring           |
| Attention  | 10-25 C   | Possible deficiency  | Repair at next scheduled maintenance  |
| Critical   | 25-40 C   | Probable deficiency  | Repair as soon as possible            |
| Emergency  | > 40 C    | Major deficiency     | Repair immediately                    |

Absolute Temperature Limits:
- Connections: Max 70 C rise above ambient
- Insulation Class A: Max 105 C
- Insulation Class B: Max 130 C
- Insulation Class F: Max 155 C
- Insulation Class H: Max 180 C

Validation Logic:
- ΔT <= 10 C: APPROVED
- ΔT 10-25 C: APPROVED_WITH_COMMENTS
- ΔT 25-40 C: APPROVED_WITH_COMMENTS (urgent action)
- ΔT > 40 C: REJECTED (immediate action required)`,
    metadata: {
      normas: ['NETA MTS'],
      limit: 'ΔT <= 10 C (normal)',
      severity: 'CRITICAL',
      applicableTestTypes: ['THERMOGRAPHY'],
      source: 'NETA',
      priority: 1,
    },
  },
  {
    id: 'THERM-005',
    type: 'LIMIT',
    category: 'THERMOGRAPHY',
    title: 'Temperature Rise Classification - Microsoft Standard',
    content: `Temperature Rise Classification - Microsoft Data Center Standard

Microsoft applies STRICTER criteria than standard NETA:

Delta T (ΔT) Classification:
| Classification | ΔT Range  | Required Action                           |
|----------------|-----------|-------------------------------------------|
| Normal         | <= 10 C   | None required                             |
| Attention      | 10-25 C   | Monitor, Energy Marshal comment required  |
| Critical       | 25-40 C   | Repair within 30 days                     |
| Emergency      | > 40 C    | Immediate action, report to management    |

CRITICAL RULE (Microsoft Specific):
ANY temperature rise > 10 C REQUIRES:
- Energy Marshal review
- Written comment/justification
- Action plan documented

Validation Logic (Microsoft):
- ΔT <= 10 C: APPROVED
- ΔT > 10 C without Energy Marshal comment: APPROVED_WITH_COMMENTS (comment required)
- ΔT > 25 C: REJECTED (requires repair plan)
- ΔT > 40 C: REJECTED (emergency)

Photo Requirements (Microsoft):
- Thermal image with temperature scale visible
- Spot measurements labeled
- Reference point clearly marked
- Visual image for context`,
    metadata: {
      normas: ['Microsoft Data Center Standard'],
      limit: 'ΔT <= 10 C',
      severity: 'CRITICAL',
      applicableTestTypes: ['THERMOGRAPHY'],
      source: 'Microsoft',
      priority: 1,
    },
  },
  {
    id: 'THERM-006',
    type: 'VALIDATION_RULE',
    category: 'THERMOGRAPHY',
    title: 'Ambient vs Reflected Temperature Validation',
    content: `Validation Rule: Temperature Parameter Consistency

The ambient temperature and reflected temperature MUST be consistent for accurate thermal measurements.

Validation Rule:
| temp_ambiente - temp_refletida | <= 1 C

Why This Matters:
- Large differences indicate measurement error
- Reflected temperature affects emissivity correction
- Indoor measurements should have minimal difference
- Outdoor measurements may have larger differences (sun exposure)

Validation Logic:
- |T_ambient - T_reflected| <= 1 C: VALID measurement
- |T_ambient - T_reflected| > 1 C: REQUIRES JUSTIFICATION
- |T_ambient - T_reflected| > 5 C: INVALID (re-measurement needed)

Common Causes of Discrepancy:
1. Nearby hot/cold surfaces affecting reflected reading
2. Sunlight or artificial light sources
3. Incorrect parameter entry
4. Camera calibration issue

Action: If difference > 1 C, thermographer must provide written justification.`,
    metadata: {
      severity: 'HIGH',
      limit: '1 C difference',
      applicableTestTypes: ['THERMOGRAPHY'],
      source: 'AuditEng/Microsoft',
      priority: 1,
    },
  },
  {
    id: 'THERM-007',
    type: 'CRITERIA',
    category: 'THERMOGRAPHY',
    title: 'Emissivity Settings Validation',
    content: `Validation Rule: Emissivity Parameter Check

Emissivity affects the accuracy of all temperature readings and must be appropriate for the target surface.

Standard Emissivity Values:
| Surface Type               | Emissivity Range |
|----------------------------|------------------|
| Electrical tape (black)    | 0.95             |
| Painted metal              | 0.90 - 0.95      |
| Oxidized metal             | 0.60 - 0.85      |
| Polished metal             | 0.05 - 0.30      |
| Plastic/rubber             | 0.90 - 0.95      |
| Electrical connections     | 0.70 - 0.95*     |

*Note: Electrical connections vary widely based on surface condition

Validation Rules:
1. Emissivity must be documented in report
2. Value must be appropriate for target surface
3. Consistent emissivity used for comparison points
4. Emissivity < 0.5 requires special justification

Common Issues:
- Using default 0.95 for shiny metal surfaces
- Not adjusting for different surface types
- Comparing temperatures with different emissivity settings`,
    metadata: {
      severity: 'MEDIUM',
      applicableTestTypes: ['THERMOGRAPHY'],
      source: 'AuditEng',
      priority: 2,
    },
  },
  {
    id: 'THERM-008',
    type: 'CRITERIA',
    category: 'THERMOGRAPHY',
    title: 'Load Condition Requirements',
    content: `Validation Rule: Minimum Load for Valid Thermography

Thermal inspection MUST be performed under adequate load conditions to detect anomalies.

Minimum Load Requirements:
| Inspection Type            | Minimum Load  | Preferred Load |
|----------------------------|---------------|----------------|
| Routine maintenance        | 40% rated     | > 60% rated    |
| Commissioning              | 50% rated     | > 80% rated    |
| Warranty/acceptance        | 80% rated     | > 90% rated    |
| Problem investigation      | As found      | As found       |

Validation Logic:
1. Load current/percentage SHOULD be documented
2. If load < 40%, findings may be INCONCLUSIVE
3. No-load inspection is NOT VALID for acceptance

Temperature Correction for Load:
Actual temperature rise proportional to I² (current squared)
At 50% load, temperature rise is ~25% of full load value

Important:
- Document load conditions at time of inspection
- Note if load was artificially created for test
- Consider time of day / seasonal variations`,
    metadata: {
      severity: 'MEDIUM',
      applicableTestTypes: ['THERMOGRAPHY'],
      source: 'NETA/NBR 15572',
      priority: 2,
    },
  },
];

// =============================================================================
// MEGGER (INSULATION RESISTANCE) CRITERIA
// =============================================================================

export const MEGGER_CRITERIA: CriteriaDocument[] = [
  {
    id: 'MEG-001',
    type: 'STANDARD',
    category: 'MEGGER',
    title: 'IEEE 43 - Insulation Resistance Testing of Rotating Machinery',
    content: `IEEE 43 - Recommended Practice for Testing Insulation Resistance of Electric Machinery

Scope: Test procedures and acceptance criteria for rotating electrical machinery insulation.

Test Voltages by Machine Rating:
| Machine Voltage Rating | Test Voltage (DC) |
|-----------------------|-------------------|
| < 1000V               | 500V or 1000V     |
| 1000V - 2500V         | 1000V - 2500V     |
| 2500V - 5000V         | 2500V - 5000V     |
| 5000V - 12000V        | 5000V - 10000V    |
| > 12000V              | 5000V - 10000V    |

Test Duration:
- Standard: 1 minute reading (R_1min)
- Extended: 10 minute reading (R_10min) for PI calculation
- Spot check: 30s and 60s for DAR calculation

Temperature Correction:
Insulation resistance doubles for every 10 C decrease in temperature.
Correct all readings to reference temperature (typically 40 C).

R_40C = R_measured x K_temperature

K varies with insulation class (see IEEE 43 tables).`,
    metadata: {
      normas: ['IEEE 43'],
      applicableTestTypes: ['MEGGER'],
      source: 'IEEE',
      priority: 1,
    },
  },
  {
    id: 'MEG-002',
    type: 'STANDARD',
    category: 'MEGGER',
    title: 'IEEE 95 - Insulation Testing for AC High Voltage Machines',
    content: `IEEE 95 - Recommended Practice for Insulation Testing of AC Electric Machinery

Scope: AC electrical machines rated 2300V and above.

Test Types:
1. DC Insulation Resistance Test
   - Standard megger test
   - Measures overall insulation condition

2. Polarization Index Test
   - Ratio of 10-minute to 1-minute readings
   - Indicates insulation contamination/moisture

3. Step Voltage Test
   - Progressive voltage application
   - Detects voltage-dependent weaknesses

Minimum IR Values (IEEE 95):
R_minimum = kV + 1 (in Megohms)

Where:
- kV = rated voltage in kilovolts
- +1 = safety margin

Example:
- 4.16kV motor: R_min = 4.16 + 1 = 5.16 Mohm (round to 5 Mohm)
- 13.8kV motor: R_min = 13.8 + 1 = 14.8 Mohm (round to 15 Mohm)`,
    metadata: {
      normas: ['IEEE 95'],
      formula: 'R_min = kV + 1 Mohm',
      applicableTestTypes: ['MEGGER'],
      source: 'IEEE',
      priority: 1,
    },
  },
  {
    id: 'MEG-003',
    type: 'STANDARD',
    category: 'MEGGER',
    title: 'NBR 5383 - Rotating Electrical Machines Testing',
    content: `NBR 5383 - Rotating Electrical Machines - Induction Motors

Scope: Testing procedures for induction motors including insulation testing.

Insulation Test Requirements:
1. Pre-test conditions:
   - Motor at ambient temperature (or corrected)
   - All accessories disconnected
   - Windings discharged before handling

2. Test procedure:
   - Apply DC voltage for specified duration
   - Record current/resistance at intervals
   - Allow proper discharge after test

3. Documentation:
   - Test voltage used
   - Ambient temperature
   - Humidity if available
   - Time-resistance curve if PI calculated

Acceptance Criteria (NBR 5383):
Based on IEEE 43 methodology with Brazilian equipment considerations.

Motor Condition Assessment:
| IR Value (Mohm)    | Condition Assessment           |
|--------------------|--------------------------------|
| > 100 Mohm         | Excellent                      |
| 10 - 100 Mohm      | Good                           |
| 1 - 10 Mohm        | Requires attention             |
| < 1 Mohm           | Unsatisfactory - investigate   |`,
    metadata: {
      normas: ['NBR 5383'],
      applicableTestTypes: ['MEGGER'],
      source: 'ABNT',
      priority: 1,
    },
  },
  {
    id: 'MEG-004',
    type: 'FORMULA',
    category: 'MEGGER',
    title: 'Minimum Insulation Resistance Formula',
    content: `Formula: Minimum Insulation Resistance (IEEE 43/95)

R_minimum = (kV + 1) Megohms

Where:
- R_minimum: Minimum acceptable insulation resistance
- kV: Equipment rated voltage in kilovolts

Examples:
| Equipment Voltage | R_min Calculation     | Minimum IR |
|-------------------|----------------------|------------|
| 480V (0.48kV)     | 0.48 + 1 = 1.48     | 2 Mohm     |
| 2.4kV             | 2.4 + 1 = 3.4       | 4 Mohm     |
| 4.16kV            | 4.16 + 1 = 5.16     | 6 Mohm     |
| 6.9kV             | 6.9 + 1 = 7.9       | 8 Mohm     |
| 13.8kV            | 13.8 + 1 = 14.8     | 15 Mohm    |

Validation Logic:
- IR >= R_min: APPROVED
- IR < R_min but > 1 Mohm: APPROVED_WITH_COMMENTS (investigate)
- IR < 1 Mohm: REJECTED (unsafe condition)

Important Notes:
1. Apply temperature correction before comparison
2. Consider trending (compare to previous readings)
3. New equipment should exceed minimum by large margin`,
    metadata: {
      normas: ['IEEE 43', 'IEEE 95'],
      formula: 'R_min = kV + 1 Mohm',
      severity: 'CRITICAL',
      applicableTestTypes: ['MEGGER'],
      priority: 1,
    },
  },
  {
    id: 'MEG-005',
    type: 'FORMULA',
    category: 'MEGGER',
    title: 'Polarization Index (PI) Calculation',
    content: `Formula: Polarization Index (PI)

PI = R_10min / R_1min

Where:
- PI: Polarization Index (dimensionless ratio)
- R_10min: Insulation resistance at 10 minutes
- R_1min: Insulation resistance at 1 minute

Interpretation (IEEE 43):
| PI Value    | Insulation Condition               |
|-------------|-----------------------------------|
| < 1.0       | Dangerous - do not energize       |
| 1.0 - 2.0   | Questionable - investigate        |
| 2.0 - 4.0   | Good                              |
| > 4.0       | Excellent                         |

Validation Logic:
- PI >= 2.0: APPROVED
- PI 1.5 - 2.0: APPROVED_WITH_COMMENTS (marginal)
- PI 1.0 - 1.5: APPROVED_WITH_COMMENTS (requires investigation)
- PI < 1.0: REJECTED (do not energize)

Notes:
1. PI < 2.0 may indicate:
   - Moisture contamination
   - Dirty insulation surface
   - Cracked or damaged insulation
   - Conductive contamination

2. Very high PI (> 6) may indicate:
   - Extremely dry insulation (can be brittle)
   - Recently cleaned/dried machine`,
    metadata: {
      normas: ['IEEE 43'],
      formula: 'PI = R_10min / R_1min',
      limit: 'PI >= 2.0',
      severity: 'CRITICAL',
      applicableTestTypes: ['MEGGER'],
      priority: 1,
    },
  },
  {
    id: 'MEG-006',
    type: 'FORMULA',
    category: 'MEGGER',
    title: 'Dielectric Absorption Ratio (DAR)',
    content: `Formula: Dielectric Absorption Ratio (DAR)

DAR = R_60s / R_30s

Where:
- DAR: Dielectric Absorption Ratio (dimensionless)
- R_60s: Insulation resistance at 60 seconds
- R_30s: Insulation resistance at 30 seconds

Interpretation:
| DAR Value   | Insulation Condition               |
|-------------|-----------------------------------|
| < 1.0       | Poor - possible contamination      |
| 1.0 - 1.25  | Questionable                       |
| 1.25 - 1.6  | Acceptable                         |
| > 1.6       | Good                               |

Validation Logic:
- DAR >= 1.4: APPROVED
- DAR 1.25 - 1.4: APPROVED_WITH_COMMENTS
- DAR 1.0 - 1.25: APPROVED_WITH_COMMENTS (investigate)
- DAR < 1.0: REJECTED

When to Use DAR vs PI:
- DAR: Quick test (1 minute total)
- PI: More comprehensive (10 minutes)
- Both: Best practice for critical equipment

DAR is useful when:
- Time constraints prevent full PI test
- Quick screening of multiple units
- Trending with historical DAR data`,
    metadata: {
      normas: ['IEEE 43', 'NETA MTS'],
      formula: 'DAR = R_60s / R_30s',
      limit: 'DAR >= 1.4',
      severity: 'HIGH',
      applicableTestTypes: ['MEGGER'],
      priority: 1,
    },
  },
  {
    id: 'MEG-007',
    type: 'LIMIT',
    category: 'MEGGER',
    title: 'Insulation Resistance Quality Levels',
    content: `Insulation Resistance Quality Assessment

General Quality Levels (IEEE 43 based):
| IR Value (Mohm)  | Quality Level  | Action                           |
|------------------|----------------|----------------------------------|
| > 100 Mohm       | Excellent      | Normal operation                 |
| 10 - 100 Mohm    | Good           | Continue monitoring              |
| 1 - 10 Mohm      | Fair           | Increase monitoring frequency    |
| < 1 Mohm         | Poor           | Investigate, consider repairs    |

Absolute Minimum Values:
| Equipment Type           | Absolute Minimum IR |
|--------------------------|---------------------|
| LV motors (< 1kV)        | 1 Mohm              |
| MV motors (1-5kV)        | 5 Mohm              |
| HV motors (> 5kV)        | 10 Mohm             |
| Transformers (LV)        | 2 Mohm              |
| Transformers (MV/HV)     | 50 Mohm             |
| Cables (per 1000ft)      | 1 Mohm minimum      |

Trending Analysis:
- 50% decrease from baseline: INVESTIGATE
- 25% decrease: MONITOR closely
- Increasing trend: POSITIVE (drying out)
- Decreasing trend: NEGATIVE (deterioration)`,
    metadata: {
      normas: ['IEEE 43', 'NETA MTS'],
      severity: 'HIGH',
      applicableTestTypes: ['MEGGER'],
      priority: 1,
    },
  },
  {
    id: 'MEG-008',
    type: 'CRITERIA',
    category: 'MEGGER',
    title: 'Test Voltage Selection',
    content: `Megger Test Voltage Selection Guidelines

Proper test voltage is critical for valid insulation testing.

Test Voltage by Equipment Voltage Rating (IEEE 43):
| Equipment Voltage | Minimum Test Voltage | Maximum Test Voltage |
|-------------------|----------------------|----------------------|
| < 250V            | 250V DC              | 500V DC              |
| 250V - 1000V      | 500V DC              | 1000V DC             |
| 1000V - 2500V     | 1000V DC             | 2500V DC             |
| 2500V - 5000V     | 2500V DC             | 5000V DC             |
| > 5000V           | 5000V DC             | 10000V DC            |

Validation Rules:
1. Test voltage must be documented
2. Test voltage must be appropriate for equipment rating
3. Higher voltage = more sensitive test
4. Never exceed equipment BIL rating

Common Errors:
- Using 500V on medium voltage equipment (insufficient stress)
- Using 5000V on low voltage equipment (may damage)
- Not documenting test voltage used

Special Considerations:
- VFD-fed motors: May need reduced test voltage
- Aged equipment: Start with lower voltage
- New equipment: Can use higher voltage range`,
    metadata: {
      normas: ['IEEE 43', 'IEEE 95'],
      severity: 'MEDIUM',
      applicableTestTypes: ['MEGGER'],
      priority: 2,
    },
  },
];

// =============================================================================
// ALL CRITERIA COMBINED
// =============================================================================

export const ALL_CRITERIA: CriteriaDocument[] = [
  ...UNIVERSAL_CRITERIA,
  ...GROUNDING_CRITERIA,
  ...THERMOGRAPHY_CRITERIA,
  ...MEGGER_CRITERIA,
];

/**
 * Get criteria by category
 */
export function getCriteriaByCategory(category: CriteriaCategory): CriteriaDocument[] {
  return ALL_CRITERIA.filter(c => c.category === category);
}

/**
 * Get criteria by test type (includes UNIVERSAL criteria)
 */
export function getCriteriaByTestType(testType: TestType): CriteriaDocument[] {
  return ALL_CRITERIA.filter(
    c => c.category === 'UNIVERSAL' ||
         c.category === testType ||
         c.metadata.applicableTestTypes?.includes(testType)
  );
}

/**
 * Get criteria by severity
 */
export function getCriteriaBySeverity(severity: CriteriaSeverity): CriteriaDocument[] {
  return ALL_CRITERIA.filter(c => c.metadata.severity === severity);
}
