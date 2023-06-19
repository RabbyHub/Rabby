import React, { useMemo, ReactNode } from 'react';
import { message } from 'antd';
import styled from 'styled-components';
import ClipboardJS from 'clipboard';
import { Chain } from 'background/service/openapi';
import AddressMemo from './AddressMemo';
import userDataDrawer from './UserListDrawer';
import { CHAINS } from 'consts';
import { useWallet } from 'ui/utils';
import { getTimeSpan } from 'ui/utils/time';
import { formatUsdValue, formatAmount } from 'ui/utils/number';
import LogoWithText from './LogoWithText';
import { ellipsis } from '@/ui/utils/address';
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
                  <div className="text-white">Mark removed</div>
                </div>
              </div>
            ),
          });
        }
        onChange();
      },
    });
  };
  return (
    <AddressMarkWrapper onClick={handleEditMark}>
      <span className="mr-6">
        {onWhitelist && 'Trusted'}
        {onBlacklist && 'Blocked'}
        {!onBlacklist && !onWhitelist && 'No mark'}
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
  return (
    <div className="flex gap-4 shrink-0 relative">
      {isFake && (
        <TooltipWithMagnetArrow
          overlayClassName="rectangle w-[max-content]"
          title="This is a scam token marked by Rabby"
        >
          <img src={IconFake} className="icon icon-fake w-12" />
        </TooltipWithMagnetArrow>
      )}
      {isScam && (
        <TooltipWithMagnetArrow
          overlayClassName="rectangle w-[max-content]"
          title="This is potentially a low-quality and scam token based on Rabby's detection"
        >
          <img src={IconScam} className="icon icon-scam w-14" />
        </TooltipWithMagnetArrow>
      )}
    </div>
  );
};

const AddressWrapper = styled.div`
  display: flex;
  .icon-copy {
    opacity: 0;
  }
  &:hover {
    .icon-copy {
      opacity: 1;
    }
  }
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
              Copied
            </div>
            <div className="text-white">{address}</div>
          </div>
        ),
      });
      clipboard.destroy();
    });
  };
  return (
    <AddressWrapper className="value-address">
      <span title={address}>{ellipsis(address)}</span>
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
  return (
    <span className="flex">
      {value ? (
        <>
          <img src={IconInteracted} className="mr-4 w-14" /> Interacted before
        </>
      ) : (
        <>
          <img src={IconNotInteracted} className="mr-4 w-14" /> Never interacted
          before
        </>
      )}
    </span>
  );
};

const Transacted = ({ value }: { value: boolean }) => {
  return (
    <span className="flex">
      {value ? (
        <>
          <img src={IconInteracted} className="mr-4 w-14" /> Transacted before
        </>
      ) : (
        <>
          <img src={IconNotInteracted} className="mr-4 w-14" /> Never transacted
          before
        </>
      )}
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
};
