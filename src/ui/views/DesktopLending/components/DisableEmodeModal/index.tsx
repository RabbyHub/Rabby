import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button } from 'antd';
import { ModalCloseIcon } from '@/ui/views/DesktopProfile/components/TokenDetailModal';
import { useMode } from '../../hooks/useMode';
import { formatPercent } from '../../utils/format';
import SymbolIcon from '../SymbolIcon';
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

const PairTable: React.FC<{
  data: EmodeCategory['assets'];
}> = ({ data }) => {
  const { t } = useTranslation();

  if (!data?.length) return null;

  return (
    <div className="mt-[12px]">
      <div className="flex bg-rb-neutral-bg-3 rounded-[6px] px-[12px] py-[8px]">
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
      <div className="mt-[12px] space-y-[12px]">
        {data.map((item) => (
          <div key={item.underlyingAsset} className="flex items-center">
            <div className="flex-1 flex items-center gap-[8px]">
              <SymbolIcon
                tokenSymbol={item.iconSymbol || item.symbol}
                size={24}
              />
              <span className="text-[12px] leading-[16px] font-medium text-r-neutral-title-1 truncate max-w-[100px]">
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
      <div className="bg-r-neutral-bg-2 rounded-[12px] p-[24px]">
        <p className="text-[20px] leading-[28px] font-medium text-r-neutral-title-1 text-center">
          {t('page.lending.manageEmode.guide.title')}
        </p>
        <p className="text-[16px] leading-[24px] text-r-neutral-foot text-center mt-[8px] px-[25px]">
          {t('page.lending.manageEmode.guide.description')}
        </p>
        <div className="mt-[8px] border border-rb-neutral-line rounded-[16px] p-[20px] space-y-[24px]">
          <div>
            <div className="text-[14px] leading-[18px] font-medium text-r-neutral-foot mb-[12px]">
              {t('page.lending.manageEmode.categorySelector.label')}
            </div>
            <div className="text-[17px] leading-[22px] font-medium text-r-neutral-title-1">
              {emodeCategoryId ? eModes?.[emodeCategoryId]?.label || '' : ''}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[16px] leading-[20px] font-medium text-r-neutral-foot">
              {t('page.lending.maxLtv')}
            </span>
            <span className="text-[16px] leading-[22px] font-medium text-r-neutral-title-1">
              {formatPercent(Number(currentEmode?.ltv || '0') / 10000)}
            </span>
          </div>
          <PairTable data={currentEmode?.assets || []} />
        </div>
        <Button
          className="w-full mt-[24px] h-[44px] rounded-[8px] font-medium border-rb-neutral-line bg-rb-neutral-line text-r-neutral-title-1 hover:!border-rb-neutral-line hover:!bg-rb-neutral-line"
          onClick={handleDisable}
        >
          {t('page.lending.manageEmode.disableTitle')}
        </Button>
      </div>
    </Modal>
  );
};
