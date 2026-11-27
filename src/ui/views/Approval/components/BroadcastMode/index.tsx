import { KEYRING_CATEGORY } from '@/constant';
import { Checkbox, Popup } from '@/ui/component';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { useAccount } from '@/ui/store-hooks';
import { useWallet } from '@/ui/utils';
import { CHAINS, CHAINS_ENUM } from '@debank/common';
import { TxPushType } from '@rabby-wallet/rabby-api/dist/types';
import { useMemoizedFn, useRequest } from 'ahooks';
import clsx from 'clsx';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../Card';
import { Divide } from '../Divide';
import { findChainByEnum } from '@/utils/chain';
import { Account } from '@/background/service/preference';
import { cn } from '@/ui/utils/cn';
import { useDocumentClass } from '@/ui/hooks/useDocumentClass';
import styles from './index.module.css';

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
  account: Account;
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
  account,
}: BroadcastModeProps) => {
  const [drawerVisible, setDrawerVisible] = React.useState(false);
  const { t } = useTranslation();
  const wallet = useWallet();
  useDocumentClass(styles.globalActive);
  const { data: supportedPushType } = useRequest(
    () =>
      wallet.openapi.gasSupportedPushType(
        findChainByEnum(chain)!.serverId || CHAINS[chain]?.serverId
      ),
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
  }, [
    supportedPushType,
    account?.type,
    hasCustomRPC,
    isCancel,
    isGasTopUp,
    isSpeedUp,
    t,
  ]);

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

  const handleSelect = useMemoizedFn((option: typeof options[0]) => {
    if (option.disabled) {
      return;
    }
    onChange?.({
      type: option.value,
      lowGasDeadline:
        option.value === 'low_gas' ? deadlineOptions[1]?.value : undefined,
    });
    setDrawerVisible(false);
  });

  return (
    <>
      <Card
        className={cn(styles.wrapper, className)}
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
      </Card>
      <Popup
        isNew
        placement="bottom"
        height="265px"
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        maskClosable
        closable
        title={t('page.signTx.BroadcastMode.title')}
        className="broadcast-mode-popup"
        isSupportDarkMode
      >
        <div className={styles.optionList}>
          {options.map((option) => (
            <TooltipWithMagnetArrow
              inApproval
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
        </div>
      </Popup>
    </>
  );
};
