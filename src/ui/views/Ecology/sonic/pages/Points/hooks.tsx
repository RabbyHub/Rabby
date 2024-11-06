import { useRabbySelector } from '@/ui/store';
import { useEffect, useState } from 'react';
import { getAddress } from 'viem';

async function getUserStats(address: string) {
  const baseUrl = 'https://airdrop.soniclabs.com/api/trpc';

  const batchInput = {
    '0': { json: { address } },
    '1': { json: { address } },
  };

  const endpoint = 'points.getArcadePoints,user.findOrCreate';
  const url = `${baseUrl}/${endpoint}?batch=1&input=${encodeURIComponent(
    JSON.stringify(batchInput)
  )}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const result = {
      base: data[0]?.result?.data?.json?.base,
      total: data[0]?.result?.data?.json?.total,
      referralCode: data[1]?.result?.data?.json?.referralCode,
    };

    return result;
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return null;
  }
}

export const useSonicPoints = () => {
  const account = useRabbySelector((state) => state.account.currentAccount);
  const [totalPoints, setTotalPoints] = useState(0);
  const [referralPoints, setReferralPoints] = useState(0);
  const [pointsLoading, setPointsLoading] = useState(true);
  const [referralCode, setReferralCode] = useState('');

  useEffect(() => {
    if (account) {
      setPointsLoading(true);
      getUserStats(getAddress(account.address))
        .then((stats) => {
          setTotalPoints(stats?.total);
          setReferralPoints(stats?.total - stats?.base);
          setReferralCode(stats?.referralCode);
        })
        .finally(() => {
          setPointsLoading(false);
        });
    }
  }, [account]);

  return {
    totalPoints,
    referralPoints,
    pointsLoading,
    referralCode,
  };
};
