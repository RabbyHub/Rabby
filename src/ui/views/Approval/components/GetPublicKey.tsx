import { Button, message, Tooltip } from 'antd';
import clsx from 'clsx';
import { KEYRING_TYPE } from 'consts';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import IconInfo from 'ui/assets/infoicon.svg';
import { FallbackSiteLogo } from 'ui/component';
import { useApproval, useWallet } from 'ui/utils';
import AccountCard from './AccountCard';

interface ConnectProps {
  params: {
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
  const { icon, origin } = params.session;

  const wallet = useWallet();
  const [, resolveApproval, rejectApproval] = useApproval();
  const handleCancel = useCallback(() => {
    rejectApproval('User rejected the request.');
  }, [rejectApproval]);

  const handleAllow = async () => {
    try {
      const account = await wallet.getCurrentAccount();
      const data = await wallet.getEncryptionPublicKey({
        type: account!.type,
        address: account!.address,
      });
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
    <div className="approval-public-key">
      <AccountCard></AccountCard>
      <div className="content">
        <div className="site">
          <FallbackSiteLogo
            className="site-icon"
            url={icon}
            origin={origin}
            width="44px"
          />
          <div className="site-origin">{origin}</div>
        </div>
        <div className="desc">
          This website would like your public encryption key. By consenting,
          this site will be able to compose encrypted messages to you.
        </div>
      </div>
      <footer className="footer p-[20px]">
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
              {t('Provide')}
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
                {t('Provide')}
              </Button>
            </Tooltip>
          )}
        </div>
      </footer>
    </div>
  );
};

export default GetEncryptionPublicKey;
