import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { readAiConfig, writeAiConfig, getOpenAIKey, getOpenAIModel, getFreeAiProvider } from '../../../../lib/aiConfig';

async function requireAuth(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;

  const token = authHeader.slice('Bearer '.length).trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return false;

  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  return !error && Boolean(user);
}

export async function GET(request: Request) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
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
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const apiKey = typeof body.apiKey === 'string' && body.apiKey.trim() ? body.apiKey.trim() : '';
  const model = typeof body.model === 'string' && body.model.trim() ? body.model.trim() : 'gpt-4o';
  if (!apiKey) {
    return NextResponse.json({ error: 'apiKey is required' }, { status: 400 });
  }
  writeAiConfig({ openaiApiKey: apiKey, openaiModel: model });
  return NextResponse.json({ configured: true, model, source: 'file' });
}

export async function DELETE(request: Request) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const cfg = readAiConfig();
  delete cfg.openaiApiKey;
  delete cfg.openaiModel;
  writeAiConfig(cfg);
  return NextResponse.json({
    configured: Boolean(getOpenAIKey()),
    source: process.env.OPENAI_API_KEY ? 'env' : 'none',
  });
}
