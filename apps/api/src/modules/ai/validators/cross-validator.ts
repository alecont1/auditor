import type { DadosExtraidos, Inconsistencia, ResultadoValidacao } from '../types/extraction.types';

/**
 * Normaliza serial removendo espaços, hifens e convertendo para uppercase
 */
function normalizeSerial(serial: string | undefined | null): string {
  if (!serial) return '';
  return serial.toUpperCase().replace(/[\s\-_\.]/g, '');
}

/**
 * Normaliza TAG para comparação
 */
function normalizeTag(tag: string | undefined | null): string {
  if (!tag) return '';
  return tag.toUpperCase().trim().replace(/[\s\-_]+/g, '-');
}

/**
 * Valida se certificado estava vencido na data da medição
 */
function validarCertificadoVencido(dados: DadosExtraidos): Inconsistencia | null {
  const dataValidade = dados.certificado?.dataValidade || dados.calibrationCertificate?.expiryDate;
  const dataMedicao = dados.relatorio?.dataMedicao || dados.testDate;

  if (!dataValidade || !dataMedicao) return null;

  const validade = new Date(dataValidade);
  const medicao = new Date(dataMedicao);

  // Usa comparação UTC para evitar problemas de timezone
  const validadeUTC = Date.UTC(validade.getUTCFullYear(), validade.getUTCMonth(), validade.getUTCDate());
  const medicaoUTC = Date.UTC(medicao.getUTCFullYear(), medicao.getUTCMonth(), medicao.getUTCDate());

  if (medicaoUTC > validadeUTC) {
    return {
      tipo: 'CRITICAL',
      codigo: 'CERT-001',
      campo: 'certificado.validade',
      esperado: `Certificado válido até ${dataValidade}`,
      encontrado: `Medição realizada em ${dataMedicao}`,
      mensagem: `CERTIFICADO VENCIDO: medição (${dataMedicao}) posterior à validade (${dataValidade})`
    };
  }

  return null;
}

/**
 * Valida consistência de TAGs entre header, foto e tabela
 */
function validarTagConsistente(dados: DadosExtraidos): Inconsistencia | null {
  const tags: string[] = [];
  const fontes: string[] = [];

  if (dados.relatorio?.tag) {
    tags.push(normalizeTag(dados.relatorio.tag));
    fontes.push(`relatório: ${dados.relatorio.tag}`);
  }

  if (dados.fotos?.tag) {
    tags.push(normalizeTag(dados.fotos.tag));
    fontes.push(`foto: ${dados.fotos.tag}`);
  }

  if (dados.medicoes && dados.medicoes.length > 0 && dados.medicoes[0]?.tag) {
    tags.push(normalizeTag(dados.medicoes[0].tag));
    fontes.push(`tabela: ${dados.medicoes[0].tag}`);
  }

  // Se não tem tags para comparar, não valida
  if (tags.length < 2) return null;

  const tagsUnicas = Array.from(new Set(tags));
  if (tagsUnicas.length > 1) {
    return {
      tipo: 'CRITICAL',
      codigo: 'TAG-001',
      campo: 'tag',
      esperado: 'Mesmo TAG em todas as fontes',
      encontrado: fontes.join(' | '),
      mensagem: `TAG INCONSISTENTE: ${fontes.join(' ≠ ')}`
    };
  }

  return null;
}

/**
 * Valida diferença entre temperatura ambiente e refletida (termografia)
 * Tolerância: <= 1°C
 */
function validarTemperaturas(dados: DadosExtraidos): Inconsistencia | null {
  // Tenta obter de fotos primeiro, depois do formato de extração
  const tempAmbiente = dados.fotos?.tempAmbiente ?? dados.ambientTemperature?.value;
  const tempRefletida = dados.fotos?.tempRefletida ?? dados.reflectedTemperature?.value;

  if (tempAmbiente == null || tempRefletida == null) return null;

  const diff = Math.abs(tempAmbiente - tempRefletida);

  if (diff > 1) {
    return {
      tipo: 'CRITICAL',
      codigo: 'TEMP-001',
      campo: 'temperatura',
      esperado: `Diferença ≤ 1°C entre ambiente e refletida`,
      encontrado: `Diferença de ${diff.toFixed(1)}°C`,
      mensagem: `TEMPERATURA INCONSISTENTE: ambiente (${tempAmbiente}°C) ≠ refletida (${tempRefletida}°C), diff=${diff.toFixed(1)}°C`
    };
  }

  return null;
}

/**
 * Valida consistência de serial entre foto e certificado
 */
function validarSerialConsistente(dados: DadosExtraidos): Inconsistencia | null {
  const serials: string[] = [];
  const fontes: string[] = [];

  // Serial do certificado
  const serialCert = dados.certificado?.serial || dados.calibrationCertificate?.serialNumber;
  if (serialCert) {
    serials.push(normalizeSerial(serialCert));
    fontes.push(`certificado: ${serialCert}`);
  }

  // Serial do relatório
  if (dados.relatorio?.serial) {
    serials.push(normalizeSerial(dados.relatorio.serial));
    fontes.push(`relatório: ${dados.relatorio.serial}`);
  }

  // Serial da foto
  if (dados.fotos?.serial) {
    serials.push(normalizeSerial(dados.fotos.serial));
    fontes.push(`foto: ${dados.fotos.serial}`);
  }

  // Serial do instrumento (formato atual do extractionData)
  if (dados.instrumentSerialNumber?.value) {
    serials.push(normalizeSerial(dados.instrumentSerialNumber.value));
    fontes.push(`instrumento: ${dados.instrumentSerialNumber.value}`);
  }

  // Se não tem seriais para comparar, não valida
  if (serials.length < 2) return null;

  const serialsUnicos = Array.from(new Set(serials.filter(s => s.length > 0)));
  if (serialsUnicos.length > 1) {
    return {
      tipo: 'CRITICAL',
      codigo: 'SERIAL-001',
      campo: 'serial',
      esperado: 'Mesmo serial em todas as fontes',
      encontrado: fontes.join(' | '),
      mensagem: `SERIAL INCONSISTENTE: ${fontes.join(' ≠ ')}`
    };
  }

  return null;
}

/**
 * Valida diferença entre valor no display da foto e valor no relatório
 * Tolerância: <= 5% (WARNING, não reprova)
 */
function validarValorDisplay(dados: DadosExtraidos): Inconsistencia | null {
  if (!dados.fotos?.valorDisplay || !dados.medicoes || dados.medicoes.length === 0) return null;

  const valorFoto = dados.fotos.valorDisplay;
  const valorRelatorio = dados.medicoes[0]?.valor;

  if (valorRelatorio == null || valorRelatorio === 0) return null;

  const diffPercent = Math.abs((valorFoto - valorRelatorio) / valorRelatorio) * 100;

  if (diffPercent > 5) {
    return {
      tipo: 'MINOR',
      codigo: 'VALOR-001',
      campo: 'valor',
      esperado: `Diferença ≤ 5% entre foto e relatório`,
      encontrado: `Diferença de ${diffPercent.toFixed(1)}%`,
      mensagem: `VALOR DIVERGENTE: foto (${valorFoto}) vs relatório (${valorRelatorio}), diff=${diffPercent.toFixed(1)}%`
    };
  }

  return null;
}

/**
 * Executa todas as validações cruzadas nos dados extraídos
 */
export function validarCruzado(dados: DadosExtraidos): Inconsistencia[] {
  const inconsistencias: Inconsistencia[] = [];

  // 1. Certificado vencido (MAIS CRÍTICO)
  const certVencido = validarCertificadoVencido(dados);
  if (certVencido) inconsistencias.push(certVencido);

  // 2. TAG inconsistente
  const tagInconsistente = validarTagConsistente(dados);
  if (tagInconsistente) inconsistencias.push(tagInconsistente);

  // 3. Temperatura inconsistente (termografia)
  const tempInconsistente = validarTemperaturas(dados);
  if (tempInconsistente) inconsistencias.push(tempInconsistente);

  // 4. Serial inconsistente
  const serialInconsistente = validarSerialConsistente(dados);
  if (serialInconsistente) inconsistencias.push(serialInconsistente);

  // 5. Valor display vs relatório
  const valorInconsistente = validarValorDisplay(dados);
  if (valorInconsistente) inconsistencias.push(valorInconsistente);

  return inconsistencias;
}

/**
 * Gera resultado final baseado nas inconsistências encontradas
 */
export function gerarResultadoValidacao(inconsistencias: Inconsistencia[]): ResultadoValidacao {
  const criticos = inconsistencias.filter(i => i.tipo === 'CRITICAL');
  const majors = inconsistencias.filter(i => i.tipo === 'MAJOR');

  // Reprova se: qualquer CRITICAL ou 2+ MAJORs
  const approved = criticos.length === 0 && majors.length < 2;

  return {
    approved,
    inconsistencias,
    motivo: criticos.length > 0
      ? criticos.map(c => c.mensagem).join('; ')
      : majors.length >= 2
        ? majors.map(m => m.mensagem).join('; ')
        : null
  };
}

/**
 * Converte dados do formato atual (extractionData) para o formato de validação
 */
export function converterParaDadosExtraidos(extractionData: any, testDate?: string): DadosExtraidos {
  return {
    certificado: {
      dataValidade: extractionData.calibrationCertificate?.expiryDate,
      serial: extractionData.calibrationCertificate?.serialNumber
    },
    relatorio: {
      dataMedicao: extractionData.testDate || testDate,
      tag: extractionData.equipmentId,
      serial: extractionData.instrumentSerialNumber?.value
    },
    fotos: {
      tag: undefined, // Será extraído pela IA no futuro
      serial: undefined, // Será extraído pela IA no futuro
      tempAmbiente: extractionData.ambientTemperature?.value,
      tempRefletida: extractionData.reflectedTemperature?.value,
      valorDisplay: undefined // Será extraído pela IA no futuro
    },
    medicoes: extractionData.readings?.map((r: any) => ({
      tag: r.point,
      valor: r.value
    })) || [],
    // Passa dados originais também para validações específicas
    ambientTemperature: extractionData.ambientTemperature,
    reflectedTemperature: extractionData.reflectedTemperature,
    calibrationCertificate: extractionData.calibrationCertificate,
    instrumentSerialNumber: extractionData.instrumentSerialNumber,
    equipmentId: extractionData.equipmentId,
    testDate: extractionData.testDate || testDate
  };
}
