import { isSameAddress } from '@/ui/utils';
import { DisplayedProject } from '@/ui/utils/portfolio/project';
import { safeBuildRegExp } from '@/utils/string';
import { useMemo } from 'react';

export const useFilterProtocolList = ({
  list,
  kw,
}: {
  list?: DisplayedProject[];
  kw: string;
}) => {
  const displayList = useMemo(() => {
    if (!list || !kw) return list;
    const result: DisplayedProject[] = [];
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const portfolios =
        item._rawPortfolios?.filter((portfolio) => {
          const hasToken = portfolio.asset_token_list.some((token) => {
            if (kw.length === 42 && kw.toLowerCase().startsWith('0x')) {
              return isSameAddress(token.id, kw);
            } else {
              const reg = safeBuildRegExp(kw, 'i');
              return (
                reg.test(token.display_symbol || '') || reg.test(token.symbol)
              );
            }
          });
          return hasToken;
        }) || [];
      const project = new DisplayedProject(
        {
          chain: item.chain,
          id: item.id,
          logo_url: item.logo,
          name: item.name,
          site_url: item.site_url,
        },
        portfolios
      );
      if (portfolios.length > 0) {
        result.push(project);
      }
    }
    return result;
  }, [list, kw]);

  return displayList;
};
