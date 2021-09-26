import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Button } from 'antd';
import { useTranslation, Trans } from 'react-i18next';
import { intToHex } from 'ethereumjs-util';
import { CHAINS, CHAINS_ENUM } from 'consts';
import { Chain } from 'background/service/chain';
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

  const [supportChains, setSupportChains] = useState<Chain[]>([]);
  const [showChain, setShowChain] = useState<Chain | undefined>(undefined);
  const [enableChains, setEnableChains] = useState<Chain[]>([]);
  const [defaultChain, setDefaultChain] = useState<CHAINS_ENUM | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<any>('');
  const [confirmBtnText, setConfirmBtnText] = useState('');
  const [inited, setInited] = useState(false);

  const init = async () => {
    setSupportChains(await wallet.getSupportChains());
    setEnableChains(await wallet.getEnableChains());
    const site = await wallet.getConnectedSite(session.origin)!;
    setDefaultChain(site.chain);
    setInited(true);
  };

  useEffect(() => {
    if (!enableChains.some((chain) => chain.hex === chainId)) {
      setTitle(t('Enable a Chain'));
      setContent(t('enableChainContent'));
      setConfirmBtnText(t('Enable'));
    } else {
      setTitle(t('Switch a Chain'));
      setContent(
        <Trans i18nKey="switchChainDesc" values={{ name: showChain?.name }} />
      );
      setConfirmBtnText(t('Change'));
    }
    setShowChain(supportChains.find((chain) => chain.hex === chainId));
  }, [enableChains, supportChains, defaultChain]);

  useEffect(() => {
    init();
  }, []);

  if (!inited) return <></>;

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
                onClick={() => rejectApproval()}
              >
                {t('Cancel')}
              </Button>
              <Button
                type="primary"
                size="large"
                className="w-[172px]"
                onClick={() => resolveApproval()}
              >
                {confirmBtnText}
              </Button>
            </>
          ) : (
            <Button
              type="primary"
              size="large"
              className="w-[200px]"
              onClick={() => rejectApproval()}
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
