/**
 * INS — Igra Name Service resolver.
 *
 * Mirrors the shape of resolveEnsAddressByName (./ens.ts) so EnterAddress
 * and ImportWatchAddress can swap helpers based on the input suffix
 * without changing their consumer code.
 *
 * Uses the public INS REST API at insdomains.org/api/resolve, which
 * unions INS V1 + V2 registries on Igra L2 (chain 38833). Read-only,
 * CORS-enabled, no auth, no rate limit. Rabby's wallet never touches
 * the user's keys or Igra RPC for resolution — the API does the on-chain
 * read server-side, mirroring the way ENS resolution avoids forcing a
 * direct contract call from the extension.
 *
 * Source + threat model:
 *   https://github.com/ItsGoonBoyCrypto/INSdomains
 *   https://github.com/ItsGoonBoyCrypto/INSdomains/blob/main/snap/SECURITY.md
 */

const INS_API = 'https://insdomains.org/api';

const looksLikeIgraName = (input: string): boolean => {
  const lower = input.trim().toLowerCase();
  return lower.endsWith('.igra') && lower.length > 5;
};

export const resolveInsAddressByName = async (
  name: string
): Promise<{ addr: string; name: string } | null> => {
  const input = name?.trim();
  if (!input || !looksLikeIgraName(input)) return null;

  try {
    const ctl = new AbortController();
    const timeout = setTimeout(() => ctl.abort(), 5000);
    const res = await fetch(
      `${INS_API}/resolve?name=${encodeURIComponent(input.toLowerCase())}`,
      { signal: ctl.signal }
    );
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      exists?: boolean;
      address?: string;
    };
    if (!data?.exists || !data?.address) return null;
    return {
      addr: data.address,
      name: input.toLowerCase(),
    };
  } catch {
    return null;
  }
};
