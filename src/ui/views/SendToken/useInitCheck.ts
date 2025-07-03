import { useEffect, useState, useCallback, Fragment } from 'react';
import { Modal } from 'antd';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AddrDescResponse } from '@rabby-wallet/rabby-api/dist/types';

import { query2obj } from '@/ui/utils/url';
import { useWallet } from '@/ui/utils';

export const useInitCheck = (addressDesc?: AddrDescResponse['desc']) => {
  const history = useHistory();
  const wallet = useWallet();
  const { t } = useTranslation();

  const [checked, setChecked] = useState(false);

  const checkFn = useCallback(
    async (id: string, chain: string, toDesc: AddrDescResponse['desc']) => {
      setChecked(true);
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
            reason: t('page.sendToken.noSupprotTokenForDex'),
          };
        }
      } else {
        const safeChains = Object.entries(addressDesc?.contract || {})
          .filter(([, contract]) => {
            return contract.multisig;
          })
          .map(([chain]) => chain?.toLocaleLowerCase());
        if (
          safeChains.length > 0 &&
          !safeChains.includes(chain?.toLocaleLowerCase())
        ) {
          return {
            disable: true,
            reason: t('page.sendToken.noSupprotTokenForSafe'),
          };
        }
        const contactChains = Object.entries(
          addressDesc?.contract || {}
        ).map(([chain]) => chain?.toLocaleLowerCase());
        if (
          contactChains.length > 0 &&
          !contactChains.includes(chain?.toLocaleLowerCase())
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
    [wallet]
  );

  useEffect(() => {
    const qs = query2obj(history.location.search);
    const toAddress = qs.to;
    if (!qs.token || !toAddress) {
      setChecked(true);
      return;
    }
    const [tokenChain, id] = qs.token.split(':');
    if (!tokenChain || !id || !addressDesc || checked) {
      return;
    }
    checkFn(id, tokenChain, addressDesc).then((res) => {
      if (res.disable) {
        Modal.confirm({
          width: 340,
          closable: true,
          closeIcon: Fragment,
          centered: true,
          className: 'token-selector-disable-item-tips',
          title: null,
          content: res.reason,
          okText: t('global.proceedButton'),
          cancelText: t('global.cancelButton'),
          cancelButtonProps: {
            type: 'ghost',
            className: 'text-r-blue-default border-r-blue-default',
          },
          onOk() {},
          onCancel() {
            history.goBack();
          },
        });
        return;
      }
    });
  }, [checked, history.location.search, addressDesc, checkFn, history, t]);
};
