import React from 'react';

import { TransferingNFTItem } from 'background/service/openapi';
import { Modal, ModalProps } from 'antd';
import NFTAvatar from '@/ui/views/Dashboard/components/NFT/NFTAvatar';

import { getChain } from '@/utils';
import { cn } from '@/ui/utils/cn';
import { splitNumberByStep } from '@/ui/utils';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '@/ui/hooks/usePreference';
import styles from './index.module.css';

export default function ModalPreviewNFTItem({
  nft,
  ...props
}: { nft: TransferingNFTItem } & ModalProps) {
  const collectProperty = nft?.collection;
  const { chainName } = React.useMemo(() => {
    const chainName = getChain(nft?.chain)?.name || '-';
    return { chainName };
  }, [nft?.chain]);

  const { t } = useTranslation();
  const { isDarkTheme } = useThemeMode();

  return (
    <Modal
      {...props}
      visible={!!nft}
      centered
      width={330}
      cancelText={null}
      closable={false}
      okText={null}
      footer={null}
      className={cn(
        styles.previewModal,
        'nft-txpreview-modal modal-support-darkmode',
        props.className
      )}
    >
      <div className={cn(styles.previewCard, 'nft-txpreview-card')}>
        <NFTAvatar
          thumbnail={false}
          content={nft?.content}
          type={nft?.content_type}
          amount={nft?.amount}
        ></NFTAvatar>
        <div className="nft-txpreview-title">{nft?.name || '-'}</div>
        <div className="nft-txpreview-properties">
          <div className="nft-txpreview-property">
            <div className="nft-txpreview-property-label">
              {t('component.ModalPreviewNFTItem.FieldLabel.Collection')}
            </div>
            <div className="nft-txpreview-property-value">
              {collectProperty?.name || '-'}
            </div>
          </div>
          <div className="nft-txpreview-property">
            <div className="nft-txpreview-property-label">
              {t('component.ModalPreviewNFTItem.FieldLabel.Chain')}
            </div>
            <div className="nft-txpreview-property-value">{chainName}</div>
          </div>
          <div className="nft-txpreview-property">
            <div className="nft-txpreview-property-label">
              {t('component.ModalPreviewNFTItem.FieldLabel.PurschaseDate')}
            </div>
            <div className="nft-txpreview-property-value">
              {/* todo */}
              {(nft as any)?.pay_token?.date_at || '-'}
            </div>
          </div>
          <div className="nft-txpreview-property">
            <div className="nft-txpreview-property-label">
              {t('component.ModalPreviewNFTItem.FieldLabel.LastPrice')}
            </div>
            <div className="nft-txpreview-property-value">
              {(nft as any)?.usd_price
                ? `$${splitNumberByStep(
                    ((nft as any)?.usd_price || 0).toFixed(2)
                  )}`
                : '-'}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
