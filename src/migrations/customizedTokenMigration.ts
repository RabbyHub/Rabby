import { Token } from '@/background/service/preference';

export default {
  version: 6,
  async migrator(data: {
    preference: { addedToken: Record<string, string[]> };
  }) {
    try {
      if (data.preference === undefined) return undefined;

      const customizedToken: Token[] = [];
      for (const addr in data.preference.addedToken) {
        const tokens: string[] = data.preference.addedToken[addr] || [];
        if (tokens.length <= 0) continue;
        tokens.forEach((token: string) => {
          const [chain, address] = token.split(':');

          if (
            !customizedToken.some(
              (t) => t.address === address && t.chain === chain
            )
          ) {
            customizedToken.push({
              address,
              chain,
            });
          }
        });
      }
      return {
        preference: {
          ...data.preference,
          customizedToken,
        },
      };
    } catch (e) {
      // drop custom tokens if migrate failed
      return {
        preference: {
          ...data.preference,
          customizedToken: [],
        },
      };
    }
  },
};
