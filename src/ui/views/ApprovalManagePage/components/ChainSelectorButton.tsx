import { CHAINS_ENUM } from '@debank/common';
import clsx from 'clsx';
import React from 'react';
import { ReactComponent as RcIconClose } from '@/ui/assets/dapp-search/cc-close.svg';
import { ReactComponent as RcIconDropdown } from '@/ui/assets/dapp-search/cc-dropdown.svg';
import { useTranslation } from 'react-i18next';
import { ChainSelectorLargeModal } from '@/ui/component/ChainSelector/LargeModal';
import { findChainByEnum } from '@/utils/chain';

interface Props {
  chain?: CHAINS_ENUM;
  setChain: (chain?: CHAINS_ENUM) => void;
  large?: boolean;
}

export const ChainSelectorButton: React.FC<Props> = ({
  chain,
  setChain,
  large,
}) => {
  const { t } = useTranslation();
  const [isShowChainSelector, setIsShowChainSelector] = React.useState(false);
  const chainInfo = React.useMemo(() => {
    return findChainByEnum(chain);
  }, [chain]);

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
              'flex items-center cursor-pointer',
              large
                ? ['h-[48px] py-[2px] px-[2px] min-w-[128px]', 'rounded-[6px]']
                : [
                    'p-[2px]',
                    'rounded-[4px]',
                    'border-[0.5px] border-solid border-rabby-neutral-line',
                  ]
            )}
          >
            <div
              className={clsx(
                'flex items-center gap-[6px] ',
                'hover:bg-r-blue-light1',
                large
                  ? ['rounded-[4px] w-full h-full pl-[10px] pr-[4px]']
                  : ['rounded-[2px]', 'py-[4px] pl-[9px] pr-[3px]']
              )}
            >
              <img
                src={chainInfo?.logo}
                className="w-[20px] h-[20px] rounded-full"
              />
              <span className="text-r-neutral-body text-[14px] leading-[17px] font-medium">
                {chainInfo?.name}
              </span>
            </div>
            <span
              className={clsx(
                'cursor-pointer text-r-neutral-foot hover:bg-r-blue-light1',
                large
                  ? [
                      'rounded-[4px] h-full px-[4px]',
                      'flex items-center justify-center',
                    ]
                  : ['rounded-[2px] p-[7px]']
              )}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setChain(undefined);
              }}
            >
              <RcIconClose />
            </span>
          </div>
        ) : (
          <div
            className={clsx(
              'flex items-center gap-[2px] cursor-pointer',
              'text-r-neutral-body',
              'font-medium',
              large
                ? [
                    'text-[15px] leading-[18px]',
                    'border border-solid border-transparent',
                    'rounded-[6px] bg-r-neutral-card1',
                    'h-[48px] px-[10px]',
                    'hover:border-rabby-blue-default hover:bg-r-blue-light1',
                  ]
                : ['text-[13px] leading-[16px]']
            )}
          >
            {t('page.dappSearch.selectChain')}
            <RcIconDropdown className="text-r-neutral-foot" />
          </div>
        )}
      </div>

      <ChainSelectorLargeModal
        visible={isShowChainSelector}
        title="Select chain"
        value={chain}
        hideTestnetTab
        onChange={(v) => {
          setChain(v);
          setIsShowChainSelector(false);
        }}
        onCancel={() => {
          setIsShowChainSelector(false);
        }}
      />
    </>
  );
};
