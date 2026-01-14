export interface Inconsistencia {
  tipo: 'CRITICAL' | 'MAJOR' | 'MINOR';
  codigo: string;
  campo: string;
  esperado: string;
  encontrado: string;
  mensagem: string;
}

export interface CertificadoData {
  dataValidade?: string;
  serial?: string;
}

export interface RelatorioData {
  dataMedicao?: string;
  tag?: string;
  serial?: string;
}

export interface FotosData {
  tag?: string;
  serial?: string;
  tempAmbiente?: number;
  tempRefletida?: number;
  valorDisplay?: number;
}

export interface MedicaoData {
  tag?: string;
  valor?: number;
}

export interface DadosExtraidos {
  certificado?: CertificadoData;
  relatorio?: RelatorioData;
  fotos?: FotosData;
  medicoes?: MedicaoData[];
  // Campos específicos de termografia
  ambientTemperature?: { value?: number };
  reflectedTemperature?: { value?: number };
  // Campos de calibração (formato do extractionData atual)
  calibrationCertificate?: {
    serialNumber?: string;
    expiryDate?: string;
    isExpired?: boolean;
  };
  // Serial do instrumento
  instrumentSerialNumber?: {
    value?: string;
    source?: string;
  };
  equipmentId?: string;
  testDate?: string;
}

export interface ResultadoValidacao {
  approved: boolean;
  inconsistencias: Inconsistencia[];
  motivo: string | null;
}
