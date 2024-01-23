import React, { useEffect } from 'react';
import styled from 'styled-components';
import { InfoCircleOutlined } from '@ant-design/icons';
import WordsMatrix from '@/ui/component/WordsMatrix';
import clsx from 'clsx';
import { connectStore, useRabbyDispatch, useRabbySelector } from 'ui/store';
import { styid } from '@/ui/utils/styled';
import { openInternalPageInTab, useWallet } from 'ui/utils';
import { Account } from '@/background/service/preference';
import { ReactComponent as RcIconCopy } from 'ui/assets/component/icon-copy-cc.svg';
import IconSuccess from 'ui/assets/success.svg';
import { Button, message } from 'antd';
import { copyTextToClipboard } from '@/ui/utils/clipboard';
import { generateAliasName } from '@/utils/account';
import { BRAND_ALIAN_TYPE_TEXT, KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import LogoSVG from '@/ui/assets/logo.svg';
import { ReactComponent as RcIconBack } from 'ui/assets/back-cc.svg';
import { useTranslation } from 'react-i18next';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';

const AlertBlock = styled.div`
  padding: 10px 12px;
  color: var(--r-red-default);
  background: var(--r-red-light);
  font-weight: 400;
  font-size: 14px;
  line-height: 16px;
`;

const CopySection = styled.div`
  color: var(--r-neutral-body);
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;

  cursor: pointer;
`;

const TipTextList = styled.ol`
  list-style-type: decimal;

  > li {
    font-weight: 400;
    color: var(--r-neutral-body);
    line-height: 20px;
  }

  > li + li {
    margin-top: 4px;
  }
`;

const MnemonicsWrapper = styled.div`
  & + ${styid(TipTextList)} {
    margin-top: 20px;
  }
`;

const DisplayMnemonic = () => {
  const dispatch = useRabbyDispatch();
  const wallet = useWallet();
  useEffect(() => {
    dispatch.createMnemonics.prepareMnemonicsAsync();
  }, []);
  const { t } = useTranslation();
  const { mnemonics } = useRabbySelector((s) => ({
    mnemonics: s.createMnemonics.mnemonics,
  }));

  const onCopyMnemonics = React.useCallback(() => {
    copyTextToClipboard(mnemonics).then(() => {
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: t('global.copied'),
        duration: 0.5,
      });
    });
  }, [mnemonics]);

  const onSubmit = React.useCallback(() => {
    wallet.createKeyringWithMnemonics(mnemonics).then(async () => {
      // Passphrase is not supported on new creation
      const keyring = await wallet.getKeyringByMnemonic(mnemonics, '');
      const keyringId = await wallet.getMnemonicKeyRingIdFromPublicKey(
        keyring!.publicKey!
      );

      openInternalPageInTab(
        `import/select-address?hd=${KEYRING_CLASS.MNEMONIC}&keyringId=${keyringId}`
      );

      dispatch.createMnemonics.reset();
    });
  }, [mnemonics]);

  return (
    <div className={clsx('mx-auto pt-[58px]', 'w-[600px]')}>
      <img src={LogoSVG} alt="Rabby" className="mb-[12px]" />
      <div
        className={clsx(
          'px-[100px] pt-[32px] pb-[40px]',
          'bg-r-neutral-card-1 rounded-[12px]',
          'relative'
        )}
      >
        <div
          className="cursor-pointer absolute left-[100px] top-[32px]"
          onClick={() => dispatch.createMnemonics.stepTo('risk-check')}
        >
          <ThemeIcon
            src={RcIconBack}
            className="w-[20px] h-[20px] text-r-neutral-title-1"
          />
        </div>
        <h1
          className={clsx(
            'flex items-center justify-center',
            'space-x-[16px] mb-[14px]',
            'text-[20px] text-r-neutral-title-1'
          )}
        >
          <span>{t('page.newAddress.seedPhrase.backup')}</span>
        </h1>
        <div className="px-20 pt-24">
          <AlertBlock className="flex justify-center items-center mb-[24px] rounded-[4px]">
            <InfoCircleOutlined className="mr-10" />
            <p className="mb-0">{t('page.newAddress.seedPhrase.backupTips')}</p>
          </AlertBlock>
          <MnemonicsWrapper className="relative">
            <div className="rounded-[6px] flex items-center">
              <WordsMatrix
                focusable={false}
                closable={false}
                words={mnemonics.split(' ')}
                className="bg-r-neutral-card-3 border-[0.5px] border-rabby-neutral-line"
              />
            </div>
          </MnemonicsWrapper>
          <CopySection
            onClick={onCopyMnemonics}
            className="text-13 pt-16 pb-16 mt-8"
          >
            <ThemeIcon
              className="mr-6 w-[16px] h-[16px] text-r-neutral-body"
              src={RcIconCopy}
            />
            {t('page.newAddress.seedPhrase.copy')}
          </CopySection>
        </div>
        <div className="text-center mt-[116px]">
          <Button
            type="primary"
            size="large"
            onClick={onSubmit}
            className="py-[13px] px-[56px] h-auto"
          >
            {t('page.newAddress.seedPhrase.saved')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default connectStore()(DisplayMnemonic);
