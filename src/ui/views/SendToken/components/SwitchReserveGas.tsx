import { useRabbyDispatch, useRabbyGetter } from '@/ui/store';
import { Switch } from 'antd';
import React from 'react';

import { Trans, useTranslation } from 'react-i18next';

export default function SwitchReserveGas({
  loading = false,
  disabled = false,
  onChange,
}: Pick<
  React.ComponentProps<typeof Switch>,
  'loading' | 'disabled' | 'onChange'
>) {
  const { t } = useTranslation();

  const isReserveGasOnSendToken = useRabbyGetter(
    (s) => s.preference.isReserveGasOnSendToken
  );

  const dispatch = useRabbyDispatch();

  return (
    <div className="flex items-center gap-[6px] font-[12px] cursor-default">
      <Trans i18nKey="page.sendTokenComponents.SwitchReserveGas" t={t}>
        Reserved Gas
        <Switch
          loading={loading}
          disabled={disabled}
          checked={isReserveGasOnSendToken}
          onChange={(nextVal, e) => {
            dispatch.preference.setIsReserveGasOnSendToken(nextVal);
            onChange?.(nextVal, e);
          }}
        />
      </Trans>
    </div>
  );
}
