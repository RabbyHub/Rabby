import { matomoRequestEvent } from '@/utils/matomo-request';
import { Button, DrawerProps, Form, Input, message, Modal, Switch } from 'antd';
import clsx from 'clsx';
import {
  CHAINS,
  DARK_MODE_TYPE,
  INITIAL_OPENAPI_URL,
  INITIAL_TESTNET_OPENAPI_URL,
  LANGS,
  ThemeIconType,
  ThemeModes,
} from 'consts';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { ReactComponent as RcIconActivities } from 'ui/assets/dashboard/activities.svg';
import { ReactComponent as RcIconArrowRight } from 'ui/assets/dashboard/settings/icon-right-arrow.svg';
import { ReactComponent as RcIconArrowOrangeRight } from 'ui/assets/dashboard/settings/icon-right-arrow-orange.svg';
import { ReactComponent as RcIconArrowCCRight } from 'ui/assets/dashboard/settings/icon-right-arrow-cc.svg';

import IconSettingsDeBank from 'ui/assets/dashboard/settings/debank.svg';

import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { ReactComponent as RcIconAddresses } from 'ui/assets/dashboard/addresses.svg';
import { ReactComponent as RcIconCustomRPC } from 'ui/assets/dashboard/custom-rpc.svg';
import { ReactComponent as RcIconCustomTestnet } from 'ui/assets/dashboard/icon-custom-testnet.svg';
import { ReactComponent as RcIconPreferMetamask } from 'ui/assets/dashboard/icon-prefer-metamask.svg';
import { ReactComponent as RcIconAutoLock } from 'ui/assets/dashboard/settings/icon-auto-lock.svg';
import { ReactComponent as RcIconLockWallet } from 'ui/assets/dashboard/settings/lock.svg';
import { ReactComponent as RcIconWhitelist } from 'ui/assets/dashboard/whitelist.svg';
import { ReactComponent as RcIconThemeMode } from 'ui/assets/settings/theme-mode.svg';
import IconDiscordHover from 'ui/assets/discord-hover.svg';
import { ReactComponent as RcIconDiscord } from 'ui/assets/discord.svg';
import IconTwitterHover from 'ui/assets/twitter-hover.svg';
import { ReactComponent as RcIconTwitter } from 'ui/assets/twitter.svg';
import { ReactComponent as RcIconClear } from 'ui/assets/icon-clear.svg';
import { ReactComponent as RcIconClearCC } from 'ui/assets/icon-clear-cc.svg';
import LogoRabby from 'ui/assets/logo-rabby-large.svg';
// import { ReactComponent as RcIconServer } from 'ui/assets/server.svg';
import { ReactComponent as RcIconServerCC } from 'ui/assets/server-cc.svg';
import IconSuccess from 'ui/assets/success.svg';
// import { ReactComponent as RcIconTestnet } from 'ui/assets/dashboard/settings/icon-testnet.svg';
import { Checkbox, Field, PageHeader, Popup } from 'ui/component';
import AuthenticationModalPromise from 'ui/component/AuthenticationModal';
import { openInTab, openInternalPageInTab, useWallet } from 'ui/utils';
import './style.less';

import IconCheck from 'ui/assets/check-2.svg';
import { ReactComponent as RcIconSettingsFeatureConnectedDapps } from 'ui/assets/dashboard/settings/connected-dapps.svg';
import { ReactComponent as RcIconSettingsAboutFollowUs } from 'ui/assets/dashboard/settings/follow-us.svg';
import { ReactComponent as RcIconSettingsAboutSupporetedChains } from 'ui/assets/dashboard/settings/supported-chains.svg';
import { ReactComponent as RcIconSettingsAboutVersion } from 'ui/assets/dashboard/settings/version.svg';
import { ReactComponent as RcIconSettingsGitForkCC } from 'ui/assets/dashboard/settings/git-fork-cc.svg';
import { ReactComponent as RcIconSettingsSearchDapps } from 'ui/assets/dashboard/settings/search.svg';
import IconSettingsRabbyBadge from 'ui/assets/badge/free-gas-badge-s.svg';
import { ReactComponent as RcIconI18n } from 'ui/assets/dashboard/settings/i18n.svg';
import { ReactComponent as RcIconFeedback } from 'ui/assets/dashboard/settings/feedback.svg';

import stats from '@/stats';
import { useAsync, useCss } from 'react-use';
import semver from 'semver-compare';
import { Contacts, RecentConnections } from '..';
import SwitchThemeModal from './components/SwitchThemeModal';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import FeedbackPopup from '../Feedback';
import { getChainList, getMainnetChainList } from '@/utils/chain';
import { SvgIconCross } from '@/ui/assets';

const useAutoLockOptions = () => {
  const { t } = useTranslation();
  return [
    {
      value: 0,
      label: t('page.dashboard.settings.lock.never'),
    },
    {
      value: 7 * 24 * 60,
      label: t('page.dashboard.settings.7Days'),
    },
    {
      value: 24 * 60,
      label: t('page.dashboard.settings.1Day'),
    },
    {
      value: 4 * 60,
      label: t('page.dashboard.settings.4Hours'),
    },
    {
      value: 60,
      label: t('page.dashboard.settings.1Hour'),
    },
    {
      value: 10,
      label: t('page.dashboard.settings.10Minutes'),
    },
  ];
};

interface SettingsProps {
  visible?: boolean;
  onClose?: DrawerProps['onClose'];
  onOpenBadgeModal: () => void;
}

const { confirm } = Modal;

const OpenApiModal = ({
  visible,
  onFinish,
  onCancel,
  value,
  title,
  defaultValue = INITIAL_OPENAPI_URL,
}: {
  title?: string;
  visible: boolean;
  onFinish(host: string): void;
  value: string;
  defaultValue: string;
  onCancel(): void;
}) => {
  const { useForm } = Form;
  const [isVisible, setIsVisible] = useState(false);
  const [form] = useForm<{ host: string }>();
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();

  title = title || t('page.dashboard.settings.backendServiceUrl');

  const handleSubmit = async ({ host }: { host: string }) => {
    setIsVisible(false);
    setTimeout(() => {
      onFinish(host);
    }, 500);
  };

  const restoreInitial = () => {
    form.setFieldsValue({
      host: defaultValue,
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
      host: value,
    });
  }, [form, value]);

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
        {title}
      </PageHeader>
      <Form onFinish={handleSubmit} form={form}>
        <Form.Item
          name="host"
          rules={[
            {
              required: true,
              message: t('page.dashboard.settings.inputOpenapiHost'),
            },
            {
              pattern: /^((https|http)?:\/\/)[^\s]+\.[^\s]+/,
              message: t('page.dashboard.settings.pleaseCheckYourHost'),
            },
          ]}
        >
          <Input
            className="popup-input"
            placeholder={t('page.dashboard.settings.host')}
            size="large"
            autoFocus
            spellCheck={false}
          />
        </Form.Item>
        {form.getFieldValue('host') !== INITIAL_OPENAPI_URL && (
          <div className="flex justify-end">
            <Button type="link" onClick={restoreInitial} className="restore">
              {t('page.dashboard.settings.reset')}
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
            {t('page.dashboard.settings.save')}
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
  const [clearNonce, setClearNonce] = useState(false);
  const wallet = useWallet();
  const { t } = useTranslation();

  const handleCancel = () => {
    setIsVisible(false);
    setClearNonce(false);
    setTimeout(() => {
      onCancel();
    }, 500);
  };

  const handleResetAccount = async () => {
    const currentAddress = (await wallet.getCurrentAccount())?.address || '';
    await wallet.clearAddressPendingTransactions(currentAddress);
    if (clearNonce) {
      await wallet.clearAddressTransactions(currentAddress);
    }
    message.success({
      icon: <img src={IconSuccess} className="icon icon-success" />,
      content: t('page.dashboard.settings.pendingTransactionCleared'),
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
        {t('page.dashboard.settings.clearPending')}
      </PageHeader>
      <div>
        <p className="reset-account-content mb-16">
          {t('page.dashboard.settings.clearPendingTip1')}
        </p>
        <p className="reset-account-content">
          {t('page.dashboard.settings.clearPendingTip2')}
        </p>
        <div className="flex flex-col mt-auto popup-footer px-20 bottom-18">
          <div className="absolute left-0 top-[40px] w-full h-0 border-solid border-t-[0.5px] border-rabby-neutral-line"></div>
          <div className="flex justify-center mb-[38px]">
            <Checkbox
              checked={clearNonce}
              unCheckBackground="transparent"
              checkIcon={
                clearNonce ? undefined : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M7.97578 13.7748C11.179 13.7748 13.7758 11.1781 13.7758 7.9748C13.7758 4.77155 11.179 2.1748 7.97578 2.1748C4.77253 2.1748 2.17578 4.77155 2.17578 7.9748C2.17578 11.1781 4.77253 13.7748 7.97578 13.7748Z"
                      stroke="var(--r-neutral-body)"
                      stroke-width="0.90625"
                      stroke-miterlimit="10"
                    />
                  </svg>
                )
              }
              onChange={setClearNonce}
            >
              <span className="text-13 text-r-neutral-body">
                Also reset my local nonce data and signature record
              </span>
            </Checkbox>
          </div>

          <Button
            type="primary"
            size="large"
            block
            onClick={handleResetAccount}
          >
            {t('global.confirm')}
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
  const AUTO_LOCK_OPTIONS = useAutoLockOptions();
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
        {t('page.dashboard.settings.autoLockTime')}
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

const SwitchLangModal = ({
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

  const locale = useRabbySelector((state) => state.preference.locale);
  const dispatch = useRabbyDispatch();

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(() => {
      onCancel();
    }, 500);
  };

  const handleSelect = async (value: string) => {
    dispatch.preference.switchLocale(value);
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
        {t('page.dashboard.settings.settings.currentLanguage')}
      </PageHeader>
      <div className="auto-lock-option-list">
        {LANGS.map((item) => {
          return (
            <div
              className="auto-lock-option-list-item"
              key={item.code}
              onClick={() => {
                handleSelect(item.code);
              }}
            >
              {item.name}
              {locale === item.code && (
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

const ClaimRabbyBadge = ({ onClick }: { onClick: () => void }) => {
  const { t } = useTranslation();
  return (
    <div className="setting-block">
      <div className="setting-items">
        <Field
          leftIcon={
            <ThemeIcon src={IconSettingsRabbyBadge} className="w-28 h-28" />
          }
          rightIcon={
            <ThemeIcon
              src={RcIconArrowCCRight}
              className="icon icon-arrow-right w-20 h-20 text-[#109D63]"
            />
          }
          onClick={onClick}
          className="bg-[rgba(16,157,99,0.20)] text-[#109D63] hover:border-[#109D63] font-medium"
        >
          {t('page.dashboard.settings.claimFreeGasBadge')}
        </Field>
      </div>
    </div>
  );
};

const RequestDeBankTestnetGasToken = () => {
  const { t } = useTranslation();
  const history = useHistory();
  return (
    <div className="setting-block mt-8">
      <div className="setting-items">
        <Field
          leftIcon={
            <ThemeIcon src={IconSettingsDeBank} className="w-28 h-28" />
          }
          rightIcon={
            <ThemeIcon
              src={RcIconArrowOrangeRight}
              className="icon icon-arrow-right w-20 h-20"
            />
          }
          onClick={() => {
            history.push('/request-debank-testnet-gas-token');
          }}
          className="text-[#FF6238] bg-[#FFF4F1] dark:bg-[#43332F] font-medium hover:border-[#FF6238]"
        >
          {t('page.dashboard.settings.requestDeBankTestnetGasToken')}
        </Field>
      </div>
    </div>
  );
};

type SettingItem = {
  leftIcon: ThemeIconType;
  content: React.ReactNode;
  description?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClick?: (...args: any[]) => any;
};

const SettingsInner = ({
  visible,
  onClose,
  onOpenBadgeModal,
}: SettingsProps) => {
  const wallet = useWallet();
  const history = useHistory();
  const { t } = useTranslation();
  const [showOpenApiModal, setShowOpenApiModal] = useState(false);
  const [showTestnetOpenApiModal, setShowTestnetOpenApiModal] = useState(false);
  const [showResetAccountModal, setShowResetAccountModal] = useState(false);
  const [isShowAutoLockModal, setIsShowAutoLockModal] = useState(false);
  const [isShowLangModal, setIsShowLangModal] = useState(false);
  const [isShowThemeModeModal, setIsShowThemeModeModal] = useState(false);
  const [contactsVisible, setContactsVisible] = useState(false);
  const [whitelistEnable, setWhitelistEnable] = useState(true);
  const [connectedDappsVisible, setConnectedDappsVisible] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);

  const autoLockTime = useRabbySelector(
    (state) => state.preference.autoLockTime || 0
  );
  const locale = useRabbySelector((state) => state.preference.locale);

  const AUTO_LOCK_OPTIONS = useAutoLockOptions();
  const isShowTestnet = useRabbySelector(
    (state) => state.preference.isShowTestnet
  );
  const themeMode = useRabbySelector((state) => state.preference.themeMode);

  const openapiStore = useRabbySelector((state) => state.openapi);

  const dispatch = useRabbyDispatch();

  const autoLockTimeLabel = useMemo(() => {
    return (
      AUTO_LOCK_OPTIONS.find((item) => item.value === autoLockTime)?.label ||
      `${autoLockTime} minutes`
    );
  }, [autoLockTime, AUTO_LOCK_OPTIONS]);

  const langLabel = useMemo(() => {
    return LANGS.find((item) => item.code === locale)?.name;
  }, [locale]);

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
      confirmText: t('global.confirm'),
      cancelText: t('page.dashboard.settings.cancel'),
      title: value
        ? t('page.dashboard.settings.enableWhitelist')
        : t('page.dashboard.settings.disableWhitelist'),
      description: value
        ? t('page.dashboard.settings.enableWhitelistTip')
        : t('page.dashboard.settings.disableWhitelistTip'),
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
      className: 'modal-support-darkmode',
      title: t('page.dashboard.settings.warning'),
      content: t('page.dashboard.settings.clearWatchAddressContent'),
      onOk() {
        wallet.clearWatchMode();
      },
    });
  };

  const { value: hasNewVersion = false } = useAsync(async () => {
    const data = await wallet.openapi.getLatestVersion();

    return semver(process.env.release || '0.0.0', data.version_tag) === -1;
  });

  const handleSwitchIsShowTestnet = (value: boolean) => {
    dispatch.preference.setIsShowTestnet(value);
  };

  const updateVersionClassName = useCss({
    '& .ant-modal-body': {
      padding: '15px 14px 28px 14px',
    },
    '& .ant-modal-confirm-content': {
      padding: '24px 0 0 0',
      background: 'transparent',
      'background-color': 'transparent',
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
        closeIcon: (
          <SvgIconCross className="w-14 fill-current text-r-neutral-foot" />
        ),
        className: clsx(updateVersionClassName, 'modal-support-darkmode'),
        title: t('page.dashboard.settings.updateVersion.title'),
        content: (
          <div className="text-14 leading-[18px] text-center text-r-neutral-body">
            {t('page.dashboard.settings.updateVersion.content')}
          </div>
        ),
        okText: t('page.dashboard.settings.updateVersion.okText'),
        onOk() {
          openInTab('https://rabby.io/update-extension');
        },
      });
    } else {
      message.success({
        key: 'latest version',
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: (
          <span className="text-white">
            {t('page.dashboard.settings.updateVersion.successTip')}
          </span>
        ),
      });
    }
  };

  const renderData = {
    features: {
      label: t('page.dashboard.settings.features.label'),
      items: [
        {
          leftIcon: RcIconLockWallet,
          content: t('page.dashboard.settings.features.lockWallet'),
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
          leftIcon: RcIconActivities,
          content: t('page.dashboard.settings.features.signatureRecord'),
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
          leftIcon: RcIconAddresses,
          content: t('page.dashboard.settings.features.manageAddress'),
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
          leftIcon: RcIconSettingsSearchDapps,
          content: t('page.dashboard.settings.features.searchDapps'),
          onClick: () => {
            matomoRequestEvent({
              category: 'Setting',
              action: 'clickToUse',
              label: 'Search Dapps',
            });
            reportSettings('Search Dapps');
            openInternalPageInTab('dapp-search');
          },
        },
        {
          leftIcon: RcIconSettingsFeatureConnectedDapps,
          content: t('page.dashboard.settings.features.connectedDapp'),
          onClick: () => {
            setConnectedDappsVisible(true);
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
      label: t('page.dashboard.settings.settings.label'),
      items: [
        {
          leftIcon: RcIconWhitelist,
          content: t(
            'page.dashboard.settings.settings.enableWhitelistForSendingAssets'
          ),
          rightIcon: (
            <Switch
              checked={whitelistEnable}
              onChange={handleSwitchWhitelistEnable}
            />
          ),
        },

        {
          leftIcon: RcIconCustomTestnet,
          content: t('page.dashboard.settings.settings.customTestnet'),
          onClick: () => {
            history.push('/custom-testnet');
            matomoRequestEvent({
              category: 'Setting',
              action: 'clickToUse',
              label: 'Custom Testnet',
            });
            reportSettings('Custom Testnet');
          },
        },
        {
          leftIcon: RcIconCustomRPC,
          content: t('page.dashboard.settings.settings.customRpc'),
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
          leftIcon: RcIconI18n,
          content: t('page.dashboard.settings.settings.currentLanguage'),
          onClick: () => {
            matomoRequestEvent({
              category: 'Setting',
              action: 'clickToUse',
              label: 'Current Language',
            });
            reportSettings('Current Language');
            setIsShowLangModal(true);
          },
          rightIcon: (
            <>
              <span
                className="text-14 mr-[8px] text-r-neutral-title-1"
                role="button"
              >
                {langLabel}
              </span>
              <ThemeIcon
                src={RcIconArrowRight}
                className="icon icon-arrow-right"
              />
            </>
          ),
        },
        {
          leftIcon: RcIconThemeMode,
          content: t('page.dashboard.settings.settings.toggleThemeMode'),
          onClick: () => {
            matomoRequestEvent({
              category: 'Setting',
              action: 'clickToUse',
              label: 'Theme Mode',
            });
            reportSettings('Theme Mode');
            setIsShowThemeModeModal(true);
          },
          rightIcon: (
            <>
              <span
                className="text-14 mr-[8px] text-r-neutral-title-1"
                role="button"
              >
                {ThemeModes.find((item) => item.code === themeMode)?.name ||
                  '-'}
              </span>
              <ThemeIcon
                src={RcIconArrowRight}
                className="icon icon-arrow-right"
              />
            </>
          ),
        },
        {
          leftIcon: RcIconPreferMetamask,
          content: t('page.dashboard.settings.settings.metamaskPreferredDapps'),
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
          leftIcon: RcIconAutoLock,
          content: t('page.dashboard.settings.autoLockTime'),
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
                className="text-14 mr-[8px] text-r-neutral-title-1"
                role="button"
              >
                {autoLockTimeLabel}
              </span>
              <ThemeIcon
                src={RcIconArrowRight}
                className="icon icon-arrow-right"
              />
            </>
          ),
        },
        {
          leftIcon: RcIconClear,
          content: t('page.dashboard.settings.clearPending'),
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
            <ThemeIcon
              src={RcIconArrowRight}
              className="icon icon-arrow-right"
            />
          ),
        },
      ] as SettingItem[],
    },
    debugkits: {
      label: 'Debug Kits (Not present on production)',
      items: [
        {
          leftIcon: RcIconServerCC,
          content: (
            <span>{t('page.dashboard.settings.backendServiceUrl')}</span>
          ),
          onClick: () => setShowOpenApiModal(true),
          rightIcon: (
            <ThemeIcon
              src={RcIconArrowRight}
              className="icon icon-arrow-right"
            />
          ),
        },
        {
          leftIcon: RcIconServerCC,
          content: (
            <span>{t('page.dashboard.settings.testnetBackendServiceUrl')}</span>
          ),
          onClick: () => setShowTestnetOpenApiModal(true),
          rightIcon: (
            <ThemeIcon
              src={RcIconArrowRight}
              className="icon icon-arrow-right"
            />
          ),
        },
        {
          leftIcon: RcIconClearCC,
          content: <span>{t('page.dashboard.settings.clearWatchMode')}</span>,
          onClick: handleClickClearWatchMode,
        },
        {
          leftIcon: RcIconSettingsGitForkCC,
          content: <span>Git Build Hash</span>,
          rightIcon: (
            <>
              <span className="text-14 mr-[8px]">
                {process.env.RABBY_BUILD_GIT_HASH}
              </span>
            </>
          ),
        },
      ] as SettingItem[],
    },
    about: {
      label: t('page.dashboard.settings.aboutUs'),
      items: [
        {
          leftIcon: RcIconFeedback,
          content: t('page.dashboard.home.panel.feedback'),
          onClick: () => {
            matomoRequestEvent({
              category: 'Setting',
              action: 'clickToUse',
              label: 'feedback',
            });
            setFeedbackVisible(true);
            reportSettings('feedback');
          },
          rightIcon: (
            <ThemeIcon
              src={RcIconArrowRight}
              className="icon icon-arrow-right"
            />
          ),
        },
        {
          leftIcon: RcIconSettingsAboutVersion,
          content: t('page.dashboard.settings.currentVersion'),
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
                className="text-14 mr-[8px] text-r-neutral-title-1"
                role="button"
                onClick={updateVersion}
              >
                {process.env.release}
                <span
                  className={clsx(
                    'text-[#ec5151] ml-2',
                    !hasNewVersion && 'hidden'
                  )}
                >
                  (
                  <span
                    className={clsx('underline')}
                    role="button"
                    onClick={(evt) => {
                      evt.stopPropagation();
                      updateVersion();
                    }}
                  >
                    {t('page.dashboard.settings.updateAvailable')}
                  </span>
                  )
                </span>
              </span>
              <ThemeIcon
                src={RcIconArrowRight}
                className="icon icon-arrow-right"
              />
            </>
          ),
        },
        {
          leftIcon: RcIconSettingsAboutSupporetedChains,
          content: t('page.dashboard.settings.supportedChains'),
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
                className="text-14 mr-[8px] text-r-neutral-title-1"
                role="button"
              >
                {getChainList('mainnet').length}
              </span>
              <ThemeIcon
                src={RcIconArrowRight}
                className="icon icon-arrow-right"
              />
            </>
          ),
        },
        {
          leftIcon: RcIconSettingsAboutFollowUs,
          content: t('page.dashboard.settings.followUs'),
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
                <ThemeIcon
                  src={RcIconTwitter}
                  className="w-20 group-hover:w-0 group-hover:h-0 group-hover:overflow-hidden"
                />
                <ThemeIcon
                  src={IconTwitterHover}
                  className="w-0 h-0 overflow-hidden group-hover:w-20 group-hover:h-20"
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
                <ThemeIcon
                  src={RcIconDiscord}
                  className="w-20 overflow-hidden group-hover:w-0 group-hover:h-0 "
                />
                <ThemeIcon
                  src={IconDiscordHover}
                  className="w-0 h-0 overflow-hidden group-hover:w-20 group-hover:h-20"
                />
              </a>
            </>
          ),
        },
      ] as SettingItem[],
    },
  };

  if (!process.env.DEBUG) {
    // @ts-expect-error we know it's not defined on production
    delete renderData.debugkits;
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
    dispatch.openapi.getHost();
    dispatch.openapi.getTestnetHost();
  }, []);

  return (
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
              {'Lock Wallet'}
            </Button> */}
        <ClaimRabbyBadge onClick={onOpenBadgeModal} />
        <RequestDeBankTestnetGasToken />
        {Object.values(renderData).map((group, idxl1) => {
          return (
            <div key={`g-${idxl1}`} className="setting-block">
              <div className="setting-title">{group.label}</div>
              <div className="setting-items">
                {group.items.map((data, idxl2) => (
                  <Field
                    key={`g-${idxl1}-item-${idxl2}`}
                    leftIcon={
                      <ThemeIcon src={data.leftIcon} className="icon" />
                    }
                    rightIcon={
                      data.rightIcon || (
                        <ThemeIcon
                          src={RcIconArrowRight}
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
        <div className="px-8 py-2 rounded hover:bg-r-blue-light-1 inline-block">
          <img
            className="inline-block cursor-pointer"
            src={LogoRabby}
            alt="https://rabby.io"
            onClick={() => {
              openInTab('https://rabby.io', false);
            }}
          />
        </div>
      </footer>
      <Contacts
        visible={contactsVisible}
        onCancel={() => {
          setContactsVisible(false);
        }}
      />
      <OpenApiModal
        visible={showOpenApiModal}
        value={openapiStore.host}
        defaultValue={INITIAL_OPENAPI_URL}
        onFinish={(host) => {
          dispatch.openapi.setHost(host);
          setShowOpenApiModal(false);
        }}
        onCancel={() => setShowOpenApiModal(false)}
      />
      <OpenApiModal
        visible={showTestnetOpenApiModal}
        value={openapiStore.testnetHost}
        defaultValue={INITIAL_TESTNET_OPENAPI_URL}
        title={t('page.dashboard.settings.testnetBackendServiceUrl')}
        onFinish={(host) => {
          dispatch.openapi.setTestnetHost(host);
          setShowTestnetOpenApiModal(false);
        }}
        onCancel={() => setShowTestnetOpenApiModal(false)}
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
      <SwitchLangModal
        visible={isShowLangModal}
        onFinish={() => setIsShowLangModal(false)}
        onCancel={() => setIsShowLangModal(false)}
      />
      <SwitchThemeModal
        visible={isShowThemeModeModal}
        onFinish={() => setIsShowThemeModeModal(false)}
        onCancel={() => setIsShowThemeModeModal(false)}
      />
      <RecentConnections
        visible={connectedDappsVisible}
        onClose={() => {
          setConnectedDappsVisible(false);
        }}
      />
      <FeedbackPopup
        visible={feedbackVisible}
        onClose={() => setFeedbackVisible(false)}
      />
    </div>
  );
};

const Settings = (props: SettingsProps) => {
  const { visible, onClose } = props;
  return (
    <Popup
      visible={visible}
      onClose={onClose}
      height={488}
      bodyStyle={{ height: '100%', padding: '20px 20px 0 20px' }}
      destroyOnClose
      className="settings-popup-wrapper"
      isSupportDarkMode
    >
      <SettingsInner {...props} />
    </Popup>
  );
};

function reportSettings(moduleName: string) {
  stats.report('settingsModule', {
    moduleName,
  });
}

export default Settings;
