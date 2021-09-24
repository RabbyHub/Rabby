import React from 'react';
import clsx from 'clsx';
import { Button } from 'antd';
import { useTranslation, Trans } from 'react-i18next';
import { intToHex } from 'ethereumjs-util';
import { CHAINS } from 'consts';
import { useWallet, useApproval } from 'ui/utils';
import IconWarning from 'ui/assets/warning.svg';

interface AddChainProps {
  data: {
    chainId: string;
  }[];
  session: {
    origin: string;
    icon: string;
    name: string;
  };
}

const AddChain = ({ params }: { params: AddChainProps }) => {
  const wallet = useWallet();
  const [, resolveApproval, rejectApproval] = useApproval();
  const { t } = useTranslation();

  const { data, session } = params;
  let [{ chainId }] = data;
  if (typeof chainId === 'number') {
    chainId = intToHex(chainId).toLowerCase();
  } else {
    chainId = chainId.toLowerCase();
  }

  const supportChains = wallet.getSupportChains();
  const showChain = supportChains.find((chain) => chain.hex === chainId);

  const enableChains = wallet.getEnableChains();

  let title;
  let content;
  let confirmBtnText;
  if (!enableChains.some((chain) => chain.hex === chainId)) {
    title = t('Enable a Chain');
    content = t('enableChainContent');
    confirmBtnText = t('Enable');
  } else {
    title = t('Switch a Chain');
    content = (
      <Trans i18nKey="switchChainDesc" values={{ name: showChain?.name }} />
    );
    confirmBtnText = t('Change');
  }

  return (
    <>
      <div className="approval-chain">
        {showChain ? (
          <>
            <h1 className="text-center mb-24">{title}</h1>
            <div className="text-center">
              <img
                className="w-[44px] h-[44px] mx-auto mb-12"
                src={showChain.logo}
              />
              <div className="mb-4 text-20 text-gray-title">
                {showChain.name}
              </div>
              <div className="mb-28 text-14 text-gray-content">
                {t('Chain ID')}:{showChain.id}
              </div>
            </div>
            <div className="text-center text-13 text-gray-content font-medium">
              {content}
            </div>
          </>
        ) : (
          <>
            <img
              src={IconWarning}
              className="w-[68px] h-[68px] mb-28 mx-auto"
            />
            <div className="text-gray-title text-20 w-[344px] mx-auto font-medium text-center">
              {t('The requested chain is not supported by Rabby yet')}
            </div>
          </>
        )}
      </div>
      <footer className="connect-footer">
        <div
          className={clsx([
            'action-buttons flex mt-4',
            showChain ? 'justify-between' : 'justify-center',
          ])}
        >
          {showChain ? (
            <>
              <Button
                type="primary"
                size="large"
                className="w-[172px]"
                onClick={rejectApproval}
              >
                {t('Cancel')}
              </Button>
              <Button
                type="primary"
                size="large"
                className="w-[172px]"
                onClick={resolveApproval}
              >
                {confirmBtnText}
              </Button>
            </>
          ) : (
            <Button
              type="primary"
              size="large"
              className="w-[200px]"
              onClick={rejectApproval}
            >
              {t('OK')}
            </Button>
          )}
        </div>
      </footer>
    </>
  );
};

export default AddChain;
