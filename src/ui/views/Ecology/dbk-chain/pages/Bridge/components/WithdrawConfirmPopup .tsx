import { ReactComponent as RcIconChecked } from '@/ui/assets/checked.svg';
import { ReactComponent as RcIconUnCheckedCC } from '@/ui/assets/icon-unchecked-cc.svg';
import { Popup } from '@/ui/component';
import clsx from 'clsx';
import React, { useMemo } from 'react';
import { DbkButton } from '../../../components/DbkButton';

export const WithdrawConfirmPopup = () => {
  const checkList = [
    {
      label:
        'I understand it will take ~7 days until my funds are claimable on Ethereum after I prove my withdrawal',
      value: 1,
    },
    {
      label:
        'I understand once a withdrawal is initiated it cannot be sped up or cancelled',
      value: 2,
    },
    {
      label: 'I understand network fees are approximate and will change',
      value: 3,
    },
  ];
  const [checked, setChecked] = React.useState<number[]>([]);

  const isCheckedAll = useMemo(() => {
    return checkList.every((item) => checked.includes(item.value));
  }, [checkList, checked]);

  return (
    <Popup
      title={
        <div className="text-r-neutral-title-1 text-[16px] font-semibold">
          DBK Chain Withdrawal takes ~7 days
        </div>
      }
      visible
      height={560}
      closable
    >
      <div className="text-r-neutral-body text-[13px] leading-[16px] text-center mb-[12px]">
        Withdrawing involves a 3-step process, requiring 1 DBK Chain transaction
        and 2 Ethereum transactions
      </div>
      <div className="rounded-[8px] border-[0.5px] border-rabby-neutral-line p-[16px] space-y-[16px] mb-[12px]">
        <div className="flex items-center justify-between text-r-neutral-title-1 text-[13px] leading-[16px] font-semibold">
          <div>Initiate withdrawal</div>
          <div>$0.0006</div>
        </div>
        <div className="text-[13px] leading-[16px] text-r-neutral-foot">
          Wait ~10 mins
        </div>
        <div className="flex items-center justify-between text-r-neutral-title-1 text-[13px] leading-[16px] font-semibold">
          <div>Prove on Ethereum</div>
          <div>$6.91</div>
        </div>
        <div className="text-[13px] leading-[16px] text-r-neutral-foot">
          Wait ~10 mins
        </div>
        <div className="flex items-center justify-between text-r-neutral-title-1 text-[13px] leading-[16px] font-semibold">
          <div>Claim on Ethereum</div>
          <div>$8.91</div>
        </div>
      </div>
      <div className="space-y-[10px]">
        {checkList.map((item) => {
          const isChecked = checked.includes(item.value);
          return (
            <div
              className={clsx(
                'flex items-center gap-[12px] px-[15px] py-[10px] ',
                'rounded-[8px] bg-r-neutral-card-2 cursor-pointer',
                'border-transparent border-[1px] hover:border-rabby-orange-DBK',
                isChecked && 'border-rabby-orange-DBK'
              )}
              key={item.value}
              onClick={() => {
                if (isChecked) {
                  setChecked(checked.filter((i) => i !== item.value));
                } else {
                  setChecked([...checked, item.value]);
                }
              }}
            >
              <div className="flex-shrink-0">
                {isChecked ? (
                  <RcIconChecked width={20} height={20} viewBox="0 0 24 24" />
                ) : (
                  <RcIconUnCheckedCC />
                )}
              </div>
              <div className="min-w-0 text-[13px] leading-[17px] font-semibold text-r-neutral-title1">
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
      <div className="h-[80px]">
        <footer className="fixed left-0 right-0 bottom-0 px-[20px] py-[18px] border-t-[0.5px] border-rabby-neutral-line bg-r-neutral-card1">
          <DbkButton className="w-full h-[44px]" disabled={!isCheckedAll}>
            Withdraw
          </DbkButton>
        </footer>
      </div>
    </Popup>
  );
};
