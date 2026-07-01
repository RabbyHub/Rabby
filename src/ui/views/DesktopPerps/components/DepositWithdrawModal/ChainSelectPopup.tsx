import React from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Popup } from '@/ui/component';
import { SvgIconCross } from '@/ui/assets';
import { usePopupContainer } from '@/ui/hooks/usePopupContainer';
import { findChainByServerID } from '@/utils/chain';
import { WITHDRAW_CHAINS } from '@/ui/views/Perps/constants';

interface ChainSelectPopupProps {
  visible: boolean;
  onCancel: () => void;
  onSelect: (serverChain: string) => void;
  selected?: string;
}

export const ChainSelectPopup: React.FC<ChainSelectPopupProps> = ({
  visible,
  onCancel,
  onSelect,
  selected,
}) => {
  const { t } = useTranslation();
  const { getContainer } = usePopupContainer();

  return (
    <Popup
      visible={visible}
      onCancel={onCancel}
      height={360}
      isSupportDarkMode
      bodyStyle={{ padding: 0 }}
      destroyOnClose
      closable
      closeIcon={
        <SvgIconCross className="w-14 fill-current text-r-neutral-title-1" />
      }
      keyboard={false}
      push={false}
      getContainer={getContainer}
    >
      <div className="flex flex-col h-full pt-16 px-16 bg-rb-neutral-bg-2 rounded-t-[16px]">
        <div className="text-[20px] font-medium text-r-neutral-title-1 text-center mb-16">
          {t('page.perps.selectChainToWithdraw')}
        </div>
        <div className="flex flex-col gap-6">
          {WITHDRAW_CHAINS.map((c) => {
            const chain = findChainByServerID(c.serverChain);
            return (
              <div
                key={c.serverChain}
                onClick={() => onSelect(c.serverChain)}
                className={clsx(
                  'flex items-center h-[48px] px-16 rounded-[6px] cursor-pointer border border-solid',
                  'bg-rb-neutral-bg-5 text-13 text-rb-neutral-title-1 font-medium',
                  selected === c.serverChain
                    ? 'border-rabby-blue-default'
                    : 'border-transparent hover:border-rabby-blue-default'
                )}
              >
                {chain?.logo && (
                  <img
                    src={chain.logo}
                    alt={chain.name}
                    className="w-20 h-20 mr-12"
                  />
                )}
                <span>{chain?.name || c.chainEnum}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Popup>
  );
};

export default ChainSelectPopup;
