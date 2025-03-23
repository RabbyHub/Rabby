import { useRabbySelector } from '@/ui/store';
import { useEffect, useMemo, useState } from 'react';
import { getAddress } from 'viem';

async function fetchReferralData(address: string) {
  const url = `https://airdrop.soniclabs.com/api/user/${address}`;

  try {
    const response = await fetch(url);
    const { referralCode, referralPoint } = await response.json();

    return {
      referralCode,
      referralPoints: referralPoint,
    };
  } catch (error) {
    console.error('Error fetching referral code:', error);
    return null;
  }
}

async function fetchPoints(address: string) {
  const url = `https://arcade.gateway.soniclabs.com/game/points?wallet=${address}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return null;
    }

    const { player, totalPoints, rank, username } = data.data[0];

    return {
      player,
      totalPoints,
      rank,
      username,
    };
  } catch (error) {
    console.error('Error fetching points:', error);
    return null;
  }
}

export const useSonicData = () => {
  const account = useRabbySelector((state) => state.account.currentAccount);
  const [pointsData, setPointsData] = useState<
    Awaited<ReturnType<typeof fetchPoints>>
  >();
  const [referralData, setReferralData] = useState<
    Awaited<ReturnType<typeof fetchReferralData>>
  >();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchCount, setRefetchCount] = useState(0);

  const totalPoints = useMemo(() => {
    return (pointsData?.totalPoints ?? 0) + (referralData?.referralPoints ?? 0);
  }, [pointsData, referralData]);

  const referralCode = useMemo(() => {
    return referralData?.referralCode;
  }, [referralData]);

  const address = useMemo(() => {
    if (!account?.address) {
      return null;
    }
    return getAddress(account.address);
  }, [account]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      if (!address) {
        setPointsData(undefined);
        setReferralData(undefined);
        setLoading(false);
        setError(null);
        return;
      }

      try {
        const [pointsData, referralData] = await Promise.all([
          fetchPoints(address),
          fetchReferralData(address),
        ]);

        setPointsData(pointsData);
        setReferralData(referralData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [address, refetchCount]);

  const refetch = () => {
    setRefetchCount((prev) => prev + 1);
  };

  return {
    points: pointsData,
    referralCode,
    totalPoints,
    loading,
    error,
    refetch,
    address,
  };
};
