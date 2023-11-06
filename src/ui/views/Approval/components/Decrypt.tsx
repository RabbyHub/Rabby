import { ReactComponent as IconRcMask } from '@/ui/assets/create-mnemonics/mask-lock.svg';
import { Button, message, Tooltip } from 'antd';
import clsx from 'clsx';
import { KEYRING_TYPE } from 'consts';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import IconCopy from 'ui/assets/component/icon-copy.svg';
import IconInfo from 'ui/assets/infoicon.svg';
import { Copy } from 'ui/component';
import { useApproval, useWallet } from 'ui/utils';
import AccountCard from './AccountCard';

interface ConnectProps {
  params: {
    data: [string, string];
    session: {
      icon: string;
      origin: string;
      name: string;
    };
  };
}

const GetEncryptionPublicKey = ({ params }: ConnectProps) => {
  const { t } = useTranslation();
  const [canProcess, setCanProcess] = useState(true);
  const [msg] = params.data;
  const [result, setResult] = useState('');

  const wallet = useWallet();
  const [, resolveApproval, rejectApproval] = useApproval();
  const handleCancel = useCallback(() => {
    rejectApproval('User rejected the request.');
  }, [rejectApproval]);

  const decrypt = async () => {
    const account = await wallet.getCurrentAccount();
    const res = await wallet.decryptMessage({
      type: account!.type,
      from: account!.address,
      data: msg,
    });
    return res;
  };

  const handleDecrypt = async () => {
    try {
      const data = await decrypt();
      setResult(data);
    } catch (e) {
      message.error(e.message);
    }
  };

  const handleAllow = async () => {
    try {
      const data = await decrypt();
      resolveApproval({
        data,
      });
    } catch (e) {
      message.error(e.message);
    }
  };

  const init = async () => {
    const account = await wallet.getCurrentAccount();
    setCanProcess(
      !!account &&
        [KEYRING_TYPE.HdKeyring, KEYRING_TYPE.SimpleKeyring].includes(
          account.type as any
        )
    );
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <div className="approval-decrypt">
      <AccountCard></AccountCard>
      <div className="content">
        <div className="desc">
          This website requires you to decrypt the following text in order to
          complete the operation
        </div>
        <div className="data">
          {!result ? (
            <>
              <div style={{ filter: 'blur(3px)' }} className="data-content">
                {msg}
              </div>
              <div className="data-mask" onClick={handleDecrypt}>
                <IconRcMask
                  width={44}
                  height={44}
                  viewBox="0 0 44 44"
                ></IconRcMask>
                Click to show request
              </div>
            </>
          ) : (
            <>
              <div className="data-content">{result}</div>
              <Copy icon={IconCopy} data={result} className="icon-copy"></Copy>
            </>
          )}
        </div>
      </div>
      <footer className="footer">
        <div className="action-buttons flex justify-between mt-4">
          <Button
            type="primary"
            size="large"
            className="w-[172px]"
            onClick={handleCancel}
          >
            {t('Cancel')}
          </Button>
          {canProcess ? (
            <Button
              type="primary"
              size="large"
              className="w-[172px]"
              onClick={() => handleAllow()}
            >
              {t('Decrypt')}
            </Button>
          ) : (
            <Tooltip
              overlayClassName={clsx('rectangle watcSign__tooltip')}
              title={
                'Only addresses with private keys stored in rabby can perform this type of signing.'
              }
              placement="topRight"
            >
              <Button
                type="primary"
                size="large"
                className="w-[172px]"
                onClick={() => handleAllow()}
                disabled
                icon={
                  <img
                    src={IconInfo}
                    className={clsx('absolute right-[40px] top-[14px]')}
                  />
                }
              >
                {t('Decrypt')}
              </Button>
            </Tooltip>
          )}
        </div>
      </footer>
    </div>
  );
};

export default GetEncryptionPublicKey;
