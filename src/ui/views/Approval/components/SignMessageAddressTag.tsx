import React from 'react';
import { useTranslation } from 'react-i18next';
import { Chain } from 'background/service/openapi';
import { KEYRING_TYPE } from 'consts';
import { useBrandIcon } from '@/ui/hooks/useBrandIcon';
import { useSignStore } from '@/ui/state/sign';
import { getTokenSymbol } from '@/ui/utils/token';
import IconDanger from '@/ui/assets/sign/security-engine/danger.svg';
import { ReactComponent as IconArrowRight } from '@/ui/assets/sign/arrow-right-lite.svg';
import ViewMore from './Actions/components/ViewMore';
import { SignMessageAddressData } from './signMessageAddressData';
import { cn } from '@/ui/utils/cn';
import styles from './SignMessageAddressTag.module.css';

interface Props {
  chain: Chain;
  data: SignMessageAddressData;
  danger: boolean;
  triggerRef: React.Ref<HTMLButtonElement>;
}

const SignMessageAddressTag = ({ chain, data, danger, triggerRef }: Props) => {
  const { t } = useTranslation();
  const openTokenDetailPopup = useSignStore(
    (state) => state.openTokenDetailPopup
  );
  const addressInfo = data;
  const { address } = addressInfo;
  const alias = addressInfo?.alias;
  const protocol = addressInfo?.protocol || null;
  const aliasIcon = useBrandIcon({
    address,
    brandName:
      addressInfo.localAccount?.brandName || KEYRING_TYPE.WatchAddressKeyring,
    type: addressInfo.localAccount?.type || KEYRING_TYPE.WatchAddressKeyring,
  });

  const token = addressInfo.token;
  const hasAlias = !!alias;
  const opensTokenDetail = !!token && !danger && !hasAlias;
  const label = danger
    ? 'Danger'
    : alias || (token ? getTokenSymbol(token) : protocol?.name || '');
  const icon = danger
    ? IconDanger
    : hasAlias
    ? aliasIcon
    : token
    ? token.logo_url
    : protocol?.logo_url;
  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      className={cn(styles.trigger, danger ? styles.danger : styles.normal)}
      aria-label={label}
      title={label}
      style={{ visibility: 'hidden' }}
      onMouseDown={(event) => event.preventDefault()}
      onClick={
        opensTokenDetail && token
          ? () => openTokenDetailPopup(token)
          : undefined
      }
    >
      {icon ? (
        <img
          className="sign-message-address-tag__icon"
          src={icon}
          alt=""
          style={{ borderRadius: danger || hasAlias ? 0 : '50%' }}
        />
      ) : null}
      <span className="sign-message-address-tag__text">{label}</span>
      <IconArrowRight className="sign-message-address-tag__arrow" />
    </button>
  );

  if (opensTokenDetail) return trigger;

  return addressInfo.isContract ? (
    <ViewMore
      title={t('page.signTx.signMessageTag.contract')}
      inline
      type="spender"
      data={{
        spender: address,
        chain,
        protocol,
        rank: addressInfo.contractInfo?.credit?.rank_at || null,
        bornAt:
          addressInfo.contractInfo?.create_at ||
          addressInfo.addressDesc?.contract?.[chain.serverId]?.create_at ||
          null,
        hasInteraction: addressInfo.hasInteraction,
        riskExposure: addressInfo.contractInfo?.spend_usd_value || 0,
        isEOA: false,
        isDanger:
          addressInfo?.isMalicious ||
          addressInfo?.contractInfo?.is_danger.auto ||
          addressInfo?.contractInfo?.is_danger.edit ||
          false,
      }}
    >
      {trigger}
    </ViewMore>
  ) : (
    <ViewMore
      inline
      type="receiver"
      data={{
        title: t('page.signTx.signMessageTag.eoa'),
        address,
        chain,
        eoa: {
          id: address,
          bornAt: addressInfo.addressDesc?.born_at || 0,
        },
        cex:
          addressInfo.addressDesc?.cex &&
          Object.keys(addressInfo.addressDesc.cex).length > 0
            ? {
                id: addressInfo.addressDesc.cex.id,
                name: addressInfo.addressDesc.cex.name,
                logo: addressInfo.addressDesc.cex.logo_url,
                bornAt: addressInfo.addressDesc.born_at,
                isDeposit: addressInfo.addressDesc.cex.is_deposit,
                supportToken: true,
              }
            : null,
        contract: null,
        usd_value: addressInfo.addressDesc?.usd_value || 0,
        hasTransfer: addressInfo.hasTransfer,
        isTokenContract: false,
        name: addressInfo.addressDesc?.name || null,
        onTransferWhitelist: addressInfo.onTransferWhitelist,
        hasReceiverPrivateKeyInWallet:
          addressInfo.hasReceiverPrivateKeyInWallet,
        hasReceiverMnemonicInWallet: addressInfo.hasReceiverMnemonicInWallet,
      }}
    >
      {trigger}
    </ViewMore>
  );
};

export default SignMessageAddressTag;
