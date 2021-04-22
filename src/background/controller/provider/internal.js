const tabConnect = ({
  data: {
    params: { origin, name, icon },
  },
  session,
}) => {
  session.setProp({ origin, name, icon });
};

const getProviderState = (req) => {
  return {
    chainId: 1,
    // accounts: methodMap.getAccounts(req),
  };
};

export default {
  tabConnect,
  getProviderState,
};
