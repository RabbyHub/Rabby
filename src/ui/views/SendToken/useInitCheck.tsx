import React, { useEffect, useRef, useCallback, Fragment } from 'react';
import { Modal } from 'antd';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AddrDescResponse } from '@rabby-wallet/rabby-api/dist/types';
import { query2obj } from '@/ui/utils/url';
import { useWallet } from '@/ui/utils';
import { RiskWarningTitle } from '@/ui/component/RiskWarningTitle';

export const useInitCheck = (addressDesc?: AddrDescResponse['desc']) => {
  const history = useHistory();
  const wallet = useWallet();
  const { t } = useTranslation();

  const checkedRef = useRef(false);

  const checkFn = useCallback(
    async (id: string, chain: string, toDesc: AddrDescResponse['desc']) => {
      const toCexId = toDesc?.cex?.id;
      if (toCexId) {
        const isCexSupport = await wallet.openapi.depositCexSupport(
          id,
          chain,
          toCexId
        );
        if (!isCexSupport.support) {
          return {
            disable: true,
            cexId: toCexId,
            reason: t('page.sendToken.noSupprotTokenForDex'),
          };
        }
      } else {
        const safeChains = Object.entries(toDesc?.contract || {})
          .filter(([, contract]) => {
            return contract.multisig;
          })
          .map(([chain]) => chain?.toLowerCase());
        if (
          safeChains.length > 0 &&
          !safeChains.includes(chain?.toLowerCase())
        ) {
          return {
            disable: true,
            reason: t('page.sendToken.noSupprotTokenForSafe'),
          };
        }
        const contactChains = Object.entries(
          toDesc?.contract || {}
        ).map(([chain]) => chain?.toLowerCase());
        if (
          contactChains.length > 0 &&
          !contactChains.includes(chain?.toLowerCase())
        ) {
          return {
            disable: true,
            reason: t('page.sendToken.noSupportTokenForChain'),
          };
        }
      }
      return {
        disable: false,
        reason: '',
      };
    },
    [t, wallet.openapi]
  );

  useEffect(() => {
    const qs = query2obj(history.location.search);
    const toAddress = qs.to;
    if (!qs.token || !toAddress) {
      checkedRef.current = true;
      return;
    }
    const [tokenChain, id] = qs.token.split(':');
    if (!tokenChain || !id || !addressDesc || checkedRef.current) {
      return;
    }
    checkedRef.current = true;
    checkFn(id, tokenChain, addressDesc).then((res) => {
      if (res.disable) {
        Modal.confirm({
          width: 340,
          closable: true,
          closeIcon: <></>,
          centered: true,
          className: 'token-selector-disable-item-tips',
          title: <RiskWarningTitle />,
          content: res.reason,
          okText: t('global.proceedButton'),
          cancelText: t('global.cancelButton'),
          cancelButtonProps: {
            type: 'ghost',
            className: 'text-r-blue-default border-r-blue-default',
          },
          onOk() {
            if (res.cexId) {
              wallet.openapi.checkCex({
                chain_id: tokenChain,
                id,
                cex_id: res.cexId,
              });
            }
          },
          onCancel() {
            history.goBack();
          },
        });
        return;
      }
    });
  }, [
    history.location.search,
    addressDesc,
    checkFn,
    history,
    t,
    wallet.openapi,
  ]);
};
