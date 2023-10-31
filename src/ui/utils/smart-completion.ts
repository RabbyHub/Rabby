import { wordlist } from '@scure/bip39/wordlists/english';

const EN = wordlist;

const SEARCH_KEYS = new Set<string>();
const SEARCH_CACHE = [] as { prefix: string; words: string[] | false }[];

function putCache(prefix: string, words: string[] | false) {
  if (SEARCH_CACHE.length >= 20) {
    SEARCH_KEYS.delete(prefix);
    const item = SEARCH_CACHE.shift();
    item?.prefix && SEARCH_KEYS.delete(item?.prefix);
  }

  SEARCH_KEYS.add(prefix);
  SEARCH_CACHE.push({ prefix, words });
}

function getFromCache(prefix: string) {
  if (SEARCH_KEYS.has(prefix)) {
    return SEARCH_CACHE.find((item) => item.prefix === prefix)?.words;
  }

  return null;
}

export function searchByPrefix(prefix: string, count = 4) {
  if (!prefix) return null;

  const cached = getFromCache(prefix);
  if (cached === false || cached?.length) return cached || [];

  const words = [] as string[];
  let w = '';
  for (let i = 0; i < EN.length; i++) {
    w = EN[i];
    if (w.startsWith(prefix)) {
      words.push(w);
    }

    if (words.length === count) break;
  }
  putCache(prefix, words.length ? words : false);

  return words;
}
