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
      <div
        className={clsx(
          'flex items-start',
          'rounded-[6px] py-16 px-12',
          'bg-r-neutral-card-1',
          {
            'border-rabby-neutral-line': !error,
          },
          'focus-within: border border-[#7084ff]',
          {
            'border-red': error,
          }
        )}
      >
        <img className="w-20 h-20 mr-8" src={chain.logo} alt={chain.name} />

        <Input.TextArea
          spellCheck={false}
          bordered={false}
          autoFocus
          onChange={(v) => onChange(v.target.value)}
          value={value}
          placeholder={t('page.newAddress.coboSafe.inputSafeModuleAddress')}
          className="p-0 min-h-[22px] text-r-neutral-title-1"
          autoSize={{
            minRows: 1,
            maxRows: 3,
          }}
        />
      </div>
      <div className="mt-12 text-13 text-red">{error}</div>
    </div>
  );
};
