import openapiService from 'background/service/openapi';

export default {
  version: 1,
  async migrator(
    data: {
      preference: { addedToken: Record<string, string[]> };
    },
    _mockData?: any
  ) {
    try {
      if (data.preference === undefined) return undefined;

      const addedTokens: Record<string, string[]> = {};
      for (const addr in data.preference.addedToken) {
        addedTokens[addr] = data.preference.addedToken[addr];
        const tokens: string[] = data.preference.addedToken[addr] || [];
        if (tokens.length <= 0) continue;
        const needLoadTokens = tokens.filter(
          (token: string) =>
            !token.includes(':') &&
            token.length === 42 &&
            token.startsWith('0x')
        );
        const resultTokens: { id: string; chain: string }[] =
          process.env.NODE_ENV === 'test'
            ? _mockData
            : ((
                await Promise.all(
                  needLoadTokens.map(async (id) => {
                    const tokens = await openapiService.searchToken(addr, id);
                    if (tokens.length > 0) {
                      return {
                        id: tokens[0].id,
                        chain: tokens[0].chain,
                      };
                    }
                    return null;
                  })
                )
              ).filter((item) => item !== null) as {
                id: string;
                chain: string;
              }[]);
        addedTokens[addr] = addedTokens[addr].map((id) => {
          const target = resultTokens.find((token) => token.id === id);
          if (target) {
            return `${target.chain}:${target.id}`;
          }
          return id;
        });
      }
      return {
        preference: {
          ...data.preference,
          addedToken: addedTokens,
        },
      };
    } catch (e) {
      // drop custom tokens if migrate failed
      return {
        preference: {
          ...data.preference,
          addedToken: {},
        },
      };
    }
  },
};
