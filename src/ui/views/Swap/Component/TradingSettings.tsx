import { Checkbox, Modal, Popup } from '@/ui/component';
import React, { useState } from 'react';
import { useSwapSettings } from '../hooks';
import { CEX, CHAINS_ENUM, DEX } from '@/constant';
import clsx from 'clsx';
import { Button, Switch } from 'antd';

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
      title={'Enable Exchanges'}
      height={458}
      onClose={onClose}
      closable
    >
      <div>
        <div className="flex items-center text-gray-content text-12 pb-8 px-12">
          <div className="w-[182px]">Exchanges</div>
          <div className="w-[66px]">View quotes</div>
          <div className="ml-auto">Trade</div>
        </div>

        <div className="flex flex-col gap-12">
          {list.map((item) => {
            return (
              <div
                className="flex items-center h-[48px] bg-gray-bg rounded-[6px] p-12"
                key={item.name}
              >
                <div className="flex items-center gap-8 w-[182px]">
                  <img
                    src={item.logo}
                    className="w-[30px] h-[30px] mr-[12px]"
                  />
                  <span className="text-15 text-gray-title font-medium ">
                    {item.name}
                  </span>
                  <span
                    className={clsx(
                      'text-12 text-gray-content rounded-[2px] px-[4px] py-[1px]',
                      'border border-solid border-gray-comment'
                    )}
                  >
                    {item?.chains ? 'Dex' : 'Cex'}
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
                        console.log('checked', checked);
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
          background: 'white',
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
  return (
    <div>
      <div className="relative -mt-8 mb-20  text-20 font-medium text-center text-gray-title">
        Enable Trading
      </div>
      <div className="text-13 leading-[18px] text-gray-subTitle">
        <p>
          1. Once enabled, you will interact with the contract from the exchange
          directly
        </p>
        <p>
          2. Rabby is not liable for any risks arising from the contract of the
          exchanges
        </p>
      </div>
      <div className="flex flex-col justify-center items-center gap-16 text-gray-subTitle mt-[30px]">
        <Checkbox checked={checked} onChange={setChecked}>
          I understand and accept it
        </Checkbox>

        <Button
          type="primary"
          block
          disabled={!checked}
          className="h-[40px] w-[182px] text-13 font-medium mx-auto"
          onClick={onConfirm}
        >
          Confirm
        </Button>
      </div>
    </div>
  );
}
