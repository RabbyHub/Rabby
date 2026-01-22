import { globalSupportCexList } from '@/ui/models/exchange';
import { Tooltip } from 'antd';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  cexIds: string[];
}
export const ExchangeLogos = ({ cexIds }: Props) => {
  const { t } = useTranslation();
  const logos = useMemo(() => {
    return cexIds
      ?.map((id) => {
        const cex = globalSupportCexList.find((cex) => cex.id === id);
        return {
          logo: cex?.logo,
          name: cex?.name,
        };
      })
      .filter((i) => i.logo && i.name);
  }, [cexIds]);
  if (cexIds?.length === 0) {
    return null;
  }
  return (
    <div className="flex items-center gap-4 ml-[6px]">
      <div className="w-0 h-[12px] border-r border-r-r-neutral-line mr-[2px]" />
      {logos.slice(0, 4).map(({ logo, name }) => (
        <Tooltip
          key={name}
          title={t('page.search.tokenItem.listBy', {
            name: name,
          })}
          trigger={['hover']}
          overlayClassName="rectangle w-[max-content]"
        >
          <div className="w-[12px] h-[12px] rounded-full overflow-hidden">
            <img key={logo} src={logo} alt="" className="w-full h-full" />
          </div>
        </Tooltip>
      ))}

      {logos.length > 4 ? (
        <Tooltip
          title={t('page.search.tokenItem.listBy', {
            name: logos
              .slice(4)
              .map((e) => e.name)
              .join(','),
          })}
          trigger={['hover']}
          overlayClassName="rectangle w-[max-content]"
        >
          <span className="text-r-neutral-foot text-[11px] font-medium whitespace-nowrap">
            +{logos.length - 4}
          </span>
        </Tooltip>
      ) : null}
    </div>
  );
};
