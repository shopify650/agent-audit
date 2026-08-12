export async function hashApiKey(key: string): Promise<string> {
  const data = new TextEncoder().encode(key);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function apiKeyHint(key: string): string {
  if (key.length <= 12) return key;
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}
