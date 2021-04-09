import { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Modal, Icon } from 'ui/component';
import { useEth } from 'ui/helper';

const Dashboard = () => {
  const history = useHistory();
  const eth = useEth();
  const [currentAccount, setCurrentAccount] = useState('');

  const [isModalOpen, setModalOpen] = useState(false);

  const handleArrowClick = useCallback(() => setModalOpen(true), []);

  const initData = async () => {
    const account = await eth.getAccount();
    setCurrentAccount(account);
  }

  useEffect(() => {
    initData();
  }, [eth])

  const handleConfig = () => {
    history.push('/settings')
  }

  return <>
    <div className="flex">
      <div className="flex-1 flex items-center">
        <div className="font-bold truncate w-20">{currentAccount}</div>
        <div className="font-bold -ml-1">{currentAccount && currentAccount.slice(-4)}</div>
        <Icon type="triangle" className="ml-1 cursor-pointer" onClick={handleArrowClick} />
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
    <Modal isOpen={isModalOpen}>hihi</Modal>
  </>
}

export default Dashboard;
