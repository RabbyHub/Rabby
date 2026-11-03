// Stylesheets of the pages in MainRoute, in the order they were applied when
// every page was bundled with MainRoute. Pages now load on demand, but styles
// are shared across pages and with components shown on every page (e.g.
// SelectToAddress renders `.send-token`, and the approval window's
// ScanCopyQRCode uses the WalletConnect page's `.qrcode`), so these still load
// up front, in the same order, and the cascade is unchanged. Keep new page
// styles with their page; add one here only if other pages rely on it.
import './NoAddress/style.less';
import '../utils/confirmPopup.less';
import '../component/QRCodeReader/style.less';
import './SelectAddress/style.less';
import './HDManager/index.less';
import './ImportSuccess/index.less';
import './ImportGnosisAddress/style.less';
import './ImportHardware/LedgerConnect/style.less';
import './ImportHardware/TrezorConnect/style.less';
import './ImportHardware/OneKeyConnect/style.less';
import '../component/Progress/index.less';
import './ConnectedSites/style.less';
import './Approval/style.less';
import './TokenApproval/style.less';
import './NFTApproval/style.less';
import './AddAddress/style.less';
import './ChainList/style.less';
import './AddressManagement/style.less';
import './SwitchLang/style.less';
import './Activities/style.less';
import './TransactionHistory/style.less';
import './SignedTextHistory/style.less';
import './History/style.less';
import './Perps/popup/OpenPositionPopup.less';
import './Staking/style.less';
import './Staking/components/actionModal.less';
import './AdvanceSettings/style.less';
import './RequestPermission/style.less';
import '../component/TokenSelector/style.less';
import '../component/TokenAmountInput/style.less';
import './SendToken/style.less';
import '../component/NFTNumberInput/style.less';
import './SendNFT/style.less';
import './Receive/style.less';
import './WalletConnect/style.less';
import './AddressDetail/style.less';
import './AddressBackup/style.less';
import './CustomRPC/style.less';
import './ImportMyMetaMaskAccount/style.less';
import './CommonPopup/AssetList/CustomTestnetTokenDetailPopup/style.less';
import './NFTView/style.less';
import './ImportHardware/QRCodeConnect/style.less';
import './ImportHardware/KeystoneConnect/style.less';
import './ImportCoinbase/style.less';
import './ImportHardware/ImKeyConnect/style.less';
import './ImportHardware/index.css';
import './CustomTestnet/style.less';
import './GnosisQueue/style.less';
import '../component/LangSelector/styles.less';
import './MetamaskModeDapps/style.less';
import './WhitelistInput/styles.less';
import './SelectToAddress/style.less';
