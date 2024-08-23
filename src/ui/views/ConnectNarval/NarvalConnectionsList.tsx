import { ArmoryConnection } from '@/background/utils/armory';
import { Navbar, StrayPageWithButton } from '@/ui/component';
import { useWallet } from '@/ui/utils';
import React, { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useMedia } from 'react-use';
import clsx from 'clsx';
import { Button, message } from 'antd';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { ReactComponent as RcIconCopy } from 'ui/assets/component/icon-copy-cc.svg';
import { ReactComponent as RcIconDelete } from 'ui/assets/address/delete.svg';
import { copyTextToClipboard } from '@/ui/utils/clipboard';
import { t } from 'i18next';
import IconSuccess from 'ui/assets/success.svg';

export const formatAddress = (
  address?: string,
  splitLength: number = 5
): string =>
  address
    ? `${address.substring(0, splitLength)}...${address.substring(
        address.length - splitLength
      )}`
    : '';

const NarvalConnectionsList = () => {
  const history = useHistory();
  const wallet = useWallet();
  const { state } = useLocation<{ connections: ArmoryConnection[] }>();
  const isWide = useMedia('(min-width: 401px)');
  const [connections, setConnections] = useState<ArmoryConnection[]>([]);
  const [
    processingConnectionId,
    setProcessingConnectionId,
  ] = useState<string>();

  useEffect(() => {
    setConnections(state.connections);
  }, [state.connections]);

  const onBack = () => {
    history.replace('/dashboard');
  };

  const onNext = () => {
    history.push({
      pathname: '/import/narval/connection-form',
    });
  };

  const onCopyAddress = (address) => {
    copyTextToClipboard(address).then(() => {
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: t('global.copied'),
        duration: 0.5,
      });
    });
  };

  return (
    <StrayPageWithButton
      custom={isWide}
      hasBack={false}
      hasDivider
      noPadding
      className={clsx(isWide && 'rabby-stray-page')}
      NextButtonContent="New Connection"
      onBackClick={onBack}
      onNextClick={onNext}
      backDisabled={false}
    >
      <Navbar onBack={onBack}>Narval Connections</Navbar>
      <div className="rabby-container widget-has-ant-input">
        <div className="px-20 pt-24">
          <ul className="flex flex-col gap-6">
            {connections.map((connection) => {
              return (
                <li
                  key={connection.connectionId}
                  className="flex items-center justify-between"
                >
                  <div className="flex gap-4 items-center">
                    <span className="font-bold w-[115px]">
                      {formatAddress(connection.credentialPublicKey)}
                    </span>
                    <ThemeIcon
                      src={RcIconCopy}
                      className="w-[16px] h-[16px] text-r-neutral-body cursor-pointer"
                      onClick={() =>
                        onCopyAddress(connection.credentialPublicKey)
                      }
                    />
                  </div>
                  <span>{connection.accounts.length} Accounts</span>
                  <Button
                    htmlType="button"
                    onClick={async () => {
                      try {
                        const { connectionId } = connection;
                        setProcessingConnectionId(connectionId);
                        const allAccounts = await wallet.fetchNarvalAccounts(
                          connectionId
                        );
                        history.push({
                          pathname: '/import/narval/accounts',
                          state: {
                            accounts: allAccounts,
                            connectionId,
                            selectedAccounts: connection.accounts,
                          },
                        });
                      } catch (err) {
                        setProcessingConnectionId(undefined);
                        if (['FORBIDDEN', 'FAILED'].includes(err?.message)) {
                          history.replace({
                            pathname: '/import/narval/pending-permissions',
                          });
                        }
                      }
                    }}
                    size="small"
                    type="primary"
                    loading={processingConnectionId === connection.connectionId}
                  >
                    Add accounts
                  </Button>
                  <ThemeIcon
                    src={RcIconDelete}
                    className="w-[16px] h-[16px] text-r-neutral-body cursor-pointer"
                    onClick={async () => {
                      const connections = await wallet.removeNarvalConnection(
                        connection.connectionId
                      );
                      setConnections(connections);
                      if (!connections.length) {
                        history.replace('/import/narval');
                      }
                    }}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </StrayPageWithButton>
  );
};

export default NarvalConnectionsList;
