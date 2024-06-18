import { KEYRING_CATEGORY } from '@/constant';
import { Checkbox, Popup } from '@/ui/component';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { useAccount } from '@/ui/store-hooks';
import { useWallet } from '@/ui/utils';
import { CHAINS, CHAINS_ENUM } from '@debank/common';
import { TxPushType } from '@rabby-wallet/rabby-api/dist/types';
import { useRequest } from 'ahooks';
import clsx from 'clsx';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styled, { createGlobalStyle } from 'styled-components';
import { Card } from '../Card';
import { Divide } from '../Divide';

const GlobalStyle = createGlobalStyle`
  .broadcast-mode-popup {
    .ant-drawer-close {
      padding-top: 24px
    }
  }
`;
const Wrapper = styled(Card)`
  .broadcast-mode {
    &-header {
      display: flex;
      padding: 12px 16px;
      justify-content: space-between;
      align-items: center;
    }
    &-title {
      color: var(--r-neutral-title-1, #192945);
      font-size: 14px;
      font-weight: 500;
      line-height: 16px;
    }
    &-extra {
      color: var(--r-neutral-body, #3e495e);
      font-size: 14px;
      font-weight: 400;
      line-height: 16px;

      display: flex;
      align-items: center;
      gap: 2px;

      margin-left: auto;

      cursor: pointer;

      svg {
        path {
          stroke: var(--r-neutral-foot, #6a7587);
        }
      }
    }
    &-body {
      padding: 12px 16px;

      ul {
        margin-top: 0px;
        margin-bottom: 0;
        font-size: 13px;
        color: var(--r-neutral-body, #3e495e);

        li {
          position: relative;
          margin-bottom: 8px;
          padding-left: 12px;
          &:last-child {
            margin-bottom: 0;
          }
          &::before {
            content: '';
            position: absolute;
            width: 4px;
            height: 4px;
            border-radius: 100%;
            background-color: var(--r-neutral-body, #3e495e);
            left: 0;
            top: 8px;
          }
        }
      }

      .deadline {
        &-options {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        &-option {
          padding: 2px 4px;
          border-radius: 2px;
          background: var(--r-neutral-card-2, #f2f4f7);
          min-width: 40px;

          color: var(--r-neutral-title-1, #192945);
          text-align: center;
          font-size: 13px;
          line-height: 16px;
          font-weight: 400;
          border: 1px solid transparent;
          border: 0.5px solid transparent;

          cursor: pointer;

          &:hover {
            border-color: var(--r-blue-default, #7084ff);
          }
          &.is-selected {
            border-color: var(--r-blue-default, #7084ff);
            background: var(--r-blue-light-1, #eef1ff);
          }
        }
      }
    }
  }
`;

const OptionList = styled.div`
  margin-bottom: -12px;
  .option {
    padding: 12px 16px;
    border-radius: 8px;
    background: var(--r-neutral-card1, #fff);
    border: 1px solid transparent;
    cursor: pointer;

    & + .option {
      margin-top: 12px;
    }

    &.is-selected {
      border: 1px solid var(--r-blue-default, #7084ff);
      background: var(--r-blue-light-1, #eef1ff);
    }
    &:not(.is-disabled):hover {
      border: 1px solid var(--r-blue-default, #7084ff);
    }

    &.is-disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    &-title {
      color: var(--r-neutral-title-1, #192945);
      font-size: 15px;
      font-weight: 500;
      line-height: 18px;
      margin-bottom: 4px;
    }

    &-desc {
      color: var(--r-neutral-body, #3e495e);
      font-size: 13px;
      font-weight: 400;
      line-height: 16px;
    }
  }
`;

interface BroadcastModeProps {
  value: {
    type: TxPushType;
    lowGasDeadline?: number;
  };
  onChange?: (value: { type: TxPushType; lowGasDeadline?: number }) => void;
  className?: string;
  style?: React.CSSProperties;
  chain: CHAINS_ENUM;
  isSpeedUp?: boolean;
  isCancel?: boolean;
  isGasTopUp?: boolean;
}
export const BroadcastMode = ({
  value,
  onChange,
  className,
  style,
  chain,
  isSpeedUp,
  isCancel,
  isGasTopUp,
}: BroadcastModeProps) => {
  const [drawerVisible, setDrawerVisible] = React.useState(false);
  const { t } = useTranslation();
  const [account] = useAccount();
  const wallet = useWallet();
  const { data: supportedPushType } = useRequest(
    () => wallet.openapi.gasSupportedPushType(CHAINS[chain]?.serverId),
    {
      refreshDeps: [chain],
    }
  );
  const { data: hasCustomRPC } = useRequest(() => wallet.hasCustomRPC(chain), {
    refreshDeps: [chain],
  });

  const disabledMap = React.useMemo(() => {
    const result = {
      low_gas: {
        disabled: false,
        tips: '',
      },
      mev: {
        disabled: false,
        tips: '',
      },
    };
    if (hasCustomRPC) {
      Object.keys(result).forEach((key) => {
        result[key] = {
          disabled: true,
          tips: t('page.signTx.BroadcastMode.tips.customRPC'),
        };
      });
      return result;
    }

    if (account?.type === KEYRING_CATEGORY.WalletConnect) {
      Object.keys(result).forEach((key) => {
        result[key] = {
          disabled: true,
          tips: t('page.signTx.BroadcastMode.tips.walletConnect'),
        };
      });

      return result;
    }

    Object.entries(supportedPushType || {}).forEach(([key, value]) => {
      if (!value) {
        result[key] = {
          disabled: true,
          tips: t('page.signTx.BroadcastMode.tips.notSupportChain'),
        };
      }
    });
    if (isSpeedUp || isCancel || isGasTopUp) {
      result.low_gas.disabled = true;
      result.low_gas.tips = t('page.signTx.BroadcastMode.tips.notSupported');
    }
    return result;
  }, [supportedPushType, account?.type]);

  useEffect(() => {
    if (value?.type && disabledMap[value.type]?.disabled) {
      onChange?.({
        type: 'default',
      });
    }
  }, [disabledMap, value.type, onChange]);

  const options: {
    title: string;
    desc: string;
    value: TxPushType;
    disabled?: boolean;
    tips?: string;
  }[] = [
    {
      title: t('page.signTx.BroadcastMode.instant.title'),
      desc: t('page.signTx.BroadcastMode.instant.desc'),
      value: 'default',
    },
    {
      title: t('page.signTx.BroadcastMode.lowGas.title'),
      desc: t('page.signTx.BroadcastMode.lowGas.desc'),
      value: 'low_gas',
      disabled: disabledMap.low_gas.disabled,
      tips: disabledMap.low_gas.tips,
    },
    {
      title: t('page.signTx.BroadcastMode.mev.title'),
      desc: t('page.signTx.BroadcastMode.mev.desc'),
      value: 'mev',
      disabled: disabledMap.mev.disabled,
      tips: disabledMap.mev.tips,
    },
  ];

  const deadlineOptions = [
    {
      title: t('page.signTx.BroadcastMode.lowGasDeadline.1h'),
      value: 1 * 60 * 60,
    },
    {
      title: t('page.signTx.BroadcastMode.lowGasDeadline.4h'),
      value: 4 * 60 * 60,
    },
    {
      title: t('page.signTx.BroadcastMode.lowGasDeadline.24h'),
      value: 24 * 60 * 60,
    },
  ];

  const selectedOption = options.find((option) => option.value === value.type);

  const handleSelect = React.useCallback((option: typeof options[0]) => {
    if (option.disabled) {
      return;
    }
    onChange?.({
      type: option.value,
      lowGasDeadline:
        option.value === 'low_gas' ? deadlineOptions[1]?.value : undefined,
    });
    setDrawerVisible(false);
  }, []);

  return (
    <>
      <GlobalStyle />
      <Wrapper
        className={className}
        style={style}
        onClick={() => {
          setDrawerVisible(true);
        }}
        headline={t('page.signTx.BroadcastMode.title')}
        actionText={selectedOption?.title}
        hasDivider={value.type !== 'default'}
      >
        {value.type !== 'default' && (
          <>
            <Divide />
            <div className="broadcast-mode-body text-r-neutral-body">
              <ul>
                <li>{selectedOption?.desc}</li>
                {value.type === 'low_gas' ? (
                  <li className="flex items-center gap-[6px]">
                    {t('page.signTx.BroadcastMode.lowGasDeadline.label')}
                    <div className="deadline-options">
                      {deadlineOptions.map((item) => {
                        return (
                          <div
                            key={item.value}
                            className={clsx(
                              'deadline-option',
                              item.value === value.lowGasDeadline &&
                                'is-selected'
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              onChange?.({
                                type: value.type,
                                lowGasDeadline: item.value,
                              });
                            }}
                          >
                            {item.title}
                          </div>
                        );
                      })}
                    </div>
                  </li>
                ) : null}
              </ul>
            </div>
          </>
        )}
      </Wrapper>
      <Popup
        isNew
        placement="bottom"
        height="352px"
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        maskClosable
        closable
        title={t('page.signTx.BroadcastMode.title')}
        className="broadcast-mode-popup"
        isSupportDarkMode
      >
        <OptionList>
          {options.map((option) => (
            <TooltipWithMagnetArrow
              title={option.tips || ''}
              className="rectangle w-[max-content]"
              align={{
                offset: [0, 34],
              }}
              placement="top"
              arrowPointAtCenter
              key={option.value}
            >
              <div
                className={clsx(
                  'option',
                  option.value === value.type && 'is-selected',
                  option.disabled && 'is-disabled'
                )}
                onClick={() => handleSelect(option)}
              >
                <div className="flex items-center gap-[4px]">
                  <div className="mr-auto">
                    <div className="option-title">{option.title}</div>
                    <div className="option-desc">{option.desc}</div>
                  </div>
                  <Checkbox
                    width="20px"
                    height="20px"
                    checked={option.value === value.type}
                    onChange={() => handleSelect(option)}
                  />
                </div>
              </div>
            </TooltipWithMagnetArrow>
          ))}
        </OptionList>
      </Popup>
    </>
  );
};
