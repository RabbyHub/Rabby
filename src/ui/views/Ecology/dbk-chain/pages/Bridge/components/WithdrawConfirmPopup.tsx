import { ReactComponent as RcIconChecked } from '@/ui/assets/checked.svg';
import { ReactComponent as RcIconUnCheckedCC } from '@/ui/assets/icon-unchecked-cc.svg';
import { Popup } from '@/ui/component';
import clsx from 'clsx';
import React, { useEffect, useMemo } from 'react';
import { DbkButton } from '../../../components/DbkButton';
import { formatUsdValue } from '@/ui/utils';
import { useTranslation } from 'react-i18next';

interface Props {
  visible?: boolean;
  onClose?: () => void;
  onSubmit?: () => void;
  gasFees: {
    withdrawFinalizeGasFee?: number;
    withdrawGasFee1?: number;
    withdrawProveGasFee?: number;
  };
}
export const WithdrawConfirmPopup = ({
  visible,
  onClose,
  onSubmit,
  gasFees,
}: Props) => {
  const { t } = useTranslation();
  const checkList = [
    {
      label: t('page.ecology.dbk.bridge.WithdrawConfirmPopup.question1'),
      value: 1,
    },
    {
      label: t('page.ecology.dbk.bridge.WithdrawConfirmPopup.question2'),
      value: 2,
    },
    {
      label: t('page.ecology.dbk.bridge.WithdrawConfirmPopup.question3'),
      value: 3,
    },
  ];
  const [checked, setChecked] = React.useState<number[]>([]);

  const isCheckedAll = useMemo(() => {
    return checkList.every((item) => checked.includes(item.value));
  }, [checkList, checked]);

  useEffect(() => {
    if (visible) {
      setChecked([]);
    }
  }, [visible]);

  return (
    <Popup
      title={
        <div className="text-r-neutral-title-1 text-[16px] font-semibold">
          {t('page.ecology.dbk.bridge.WithdrawConfirmPopup.title')}
        </div>
      }
      visible={visible}
      height={560}
      closable
      style={{ fontFamily: "'Lato', sans-serif" }}
      bodyStyle={{
        paddingTop: 8,
        paddingBottom: 80,
      }}
      onCancel={onClose}
    >
      <div className="text-r-neutral-body text-[13px] leading-[16px] text-center mb-[12px]">
        {t('page.ecology.dbk.bridge.WithdrawConfirmPopup.tips')}
      </div>
      <div className="rounded-[8px] border-[0.5px] border-rabby-neutral-line p-[16px] space-y-[16px] mb-[12px]">
        <div className="flex items-center justify-between text-r-neutral-title-1 text-[13px] leading-[16px] font-semibold">
          <div>{t('page.ecology.dbk.bridge.WithdrawConfirmPopup.step1')}</div>
          <div>
            {gasFees?.withdrawGasFee1
              ? formatUsdValue(gasFees.withdrawGasFee1)
              : '--'}
          </div>
        </div>
        <div className="text-[13px] leading-[16px] text-r-neutral-foot">
          Wait ~10 mins
        </div>
        <div className="flex items-center justify-between text-r-neutral-title-1 text-[13px] leading-[16px] font-semibold">
          <div>{t('page.ecology.dbk.bridge.WithdrawConfirmPopup.step2')}</div>
          <div>
            {gasFees?.withdrawProveGasFee
              ? formatUsdValue(gasFees.withdrawProveGasFee)
              : '--'}
          </div>
        </div>
        <div className="text-[13px] leading-[16px] text-r-neutral-foot">
          Wait ~7 days
        </div>
        <div className="flex items-center justify-between text-r-neutral-title-1 text-[13px] leading-[16px] font-semibold">
          <div>{t('page.ecology.dbk.bridge.WithdrawConfirmPopup.step3')}</div>
          <div>
            {' '}
            {gasFees?.withdrawFinalizeGasFee
              ? formatUsdValue(gasFees.withdrawFinalizeGasFee)
              : '--'}
          </div>
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
                  <RcIconUnCheckedCC className="text-r-neutral-body" />
                )}
              </div>
              <div className="min-w-0 text-[13px] leading-[17px] font-semibold text-r-neutral-title1">
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
      <footer className="fixed left-0 right-0 bottom-0 px-[20px] py-[18px] border-t-[0.5px] border-rabby-neutral-line bg-r-neutral-card1">
        <DbkButton
          className="w-full h-[44px]"
          disabled={!isCheckedAll}
          onClick={onSubmit}
        >
          {t('page.ecology.dbk.bridge.WithdrawConfirmPopup.btn')}
        </DbkButton>
      </footer>
    </Popup>
  );
};
