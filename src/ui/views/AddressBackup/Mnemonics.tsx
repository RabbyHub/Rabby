import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './style.less';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import IconMaskIcon from '@/ui/assets/create-mnemonics/mask-lock.svg';
import { ReactComponent as RcIconCopyCC } from 'ui/assets/component/icon-copy-cc.svg';
import IconSuccess from 'ui/assets/success.svg';
import { message } from 'antd';
import { copyTextToClipboard } from '@/ui/utils/clipboard';
import clsx from 'clsx';
import WordsMatrix from '@/ui/component/WordsMatrix';
import { useHistory, useLocation } from 'react-router-dom';
import IconBack from 'ui/assets/back.svg';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { Slip39TextareaContainer } from './Slip39TextAreaContainer';
import { Popup } from '@/ui/component';
import QRCode from 'qrcode.react';
import { ReactComponent as RcIconQrCode } from 'ui/assets/qrcode-cc.svg';
import { usePopupContainer } from '@/ui/hooks/usePopupContainer';
import { useWallet } from '@/ui/utils';
import { current } from 'immer';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useMount } from 'ahooks';
import AuthenticationModal from '@/ui/component/AuthenticationModal';
import { KEYRING_TYPE } from '@/constant';
import { useEnterPassphraseModal } from '@/ui/hooks/useEnterPassphraseModal';
import { repeat } from 'lodash';
import { useCheckSeedPhraseBackup } from '@/ui/utils/useCheckSeedPhraseBackup';

const placeholderMnemonics = repeat('****** ', 12).trim();

const AddressBackupMnemonics: React.FC<{
  isInModal?: boolean;
  onClose?(): void;
}> = ({ isInModal, onClose }) => {
  const { t } = useTranslation();

  const history = useHistory();
  const { state } = useLocation<{
    data: string;
    goBack?: boolean;
  }>();

  const [data, setData] = useState(state?.data || placeholderMnemonics);
  const [masked, setMasked] = useState(true);
  const { getContainer } = usePopupContainer();
  const wallet = useWallet();
  const currentAccount = useCurrentAccount();

  const onCopyMnemonics = React.useCallback(() => {
    copyTextToClipboard(data).then(() => {
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: t('global.copied'),
        duration: 0.5,
      });
    });
  }, [data]);

  const handleShowQrCode = () => {
    Popup.open({
      title: t('page.backupSeedPhrase.qrCodePopupTitle'),
      height: 476,
      closable: true,
      getContainer,
      content: (
        <div>
          <div className="flex items-start gap-8 px-[12px] py-[10px] rounded-[4px] bg-r-red-light text-r-red-default mb-[20px]">
            <InfoCircleOutlined className="rotate-180" />
            <div className="text-[14px] leading-[18px] ">
              {t('page.backupSeedPhrase.qrCodePopupTips')}
            </div>
          </div>
          <div className="flex justify-center">
            <div className="p-[12px] rounded-[16px] border-rabby-neutral-line border-[1px] bg-white">
              <QRCode value={data} size={240} />
            </div>
          </div>
        </div>
      ),
    });
  };

  const isSlip39 = React.useMemo(() => {
    return data?.split('\n').length > 1;
  }, [data]);

  // useEffect(() => {
  //   if (!data) {
  //     if (isInModal) {
  //       onClose?.();
  //     } else {
  //       history.goBack();
  //     }
  //   }
  // }, [data, history, isInModal]);

  const invokeEnterPassphrase = useEnterPassphraseModal('address');
  const { runCheckBackup } = useCheckSeedPhraseBackup(
    currentAccount?.address || '',
    { manual: true }
  );
  useMount(() => {
    if (!state.data && currentAccount) {
      AuthenticationModal({
        confirmText: t('global.confirm'),
        cancelText: t('global.Cancel'),
        title: t('page.addressDetail.backup-seed-phrase'),
        validationHandler: async (password: string) => {
          if (currentAccount?.type === KEYRING_TYPE.HdKeyring) {
            await invokeEnterPassphrase(currentAccount.address);
          }

          const seed = await wallet.getMnemonics(
            password,
            currentAccount.address
          );
          setData(seed);
        },
        onFinished() {},
        onCancel() {
          if (isInModal) {
            onClose?.();
          } else {
            history.goBack();
          }
        },
        getContainer,
        wallet,
      });
    }
  });

  // if (!data) {
  //   return null;
  // }

  return (
    <div
      className={clsx(
        'page-address-backup',
        isInModal ? 'min-h-0 h-[600px]' : ''
      )}
    >
      <header className="relative">
        {!!state?.goBack && (
          <img
            src={IconBack}
            className={clsx('absolute icon icon-back filter invert')}
            onClick={() => history.goBack()}
          />
        )}
        {t('page.backupSeedPhrase.title')}
      </header>
      <div className="alert mb-20">
        <InfoCircleOutlined className="rotate-180" />
        {t('page.backupSeedPhrase.alert')}
      </div>
      <div className="mb-[94px]">
        <div className="relative">
          <div
            onClick={() => setMasked(false)}
            className={clsx('mask', !masked && 'hidden')}
          >
            <img src={IconMaskIcon} className="w-[44px] h-[44px]" />
            <p className="mt-[16px] mb-0 text-white">
              {t('page.backupSeedPhrase.clickToShow')}
            </p>
          </div>
          <div className="flex items-center gap-[24px] justify-center mb-20">
            <div
              onClick={handleShowQrCode}
              className={clsx(
                'copy text-r-neutral-foot',
                masked ? 'invisible' : 'visible'
              )}
            >
              <ThemeIcon
                src={RcIconQrCode}
                className="text-r-neutral-foot w-[16px] h-[16px]"
              />
              {t('page.backupSeedPhrase.showQrCode')}
            </div>
            <div
              onClick={onCopyMnemonics}
              className={clsx(
                'copy text-r-neutral-foot',
                masked ? 'invisible' : 'visible'
              )}
            >
              <ThemeIcon
                src={RcIconCopyCC}
                className="text-r-neutral-foot w-[16px] h-[16px]"
              />
              {t('page.backupSeedPhrase.copySeedPhrase')}
            </div>
          </div>
          <div
            className="rounded-[6px] flex items-center w-full"
            style={masked ? { filter: 'blur(3px)' } : {}}
          >
            {isSlip39 ? (
              <Slip39TextareaContainer data={data || ''} />
            ) : (
              <WordsMatrix
                className="w-full bg-r-neutral-card-1"
                focusable={false}
                closable={false}
                words={data?.split(' ')}
              />
            )}
          </div>
        </div>
      </div>
      <div className="footer py-[18px] z-20 border-t-[0.5px] border-rabby-neutral-line bg-transparent">
        <Button
          type="primary"
          className="w-full"
          size="large"
          onClick={async () => {
            history.goBack();
            if (currentAccount) {
              await wallet.backupSeedPhraseConfirmed(currentAccount?.address);
              runCheckBackup();
            }
          }}
        >
          {/* {t('global.Done')} */}
          I've Saved the Seed Phrase
        </Button>
      </div>
    </div>
  );
};

export default AddressBackupMnemonics;
