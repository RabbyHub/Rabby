import { Checkbox, Modal, Popup } from '@/ui/component';
import React, { useState } from 'react';
import { useSwapSettings } from '../hooks';
import { CEX, CHAINS_ENUM, DEX } from '@/constant';
import clsx from 'clsx';
import { Button, Switch } from 'antd';
import { useTranslation } from 'react-i18next';

const list = [...Object.values(DEX), ...Object.values(CEX)] as {
  id: keyof typeof DEX | keyof typeof CEX;
  logo: string;
  name: string;
  chains: CHAINS_ENUM[];
}[];

export const TradingSettings = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const {
    swapViewList,
    swapTradeList,
    setSwapView,
    setSwapTrade,
  } = useSwapSettings();

  const [open, setOpen] = useState(false);

  const [id, setId] = useState<Parameters<typeof setSwapTrade>[0][0]>();

  const onConfirm = () => {
    if (id) {
      setSwapTrade([id, true]);
      setOpen(false);
    }
  };

  return (
    <Popup
      visible={visible}
      title={t('page.swap.enable-exchanges')}
      height={458}
      onClose={onClose}
      closable
      bodyStyle={{
        paddingTop: 16,
      }}
      isSupportDarkMode
    >
      <div>
        <div className="flex items-center text-r-neutral-foot text-12 pb-8 px-12">
          <div className="w-[252px] flex justify-between">
            <div>{t('page.swap.exchanges')}</div>
            <div>{t('page.swap.view-quotes')}</div>
          </div>
          <div className="ml-auto">{t('page.swap.trade')}</div>
        </div>

        <div className="flex flex-col gap-8">
          {list.map((item) => {
            return (
              <div
                className="flex items-center h-[52px] bg-r-neutral-card-2 rounded-[6px] px-12 py-14"
                key={item.name}
              >
                <div className="flex items-center gap-8 w-[188px]">
                  <img
                    src={item.logo}
                    className="w-[24px] h-[24px] rounded-full"
                  />
                  <span className="text-15 text-r-neutral-title-1 font-medium">
                    {item.name}
                  </span>
                  <span
                    className={clsx(
                      'text-12 text-r-neutral-foot rounded-[2px] px-[4px] py-[1px]',
                      'border-[0.5px] border-solid border--r-neutral-line'
                    )}
                  >
                    {item?.chains ? t('page.swap.dex') : t('page.swap.cex')}
                  </span>
                </div>
                <div className="w-[66px] flex justify-end">
                  <Switch
                    checked={swapViewList?.[item.id] ?? true}
                    onChange={(checked) => {
                      setSwapView([item.id, checked]);
                      if (!checked && DEX[item.id]) {
                        setSwapTrade([item.id, checked]);
                      }
                    }}
                  />
                </div>
                <div className="ml-auto">
                  <Switch
                    disabled={
                      swapViewList?.[item.id] === false || !!CEX[item.id]
                    }
                    checked={!!swapTradeList?.[item.id]}
                    onChange={(checked) => {
                      if (checked) {
                        setId(item.id);
                        setOpen(true);
                      } else {
                        setSwapTrade([item.id, checked]);
                      }
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Modal
        bodyStyle={{
          background: 'var(--r-neutral-bg-1, #3D4251)',
          height: 280,
        }}
        // center
        visible={open}
        title={null}
        footer={null}
        destroyOnClose
        onCancel={() => {
          setOpen(false);
        }}
      >
        <EnableTrading onConfirm={onConfirm} />
      </Modal>
    </Popup>
  );
};

function EnableTrading({ onConfirm }: { onConfirm: () => void }) {
  const [checked, setChecked] = useState(false);
  const { t } = useTranslation();
  return (
    <div>
      <div className="relative -mt-8 mb-20 text-20 font-medium text-center text-r-neutral-title-1">
        {t('page.swap.enable-trading')}
      </div>
      <div className="text-13 leading-[18px] text-r-neutral-body">
        <p>{t('page.swap.tradingSettingTip1')}</p>
        <p>{t('page.swap.tradingSettingTip2')}</p>
      </div>
      <div className="flex flex-col justify-center items-center gap-16 text-r-neutral-body mt-[30px]">
        <Checkbox checked={checked} onChange={setChecked}>
          {t('page.swap.i-understand-and-accept-it')}
        </Checkbox>

        <Button
          type="primary"
          block
          disabled={!checked}
          className="h-[40px] w-[188px] text-13 font-medium mx-auto"
          onClick={onConfirm}
        >
          {t('page.swap.confirm')}
        </Button>
      </div>
    </div>
  );
}
