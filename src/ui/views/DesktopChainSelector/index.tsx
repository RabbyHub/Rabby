import { CHAINS_ENUM } from '@debank/common';
import clsx from 'clsx';
import React from 'react';
import { ReactComponent as RcIconClose } from '@/ui/assets/dapp-search/cc-close.svg';
// import { ReactComponent as RcIconArrowDownCC } from '@/ui/assets/arrow-down-cc.svg';
import { useTranslation } from 'react-i18next';
import { ChainSelectorLargeModal } from '@/ui/component/ChainSelector/LargeModal';
import { findChainByEnum } from '@/utils/chain';
import { RcIconArrowDownCC } from '@/ui/assets/desktop/common';

interface Props {
  value?: CHAINS_ENUM;
  onChange?: (chain?: CHAINS_ENUM) => void;
  large?: boolean;
}

export const DesktopChainSelector: React.FC<Props> = ({
  value,
  onChange,
  large,
}) => {
  const { t } = useTranslation();
  const [isShowChainSelector, setIsShowChainSelector] = React.useState(false);
  const chainInfo = React.useMemo(() => {
    return findChainByEnum(value);
  }, [value]);

  return (
    <>
      <div
        onClick={() => {
          setIsShowChainSelector(true);
        }}
      >
        {chainInfo ? (
          <div
            className={clsx(
              'bg-r-neutral-card1',
              'flex items-center gap-[8px] cursor-pointer',
              'px-[10px] py-[8px]',
              'rounded-[8px]',
              'border-[0.5px] border-solid border-rabby-neutral-line'
            )}
          >
            <div
              className={clsx(
                'flex items-center gap-[6px] ',
                // 'hover:bg-r-blue-light1',
                'rounded-[8px]'
              )}
            >
              <img
                src={chainInfo?.logo}
                className="w-[16px] h-[16px] rounded-full"
              />
              <span className="text-r-neutral-body text-[14px] leading-[17px] font-medium">
                {chainInfo?.name}
              </span>
            </div>
            <span
              className={clsx('cursor-pointer text-r-neutral-foot')}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange?.(undefined);
              }}
            >
              <RcIconClose />
            </span>
          </div>
        ) : (
          <div
            className={clsx(
              'flex items-center gap-[4px] cursor-pointer',
              'text-[13px] leading-[16px] text-rb-neutral-secondary',
              'hover:text-r-blue-default'
            )}
          >
            {t('component.DesktopChainSelector.allChains')}
            <RcIconArrowDownCC />
          </div>
        )}
      </div>

      <ChainSelectorLargeModal
        visible={isShowChainSelector}
        title="Select chain"
        value={value}
        hideTestnetTab
        onChange={(v) => {
          onChange?.(v);
          setIsShowChainSelector(false);
        }}
        onCancel={() => {
          setIsShowChainSelector(false);
        }}
      />
    </>
  );
};
