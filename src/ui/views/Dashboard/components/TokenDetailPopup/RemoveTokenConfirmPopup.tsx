import React, { useState } from 'react';
import { Button, message } from 'antd';
import type { DrawerProps } from 'antd';
import type { TokenItem } from '@/background/service/openapi';
import Popup from '@/ui/component/Popup';
import TokenWithChain from '@/ui/component/TokenWithChain';
import { useTranslation } from 'react-i18next';
import { useRemovedTokens } from '@/ui/hooks/useRemovedTokens';
import { usePopupContainer } from '@/ui/hooks/usePopupContainer';
import { getTokenSymbol } from '@/ui/utils/token';
import { ReactComponent as RcIconBack } from '@/ui/assets/icon-back-cc.svg';
import './style.less';

/** Confirms removal before saving the token to the shared removed-token list. */
export const RemoveTokenConfirmPopup = ({
  token,
  onClose,
  getContainer,
}: {
  token: TokenItem;
  onClose: () => void;
  getContainer?: DrawerProps['getContainer'];
}) => {
  const { t } = useTranslation();
  const { getContainer: fromModalContainer } = usePopupContainer();
  const addRemovedToken = useRemovedTokens((state) => state.addRemovedToken);
  const [removing, setRemoving] = useState(false);

  const handleClose = () => {
    if (!removing) onClose();
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await addRemovedToken({ tokenId: token.id, chain: token.chain });
      onClose();
    } catch (error) {
      console.error('Remove token failed:', error);
      message.error(t('page.dashboard.tokenDetail.removed.removeFailed'));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Popup
      visible
      height={490}
      title={t('page.dashboard.tokenDetail.removed.confirmTitle')}
      closable
      closeIcon={<RcIconBack />}
      onClose={handleClose}
      maskClosable={!removing}
      keyboard={!removing}
      push={false}
      isSupportDarkMode
      className="remove-token-confirm-popup"
      getContainer={getContainer ?? fromModalContainer}
    >
      <div className="remove-token-confirm-content">
        <div className="remove-token-confirm-description">
          <p>· {t('page.dashboard.tokenDetail.removed.portfolioNotice')}</p>
          <p>· {t('page.dashboard.tokenDetail.removed.restoreNotice')}</p>
        </div>
        <div className="remove-token-confirm-token">
          <TokenWithChain
            token={token}
            width="40px"
            height="40px"
            chainSize={23.333}
          />
          <span className="remove-token-confirm-symbol">
            {getTokenSymbol(token)}
          </span>
        </div>
      </div>
      <div className="remove-token-confirm-buttons">
        <Button type="primary" ghost disabled={removing} onClick={handleClose}>
          {t('global.Cancel')}
        </Button>
        <Button type="primary" danger loading={removing} onClick={handleRemove}>
          {t('page.dashboard.tokenDetail.removed.remove')}
        </Button>
      </div>
    </Popup>
  );
};
