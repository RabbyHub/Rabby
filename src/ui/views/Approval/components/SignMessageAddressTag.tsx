import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Chain } from 'background/service/openapi';
import { KEYRING_TYPE } from 'consts';
import { useBrandIcon } from '@/ui/hooks/useBrandIcon';
import { useRabbyDispatch } from '@/ui/store';
import { getTokenSymbol } from '@/ui/utils/token';
import IconDanger from '@/ui/assets/sign/security-engine/danger.svg';
import { ReactComponent as IconArrowRight } from '@/ui/assets/sign/arrow-right-lite.svg';
import ViewMore from './Actions/components/ViewMore';
import { SignMessageAddressData } from './signMessageAddressData';

const Trigger = styled.button<{
  $danger: boolean;
}>`
  box-sizing: content-box;
  position: absolute;
  top: 0;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  max-width: 40px;
  padding: 2px 2px 2px 6px;
  overflow: hidden;
  border: 0.5px solid
    ${({ $danger }) =>
      $danger
        ? 'var(--r-red-default, #E34935)'
        : 'var(--r-neutral-line, #E0E5EC)'};
  border-radius: 4px;
  background: ${({ $danger }) =>
    $danger ? 'var(--r-red-light, #fce5e5)' : 'var(--r-neutral-bg2, #f2f4f7)'};
  color: ${({ $danger }) =>
    $danger
      ? 'var(--r-red-default, #ec5151)'
      : 'var(--r-neutral-body, #3e495e)'};
  font-size: 13px;
  line-height: normal;
  font-weight: 400;
  white-space: nowrap;
  cursor: pointer;
  pointer-events: auto;
  transform: translateY(-50%);
  transition: box-shadow 0.3s;

  &:hover,
  &:focus-visible {
    z-index: 4;
    width: max-content;
    max-width: 170px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 1px;
  }

  &:hover .sign-message-address-tag__text,
  &:focus-visible .sign-message-address-tag__text {
    display: block;
  }

  .sign-message-address-tag__icon {
    width: 16px;
    height: 16px;
    flex: 0 0 16px;
    margin-right: 2px;
    border-radius: 50%;
    object-fit: cover;
  }

  .sign-message-address-tag__arrow {
    width: 16px;
    height: 16px;
    flex: 0 0 16px;
  }

  .sign-message-address-tag__text {
    display: none;
    max-width: 128px;
    margin-right: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

interface Props {
  chain: Chain;
  data: SignMessageAddressData;
  danger: boolean;
  triggerRef: React.Ref<HTMLButtonElement>;
}

const SignMessageAddressTag = ({ chain, data, danger, triggerRef }: Props) => {
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();
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
    <Trigger
      ref={triggerRef}
      type="button"
      $danger={danger}
      aria-label={label}
      title={label}
      style={{ visibility: 'hidden' }}
      onClick={
        opensTokenDetail && token
          ? () => dispatch.sign.openTokenDetailPopup(token)
          : undefined
      }
    >
      {icon ? (
        <img className="sign-message-address-tag__icon" src={icon} alt="" />
      ) : null}
      <span className="sign-message-address-tag__text">{label}</span>
      <IconArrowRight className="sign-message-address-tag__arrow" />
    </Trigger>
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
