import React from 'react';
import { useRequest } from 'ahooks';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useWallet } from '@/ui/utils';

interface PerpsAboutProps {
  coin: string;
  className?: string;
}

/**
 * Renders the per-coin "About" description card. Fetches `getPerpTokenDetail`
 * and renders nothing when there's no description available.
 */
export const PerpsAbout: React.FC<PerpsAboutProps> = ({ coin, className }) => {
  const { t, i18n } = useTranslation();
  const wallet = useWallet();

  const { data } = useRequest(
    async () => {
      if (!coin) return null;
      try {
        const res = await wallet.openapi.getPerpTokenDetail({
          name: coin,
          lang: i18n.language || 'en',
        });
        // The API returns an array of matches; take the first
        return Array.isArray(res) ? res[0] : res;
      } catch (e) {
        console.error('getPerpTokenDetail failed', e);
        return null;
      }
    },
    { refreshDeps: [coin, i18n.language] }
  );

  const description = (data as any)?.description as string | undefined;
  if (!description) return null;

  return (
    <div
      className={clsx(
        'bg-r-neutral-bg-2 rounded-[8px] p-16 text-13 text-r-neutral-body',
        className
      )}
    >
      <div className="text-r-neutral-title-1 font-medium mb-8">
        {t('page.perps.PerpsAbout.title')}
      </div>
      <div className="leading-[20px] whitespace-pre-wrap">{description}</div>
    </div>
  );
};

export default PerpsAbout;
