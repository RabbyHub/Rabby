import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getHealthStatusColor } from '../../utils';
import { HF_COLOR_GOOD_THRESHOLD } from '../../utils/constant';
import { getHealthFactorText } from '../../utils/health';

interface HealthFactorBarProps {
  healthFactor: string;
}

export const HealthFactorBar: React.FC<HealthFactorBarProps> = ({
  healthFactor,
}) => {
  const { t } = useTranslation();
  const hfNumber = Number(healthFactor || '0');

  const dotPosition = useMemo(() => {
    if (hfNumber > 10) {
      return 90;
    }
    if (hfNumber > 3) {
      return 50 + ((hfNumber - 3) / 7) * 45;
    }
    if (hfNumber > 1) {
      return 10 + ((hfNumber - 1) / 2) * 40;
    }
    return (hfNumber / 1) * 10;
  }, [hfNumber]);

  const hfColor = useMemo(() => getHealthStatusColor(hfNumber), [hfNumber]);

  return (
    <div className="relative mt-[20px] mb-[56px] w-full">
      <div
        className="h-[6px] rounded-[3px] w-full"
        style={{
          background:
            'linear-gradient(to right, var(--rb-red-default) 0%, var(--rb-orange-default) 18%, var(--rb-orange-default) 20%, var(--rb-green-default) 100%)',
        }}
      />
      <div
        className="absolute bottom-[130%] mb-[6px] z-[3] flex flex-col items-center"
        style={{
          left: `${Math.min(dotPosition, 100)}%`,
          transform: 'translateX(-50%)',
        }}
      >
        <div className="flex items-center gap-[5px] mb-[2px]">
          <span
            className="text-[15px] leading-[20px] font-medium text-center"
            style={{ color: hfColor.color }}
          >
            {getHealthFactorText(healthFactor)}
          </span>
          <span
            className="inline-block w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent"
            style={{ borderTopColor: hfColor.color }}
          />
        </div>
        {hfNumber < HF_COLOR_GOOD_THRESHOLD && (
          <div
            className="flex items-center py-[1px] px-[4px] rounded-[4px] overflow-hidden"
            style={{ backgroundColor: hfColor.backgroundColor }}
          >
            <span
              className="text-[12px] leading-[16px] font-normal text-center"
              style={{ color: hfColor.color }}
            >
              {t('page.lending.lqDescription.risky')}
            </span>
          </div>
        )}
      </div>
      <div
        className="absolute left-0 top-[150%] flex flex-col items-center"
        style={{ maxWidth: '20%' }}
      >
        <div
          className="w-[3px] h-[12px] shrink-0"
          style={{ backgroundColor: 'var(--rb-red-default)' }}
        />
        <span className="text-[15px] leading-[20px] font-medium text-rb-red-default text-center">
          1.00
        </span>
        <span className="text-[12px] leading-[16px] font-normal text-rb-red-default text-center">
          {t('page.lending.lqDescription.desc')}
        </span>
      </div>
    </div>
  );
};
