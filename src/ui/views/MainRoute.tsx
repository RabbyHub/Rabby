import React, { useEffect } from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import { PrivateRoute } from 'ui/component';

import Welcome from './Welcome';
import NoAddress from './NoAddress';
import CreatePassword from './CreatePassword';
import ImportMode from './ImportMode';
import ImportPrivateKey from './ImportPrivateKey';
import ImportJson from './ImportJson';

import InputMnemonics from './ImportMnemonics/InputMnemonics';
import EntryImportAddress from './ImportMnemonics/EntryImportAddress';
import ConfirmMnemonics from './ImportMnemonics/ConfirmMnemonics';

import ImportWatchAddress from './ImportWatchAddress';
import ImportQRCodeBase from './ImportQRCodeBase';
import SelectAddress from './SelectAddress';
import ImportMoreAddress from './ImportMoreAddress';
import ImportSuccess from './ImportSuccess';
import ImportHardware from './ImportHardware';
import ImportLedgerPathSelect from './ImportHardware/LedgerHdPath';
import ImportGnosis from './ImportGnosisAddress';
import ConnectLedger from './ImportHardware/LedgerConnect';
import Settings from './Settings';
import ConnectedSites from './ConnectedSites';
import Approval from './Approval';
import TokenApproval from './TokenApproval';
import NFTApproval from './NFTApproval';
import CreateMnemonics from './CreateMnemonics';
import AddAddress from './AddAddress';
import ChainManagement, { StartChainManagement } from './ChainManagement';
import ChainList from './ChainList';
import AddressManagement from './AddressManagement';
import SwitchLang from './SwitchLang';
import Activities from './Activities';
import History from './History';
import GnosisTransactionQueue from './GnosisTransactionQueue';
import QRCodeReader from './QRCodeReader';
import AdvancedSettings from './AdvanceSettings';
import RequestPermission from './RequestPermission';
import SendToken from './SendToken';
import SendNFT from './SendNFT';
import Receive from './Receive/index';
import WalletConnectTemplate from './WalletConnect';
import AddressDetail from './AddressDetail';
import AddressBackupMnemonics from './AddressBackup/Mnemonics';
import AddressBackupPrivateKey from './AddressBackup/PrivateKey';
import Swap from './Swap';
import { getUiType, useWallet } from '../utils';
import GasTopUp from './GasTopUp';
import ApprovalManage from './ApprovalManage';
import CustomRPC from './CustomRPC';
import { ImportMyMetaMaskAccount } from './ImportMyMetaMaskAccount';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { PreferMetamaskDapps } from './PreferMetamaskDapps';
import { CommonPopup } from './CommonPopup';
import ManageAddress from './ManageAddress';
import { NFTView } from './NFTView';
import { QRCodeConnect } from './ImportHardware/QRCodeConnect';
import ApprovalManagePage from './ApprovalManagePage';

declare global {
  interface Window {
    _paq: any;
  }
}

const LogPageView = () => {
  if (window._paq) {
    window._paq.push(['setCustomUrl', window.location.hash.replace(/#/, '')]);
    window._paq.push(['trackPageView']);
  }

  return null;
};

const Main = () => {
  const wallet = useWallet();

  useEffect(() => {
    (async () => {
      const UIType = getUiType();
      if (UIType.isNotification || UIType.isPop) {
        const hasOtherProvider = await wallet.getHasOtherProvider();
        matomoRequestEvent({
          category: 'User',
          action: 'active',
          label: UIType.isPop
            ? `popup|${hasOtherProvider ? 'hasMetaMask' : 'noMetaMask'}`
            : `request|${hasOtherProvider ? 'hasMetaMask' : 'noMetaMask'}`,
        });
      }
    })();
  }, []);

  return (
    <>
      <Route path="/" component={LogPageView} />
      <Switch>
        <Route exact path="/welcome">
          <Welcome />
        </Route>
        <Route exact path="/password">
          <CreatePassword />
        </Route>

        <Route exact path="/no-address">
          <NoAddress />
        </Route>
        <PrivateRoute exact path="/start-chain-management">
          <StartChainManagement />
        </PrivateRoute>
        <PrivateRoute exact path="/mnemonics/risk-check">
          <CreateMnemonics />
        </PrivateRoute>
        <Redirect exact path="/create-mnemonics" to="/mnemonics/create" />
        <PrivateRoute exact path="/mnemonics/create">
          <CreateMnemonics />
        </PrivateRoute>
        <PrivateRoute exact path="/import">
          <ImportMode />
        </PrivateRoute>
        <PrivateRoute exact path="/import/entry-import-address">
          <EntryImportAddress />
        </PrivateRoute>
        <PrivateRoute exact path="/import/key">
          <ImportPrivateKey />
        </PrivateRoute>
        <PrivateRoute exact path="/import/json">
          <ImportJson />
        </PrivateRoute>
        <PrivateRoute exact path="/import/mnemonics">
          <InputMnemonics />
        </PrivateRoute>
        <PrivateRoute exact path="/popup/import/mnemonics-confirm">
          <ConfirmMnemonics isPopup />
        </PrivateRoute>
        <PrivateRoute exact path="/import/mnemonics-confirm">
          <ConfirmMnemonics />
        </PrivateRoute>
        <PrivateRoute exact path="/popup/import/mnemonics-import-more-address">
          <ImportMoreAddress isPopup />
        </PrivateRoute>
        <PrivateRoute exact path="/import/mnemonics-import-more-address">
          <ImportMoreAddress />
        </PrivateRoute>
        <PrivateRoute exact path="/popup/import/select-address">
          <SelectAddress isPopup />
        </PrivateRoute>
        <PrivateRoute exact path="/import/select-address">
          <SelectAddress />
        </PrivateRoute>
        <PrivateRoute exact path="/import/hardware">
          <ImportHardware />
        </PrivateRoute>
        <PrivateRoute exact path="/import/hardware/ledger-connect">
          <ConnectLedger />
        </PrivateRoute>
        <PrivateRoute exact path="/import/hardware/ledger">
          <ImportLedgerPathSelect />
        </PrivateRoute>
        <PrivateRoute exact path="/import/hardware/qrcode">
          <QRCodeConnect />
        </PrivateRoute>
        <PrivateRoute exact path="/import/watch-address">
          <ImportWatchAddress />
        </PrivateRoute>
        <PrivateRoute exact path="/import/qrcode">
          <ImportQRCodeBase />
        </PrivateRoute>
        <PrivateRoute exact path="/import/wallet-connect">
          <WalletConnectTemplate />
        </PrivateRoute>
        <PrivateRoute exact path="/popup/import/success">
          <ImportSuccess isPopup />
        </PrivateRoute>
        <PrivateRoute exact path="/import/success">
          <ImportSuccess />
        </PrivateRoute>
        <PrivateRoute exact path="/history">
          <History />
        </PrivateRoute>
        <PrivateRoute exact path="/activities">
          <Activities />
        </PrivateRoute>
        <PrivateRoute exact path="/gnosis-queue">
          <GnosisTransactionQueue />
        </PrivateRoute>
        <PrivateRoute exact path="/import/gnosis">
          <ImportGnosis />
        </PrivateRoute>
        <PrivateRoute exact path="/add-address">
          <AddAddress />
        </PrivateRoute>
        <PrivateRoute exact path="/approval">
          <Approval />
        </PrivateRoute>
        <PrivateRoute exact path="/token-approval">
          <TokenApproval />
        </PrivateRoute>
        <PrivateRoute exact path="/nft-approval">
          <NFTApproval />
        </PrivateRoute>
        <PrivateRoute exact path="/settings">
          <Settings />
        </PrivateRoute>
        <PrivateRoute exact path="/settings/address">
          <ManageAddress />
        </PrivateRoute>
        <PrivateRoute exact path="/settings/address-detail">
          <AddressDetail />
        </PrivateRoute>
        <PrivateRoute exact path="/settings/address-backup/private-key">
          <AddressBackupPrivateKey />
        </PrivateRoute>
        <PrivateRoute exact path="/settings/address-backup/mneonics">
          <AddressBackupMnemonics />
        </PrivateRoute>
        <PrivateRoute exact path="/settings/sites">
          <ConnectedSites />
        </PrivateRoute>
        <PrivateRoute exact path="/settings/chain">
          <ChainManagement />
        </PrivateRoute>
        <PrivateRoute exact path="/settings/chain-list">
          <ChainList />
        </PrivateRoute>
        <PrivateRoute exact path="/settings/switch-lang">
          <SwitchLang />
        </PrivateRoute>
        <PrivateRoute exact path="/settings/advanced">
          <AdvancedSettings />
        </PrivateRoute>
        <PrivateRoute exact path="/qrcode-reader">
          <QRCodeReader />
        </PrivateRoute>
        <PrivateRoute exact path="/request-permission">
          <RequestPermission />
        </PrivateRoute>
        <PrivateRoute exact path="/send-token">
          <SendToken />
        </PrivateRoute>
        <PrivateRoute exact path="/send-nft">
          <SendNFT />
        </PrivateRoute>
        <PrivateRoute exact path="/receive">
          <Receive />
        </PrivateRoute>

        <PrivateRoute exact path="/gas-top-up">
          <GasTopUp />
        </PrivateRoute>

        <PrivateRoute exact path="/popup/approval-manage">
          <ApprovalManage />
        </PrivateRoute>
        <PrivateRoute exact path="/approval-manage">
          <ApprovalManagePage />
        </PrivateRoute>

        <PrivateRoute exact path="/import/metamask">
          <ImportMyMetaMaskAccount />
        </PrivateRoute>

        <PrivateRoute exact path="/switch-address">
          <AddressManagement />
        </PrivateRoute>

        <PrivateRoute exact path="/dex-swap">
          <Swap />
        </PrivateRoute>
        <PrivateRoute exact path="/custom-rpc">
          <CustomRPC />
        </PrivateRoute>
        <PrivateRoute exact path="/prefer-metamask-dapps">
          <PreferMetamaskDapps />
        </PrivateRoute>
        <PrivateRoute exact path="/nft">
          <NFTView />
        </PrivateRoute>
      </Switch>

      <CommonPopup />
    </>
  );
};

export default Main;
