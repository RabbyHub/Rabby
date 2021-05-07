import React from 'react';
import { useState, useEffect } from 'react';
import { Button } from 'antd';
import { Footer, Header } from 'ui/component';
import { useWallet, noop } from 'ui/utils';

const Address = () => {
  const [addresses, setAddresses] = useState<string[]>([]);
  const wallet = useWallet();

  const initData = async () => {
    const addresses = await wallet.getAccounts();
    setAddresses(addresses);
  };

  useEffect(() => {
    initData();
  }, []);

  const handleHide = (_, id: string) => {
    console.log(id);
  };
  const handleSingleExport = (_, id: string) => {
    console.log(id);
  };

  const handleExport = noop;

  return (
    <>
      <Header title={'Address Management'} />
      <div className="flex text-gray-500 text-xs mb-1">
        <div>Private key address</div>
      </div>
      {addresses.map((k) => (
        <div
          className="rounded py-2 px-3 bg-gray-100 mb-2 flex items-center"
          key={k}
        >
          <div className="flex flex-1">
            <div className="font-bold truncate w-20">{k}</div>
            <div className="font-bold -ml-1">{k && k.slice(-4)}</div>
          </div>
          <div className="flex">
            <Button
              onClick={(e) => handleHide(e, k)}
              size="small"
              className="text-xs px-4 text-gray-500 mr-2"
            >
              Hide
            </Button>
            <Button
              onClick={(e) => handleSingleExport(e, k)}
              size="small"
              className="text-xs px-4 text-gray-500"
            >
              Export Pk
            </Button>
          </div>
        </div>
      ))}
      <Footer>
        <Button block onClick={handleExport}>
          Export all PKs as a JSON file
        </Button>
      </Footer>
    </>
  );
};

export default Address;
