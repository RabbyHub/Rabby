import React, { useCallback } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Tooltip } from 'antd';
import { ModalCloseIcon } from '@/ui/views/DesktopProfile/components/TokenDetailModal';
import { useMode } from '../../hooks/useMode';
import { formatPercent } from '../../utils/format';
import SymbolIcon from '../SymbolIcon';
import { ReactComponent as RcIconInfo } from '@/ui/assets/tip-cc.svg';
import { EmodeCategory } from '../../types';

const modalStyle = {
  width: 400,
  title: null as React.ReactNode,
  bodyStyle: { background: 'transparent', padding: 0 } as const,
  maskClosable: true,
  footer: null as React.ReactNode,
  zIndex: 1000,
  className: 'modal-support-darkmode',
  closeIcon: ModalCloseIcon,
  centered: true,
  maskStyle: {
    zIndex: 1000,
    backdropFilter: 'blur(8px)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
};

export const PairTable: React.FC<{
  data: EmodeCategory['assets'];
}> = ({ data }) => {
  const { t } = useTranslation();

  if (!data?.length) return null;

  return (
    <div className="mt-[8px] rounded-[6px] border border-rb-neutral-line">
      <div className="flex px-[12px] pb-0 pt-[8px]">
        <div className="flex-1 text-left text-[12px] leading-[16px] font-medium text-rb-neutral-body">
          {t('page.lending.manageEmode.overview.row.asset')}
        </div>
        <div className="flex-1 text-center text-[12px] leading-[16px] font-medium text-rb-neutral-body">
          {t('page.lending.manageEmode.overview.row.collateral')}
        </div>
        <div className="flex-1 text-center text-[12px] leading-[16px] font-medium text-rb-neutral-body">
          {t('page.lending.manageEmode.overview.row.borrowable')}
        </div>
      </div>
      <div className="space-y-[12px] px-12 pr-0 mt-[8px] pb-20 max-h-[120px] overflow-y-auto">
        {data.map((item) => (
          <div key={item.underlyingAsset} className="flex items-center">
            <div className="flex-1 flex items-center gap-[8px]">
              <SymbolIcon
                tokenSymbol={item.iconSymbol || item.symbol}
                size={24}
              />
              <span
                className={clsx(
                  'text-[12px] leading-[16px] font-medium text-r-neutral-title-1',
                  'truncate max-w-[100px]'
                )}
              >
                {item.symbol}
              </span>
            </div>
            <div className="flex-1 flex justify-center">
              {item.collateral ? (
                <span className="text-[16px] text-r-green-default">✓</span>
              ) : (
                <span className="text-[16px] text-r-red-default">✗</span>
              )}
            </div>
            <div className="flex-1 flex justify-center">
              {item.borrowable ? (
                <span className="text-[16px] text-r-green-default">✓</span>
              ) : (
                <span className="text-[16px] text-r-red-default">✗</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

type DisableEmodeModalProps = {
  visible: boolean;
  onCancel: () => void;
  onDisableEmode: () => void;
};

export const DisableEmodeModal: React.FC<DisableEmodeModalProps> = ({
  visible,
  onCancel,
  onDisableEmode,
}) => {
  const { t } = useTranslation();
  const { emodeCategoryId, eModes, currentEmode } = useMode();

  const handleDisable = useCallback(() => {
    onCancel();
    onDisableEmode();
  }, [onCancel, onDisableEmode]);

  return (
    <Modal {...modalStyle} visible={visible} onCancel={onCancel}>
      <div className="bg-r-neutral-bg-2 px-[20px] pt-[16px] pb-[16px] flex flex-col">
        <div className="text-[20px] leading-[28px] font-medium text-r-neutral-title-1 text-center">
          {t('page.lending.manageEmode.guide.title')}
        </div>
        <div className="text-[14px] leading-[17px] text-r-neutral-foot mt-[8px]">
          {t('page.lending.manageEmode.guide.description')}
        </div>
        <div className="mt-[11px] bg-r-neutral-card-1 rounded-[8px] p-[16px]">
          <div className="flex items-center justify-between border border-rb-neutral-line rounded-[6px] h-[48px] px-[12px]">
            <div className="text-[13px] leading-[16px] font-medium text-r-neutral-title-1 max-w-[180px] truncate">
              {emodeCategoryId ? eModes?.[emodeCategoryId]?.label || '' : ''}
            </div>
            <div>
              <span
                className={
                  'text-[13px] leading-[15px] font-medium text-rb-green-default'
                }
              >
                {t('page.lending.manageEmode.enabled')}
              </span>
            </div>
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
              {formatPercent(Number(currentEmode?.ltv || '0') / 10000)}
            </span>
          </div>
          <PairTable data={currentEmode?.assets || []} />
        </div>
        <div className="mt-auto w-full">
          <Button
            className={clsx(
              'w-full mt-[24px] h-[44px] rounded-[8px] font-medium',
              'border-rb-neutral-line bg-rb-neutral-line text-r-neutral-title-1',
              'hover:!border-rb-neutral-line hover:!bg-rb-neutral-line'
            )}
            onClick={handleDisable}
          >
            {t('page.lending.manageEmode.disableTitle')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
