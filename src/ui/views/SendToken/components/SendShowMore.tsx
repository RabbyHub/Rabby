import clsx from 'clsx';
import React from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as IconArrowDownCC } from 'ui/assets/bridge/tiny-down-arrow-cc.svg';
import { DirectSignGasInfo } from '../../Bridge/Component/BridgeShowMore';
import { noop } from 'lodash';

export const ShowMoreOnSend = ({
  chainServeId,
  open,
  setOpen,
}: {
  chainServeId: string;
  open: boolean;
  setOpen: (bool: boolean) => void;
}) => {
  const { t } = useTranslation();
  const [showGasFeeError, setShowGasFeeError] = useState(false);

  return (
    <div className="mx-16">
      <div className="flex items-center justify-center gap-8 mb-8">
        <div
          className={clsx(
            'flex items-center opacity-50',
            'cursor-pointer',
            'text-r-neutral-foot text-12'
          )}
          onClick={() => setOpen(!open)}
        >
          <span>{t('page.bridge.showMore.title')}</span>
          <IconArrowDownCC
            viewBox="0 0 14 14"
            width={14}
            height={14}
            className={clsx(
              'transition-transform',
              open && 'rotate-180 translate-y-1'
            )}
          />
        </div>
      </div>

      <div className={clsx('overflow-hidden', !open && 'h-0')}>
        <DirectSignGasInfo
          supportDirectSign
          loading={false}
          openShowMore={setShowGasFeeError}
          chainServeId={chainServeId}
          noQuote={false}
        />
      </div>

      {!open && (
        <>
          {showGasFeeError ? (
            <DirectSignGasInfo
              supportDirectSign
              loading={false}
              openShowMore={noop}
              chainServeId={chainServeId}
              noQuote={false}
            />
          ) : null}
        </>
      )}
    </div>
  );
};
