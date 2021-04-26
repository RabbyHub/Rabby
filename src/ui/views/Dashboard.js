import { useCallback, useEffect, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { Modal, Icon } from 'ui/component';
import { useWallet, getCurrentTab } from 'ui/utils';

const SwitchAddress = ({ onChange }) => {
  const wallet = useWallet();
  const [accounts, setAccounts] = useState();
  const keyrings = {
    'HD Key Tree': 'Mnemonics addresses',
    'Simple Key Pair': 'Private key addresses',
  };

  const getAllKeyrings = async () => {
    const _accounts = await wallet.getAllTypedAccounts();

    setAccounts(_accounts);
  };

  const handleCreate = async () => {
    await wallet.addNewAccount();
    getAllKeyrings();
  };

  const changeAccount = ({
    currentTarget: {
      dataset: { account },
    },
  }) => {
    onChange && onChange(account);
  };

  useEffect(() => {
    getAllKeyrings();
  }, []);

  return accounts ? (
    <div className="bg-white shadow-even p-4">
      <div className="mb-6 overflow-auto w-[280px] h-[220px]">
        {accounts.map((a) => (
          <div key={a.type} className="mb-6">
            <div className="text-gray-500 text-lg">{keyrings[a.type]}</div>
            {a.accounts.map((acct) => (
              <div
                data-account={acct}
                onClick={changeAccount}
                className="bg-gray-100 text-gray-800 p-4 text-xs mt-4"
                key={acct}>
                {acct}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div>
        <div className="text-gray-500 text-sm mb-1">New address</div>
        <div className="text-gray-500 text-lg mb-1" onClick={handleCreate}>
          Create a new address
        </div>
        <Link className="block text-gray-500 text-lg" to="/import">
          Import addresses
        </Link>
      </div>
    </div>
  ) : null;
};

const Dashboard = () => {
  const history = useHistory();
  const wallet = useWallet();
  const [currentAccount, setCurrentAccount] = useState('');

  const [isModalOpen, setModalOpen] = useState(false);

  const handleToggle = () => {
    setModalOpen(!isModalOpen);
  };

  const getCurrentAccount = async () => {
    const account = await wallet.getAccount();
    setCurrentAccount(account);
  };

  useEffect(() => {
    getCurrentAccount();
  }, []);

  const handleConfig = () => {
    history.push('/settings');
  };

  const handleChange = async (account) => {
    const { id: tabId } = await getCurrentTab();
    await wallet.changeAccount(account, tabId);
    setCurrentAccount(account);
    handleToggle();
  };

  return (
    <>
      <div className="flex">
        <div className="flex-1 flex items-center">
          <div className="font-bold truncate w-20">{currentAccount}</div>
          <div className="font-bold -ml-1">
            {currentAccount && currentAccount.toString().slice(-4)}
          </div>
          <Icon
            type="triangle"
            className="ml-1 cursor-pointer"
            onClick={handleToggle}
          />
        </div>
        <div onClick={handleConfig}>o</div>
      </div>
      <div className="bg-primary mt-6 p-6 text-white rounded-2xl cursor-pointer">
        <div className="text-xs">Total Net Worth on 2 Chains</div>
        <div className="text-2xl font-bold flex">
          <div className="flex-1">$3,791,231.25</div>
          <Icon type="arrow" />
        </div>
      </div>
      <Modal isOpen={isModalOpen} onClose={handleToggle}>
        <SwitchAddress onChange={handleChange} />
      </Modal>
    </>
  );
};

export default Dashboard;
