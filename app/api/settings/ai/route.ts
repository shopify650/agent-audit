import { NextResponse } from 'next/server';
import { readAiConfig, writeAiConfig, getOpenAIKey, getOpenAIModel, getFreeAiProvider } from '../../../../lib/aiConfig';

export async function GET() {
  const fileCfg = readAiConfig();
  const source = process.env.OPENAI_API_KEY ? 'env' : fileCfg.openaiApiKey ? 'file' : 'none';
  const free = getFreeAiProvider();
  const paid = Boolean(getOpenAIKey());
  return NextResponse.json({
    configured: Boolean(paid || free),
    model: getOpenAIModel(),
    activeModel: paid ? getOpenAIModel() : free ? free.model : '',
    source,
    free: free
      ? {
          provider: process.env.FREE_AI_PROVIDER || fileCfg.freeProvider || 'gemini',
          model: free.model,
        }
      : null,
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const apiKey = typeof body.apiKey === 'string' && body.apiKey.trim() ? body.apiKey.trim() : '';
  const model = typeof body.model === 'string' && body.model.trim() ? body.model.trim() : 'gpt-4o';
  if (!apiKey) {
    return NextResponse.json({ error: 'apiKey is required' }, { status: 400 });
  }
  writeAiConfig({ openaiApiKey: apiKey, openaiModel: model });
  return NextResponse.json({ configured: true, model, source: 'file' });
}

export async function DELETE() {
  const cfg = readAiConfig();
  delete cfg.openaiApiKey;
  delete cfg.openaiModel;
  writeAiConfig(cfg);
  return NextResponse.json({
    configured: Boolean(getOpenAIKey()),
    source: process.env.OPENAI_API_KEY ? 'env' : 'none',
  });
}
