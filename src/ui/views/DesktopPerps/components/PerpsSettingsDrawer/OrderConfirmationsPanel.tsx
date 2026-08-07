import React from 'react';
import { Switch } from 'antd';
import { useMemoizedFn } from 'ahooks';
import { useTranslation } from 'react-i18next';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { PERPS_ORDER_CONFIRM_SETTING_ORDER } from '@/constant/perps';
import type { PerpsOrderConfirmType } from '@/constant/perps';

export const OrderConfirmationsPanel: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();
  const orderConfirmations = useRabbySelector(
    (s) => s.perps.orderConfirmations
  );

  const handleChange = useMemoizedFn(
    (type: PerpsOrderConfirmType, enabled: boolean) => {
      dispatch.perps.updateOrderConfirmation({ type, enabled });
    }
  );

  return (
    <div className="flex flex-col gap-[24px] px-[20px] py-[12px]">
      {PERPS_ORDER_CONFIRM_SETTING_ORDER.map((type) => {
        // A key the user has never touched isn't persisted yet, and an
        // unpersisted confirmation is on — same rule the gate applies.
        const checked = orderConfirmations?.[type] !== false;
        return (
          <div
            key={type}
            onClick={() => handleChange(type, !checked)}
            className="flex cursor-pointer items-center justify-between gap-[12px]"
          >
            <span className="text-[13px] leading-[16px] text-rb-neutral-title-1">
              {t(`page.perpsPro.settings.orderConfirmationRow.${type}`)}
            </span>
            {/* Without this the row handler fires too and cancels the toggle
                back out. */}
            <span
              className="flex items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <Switch
                size="small"
                checked={checked}
                onChange={(next) => handleChange(type, next)}
                className="desktop-perps-settings-switch"
              />
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default OrderConfirmationsPanel;
