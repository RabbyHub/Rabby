import { useRabbySelector } from '@/ui/store';
import { useWallet } from '@/ui/utils';
import { useState } from 'react';
import { useAsync } from 'react-use';

const useRefresh = () => {
  const [v, setV] = useState(0);
  return [v, () => setV((e) => e + 1)] as const;
};

export const useRabbyPoints = () => {
  const wallet = useWallet();
  const account = useRabbySelector((state) => state.account.currentAccount);
  const [userPointsCount, refreshUserPoints] = useRefresh();
  const [activitiesCount, refreshActivities] = useRefresh();
  const [topUsersCount, refreshTopUsers] = useRefresh();

  const {
    value: campaignIsEnded,
    loading: campaignIsEndedLoading,
  } = useAsync(async () => {
    if (account?.address) {
      const data = await wallet.openapi.getRabbyPointsCampaignIsEndedV2();
      return data?.campaign_is_ended;
    }
    return;
  }, [account?.address]);

  const { value: signature, loading: signatureLoading } = useAsync(async () => {
    if (account?.address) {
      const data = await wallet.getRabbyPointsSignature(account?.address);
      return data;
    }
    return;
  }, [account?.address]);

  const { value: snapshot, loading: snapshotLoading } = useAsync(async () => {
    if (account?.address) {
      const data = await wallet.openapi.getRabbyPointsSnapshotV2({
        id: account?.address,
      });
      return data;
    }
    return;
  }, [account?.address]);

  const {
    value: userPointsDetail,
    loading: userLoading,
  } = useAsync(async () => {
    if (account?.address) {
      const data = await wallet.openapi.getRabbyPointsV2({
        id: account?.address,
      });
      return data;
    }
    return undefined;
  }, [account?.address, userPointsCount]);

  const { value: topUsers, loading: topUsersLoading } = useAsync(async () => {
    if (account?.address) {
      const data = await wallet.openapi.getRabbyPointsTopUsersV2({
        id: account?.address,
      });
      return data;
    }
    return undefined;
  }, [account?.address, topUsersCount]);

  const {
    value: activities,
    loading: activitiesLoading,
  } = useAsync(async () => {
    if (account?.address) {
      const data = await wallet.openapi.getRabbyPointsListV2({
        id: account?.address,
      });
      return data;
    }
    return undefined;
  }, [account?.address, activitiesCount]);

  return {
    campaignIsEnded,
    campaignIsEndedLoading,
    signature,
    signatureLoading,
    snapshot,
    snapshotLoading,
    userPointsDetail,
    userLoading,
    topUsers,
    topUsersLoading,
    activities,
    activitiesLoading,
    refreshUserPoints,
    refreshActivities,
    refreshTopUsers,
  };
};

export const useRabbyPointsInvitedCodeCheck = (invitedCode?: string) => {
  const wallet = useWallet();
  const account = useRabbySelector((state) => state.account.currentAccount);

  const { value: codeStatus, loading: codeLoading } = useAsync(async () => {
    if (invitedCode && account?.address) {
      const data = await wallet.openapi.checkRabbyPointsInviteCodeV2({
        code: invitedCode,
      });
      return data;
    }
    return;
  }, [invitedCode, account?.address]);
  return {
    codeStatus,
    codeLoading,
  };
};
