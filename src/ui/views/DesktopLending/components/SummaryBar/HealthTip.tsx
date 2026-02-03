import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getHealthStatusColor } from '../../utils';
import { HF_COLOR_GOOD_THRESHOLD } from '../../utils/constant';

const TipWarning = ({
  size,
  fillColor,
  pathColor,
}: {
  size: number;
  fillColor: string;
  pathColor: string;
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 25 24"
      fill="none"
    >
      <g clip-path="url(#clip0_126501_79823)">
        <path
          d="M12.5004 21.6004C17.8023 21.6004 22.1004 17.3023 22.1004 12.0004C22.1004 6.69846 17.8023 2.40039 12.5004 2.40039C7.19846 2.40039 2.90039 6.69846 2.90039 12.0004C2.90039 17.3023 7.19846 21.6004 12.5004 21.6004Z"
          fill={fillColor}
          stroke={fillColor}
          stroke-width="1.5"
          stroke-miterlimit="10"
        />
        <path
          d="M12.5 12.75V7.5"
          stroke={pathColor}
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M12.5 17.25C13.1213 17.25 13.625 16.7463 13.625 16.125C13.625 15.5037 13.1213 15 12.5 15C11.8787 15 11.375 15.5037 11.375 16.125C11.375 16.7463 11.8787 17.25 12.5 17.25Z"
          fill={pathColor}
        />
      </g>
      <defs>
        <clipPath id="clip0_126501_79823">
          <rect
            width="24"
            height="24"
            fill={pathColor}
            transform="translate(0.5)"
          />
        </clipPath>
      </defs>
    </svg>
  );
};

export const HealthTip = ({
  healthFactor,
  onMoreClick,
}: {
  healthFactor: string;
  onMoreClick: () => void;
}) => {
  const { t } = useTranslation();
  const { textColor, pathColor } = useMemo(() => {
    const numHF = Number(healthFactor || '0');
    const hfColorInfo = getHealthStatusColor(numHF);

    return {
      textColor: hfColorInfo.tooltipTextColor,
      pathColor: numHF > HF_COLOR_GOOD_THRESHOLD ? 'black' : 'white',
    };
  }, [healthFactor]);
  return (
    <div className="flex items-center gap-[4px]">
      <TipWarning size={16} fillColor={textColor} pathColor={pathColor} />
      <span
        className="text-[13px] leading-[16px] font-medium whitespace-nowrap"
        style={{ color: textColor }}
      >
        {t('page.lending.summary.lq')}
        <span className="underline cursor-pointer" onClick={onMoreClick}>
          {' '}
          {t('page.lending.summary.more')}
        </span>
      </span>
    </div>
  );
};
