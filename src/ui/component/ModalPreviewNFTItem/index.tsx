import React from 'react';
import styled from 'styled-components';

import { TransferingNFTItem } from 'background/service/openapi';
import { Modal, ModalProps } from 'antd';
import NFTAvatar from '@/ui/views/Dashboard/components/NFT/NFTAvatar';

import { getChain } from '@/utils';
import clsx from 'clsx';
import { splitNumberByStep } from '@/ui/utils';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '@/ui/hooks/usePreference';

const PreviewModal = styled(Modal)`
  .ant-modal-body {
    padding: 12px;
  }
`;

const PreviewCard = styled.div`
  .nft-avatar {
    width: 100%;
    height: 306px;
    border-color: var(--r-neutral-line);
    border-radius: 6px;
    background-color: var(--r-neutral-bg1);
  }

  .nft-txpreview-title {
    font-weight: 500;
    font-size: 15px;
    line-height: 18px;
    color: var(--r-neutral-title1);
    border-bottom: 0.5px solid var(--r-neutral-line);
    padding-top: 16px;
    padding-bottom: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .nft-txpreview-properties {
    padding-top: 12px;
    margin-bottom: 16px;
  }
  .nft-txpreview-property {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    &:nth-last-child(1) {
      margin-bottom: 0;
    }
  }
  .nft-txpreview-property-label {
    font-weight: 500;
    font-size: 12px;
    line-height: 14px;
    color: var(--r-neutral-title1);
  }
  .nft-txpreview-property-value {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 12px;
    line-height: 14px;
    color: var(--r-neutral-foot);
  }
`;

export default function ModalPreviewNFTItem({
  nft,
  ...props
}: { nft: TransferingNFTItem } & ModalProps) {
  const collectProperty = nft?.collection;
  const { chainName } = React.useMemo(() => {
    const chainName = getChain(nft?.chain)?.name || '-';
    return { chainName };
  }, [collectProperty]);

  const { t } = useTranslation();
  const { isDarkTheme } = useThemeMode();

  return (
    <PreviewModal
      {...props}
      visible={!!nft}
      centered
      width={330}
      cancelText={null}
      closable={false}
      okText={null}
      footer={null}
      className={clsx(
        'nft-txpreview-modal modal-support-darkmode',
        props.className
      )}
    >
      <PreviewCard className="nft-txpreview-card">
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
      </PreviewCard>
    </PreviewModal>
  );
}
