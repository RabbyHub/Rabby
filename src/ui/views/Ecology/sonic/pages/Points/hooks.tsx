import { useRabbySelector } from '@/ui/store';
import { useEffect, useState } from 'react';
import { getAddress } from 'viem';

async function fetchReferralCode(address: string) {
  const baseUrl = 'https://airdrop.soniclabs.com/api/trpc';
  const endpoint = 'user.findOrCreate';

  const input = {
    '0': { json: { address } },
  };

  const url = `${baseUrl}/${endpoint}?batch=1&input=${encodeURIComponent(
    JSON.stringify(input)
  )}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const result = data[0]?.result?.data?.json;

    if (!result) {
      return null;
    }

    const { referralCode } = result;

    return referralCode;
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

export const useSonicPoints = () => {
  const account = useRabbySelector((state) => state.account.currentAccount);
  const [points, setPoints] = useState<
    Awaited<ReturnType<typeof fetchPoints>>
  >();
  const [pointsLoading, setPointsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchCount, setRefetchCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setPointsLoading(true);

      if (!account?.address) {
        setPoints(undefined);
        setPointsLoading(false);
        setError(null);
        return;
      }

      try {
        const address = getAddress(account.address);
        const points = await fetchPoints(address);
        setPoints(points);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setPointsLoading(false);
      }
    };

    fetchData();
  }, [account?.address, refetchCount]);

  const refetch = () => {
    setRefetchCount((prev) => prev + 1);
  };

  return {
    points,
    pointsLoading,
    error,
    refetch,
    address: account?.address,
  };
};

export const useSonicReferralCode = () => {
  const account = useRabbySelector((state) => state.account.currentAccount);
  const [referralCode, setReferralCode] = useState<
    Awaited<ReturnType<typeof fetchReferralCode>>
  >();
  const [referralLoading, setReferralLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchCount, setRefetchCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setReferralLoading(true);

      if (!account?.address) {
        setReferralCode(undefined);
        setReferralLoading(false);
        setError(null);
        return;
      }

      try {
        const address = getAddress(account.address);
        const code = await fetchReferralCode(address);
        setReferralCode(code);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setReferralLoading(false);
      }
    };

    fetchData();
  }, [account?.address, refetchCount]);

  const refetch = () => {
    setRefetchCount((prev) => prev + 1);
  };

  return {
    referralCode,
    referralLoading,
    error,
    refetch,
    address: account?.address,
  };
};
