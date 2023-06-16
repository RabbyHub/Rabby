import { useEffect, useState } from 'react';
import {
  UserData,
  ContextActionData,
  RuleConfig,
} from '@rabby-wallet/rabby-security-engine/dist/rules';
import { useWallet } from './';

export const useSecurityEngine = (nonce = 0) => {
  const wallet = useWallet();
  const [userData, setUserData] = useState<UserData>({
    originBlacklist: [],
    originWhitelist: [],
    addressBlacklist: [],
    addressWhitelist: [],
    contractBlacklist: [],
    contractWhitelist: [],
  });
  const [rules, setRules] = useState<RuleConfig[]>([]);

  const fetch = async () => {
    const data = await wallet.getSecurityEngineUserData();
    const r = await wallet.getSecurityEngineRules();
    setUserData(data);
    setRules(r);
  };

  const executeEngine = (actionData: ContextActionData) => {
    return wallet.executeSecurityEngine(actionData);
  };

  const updateUserData = async (data: UserData) => {
    await wallet.updateUserData(data);
    fetch();
  };

  useEffect(() => {
    fetch();
  }, [nonce]);

  return {
    rules,
    userData,
    executeEngine,
    updateUserData,
  };
};
