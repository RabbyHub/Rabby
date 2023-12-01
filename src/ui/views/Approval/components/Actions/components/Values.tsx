import React, { useMemo, ReactNode, useState, useEffect } from 'react';
import { message } from 'antd';
import styled from 'styled-components';
import ClipboardJS from 'clipboard';
import { useTranslation } from 'react-i18next';
import { Chain, TokenItem } from 'background/service/openapi';
import AddressMemo from './AddressMemo';
import userDataDrawer from './UserListDrawer';
import { CHAINS } from 'consts';
import { isSameAddress, useWallet } from 'ui/utils';
import { getTimeSpan } from 'ui/utils/time';
import { useRabbyDispatch } from 'ui/store';
import { formatUsdValue, formatAmount } from 'ui/utils/number';
import LogoWithText from './LogoWithText';
import { ellipsis } from '@/ui/utils/address';
import { ellipsisTokenSymbol, getTokenSymbol } from 'ui/utils/token';
import { openInTab } from '@/ui/utils';
import IconEdit from 'ui/assets/editpen.svg';
import IconSuccess from 'ui/assets/success.svg';
import IconScam from 'ui/assets/sign/tx/token-scam.svg';
import IconFake from 'ui/assets/sign/tx/token-fake.svg';
import IconAddressCopy from 'ui/assets/icon-copy-2.svg';
import IconExternal from 'ui/assets/icon-share.svg';
import IconInteracted from 'ui/assets/sign/tx/interacted.svg';
import IconNotInteracted from 'ui/assets/sign/tx/not-interacted.svg';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import AccountAlias from '../../AccountAlias';

const Boolean = ({ value }: { value: boolean }) => {
  return <>{value ? 'Yes' : 'No'}</>;
};

const TokenAmountWrapper = styled.div`
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
`;
const TokenAmount = ({ value }: { value: string | number }) => {
  return (
    <TokenAmountWrapper title={String(value)}>
      {formatAmount(value)}
    </TokenAmountWrapper>
  );
};

const Percentage = ({ value }: { value: number }) => {
  return <>{(value * 100).toFixed(2)}%</>;
};

const USDValue = ({ value }: { value: number | string }) => {
  return <Text>{formatUsdValue(value)}</Text>;
};

const TimeSpan = ({
  value,
  to = Date.now(),
}: {
  value: number | null;
  to?: number;
}) => {
  const timeSpan = useMemo(() => {
    const from = value;
    if (!from) return '-';
    const { d, h, m } = getTimeSpan(Math.floor(to / 1000) - from);
    if (d > 0) {
      return `${d} day${d > 1 ? 's' : ''} ago`;
    }
    if (h > 0) {
      return `${h} hour${h > 1 ? 's' : ''} ago`;
    }
    if (m > 1) {
      return `${m} minutes ago`;
    }
    return '1 minute ago';
  }, [value, to]);
  return <>{timeSpan}</>;
};

const TimeSpanFuture = ({
  from = Math.floor(Date.now() / 1000),
  to,
}: {
  from?: number;
  to: number;
}) => {
  const timeSpan = useMemo(() => {
    if (!to) return '-';
    const { d, h, m } = getTimeSpan(to - from);
    if (d > 0) {
      return `${d} day${d > 1 ? 's' : ''}`;
    }
    if (h > 0) {
      return `${h} hour${h > 1 ? 's' : ''}`;
    }
    if (m > 1) {
      return `${m} minutes`;
    }
    return '1 minute';
  }, [from, to]);
  return <>{timeSpan}</>;
};

const AddressMarkWrapper = styled.div`
  display: inline-flex;
  cursor: pointer;
  .icon-edit-alias {
    width: 13px;
    height: 13px;
  }
`;
const AddressMark = ({
  onWhitelist,
  onBlacklist,
  address,
  chain,
  isContract = false,
  onChange,
}: {
  onWhitelist: boolean;
  onBlacklist: boolean;
  address: string;
  chain: Chain;
  isContract?: boolean;
  onChange(): void;
}) => {
  const chainId = chain.serverId;
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();
  const { t } = useTranslation();
  const handleEditMark = () => {
    userDataDrawer({
      address: address,
      chain,
      onWhitelist,
      onBlacklist,
      async onChange(data) {
        if (data.onWhitelist && !onWhitelist) {
          if (isContract && chainId) {
            await wallet.addContractWhitelist({
              address,
              chainId,
            });
          } else {
            await wallet.addAddressWhitelist(address);
          }
          message.success({
            duration: 3,
            icon: <i />,
            content: (
              <div>
                <div className="flex gap-4">
                  <img src={IconSuccess} alt="" />
                  <div className="text-white">Mark as "Trusted"</div>
                </div>
              </div>
            ),
          });
        }
        if (data.onBlacklist && !onBlacklist) {
          if (isContract && chainId) {
            await wallet.addContractBlacklist({
              address,
              chainId,
            });
          } else {
            await wallet.addAddressBlacklist(address);
          }
          message.success({
            duration: 3,
            icon: <i />,
            content: (
              <div>
                <div className="flex gap-4">
                  <img src={IconSuccess} alt="" />
                  <div className="text-white">Mark as "Blocked"</div>
                </div>
              </div>
            ),
          });
        }
        if (
          !data.onBlacklist &&
          !data.onWhitelist &&
          (onBlacklist || onWhitelist)
        ) {
          if (isContract && chainId) {
            await wallet.removeContractBlacklist({
              address,
              chainId,
            });
            await wallet.removeContractWhitelist({
              address,
              chainId,
            });
          } else {
            await wallet.removeAddressBlacklist(address);
            await wallet.removeAddressWhitelist(address);
          }
          message.success({
            duration: 3,
            icon: <i />,
            content: (
              <div>
                <div className="flex gap-4">
                  <img src={IconSuccess} alt="" />
                  <div className="text-white">
                    {t('page.signTx.markRemoved')}
                  </div>
                </div>
              </div>
            ),
          });
        }
        dispatch.securityEngine.init();
        onChange();
      },
    });
  };
  return (
    <AddressMarkWrapper onClick={handleEditMark}>
      <span className="mr-6">
        {onWhitelist && t('page.signTx.trusted')}
        {onBlacklist && t('page.signTx.blocked')}
        {!onBlacklist && !onWhitelist && t('page.signTx.noMark')}
      </span>
      <img src={IconEdit} className="icon-edit-alias icon" />
    </AddressMarkWrapper>
  );
};

const Protocol = ({
  value,
  logoSize,
  textStyle,
}: {
  value?: { name: string; logo_url: string } | null;
  logoSize?: number;
  textStyle?: React.CSSProperties;
}) => {
  return (
    <>
      {value ? (
        <LogoWithText
          logo={value.logo_url}
          text={value.name}
          logoRadius="100%"
          logoSize={logoSize}
          textStyle={textStyle}
        />
      ) : (
        '-'
      )}
    </>
  );
};

const TokenLabel = ({
  isScam,
  isFake,
}: {
  isScam: boolean;
  isFake: boolean;
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex gap-4 shrink-0 relative">
      {isFake && (
        <TooltipWithMagnetArrow
          overlayClassName="rectangle w-[max-content]"
          title={t('page.signTx.fakeTokenAlert')}
        >
          <img src={IconFake} className="icon icon-fake w-12" />
        </TooltipWithMagnetArrow>
      )}
      {isScam && (
        <TooltipWithMagnetArrow
          overlayClassName="rectangle w-[max-content]"
          title={t('page.signTx.scamTokenAlert')}
        >
          <img src={IconScam} className="icon icon-scam w-14" />
        </TooltipWithMagnetArrow>
      )}
    </div>
  );
};

const AddressWrapper = styled.div`
  display: flex;
`;
const Address = ({
  address,
  chain,
  iconWidth = '12px',
}: {
  address: string;
  chain?: Chain;
  iconWidth?: string;
}) => {
  const { t } = useTranslation();
  const handleClickContractId = () => {
    if (!chain) return;
    openInTab(chain.scanLink.replace(/tx\/_s_/, `address/${address}`), false);
  };
  const handleCopyContractAddress = () => {
    const clipboard = new ClipboardJS('.value-address', {
      text: function () {
        return address;
      },
    });

    clipboard.on('success', () => {
      message.success({
        duration: 3,
        icon: <i />,
        content: (
          <div>
            <div className="flex gap-4 mb-4">
              <img src={IconSuccess} alt="" />
              {t('global.copied')}
            </div>
            <div className="text-white">{address}</div>
          </div>
        ),
      });
      clipboard.destroy();
    });
  };
  return (
    <AddressWrapper className="value-address relative">
      <TooltipWithMagnetArrow
        title={address}
        className="rectangle w-[max-content]"
      >
        <span>{ellipsis(address)}</span>
      </TooltipWithMagnetArrow>
      {chain && (
        <img
          onClick={handleClickContractId}
          src={IconExternal}
          width={iconWidth}
          height={iconWidth}
          className="ml-6 cursor-pointer"
        />
      )}
      <img
        onClick={handleCopyContractAddress}
        src={IconAddressCopy}
        width={iconWidth}
        height={iconWidth}
        className="ml-6 cursor-pointer icon-copy"
      />
    </AddressWrapper>
  );
};

const Text = ({ children }: { children: ReactNode }) => {
  return (
    <div className="overflow-hidden overflow-ellipsis whitespace-nowrap">
      {children}
    </div>
  );
};

const DisplayChain = ({ chainServerId }: { chainServerId: string }) => {
  const chain = useMemo(() => {
    return Object.values(CHAINS).find(
      (item) => item.serverId === chainServerId
    );
  }, [chainServerId]);
  if (!chain) return null;
  return (
    <span className="flex items-center">
      on {chain.name} <img src={chain.logo} className="ml-4 w-14 h-14" />
    </span>
  );
};

const Interacted = ({ value }: { value: boolean }) => {
  const { t } = useTranslation();
  return (
    <span className="flex">
      {value ? (
        <>
          <img src={IconInteracted} className="mr-4 w-14" />{' '}
          {t('page.signTx.interacted')}
        </>
      ) : (
        <>
          <img src={IconNotInteracted} className="mr-4 w-14" />{' '}
          {t('page.signTx.neverInteracted')}
        </>
      )}
    </span>
  );
};

const Transacted = ({ value }: { value: boolean }) => {
  const { t } = useTranslation();
  return (
    <span className="flex">
      {value ? (
        <>
          <img src={IconInteracted} className="mr-4 w-14" />{' '}
          {t('page.signTx.transacted')}
        </>
      ) : (
        <>
          <img src={IconNotInteracted} className="mr-4 w-14" />{' '}
          {t('page.signTx.neverTransacted')}
        </>
      )}
    </span>
  );
};

const TokenSymbol = ({ token }: { token: TokenItem }) => {
  const dispatch = useRabbyDispatch();
  const handleClickTokenSymbol = () => {
    dispatch.sign.openTokenDetailPopup(token);
  };
  return (
    <span
      className="hover:underline cursor-pointer"
      onClick={handleClickTokenSymbol}
      title={getTokenSymbol(token)}
    >
      {ellipsisTokenSymbol(getTokenSymbol(token))}
    </span>
  );
};

const KnownAddress = ({ address }: { address: string }) => {
  const wallet = useWallet();
  const [hasAddress, setHasAddress] = useState(false);
  const [inWhitelist, setInWhitelist] = useState(false);
  const { t } = useTranslation();

  const handleAddressChange = async (addr: string) => {
    const res = await wallet.hasAddress(addr);
    const whitelist = await wallet.getWhitelist();
    setInWhitelist(!!whitelist.find((item) => isSameAddress(item, addr)));
    setHasAddress(res);
  };

  useEffect(() => {
    handleAddressChange(address);
  }, [address]);

  if (!hasAddress) return null;

  return (
    <span className="text-13">
      {inWhitelist
        ? t('page.connect.onYourWhitelist')
        : t('page.signTx.importedAddress')}
    </span>
  );
};

export {
  Boolean,
  TokenAmount,
  Percentage,
  AddressMemo,
  AddressMark,
  USDValue,
  TimeSpan,
  TimeSpanFuture,
  Protocol,
  TokenLabel,
  Address,
  Text,
  DisplayChain,
  Interacted,
  Transacted,
  TokenSymbol,
  AccountAlias,
  KnownAddress,
};
