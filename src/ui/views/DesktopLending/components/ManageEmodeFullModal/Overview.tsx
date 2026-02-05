import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { formatUserSummary } from '@aave/math-utils';
import { useMode } from '../../hooks/useMode';
import { useLendingISummary } from '../../hooks';
import { isHFEmpty } from '../../utils';
import { formatPercent } from '../../utils/format';
import { Tooltip } from 'antd';
import { HealthFactorText } from '../HealthFactorText';
import { isEModeCategoryAvailable } from '../../utils/emode';
import { ReactComponent as RcIconInfo } from '@/ui/assets/tip-cc.svg';
import Popup from '@/ui/component/Popup';
import { usePopupContainer } from '@/ui/hooks/usePopupContainer';
import { ReactComponent as RcIconArrowCC } from '@/ui/assets/lending/arrow-cc.svg';
import { PairTable } from '../DisableEmodeModal';

export const ManageEmodeFullModalOverview: React.FC<{
  selectedCategoryId?: number;
  disabled?: boolean;
  newSummary: ReturnType<typeof formatUserSummary>;
  onSelectCategory?: (categoryId: number) => void;
  isUnAvailable?: boolean;
}> = ({
  selectedCategoryId,
  onSelectCategory,
  disabled: disableEmode,
  newSummary,
  isUnAvailable,
}) => {
  const { t } = useTranslation();
  const { eModes } = useMode();

  const { iUserSummary } = useLendingISummary();

  const healthFactor = useMemo(() => {
    return iUserSummary?.healthFactor || '';
  }, [iUserSummary?.healthFactor]);

  const categoryOptions = useMemo(() => {
    if (!eModes || !iUserSummary) return [];
    return Object.values(eModes)
      .filter((e) => e.id !== 0 && e.assets?.length > 0)
      .map((e) => {
        const available = isEModeCategoryAvailable(iUserSummary, e);
        return {
          value: e.id,
          label: available
            ? e.label
            : `${e.label} ${t('page.lending.manageEmode.unavailable')}`,
          available,
        };
      });
  }, [eModes, iUserSummary, t]);

  // Shown only if the user has a collateral asset which is changing in LTV
  const showLTVChange = useMemo(() => {
    return (
      iUserSummary?.currentLoanToValue !== '0' &&
      Number(newSummary.currentLoanToValue).toFixed(3) !==
        Number(iUserSummary?.currentLoanToValue).toFixed(3)
    ); // Comparing without rounding causes stuttering, LTVs update asyncronously
  }, [iUserSummary?.currentLoanToValue, newSummary.currentLoanToValue]);

  const afterHealthFactor = useMemo(() => {
    return newSummary?.healthFactor || '';
  }, [newSummary?.healthFactor]);

  const isEmptyHF = useMemo(() => {
    return (
      isHFEmpty(Number(healthFactor || '0')) &&
      isHFEmpty(Number(afterHealthFactor || '0'))
    );
  }, [afterHealthFactor, healthFactor]);

  const ltvLineContent = useMemo(() => {
    if (disableEmode || !selectedCategoryId) {
      return showLTVChange
        ? `${formatPercent(
            Number(iUserSummary?.currentLoanToValue || '0')
          )} → ${formatPercent(Number(newSummary.currentLoanToValue || '0'))}`
        : formatPercent(Number(newSummary.currentLoanToValue));
    }
    const targetMode = eModes[selectedCategoryId];
    return showLTVChange
      ? `${formatPercent(
          Number(iUserSummary?.currentLoanToValue || '0')
        )} → ${formatPercent(Number(targetMode?.ltv) / 10000)}`
      : formatPercent(Number(targetMode?.ltv) / 10000);
  }, [
    disableEmode,
    selectedCategoryId,
    eModes,
    showLTVChange,
    iUserSummary?.currentLoanToValue,
    newSummary.currentLoanToValue,
  ]);

  const [categoryPopupVisible, setCategoryPopupVisible] = useState(false);

  const selectedCategory = useMemo(
    () => (selectedCategoryId ? eModes?.[selectedCategoryId] : undefined),
    [eModes, selectedCategoryId]
  );

  const { getContainer } = usePopupContainer();

  return (
    <div>
      <div className="text-[13px] mt-[16px] leading-[13px] font-normal text-r-neutral-foot mb-8">
        {t('page.lending.popup.title')}
      </div>
      <div className="mt-[6px] rounded-[8px] bg-rb-neutral-card-1 p-[16px]">
        <div>
          <div
            className={clsx(
              'text-[14px] leading-[18px] font-medium text-r-neutral-title-1'
            )}
          >
            {t('page.lending.manageEmode.overview.title')}
          </div>
          {disableEmode ? (
            <div className="flex items-center justify-between border border-rb-neutral-line rounded-[6px] h-[48px] px-[12px] mt-6">
              <span className="text-[13px] leading-[16px] font-medium text-r-neutral-title-1 max-w-[180px] truncate">
                {selectedCategoryId
                  ? eModes?.[selectedCategoryId]?.label || ''
                  : ''}
              </span>
              <div className="mt-[4px]">
                <span className="text-[13px] leading-[15px] font-medium text-rb-green-default">
                  {t('page.lending.manageEmode.enabled')}
                </span>
              </div>
            </div>
          ) : (
            <div
              className={clsx(
                'w-full mt-6 h-[48px] px-[12px] rounded-[6px]  border-none bg-r-neutral-card-2',
                'flex items-center justify-between',
                disableEmode && 'opacity-60 cursor-not-allowed'
              )}
              onClick={() => {
                if (!disableEmode) {
                  setCategoryPopupVisible(true);
                }
              }}
            >
              <span className="text-[13px] leading-[16px] font-medium text-r-neutral-title-1 max-w-[220px] truncate text-left">
                {selectedCategory?.label ||
                  t('page.lending.manageEmode.categorySelector.placeholder')}
              </span>
              <RcIconArrowCC
                width={20}
                height={20}
                className="cursor-pointer text-rb-neutral-foot transform rotate-90"
              />
            </div>
          )}
          {isUnAvailable && (
            <p className="text-[16px] leading-[24px] text-r-neutral-foot mt-[4px]">
              {t('page.lending.manageEmode.categorySelector.desc')}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-[16px]">
          <div className="flex items-center gap-[4px]">
            <span className="text-[13px] leading-[16px] font-medium text-r-neutral-title-1">
              {t('page.lending.maxLtv')}
            </span>
            <Tooltip
              overlayClassName="rectangle"
              title={t('page.lending.modalDesc.maxLTV')}
            >
              <RcIconInfo
                width={12}
                height={12}
                className="cursor-pointer text-rb-neutral-foot"
              />
            </Tooltip>
          </div>
          <span className="text-[13px] leading-[16px] font-medium text-r-neutral-title-1">
            {ltvLineContent}
          </span>
        </div>

        {!isEmptyHF && (
          <div className="flex items-center justify-between mt-[16px]">
            <span className="text-[13px] leading-[16px] font-medium text-r-neutral-title-1">
              {t('page.lending.hfTitle')}
            </span>
            <span className="text-[13px] leading-[16px] font-normal text-r-neutral-foot flex items-center">
              {afterHealthFactor ? (
                <>
                  <HealthFactorText
                    limitless={healthFactor === '-1'}
                    healthFactor={healthFactor}
                  />{' '}
                  <span className="mx-1">→</span>
                  <HealthFactorText
                    limitless={afterHealthFactor === '-1'}
                    healthFactor={afterHealthFactor}
                  />
                </>
              ) : (
                <HealthFactorText
                  limitless={healthFactor === '-1'}
                  healthFactor={healthFactor}
                />
              )}
            </span>
          </div>
        )}

        {!isEmptyHF && (
          <div className="flex justify-end mt-[2px]">
            <span className="text-[12px] leading-[15px] text-r-neutral-foot">
              {t('page.lending.popup.liquidationAt')}
            </span>
          </div>
        )}

        {!disableEmode && (
          <PairTable
            data={
              selectedCategoryId
                ? eModes?.[selectedCategoryId]?.assets || []
                : []
            }
          />
        )}
      </div>

      {!disableEmode && (
        <Popup
          visible={categoryPopupVisible}
          onClose={() => setCategoryPopupVisible(false)}
          height={500}
          width={400}
          closable
          className="p-0"
          isSupportDarkMode
          bodyStyle={{ padding: 0 }}
          getContainer={getContainer}
        >
          <div className="bg-r-neutral-bg-2 h-full rounded-t-[12px] overflow-hidden">
            <div className="h-[56px] flex items-center justify-center relative">
              <span className="text-[20px] leading-[24px] font-medium text-r-neutral-title-1">
                {t('page.lending.manageEmode.overview.title')}
              </span>
            </div>

            <div className="px-[18px] pt-[10px] pb-[8px]">
              <div className="flex items-center justify-between text-[12px] leading-[14px] text-r-neutral-foot">
                <span className="pl-[16px]">
                  {t('page.lending.manageEmode.overview.row.asset')}
                </span>
                <span className="pr-[16px]">{t('page.lending.maxLtv')}</span>
              </div>
            </div>

            <div className="px-[18px] pt-[4px] pb-[30px] space-y-[8px] max-h-[400px] overflow-y-auto">
              {categoryOptions.map(({ value, label, available }) => {
                const category = eModes?.[value];
                const ltvText = category
                  ? formatPercent(Number(category.ltv) / 10000)
                  : '--';
                const isSelected = selectedCategoryId === value;

                return (
                  <button
                    key={value}
                    type="button"
                    disabled={!available}
                    className={clsx(
                      'w-full h-[48px] rounded-[8px] px-[16px] flex items-center justify-between',
                      'bg-rb-neutral-card-1 text-[14px] font-medium text-r-neutral-title-1',
                      !available && 'opacity-50 cursor-not-allowed',
                      isSelected && 'ring-1 ring-rb-brand-default'
                    )}
                    onClick={() => {
                      if (!available) return;
                      onSelectCategory?.(value);
                      setCategoryPopupVisible(false);
                    }}
                  >
                    <span className="truncate max-w-[240px] text-left">
                      {label}
                    </span>
                    <span>{ltvText}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Popup>
      )}
    </div>
  );
};
