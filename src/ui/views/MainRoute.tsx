import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
import { HistoryPage } from './History';
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
import RequestDeBankTestnetGasToken from './RequestDeBankTestnetGasToken';
import { ImportCoboArgus } from './ImportCoboArgus/ImportCoboArgus';

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
      <Route path="/" element={LogPageView} />
      <Routes>
        <Route path="/welcome">
          <Welcome />
        </Route>
        <Route path="/password">
          <CreatePassword />
        </Route>

        <Route path="/no-address">
          <NoAddress />
        </Route>
        <PrivateRoute path="/start-chain-management">
          <StartChainManagement />
        </PrivateRoute>
        <PrivateRoute path="/mnemonics/risk-check">
          <CreateMnemonics />
        </PrivateRoute>
        <PrivateRoute
          path="/create-mnemonics"
          element={<Navigate to="/mnemonics/create" />}
        />
        <PrivateRoute path="/mnemonics/create">
          <CreateMnemonics />
        </PrivateRoute>
        <PrivateRoute path="/import">
          <ImportMode />
        </PrivateRoute>
        <PrivateRoute path="/import/entry-import-address">
          <EntryImportAddress />
        </PrivateRoute>
        <PrivateRoute path="/import/key">
          <ImportPrivateKey />
        </PrivateRoute>
        <PrivateRoute path="/import/json">
          <ImportJson />
        </PrivateRoute>
        <PrivateRoute path="/import/mnemonics">
          <InputMnemonics />
        </PrivateRoute>
        <PrivateRoute path="/popup/import/mnemonics-confirm">
          <ConfirmMnemonics isPopup />
        </PrivateRoute>
        <PrivateRoute path="/import/mnemonics-confirm">
          <ConfirmMnemonics />
        </PrivateRoute>
        <PrivateRoute path="/popup/import/mnemonics-import-more-address">
          <ImportMoreAddress isPopup />
        </PrivateRoute>
        <PrivateRoute path="/import/mnemonics-import-more-address">
          <ImportMoreAddress />
        </PrivateRoute>
        <PrivateRoute path="/popup/import/select-address">
          <SelectAddress isPopup />
        </PrivateRoute>
        <PrivateRoute path="/import/select-address">
          <SelectAddress />
        </PrivateRoute>
        <PrivateRoute path="/import/hardware">
          <ImportHardware />
        </PrivateRoute>
        <PrivateRoute path="/import/hardware/ledger-connect">
          <ConnectLedger />
        </PrivateRoute>
        <PrivateRoute path="/import/hardware/ledger">
          <ImportLedgerPathSelect />
        </PrivateRoute>
        <PrivateRoute path="/import/hardware/qrcode">
          <QRCodeConnect />
        </PrivateRoute>
        <PrivateRoute path="/import/watch-address">
          <ImportWatchAddress />
        </PrivateRoute>
        <PrivateRoute path="/import/qrcode">
          <ImportQRCodeBase />
        </PrivateRoute>
        <PrivateRoute path="/import/wallet-connect">
          <WalletConnectTemplate />
        </PrivateRoute>
        <PrivateRoute path="/popup/import/success">
          <ImportSuccess isPopup />
        </PrivateRoute>
        <PrivateRoute path="/import/success">
          <ImportSuccess />
        </PrivateRoute>
        <PrivateRoute path="/history">
          <HistoryPage />
        </PrivateRoute>
        <PrivateRoute path="/history/filter-scam">
          <HistoryPage isFitlerScam={true} />
        </PrivateRoute>
        <PrivateRoute path="/activities">
          <Activities />
        </PrivateRoute>
        <PrivateRoute path="/gnosis-queue">
          <GnosisTransactionQueue />
        </PrivateRoute>
        <PrivateRoute path="/import/gnosis">
          <ImportGnosis />
        </PrivateRoute>
        <PrivateRoute path="/import/cobo-argus">
          <ImportCoboArgus />
        </PrivateRoute>
        <PrivateRoute path="/add-address">
          <AddAddress />
        </PrivateRoute>
        <PrivateRoute path="/approval">
          <Approval />
        </PrivateRoute>
        <PrivateRoute path="/token-approval">
          <TokenApproval />
        </PrivateRoute>
        <PrivateRoute path="/nft-approval">
          <NFTApproval />
        </PrivateRoute>
        <PrivateRoute path="/settings">
          <Settings />
        </PrivateRoute>
        <PrivateRoute path="/settings/address">
          <ManageAddress />
        </PrivateRoute>
        <PrivateRoute path="/settings/address-detail">
          <AddressDetail />
        </PrivateRoute>
        <PrivateRoute path="/settings/address-backup/private-key">
          <AddressBackupPrivateKey />
        </PrivateRoute>
        <PrivateRoute path="/settings/address-backup/mneonics">
          <AddressBackupMnemonics />
        </PrivateRoute>
        <PrivateRoute path="/settings/sites">
          <ConnectedSites />
        </PrivateRoute>
        <PrivateRoute path="/settings/chain">
          <ChainManagement />
        </PrivateRoute>
        <PrivateRoute path="/settings/chain-list">
          <ChainList />
        </PrivateRoute>
        <PrivateRoute path="/settings/switch-lang">
          <SwitchLang />
        </PrivateRoute>
        <PrivateRoute path="/settings/advanced">
          <AdvancedSettings />
        </PrivateRoute>
        <PrivateRoute path="/qrcode-reader">
          <QRCodeReader />
        </PrivateRoute>
        <PrivateRoute path="/request-permission">
          <RequestPermission />
        </PrivateRoute>
        <PrivateRoute path="/send-token">
          <SendToken />
        </PrivateRoute>
        <PrivateRoute path="/send-nft">
          <SendNFT />
        </PrivateRoute>
        <PrivateRoute path="/receive">
          <Receive />
        </PrivateRoute>

        <PrivateRoute path="/gas-top-up">
          <GasTopUp />
        </PrivateRoute>

        <PrivateRoute path="/popup/approval-manage">
          <ApprovalManage />
        </PrivateRoute>
        <PrivateRoute path="/approval-manage">
          <ApprovalManagePage />
        </PrivateRoute>

        <PrivateRoute path="/import/metamask">
          <ImportMyMetaMaskAccount />
        </PrivateRoute>

        <PrivateRoute path="/switch-address">
          <AddressManagement />
        </PrivateRoute>

        <PrivateRoute path="/dex-swap">
          <Swap />
        </PrivateRoute>
        <PrivateRoute path="/custom-rpc">
          <CustomRPC />
        </PrivateRoute>
        <PrivateRoute path="/prefer-metamask-dapps">
          <PreferMetamaskDapps />
        </PrivateRoute>
        <PrivateRoute path="/nft">
          <NFTView />
        </PrivateRoute>
        <PrivateRoute path="/request-debank-testnet-gas-token">
          <RequestDeBankTestnetGasToken />
        </PrivateRoute>
      </Routes>

      <CommonPopup />
    </>
  );
};

export default Main;
