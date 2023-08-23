import { CHAINS_ENUM, CHAINS } from '@debank/common';
import { Input } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';

export interface Props {
  onChange: (value: string) => void;
  value: string;
  chainEnum: CHAINS_ENUM;
  error: string;
}

export const AddressInput: React.FC<Props> = ({
  onChange,
  value,
  chainEnum,
  error,
}) => {
  const chain = CHAINS[chainEnum];
  const { t } = useTranslation();

  return (
    <div>
      <Input
        prefix={
          <img className="w-20 h-20 mr-8" src={chain.logo} alt={chain.name} />
        }
        autoFocus
        onChange={(v) => onChange(v.target.value)}
        value={value}
        placeholder={t('page.newAddress.coboSafe.inputSafeModuleAddress')}
        className={clsx('rounded-[6px] py-16 px-12', {
          'border-gray-divider': !error,
          'border-red': error,
        })}
      />
      <div className="mt-12 text-13 text-red">{error}</div>
    </div>
  );
};
