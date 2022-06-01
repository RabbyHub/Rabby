import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { InfoCircleOutlined } from '@ant-design/icons';

import WordsMatrix from '@/ui/component/WordsMatrix';

import { StrayPageWithButton } from 'ui/component';
import { useMedia } from 'react-use';
import clsx from 'clsx';
import { connectStore, useRabbyDispatch, useRabbySelector } from 'ui/store';
import LessPalette from '@/ui/style/var-defs';
import { fadeColor, styid } from '@/ui/utils/styled';

import IconMaskIcon from '@/ui/assets/create-mnemonics/mask-lock.svg';
import IconCopy from 'ui/assets/component/icon-copy.svg';
import IconSuccess from 'ui/assets/success.svg';
import { message } from 'antd';
import { copyTextToClipboard } from '@/ui/utils/clipboard';

const AlertBlock = styled.div`
  padding: 10px 12px;
  color: ${LessPalette['@color-red']};
  background-color: ${fadeColor({ hex: LessPalette['@color-red'], fade: 10 })};
`;

const MnemonicsMask = styled.div`
  background-color: ${fadeColor({ hex: '#000000', fade: 90 })};
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  backdrop-filter: blur(120px);
  opacity: 0.9;
`;

const CopySection = styled.div`
  color: ${LessPalette['@color-comment-1']};
  display: flex;
  align-items: center;
  justify-content: center;

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
  useEffect(() => {
    dispatch.createMnemonics.prepareMnemonicsAsync();
  }, []);

  const [masked, setMasked] = React.useState(true);

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

  return (
    <StrayPageWithButton
      custom={isWide}
      className={clsx(isWide && 'rabby-stray-page')}
      hasBack
      hasDivider
      onNextClick={() => {
        dispatch.createMnemonics.stepTo('verify');
      }}
      onBackClick={async () => {
        dispatch.createMnemonics.stepTo('risk-check');
      }}
      nextDisabled={masked}
      noPadding
    >
      <header className="create-new-header create-mnemonics-header h-[60px] leading-[60px] py-0">
        <h2 className="text-20 mb-0 mt-0 text-white text-center font-medium">
          {t('Backup Seed Phrase')}
        </h2>
      </header>
      <div className="rabby-container">
        <div className="px-20 pt-20">
          <AlertBlock className="flex justify-center items-center mb-20 rounded-[4px]">
            <InfoCircleOutlined className="mr-10" />
            <p className="mb-0">
              {t(
                'When backing up the seed phrase, make sure no one else is around !'
              )}
            </p>
          </AlertBlock>
          <MnemonicsWrapper className="relative">
            <MnemonicsMask
              onClick={() => setMasked(false)}
              className={clsx(
                'rounded-[6px] flex flex-col justify-center items-center cursor-pointer z-10',
                !masked && 'hidden'
              )}
            >
              <img src={IconMaskIcon} className="w-[44px] h-[44px]" />
              <p className="mt-[16px] mb-0 text-white">
                {t('Click to show Seed Phrase')}
              </p>
            </MnemonicsMask>
            <div className="rounded-[6px] flex items-center">
              <WordsMatrix
                focusable={false}
                closable={false}
                words={mnemonics.split(' ')}
              />
            </div>
          </MnemonicsWrapper>
          {!masked && (
            <CopySection onClick={onCopyMnemonics} className="pt-16 pb-16">
              <img className="mr-6" src={IconCopy} />

              {'Copy seed phrase'}
            </CopySection>
          )}
          <TipTextList className="text-14 pl-20">
            <li>
              Do not backup and save by screenshots or network transmission
            </li>
            <li>
              Do not share the seed phrase with others, as having the seed
              phrase is the same as having control of the asset
            </li>
            <li>
              Do not uninstall Rabby easily in any case, after uninstallation,
              the seed phrase be lost and Rabby cannot retrieve it for you.
            </li>
          </TipTextList>
        </div>
      </div>
    </StrayPageWithButton>
  );
};

export default connectStore()(DisplayMnemonic);
