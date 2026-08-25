export const GO_RABBY_ORIGIN = 'https://go.rabby.io';

const DEBANK_ORIGINS = new Set([
  'https://debank.com',
  'https://www.debank.com',
]);

export type OpenInDesktopPolicy = {
  source: 'debank' | 'go-rabby';
};

export function getOpenInDesktopPolicy(
  origin?: string,
  sourceFrameId?: number
): OpenInDesktopPolicy | null {
  if (origin === GO_RABBY_ORIGIN && sourceFrameId === 0) {
    return {
      source: 'go-rabby',
    };
  }

  if (origin && DEBANK_ORIGINS.has(origin)) {
    return {
      source: 'debank',
    };
  }

  return null;
}
