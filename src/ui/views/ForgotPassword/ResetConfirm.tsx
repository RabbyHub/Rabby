import { Card } from '@/ui/component/NewUserImport';
import React from 'react';
import { ReactComponent as TrashSVG } from '@/ui/assets/forgot/trash-cc.svg';
import { ReactComponent as TimeSVG } from '@/ui/assets/forgot/time-cc.svg';
import { Trans, useTranslation } from 'react-i18next';
import { Button, Input } from 'antd';
import clsx from 'clsx';

export const ResetConfirm: React.FC<{
  onConfirm: () => void;
  onBack: () => void;
}> = ({ onConfirm, onBack }) => {
  const { t } = useTranslation();
  const [disabled, setDisabled] = React.useState(true);
  const [input, setInput] = React.useState('');

  return (
    <Card
      className="p-0"
      headerClassName="mx-20"
      onBack={onBack}
      title={t('page.forgotPassword.reset.title')}
    >
      <div className={clsx('bg-r-red-light rounded-[8px]', 'p-16 mt-24 mx-20')}>
        <div className="gap-6 flex items-center">
          <TrashSVG className="text-r-red-default" />
          <h1 className="text-15 font-medium text-r-red-default">
            {t('page.forgotPassword.reset.alert.title')}
          </h1>
        </div>
        <ul className="mt-12 list-disc pl-16 mb-0">
          {[
            t('page.forgotPassword.reset.alert.seed'),
            t('page.forgotPassword.reset.alert.privateKey'),
          ].map((text, index) => (
            <li key={index} className="text-15 text-r-red-default mt-8">
              {text}
            </li>
          ))}
        </ul>
      </div>

      <div
        className={clsx(
          'p-16 rounded-[8px] mt-12 mx-20',
          'border-[0.5px] border-solid border-rabby-neutral-line'
        )}
      >
        <div className="gap-6 flex items-center">
          <TimeSVG className="text-r-neutral-foot" />
          <h1 className="text-15 font-medium text-r-neutral-foot">
            {t('page.forgotPassword.reset.tip.title')}
          </h1>
        </div>
        <ul className="mt-12 list-disc pl-16 mb-0">
          {[
            t('page.forgotPassword.reset.tip.hardware'),
            t('page.forgotPassword.reset.tip.safe'),
            t('page.forgotPassword.reset.tip.watch'),
            t('page.forgotPassword.reset.tip.whitelist'),
            t('page.forgotPassword.reset.tip.records'),
          ].map((text, index) => (
            <li key={index} className="text-15 text-r-neutral-foot mt-8">
              {text}
            </li>
          ))}
        </ul>
      </div>

      <div
        className={clsx(
          'mt-40 mx-20',
          'text-13 text-light-r-neutral-foot',
          'text-center'
        )}
      >
        <Trans t={t} i18nKey="page.forgotPassword.reset.confirm">
          Type
          <span className="text-r-red-default font-semibold">RESET</span>
          in the box to confirm and proceed
        </Trans>
      </div>

      <div className="mt-12 mx-20">
        <Input
          onChange={(e) => {
            setInput(e.target.value);
            setDisabled(e.target.value !== 'RESET');
          }}
          value={input}
          placeholder="RESET"
          className={clsx(
            'h-[52px] rounded-[8px]',
            'border-rabby-neutral-line bg-r-neutral-bg1 hover:border-rabby-blue-default focus:border-rabby-blue-default',
            'text-r-neutral-foot text-15'
          )}
          size="large"
        />
      </div>

      <div
        className={clsx(
          'flex flex-col items-center',
          'border-t-[0.5px] border-solid border-rabby-neutral-line',
          'px-20 py-16 mt-[22px]'
        )}
      >
        <Button
          disabled={disabled}
          onClick={onConfirm}
          block
          type="primary"
          danger
          className={clsx(
            'h-[48px] shadow-none rounded-[6px]',
            'text-[15px] font-medium',
            'disabled:text-opacity-40 disabled:bg-r-red-default disabled:opacity-50 border-transparent',
            'before:content-none'
          )}
        >
          {t('page.forgotPassword.reset.button')}
        </Button>
      </div>
    </Card>
  );
};
