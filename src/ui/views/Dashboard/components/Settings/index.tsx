import { matomoRequestEvent } from '@/utils/matomo-request';
import { Button, DrawerProps, Form, Input, message, Modal, Switch } from 'antd';
import clsx from 'clsx';
import { CHAINS, INITIAL_OPENAPI_URL } from 'consts';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import IconActivities from 'ui/assets/dashboard/activities.svg';
import IconArrowRight from 'ui/assets/dashboard/settings/icon-right-arrow.svg';

import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import IconAddresses from 'ui/assets/dashboard/addresses.svg';
import IconCustomRPC from 'ui/assets/dashboard/custom-rpc.svg';
import IconPreferMetamask from 'ui/assets/dashboard/icon-prefer-metamask.svg';
import IconAutoLock from 'ui/assets/dashboard/settings/icon-auto-lock.svg';
import IconLockWallet from 'ui/assets/dashboard/settings/lock.svg';
import IconWhitelist from 'ui/assets/dashboard/whitelist.svg';
import IconDiscordHover from 'ui/assets/discord-hover.svg';
import IconDiscord from 'ui/assets/discord.svg';
import IconClear from 'ui/assets/icon-clear.svg';
import LogoRabby from 'ui/assets/logo-rabby-large.svg';
import IconServer from 'ui/assets/server.svg';
import IconSuccess from 'ui/assets/success.svg';
import IconTwitterHover from 'ui/assets/twitter-hover.svg';
import IconTwitter from 'ui/assets/twitter.svg';
import { Field, PageHeader, Popup } from 'ui/component';
import AuthenticationModalPromise from 'ui/component/AuthenticationModal';
import { openInTab, useWallet } from 'ui/utils';
import './style.less';

import IconCheck from 'ui/assets/check-2.svg';
import IconSettingsFeatureConnectedDapps from 'ui/assets/dashboard/settings/connected-dapps.svg';
import IconSettingsAboutFollowUs from 'ui/assets/dashboard/settings/follow-us.svg';
import IconSettingsAboutSupporetedChains from 'ui/assets/dashboard/settings/supported-chains.svg';
import IconSettingsAboutVersion from 'ui/assets/dashboard/settings/version.svg';

import stats from '@/stats';
import { useAsync, useCss } from 'react-use';
import semver from 'semver-compare';
import { Contacts } from '..';

const AUTO_LOCK_OPTIONS = [
  {
    value: 0,
    label: 'Never',
  },
  {
    value: 7 * 24 * 60,
    label: '7 days',
  },
  {
    value: 24 * 60,
    label: '1 day',
  },
  {
    value: 4 * 60,
    label: '4 hours',
  },
  {
    value: 60,
    label: '1 hour',
  },
  {
    value: 10,
    label: '10 minutes',
  },
];

interface SettingsProps {
  visible?: boolean;
  onClose?: DrawerProps['onClose'];
  onOpenConnectedDapps?: () => void;
}

const { confirm } = Modal;

const OpenApiModal = ({
  visible,
  onFinish,
  onCancel,
}: {
  visible: boolean;
  onFinish(): void;
  onCancel(): void;
}) => {
  const { useForm } = Form;
  const [isVisible, setIsVisible] = useState(false);
  const [form] = useForm<{ host: string }>();
  const { t } = useTranslation();

  const host = useRabbySelector((state) => state.openapi.host);
  const dispatch = useRabbyDispatch();

  const handleSubmit = async ({ host }: { host: string }) => {
    await dispatch.openapi.setHost(host);
    setIsVisible(false);
    setTimeout(() => {
      onFinish();
    }, 500);
  };

  const restoreInitial = () => {
    form.setFieldsValue({
      host: INITIAL_OPENAPI_URL,
    });
  };

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(() => {
      onCancel();
    }, 500);
  };

  useEffect(() => {
    form.setFieldsValue({
      host,
    });
  }, [form, host]);

  useEffect(() => {
    dispatch.openapi.getHost();
  }, [dispatch]);

  useEffect(() => {
    setTimeout(() => {
      setIsVisible(visible);
    }, 100);
  }, [visible]);

  return (
    <div
      className={clsx('openapi-modal', { show: isVisible, hidden: !visible })}
    >
      <PageHeader forceShowBack onBack={handleCancel}>
        {t('Backend Service URL')}
      </PageHeader>
      <Form onFinish={handleSubmit} form={form}>
        <Form.Item
          name="host"
          rules={[
            { required: true, message: t('Please input openapi host') },
            {
              pattern: /^((https|http)?:\/\/)[^\s]+\.[^\s]+/,
              message: t('Please check your host'),
            },
          ]}
        >
          <Input
            className="popup-input"
            placeholder="Host"
            size="large"
            autoFocus
            spellCheck={false}
          />
        </Form.Item>
        {form.getFieldValue('host') !== INITIAL_OPENAPI_URL && (
          <div className="flex justify-end">
            <Button type="link" onClick={restoreInitial} className="restore">
              {t('Restore initial setting')}
            </Button>
          </div>
        )}
        <div className="flex justify-center mt-24 popup-footer">
          <Button
            type="primary"
            size="large"
            htmlType="submit"
            className="w-[200px]"
          >
            {t('Save')}
          </Button>
        </div>
      </Form>
    </div>
  );
};

const ResetAccountModal = ({
  visible,
  onFinish,
  onCancel,
}: {
  visible: boolean;
  onFinish(): void;
  onCancel(): void;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const wallet = useWallet();
  const { t } = useTranslation();

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(() => {
      onCancel();
    }, 500);
  };

  const handleResetAccount = async () => {
    const currentAddress = (await wallet.getCurrentAccount())?.address || '';
    await wallet.clearAddressPendingTransactions(currentAddress);
    message.success({
      icon: <img src={IconSuccess} className="icon icon-success" />,
      content: t('Pending transaction cleared'),
      duration: 1,
    });
    setIsVisible(false);
    setTimeout(() => {
      onFinish();
    }, 500);
  };

  useEffect(() => {
    setTimeout(() => {
      setIsVisible(visible);
    }, 100);
  }, [visible]);

  return (
    <div
      className={clsx('reset-account-modal', {
        show: isVisible,
        hidden: !visible,
      })}
    >
      <PageHeader forceShowBack onBack={handleCancel}>
        {t('Clear Pending')}
      </PageHeader>
      <div>
        <p className="reset-account-content mb-16">
          {t(
            'This will clear all your pending transactions. This can help you solve the problem that in some cases the state of the transaction in Rabby does not match the state on-chain. '
          )}
        </p>
        <p className="reset-account-content">
          {t(
            'This will not change the balances in your accounts or require you to re-enter your seed phrase. All your assets and accounts information will remain secure.'
          )}
        </p>
        <div className="flex justify-center mt-24 popup-footer">
          <Button
            type="primary"
            size="large"
            className="w-[200px]"
            onClick={handleResetAccount}
          >
            {t('Confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
};

const AutoLockModal = ({
  visible,
  onFinish,
  onCancel,
}: {
  visible: boolean;
  onFinish(): void;
  onCancel(): void;
}) => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  const autoLockTime = useRabbySelector(
    (state) => state.preference.autoLockTime || 0
  );
  const dispatch = useRabbyDispatch();

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(() => {
      onCancel();
    }, 500);
  };

  const handleSelect = async (value: number) => {
    dispatch.preference.setAutoLockTime(value);
    setIsVisible(false);
    setTimeout(() => {
      onFinish();
    }, 500);
  };

  useEffect(() => {
    setTimeout(() => {
      setIsVisible(visible);
    }, 100);
  }, [visible]);

  return (
    <div
      className={clsx('auto-lock-modal', {
        show: isVisible,
        hidden: !visible,
      })}
    >
      <PageHeader forceShowBack onBack={handleCancel}>
        {t('Auto lock time')}
      </PageHeader>
      <div className="auto-lock-option-list">
        {AUTO_LOCK_OPTIONS.map((item) => {
          return (
            <div
              className="auto-lock-option-list-item"
              key={item.value}
              onClick={() => {
                handleSelect(item.value);
              }}
            >
              {item.label}
              {autoLockTime === item.value && (
                <img
                  src={IconCheck}
                  alt=""
                  className="auto-lock-option-list-item-icon"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

type SettingItem = {
  leftIcon: string;
  content: React.ReactNode;
  description?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClick?: (...args: any[]) => any;
};

const Settings = ({
  visible,
  onClose,
  onOpenConnectedDapps,
}: SettingsProps) => {
  const wallet = useWallet();
  const history = useHistory();
  const { t } = useTranslation();
  const [showOpenApiModal, setShowOpenApiModal] = useState(false);
  const [showResetAccountModal, setShowResetAccountModal] = useState(false);
  const [isShowAutoLockModal, setIsShowAutoLockModal] = useState(false);
  const [contactsVisible, setContactsVisible] = useState(false);
  const [whitelistEnable, setWhitelistEnable] = useState(true);
  const autoLockTime = useRabbySelector(
    (state) => state.preference.autoLockTime || 0
  );

  const autoLockTimeLabel = useMemo(() => {
    return (
      AUTO_LOCK_OPTIONS.find((item) => item.value === autoLockTime)?.label ||
      `${autoLockTime} minutes`
    );
  }, [autoLockTime]);

  const handleSwitchWhitelistEnable = async (checked: boolean) => {
    matomoRequestEvent({
      category: 'Setting',
      action: 'clickToUse',
      label: 'Whitelist',
    });
    reportSettings('Whitelist');
    handleWhitelistEnableChange(checked);
  };

  const handleWhitelistEnableChange = async (value: boolean) => {
    await AuthenticationModalPromise({
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      title: value ? 'Enable Whitelist' : 'Disable Whitelist',
      description: value
        ? 'Once enabled, you can only send assets to the addresses in the whitelist using Rabby.'
        : 'You can send assets to any address once disabled',
      validationHandler: async (password: string) =>
        await wallet.toggleWhitelist(password, value),
      onFinished() {
        setWhitelistEnable(value);
      },
      onCancel() {
        // do nothing
      },
      wallet,
    });
  };

  const handleClickClearWatchMode = () => {
    confirm({
      title: 'Warning',
      content: 'Do you make sure to delete all Watch Mode address?',
      onOk() {
        wallet.clearWatchMode();
      },
    });
  };

  const { value: hasNewVersion = false } = useAsync(async () => {
    const data = await wallet.openapi.getLatestVersion();

    return semver(process.env.release || '0.0.0', data.version_tag) === -1;
  });

  const updateVersionClassName = useCss({
    '& .ant-modal-content': {
      background: '#fff',
    },
    '& .ant-modal-body': {
      padding: '15px 14px 28px 14px',
    },
    '& .ant-modal-confirm-content': {
      padding: '24px 0 0 0',
    },
    '& .ant-modal-confirm-btns': {
      justifyContent: 'center',
      'button:first-child': {
        display: 'none',
      },
    },
  });

  const updateVersion = () => {
    if (hasNewVersion) {
      confirm({
        width: 320,
        closable: true,
        centered: true,
        className: updateVersionClassName,
        title: null,
        content: (
          <div className="text-14 leading-[18px] text-center text-gray-subTitle">
            A new update for Rabby Wallet is available. Click to check how to
            update manually.
          </div>
        ),
        okText: 'See Tutorial',
        onOk() {
          openInTab('https://rabby.io/update-extension');
        },
      });
    } else {
      message.success({
        key: 'latest version',
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: (
          <span className="text-white">You are using the latest version</span>
        ),
      });
    }
  };

  const renderData = {
    features: {
      label: 'Features',
      items: [
        {
          leftIcon: IconLockWallet,
          content: t('Lock Wallet'),
          onClick: () => {
            lockWallet();
            matomoRequestEvent({
              category: 'Setting',
              action: 'clickToUse',
              label: 'Lock Wallet',
            });
            reportSettings('Lock Wallet');
          },
        },
        {
          leftIcon: IconActivities,
          content: t('Signature Record'),
          onClick: () => {
            history.push('/activities');
            matomoRequestEvent({
              category: 'Setting',
              action: 'clickToUse',
              label: 'Signature Record',
            });
            reportSettings('Signature Record');
          },
        },
        {
          leftIcon: IconAddresses,
          content: t('Manage Address'),
          onClick: () => {
            history.push('/settings/address');
            matomoRequestEvent({
              category: 'Setting',
              action: 'clickToUse',
              label: 'Manage Address',
            });
            reportSettings('Manage Address');
          },
        },
        {
          leftIcon: IconSettingsFeatureConnectedDapps,
          content: t('Connected Dapp'),
          onClick: () => {
            onOpenConnectedDapps?.();
            matomoRequestEvent({
              category: 'Setting',
              action: 'clickToUse',
              label: 'Connected Dapps',
            });
            reportSettings('Connected Dapps');
          },
        },
      ] as SettingItem[],
    },
    settings: {
      label: 'Settings',
      items: [
        {
          leftIcon: IconWhitelist,
          content: t('Enable Whitelist For Sending Assets'),
          rightIcon: (
            <Switch
              checked={whitelistEnable}
              onChange={handleSwitchWhitelistEnable}
            />
          ),
        },
        {
          leftIcon: IconCustomRPC,
          content: t('Custom RPC'),
          onClick: () => {
            history.push('/custom-rpc');
            matomoRequestEvent({
              category: 'Setting',
              action: 'clickToUse',
              label: 'Custom RPC',
            });
            reportSettings('Custom RPC');
          },
        },
        {
          leftIcon: IconPreferMetamask,
          content: t('MetaMask Preferred Dapps'),
          onClick: () => {
            history.push('/prefer-metamask-dapps');
            matomoRequestEvent({
              category: 'Setting',
              action: 'clickToUse',
              label: 'MetaMask Preferred Dapps',
            });
            reportSettings('MetaMask Preferred Dapps');
          },
        },
        {
          leftIcon: IconAutoLock,
          content: t('Auto lock time'),
          onClick: () => {
            matomoRequestEvent({
              category: 'Setting',
              action: 'clickToUse',
              label: 'Auto lock time',
            });
            reportSettings('Auto lock time');
            setIsShowAutoLockModal(true);
          },
          rightIcon: (
            <>
              <span
                className="text-14 mr-[8px] text-[#13141a]"
                role="button"
                onClick={updateVersion}
              >
                {autoLockTimeLabel}
              </span>
              <img src={IconArrowRight} className="icon icon-arrow-right" />
            </>
          ),
        },
        {
          leftIcon: IconClear,
          content: t('Clear Pending'),
          onClick: () => {
            matomoRequestEvent({
              category: 'Setting',
              action: 'clickToUse',
              label: 'Reset Account',
            });
            setShowResetAccountModal(true);
            reportSettings('Reset Account');
          },
          rightIcon: (
            <img src={IconArrowRight} className="icon icon-arrow-right" />
          ),
        },
      ] as SettingItem[],
    },
    about: {
      label: 'About us',
      items: [
        {
          leftIcon: IconSettingsAboutVersion,
          content: t('Current Version'),
          onClick: () => {
            updateVersion();
            matomoRequestEvent({
              category: 'Setting',
              action: 'clickToUse',
              label: 'Current Version',
            });
            reportSettings('Current Version');
          },
          rightIcon: (
            <>
              <span
                className="text-14 mr-[8px] text-[#13141a]"
                role="button"
                onClick={updateVersion}
              >
                {process.env.release}
                <span
                  className={clsx(
                    'text-[#ec5151] underline',
                    !hasNewVersion && 'hidden'
                  )}
                  role="button"
                  onClick={updateVersion}
                >
                  &nbsp;(Update Available)&nbsp;
                </span>
              </span>
              <img src={IconArrowRight} className="icon icon-arrow-right" />
            </>
          ),
        },
        {
          leftIcon: IconSettingsAboutSupporetedChains,
          content: t('Supported Chains'),
          onClick: () => {
            history.push('/settings/chain-list');
            matomoRequestEvent({
              category: 'Setting',
              action: 'clickToUse',
              label: 'Supported Chains',
            });
            reportSettings('Supported Chains');
          },
          rightIcon: (
            <>
              <span
                className="text-14 mr-[8px] text-[#13141a]"
                role="button"
                onClick={updateVersion}
              >
                {Object.values(CHAINS).length}
              </span>
              <img src={IconArrowRight} className="icon icon-arrow-right" />
            </>
          ),
        },
        {
          leftIcon: IconSettingsAboutFollowUs,
          content: t('Follow Us'),
          // onClick: () => {},
          rightIcon: (
            <>
              <a
                href="https://twitter.com/rabby_io"
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  matomoRequestEvent({
                    category: 'Setting',
                    action: 'clickToUse',
                    label: 'Find us|Twitter',
                  });
                  reportSettings('twitter');
                }}
                className="ml-12 group"
              >
                <img
                  src={IconTwitter}
                  className="w-16 group-hover:w-0 group-hover:h-0 group-hover:overflow-hidden"
                />
                <img
                  src={IconTwitterHover}
                  className=" w-0 h-0 overflow-hidden group-hover:w-16 group-hover:h-16"
                />
              </a>
              <a
                href="https://discord.com/invite/seFBCWmUre"
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  matomoRequestEvent({
                    category: 'Setting',
                    action: 'clickToUse',
                    label: 'Find us|Discord',
                  });
                  reportSettings('discord');
                }}
                className="ml-12 group"
              >
                <img
                  src={IconDiscord}
                  className="w-16 overflow-hidden group-hover:w-0 group-hover:h-0 "
                />
                <img
                  src={IconDiscordHover}
                  className=" w-0 h-0 overflow-hidden group-hover:w-16 group-hover:h-16"
                />
              </a>
            </>
          ),
        },
      ] as SettingItem[],
    },
  };

  if (process.env.DEBUG) {
    renderData.features.items.splice(-1, 0, {
      leftIcon: IconServer,
      content: t('Backend Service URL'),
      onClick: () => setShowOpenApiModal(true),
      rightIcon: <img src={IconArrowRight} className="icon icon-arrow-right" />,
    } as typeof renderData.features.items[0]);
  }

  if (process.env.DEBUG) {
    renderData.features.items.push({
      content: t('Clear Watch Mode'),
      onClick: handleClickClearWatchMode,
    } as typeof renderData.features.items[0]);
  }

  const lockWallet = async () => {
    matomoRequestEvent({
      category: 'Setting',
      action: 'clickToUse',
      label: 'lockWallet',
    });
    reportSettings('lockWallet');
    await wallet.lockWallet();
    history.push('/unlock');
  };

  const handleClose: DrawerProps['onClose'] = (e) => {
    setShowOpenApiModal(false);
    setShowResetAccountModal(false);
    onClose && onClose(e);
  };

  const initWhitelistEnabled = async () => {
    const enabled = await wallet.isWhitelistEnabled();
    setWhitelistEnable(enabled);
  };

  useEffect(() => {
    initWhitelistEnabled();
  }, []);

  return (
    <>
      <Popup
        visible={visible}
        onClose={handleClose}
        height={523}
        bodyStyle={{ height: '100%', padding: '20px 20px 0 20px' }}
      >
        <div className="popup-settings">
          <div className="content">
            {/* <Button
              block
              size="large"
              type="primary"
              className="flex justify-center items-center lock-wallet"
              onClick={lockWallet}
            >
              <img src={IconLock} className="icon icon-lock" />{' '}
              {t('Lock Wallet')}
            </Button> */}
            {Object.values(renderData).map((group, idxl1) => {
              return (
                <div key={`g-${idxl1}`} className="setting-block">
                  <div className="setting-title">{group.label}</div>
                  <div className="setting-items">
                    {group.items.map((data, idxl2) => (
                      <Field
                        key={`g-${idxl1}-item-${idxl2}`}
                        leftIcon={<img src={data.leftIcon} className="icon" />}
                        rightIcon={
                          data.rightIcon || (
                            <img
                              src={IconArrowRight}
                              className="icon icon-arrow-right"
                            />
                          )
                        }
                        onClick={data.onClick}
                        className={clsx(data.description ? 'has-desc' : null)}
                      >
                        {data.content}
                        {data.description && (
                          <p className="desc">{data.description}</p>
                        )}
                      </Field>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <footer className="footer">
            <img src={LogoRabby} alt="" />
          </footer>
          <Contacts
            visible={contactsVisible}
            onCancel={() => {
              setContactsVisible(false);
            }}
          />

          <OpenApiModal
            visible={showOpenApiModal}
            onFinish={() => setShowOpenApiModal(false)}
            onCancel={() => setShowOpenApiModal(false)}
          />
          <ResetAccountModal
            visible={showResetAccountModal}
            onFinish={() => setShowResetAccountModal(false)}
            onCancel={() => setShowResetAccountModal(false)}
          />
          <AutoLockModal
            visible={isShowAutoLockModal}
            onFinish={() => setIsShowAutoLockModal(false)}
            onCancel={() => setIsShowAutoLockModal(false)}
          />
        </div>
      </Popup>
    </>
  );
};

function reportSettings(moduleName: string) {
  stats.report('settingsModule', {
    moduleName,
  });
}

export default Settings;
