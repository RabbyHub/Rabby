import { Buffer } from 'buffer';

const MAX_LOGO_BYTES = 256 * 1024;

/** Load outside the host document so image URLs never enter its resource timings. */
export async function fetchPerpsWidgetLogo(url: string): Promise<string> {
  if (!url.startsWith('https://')) return '';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, {
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    });
    const mime = response.headers.get('content-type')?.split(';')[0].trim();
    if (!response.ok || !mime?.startsWith('image/')) return '';

    const reader = response.body?.getReader();
    if (!reader) return '';
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_LOGO_BYTES) return '';
      chunks.push(value);
    }
    return size
      ? `data:${mime};base64,${Buffer.concat(chunks).toString('base64')}`
      : '';
  } catch {
    return '';
  } finally {
    controller.abort();
    clearTimeout(timer);
  }
}
