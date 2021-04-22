import { useState, useEffect } from 'react';
import { Button, Header } from 'ui/component';
import { useWallet } from 'ui/utils';

const ConnectedSites = () => {
  const [sites, setSites] = useState([]);
  const wallet = useWallet();

  const getSites = async () => {
    const sites = await wallet.getConnectedSites();

    setSites(sites);
  }

  useEffect(() => {
    getSites();
  }, []);

  const handleRemove = ({ currentTarget: { dataset: { origin } }}) => {
    wallet.removeConnectedSite(origin);
    getSites();
  }

  return <>
    <Header title={'Connected Sites'} />
    {
      sites.map(k => (
        <div
          className="rounded py-2 px-3 bg-gray-100 mb-2 flex items-center"
          key={k}
        >
          <div className="font-bold flex-1 text-sm">{k}</div>
          <div>
            <Button
              data-origin={k}
              onClick={handleRemove}
              size="sm"
              className="text-xs px-4 text-gray-500"
            >
              remove
            </Button>
          </div>
        </div>
      ))
    }
  </>
}

export default ConnectedSites;
