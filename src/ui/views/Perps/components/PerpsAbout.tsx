import React from 'react';
import { useRequest } from 'ahooks';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useWallet } from '@/ui/utils';
import { useRabbySelector } from '@/ui/store';

interface PerpsAboutProps {
  coin: string;
  className?: string;
}

export const PerpsAbout: React.FC<PerpsAboutProps> = ({ coin, className }) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const lang = useRabbySelector((state) => state.preference.locale);
  const { data } = useRequest(
    async () => {
      if (!coin) return null;
      try {
        const res = await wallet.openapi.getPerpTokenDetail({
          name: coin,
          lang: lang || '',
        });
        return res;
      } catch (e) {
        console.error('getPerpTokenDetail failed', e);
        return null;
      }
    },
    { refreshDeps: [coin, lang] }
  );

  const description = data?.description;
  if (!description) return null;

  return (
    <div className={clsx(className)}>
      <div className="text-r-neutral-title-1 text-13 font-medium mb-8">
        {t('page.perps.PerpsAbout.title')}
      </div>
      <div className="bg-r-neutral-card-1 rounded-[8px] p-16 text-[12px] text-r-neutral-foot whitespace-pre-wrap">
        {description}
      </div>
    </div>
  );
};

export default PerpsAbout;
