import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { InfoCircleOutlined } from '@ant-design/icons';

import WordsMatrix from '@/ui/component/WordsMatrix';

import { Navbar, StrayPageWithButton } from 'ui/component';
import { useMedia } from 'react-use';
import clsx from 'clsx';
import { connectStore, useRabbyDispatch, useRabbySelector } from 'ui/store';
import LessPalette from '@/ui/style/var-defs';
import { fadeColor, styid } from '@/ui/utils/styled';
import { useWallet } from 'ui/utils';
import { Account } from '@/background/service/preference';

import IconMaskIcon from '@/ui/assets/create-mnemonics/mask-lock.svg';
import IconCopy from 'ui/assets/component/icon-copy.svg';
import IconSuccess from 'ui/assets/success.svg';
import { message } from 'antd';
import { copyTextToClipboard } from '@/ui/utils/clipboard';
import { generateAliasName } from '@/utils/account';
import { BRAND_ALIAN_TYPE_TEXT, KEYRING_TYPE } from '@/constant';
import { useHistory } from 'react-router-dom';

const AlertBlock = styled.div`
  padding: 10px 12px;
  color: ${LessPalette['@color-red']};
  background: rgba(236, 81, 81, 0.1);
  font-weight: 400;
  font-size: 14px;
  line-height: 16px;
`;

const CopySection = styled.div`
  color: ${LessPalette['@color-comment-1']};
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
    color: ${LessPalette['@color-body']};
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
  const { t } = useTranslation();
  const isWide = useMedia('(min-width: 401px)');
  const dispatch = useRabbyDispatch();
  const wallet = useWallet();
  const history = useHistory();
  useEffect(() => {
    dispatch.createMnemonics.prepareMnemonicsAsync();
  }, []);

  const { mnemonics } = useRabbySelector((s) => ({
    mnemonics: s.createMnemonics.mnemonics,
  }));

  const onCopyMnemonics = React.useCallback(() => {
    copyTextToClipboard(mnemonics).then(() => {
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: t('Copied'),
        duration: 0.5,
      });
    });
  }, [mnemonics]);

  const onSubmit = React.useCallback(() => {
    wallet
      .createKeyringWithMnemonics(mnemonics)
      .then(async (accounts: Account[]) => {
        const keyring = await wallet.getKeyringByMnemonic(mnemonics);

        const newAccounts = await Promise.all(
          accounts.map(async (account) => {
            const alianName = generateAliasName({
              keyringType: KEYRING_TYPE.HdKeyring,
              brandName: `${BRAND_ALIAN_TYPE_TEXT[KEYRING_TYPE.HdKeyring]}`,
              keyringCount: Math.max(keyring!.index, 0),
              addressCount: 0,
            });

            await wallet.updateAlianName(
              account?.address?.toLowerCase(),
              alianName
            );

            return {
              ...account,
              alianName,
            };
          })
        );

        history.replace({
          pathname: '/popup/import/success',
          state: {
            accounts: newAccounts,
            title: t('Created Successfully'),
            editing: true,
          },
        });

        dispatch.createMnemonics.reset();
      });
  }, [mnemonics]);

  return (
    <StrayPageWithButton
      custom={isWide}
      className={clsx(isWide && 'rabby-stray-page')}
      hasDivider
      onSubmit={onSubmit}
      onBackClick={async () => {
        dispatch.createMnemonics.stepTo('risk-check');
      }}
      noPadding
      NextButtonContent={"I've Saved the Phrase"}
    >
      <Navbar
        onBack={async () => {
          dispatch.createMnemonics.stepTo('risk-check');
        }}
      >
        {t('Backup Seed Phrase')}
      </Navbar>
      <div className="rabby-container">
        <div className="px-20 pt-24">
          <AlertBlock className="flex justify-center items-center mb-20 rounded-[4px]">
            <InfoCircleOutlined className="mr-10" />
            <p className="mb-0">
              {t(
                'Make sure no one else is watching your screen when you back up the seed phrase'
              )}
            </p>
          </AlertBlock>
          <MnemonicsWrapper className="relative">
            <div className="rounded-[6px] flex items-center">
              <WordsMatrix
                focusable={false}
                closable={false}
                words={mnemonics.split(' ')}
              />
            </div>
          </MnemonicsWrapper>
          <CopySection onClick={onCopyMnemonics} className="pt-16 pb-16">
            <img className="mr-6" src={IconCopy} />

            {'Copy seed phrase'}
          </CopySection>
        </div>
      </div>
    </StrayPageWithButton>
  );
};

export default connectStore()(DisplayMnemonic);
