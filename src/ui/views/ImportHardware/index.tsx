import { useHistory } from 'react-router-dom';
import { KEYRING_CLASS } from 'consts';

import './index.css';

const ImportHardware = () => {
  const history = useHistory();
  const query = new URLSearchParams(history.location.search);
  const connectType = query.get('connectType');
  const brand = query.get('brand');
  const navSelectAddress = async (hardware) => {
    if (hardware === 'LEDGER') {
      history.push('/import/hardware/ledger-connect');
      return;
    }

    try {
      let search = `?hd=${KEYRING_CLASS.HARDWARE[hardware]}`;
      if (brand) {
        search += `&brand=${brand}`;
      }
      history.push({
        pathname: '/import/select-address',
        state: {
          keyring: KEYRING_CLASS.HARDWARE[hardware],
          brand,
        },
        search,
      });
    } catch (err) {
      console.log('connect error', err);
    }
  };
  if (connectType) {
    navSelectAddress(connectType);
  }
  return null;
};

export default ImportHardware;
