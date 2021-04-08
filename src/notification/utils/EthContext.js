import { createContext, useContext } from 'react';

const EthContext = createContext({
  eth: {},
});

const EthProvider = ({ children, eth }) => (
  <EthContext.Provider value={{ eth }}>{children}</EthContext.Provider>
);

const useEth = () => {
  const { eth } = useContext(EthContext);

  return eth;
}

export {
  EthProvider,
  useEth,
}
