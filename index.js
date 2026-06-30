const { onRequest } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');

const DEFAULT_MODEL = 'gemini-2.5-flash';

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    consumerUnit: { type: 'STRING' },
    clientName: { type: 'STRING' },
    distributor: { type: 'STRING' },
    className: { type: 'STRING' },
    tariffGroup: { type: 'STRING' },
    currentTariff: { type: 'NUMBER' },
    consumption: {
      type: 'ARRAY',
      items: { type: 'NUMBER' },
    },
    averageConsumption: { type: 'NUMBER' },
    annualConsumption: { type: 'NUMBER' },
    confidence: { type: 'NUMBER' },
    warnings: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
  },
  required: [
    'consumerUnit',
    'clientName',
    'distributor',
    'className',
    'tariffGroup',
    'currentTariff',
    'consumption',
    'averageConsumption',
    'annualConsumption',
    'confidence',
    'warnings',
  ],
};

function normalizeModel(model) {
  const cleaned = String(model || DEFAULT_MODEL).trim().replace(/[^a-zA-Z0-9._-]/g, '');

  // Evita erro comum quando o front está com um modelo inexistente/antigo.
  if (!cleaned || cleaned === 'gemini-3.5-flash') return DEFAULT_MODEL;

  return cleaned;
}

function dataUrlToInlinePart(dataUrl) {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;

  return {
    inlineData: {
      mimeType: match[1],
      data: match[2],
    },
  };
}

function extractTextFromGeminiResponse(result) {
  const parts = result?.candidates?.[0]?.content?.parts || [];
  return parts.map((part) => part.text || '').join('').trim();
}

function parseJsonText(text) {
  const clean = String(text || '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(clean);
  } catch (_) {
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(clean.slice(start, end + 1));
    }
    throw new Error('A IA não retornou JSON válido.');
  }
}

function normalizeResult(data) {
  const consumption = Array.isArray(data.consumption)
    ? data.consumption.map(Number).filter((value) => Number.isFinite(value) && value >= 0)
    : [];

  const annual = consumption.reduce((sum, value) => sum + value, 0);
  const average = consumption.length ? annual / consumption.length : 0;

  return {
    consumerUnit: String(data.consumerUnit || '').trim(),
    clientName: String(data.clientName || '').trim(),
    distributor: String(data.distributor || '').trim(),
    className: String(data.className || '').trim(),
    tariffGroup: String(data.tariffGroup || '').trim(),
    currentTariff: Number(data.currentTariff || 0),
    consumption,
    averageConsumption: Number(data.averageConsumption || average || 0),
    annualConsumption: Number(data.annualConsumption || annual || 0),
    confidence: Math.max(0, Math.min(100, Number(data.confidence || 0))),
    warnings: Array.isArray(data.warnings) ? data.warnings.map(String).slice(0, 8) : [],
  };
}

exports.analisarFatura = onRequest(
  {
    cors: true,
    timeoutSeconds: 120,
    memory: '1GiB',
    secrets: ['GEMINI_API_KEY'],
  },
  async (req, res) => {
    try {
      if (req.method === 'OPTIONS') {
        return res.status(204).send('');
      }

      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido. Use POST.' });
      }

      const { billText = '', images = [], model } = req.body || {};
      const text = String(billText || '').slice(0, 50000);

      const parts = [
        {
          text: `Você é um especialista em leitura de faturas de energia elétrica brasileiras.

Extraia os dados da fatura para um CRM de energia solar.

Regras:
- Retorne somente JSON válido.
- Consumo deve ser uma lista numérica em kWh, preferencialmente com 12 meses.
- Tarifa deve ser número em R$/kWh.
- Se não encontrar algum dado, use string vazia ou 0.
- confidence deve ser de 0 a 100.
- warnings deve listar campos incertos.

Campos esperados:
consumerUnit, clientName, distributor, className, tariffGroup, currentTariff, consumption, averageConsumption, annualConsumption, confidence, warnings.

Texto extraído da fatura:\n${text}`,
        },
      ];

      for (const image of Array.isArray(images) ? images.slice(0, 3) : []) {
        const inlinePart = dataUrlToInlinePart(image);
        if (inlinePart) parts.push(inlinePart);
      }

      if (!text.trim() && parts.length === 1) {
        return res.status(400).json({ error: 'Envie texto ou imagem da fatura.' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY não configurada no Firebase Secrets.',
          help: 'Rode: firebase functions:secrets:set GEMINI_API_KEY',
        });
      }

      const safeModel = normalizeModel(model);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${safeModel}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const geminiResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts,
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      });

      const result = await geminiResponse.json();

      if (!geminiResponse.ok) {
        logger.error('Erro Gemini', result);
        return res.status(500).json({
          error: 'Erro ao chamar o Gemini.',
          model: safeModel,
          details: result?.error?.message || result,
        });
      }

      const outputText = extractTextFromGeminiResponse(result);
      const parsed = parseJsonText(outputText);

      return res.json(normalizeResult(parsed));
    } catch (error) {
      logger.error(error);
      return res.status(500).json({
        error: 'Erro ao analisar fatura com Gemini.',
        message: error.message,
      });
    }
  }
);
