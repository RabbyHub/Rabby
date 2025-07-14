// ui/views/CustomTestnet/components/TestRPCReliabilityMinimal.tsx
import { ethers } from 'ethers';
import React, { useCallback, useEffect, useRef } from 'react';

interface RPCTestResult {
  url: string;
  reliability: number;
  latency: number;
  isWorking: boolean;
  error?: string;
  lastTested: number;
}

interface TestRPCReliabilityMinimalProps {
  rpcs: { url: string }[];
  onSortedRpcsChange?: (sortedRpcs: { url: string }[]) => void;
}

const TestRPCReliabilityMinimal: React.FC<TestRPCReliabilityMinimalProps> = ({
  rpcs,
  onSortedRpcsChange,
}) => {
  // Use refs to prevent excessive re-renders
  const rpcStatusRef = useRef<Record<string, RPCTestResult>>({});
  const testingRpcsRef = useRef<Set<string>>(new Set());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialTestDoneRef = useRef(false);

  // Create a stable reference to the rpcs prop
  const rpcsRef = useRef(rpcs);
  useEffect(() => {
    rpcsRef.current = rpcs;
  }, [rpcs]);

  const testRPCReliability = async (
    rpcUrl: string,
    testCount = 3
  ): Promise<RPCTestResult> => {
    if (testingRpcsRef.current.has(rpcUrl)) {
      // Already testing this RPC, return the current status or a placeholder
      return (
        rpcStatusRef.current[rpcUrl] || {
          url: rpcUrl,
          reliability: 0,
          latency: 0,
          isWorking: false,
          lastTested: Date.now(),
        }
      );
    }

    testingRpcsRef.current.add(rpcUrl);

    let successfulRequests = 0;
    let totalLatency = 0;
    let lastError: any = null;

    try {
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

      for (let i = 0; i < testCount; i++) {
        const startTime = Date.now();
        try {
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), 3000);
          });

          await Promise.race([provider.getBlockNumber(), timeoutPromise]);

          successfulRequests++;
          totalLatency += Date.now() - startTime;
        } catch (error) {
          lastError = error;
        }

        if (i < testCount - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      const reliability = (successfulRequests / testCount) * 100;
      const avgLatency =
        successfulRequests > 0 ? totalLatency / successfulRequests : 0;

      const result = {
        url: rpcUrl,
        reliability: Math.round(reliability),
        latency: Math.round(avgLatency),
        isWorking: successfulRequests > 0,
        error: lastError instanceof Error ? lastError.message : undefined,
        lastTested: Date.now(),
      };

      rpcStatusRef.current[rpcUrl] = result;
      return result;
    } finally {
      testingRpcsRef.current.delete(rpcUrl);
    }
  };

  const sortRpcs = useCallback(() => {
    if (!rpcsRef.current || rpcsRef.current.length === 0) return;

    // Clone the original RPCs
    const newSortedRpcs = [...rpcsRef.current];

    // Sort by reliability if we have test results
    if (Object.keys(rpcStatusRef.current).length > 0) {
      newSortedRpcs.sort((a, b) => {
        const statusA = rpcStatusRef.current[a.url];
        const statusB = rpcStatusRef.current[b.url];

        // If both have been tested, sort by reliability
        if (statusA && statusB) {
          if (statusA.reliability !== statusB.reliability) {
            return statusB.reliability - statusA.reliability;
          }
          // If reliability is the same, sort by latency
          return statusA.latency - statusB.latency;
        }

        // If only one has been tested, prioritize the tested one
        if (statusA) return -1;
        if (statusB) return 1;

        // If neither has been tested, maintain original order
        return 0;
      });
    }

    // Notify parent component about the sorted RPCs, but only if the order changed
    if (onSortedRpcsChange && newSortedRpcs.length > 0) {
      onSortedRpcsChange(newSortedRpcs);
    }
  }, [onSortedRpcsChange]);

  const testAllRPCs = useCallback(async () => {
    if (!rpcsRef.current || rpcsRef.current.length === 0) return;

    const currentTime = Date.now();
    const rpcsToTest = rpcsRef.current.filter((rpc) => {
      const status = rpcStatusRef.current[rpc.url];
      return !status || currentTime - status.lastTested > 30000;
    });

    if (rpcsToTest.length === 0) {
      // No RPCs need testing, just sort with current data
      sortRpcs();
      return;
    }

    // Use Promise.all to run tests in parallel
    const promises = rpcsToTest.map((rpc) => testRPCReliability(rpc.url));

    // Wait for all tests to complete, then sort
    await Promise.allSettled(promises);
    sortRpcs();
  }, [sortRpcs]);

  // Use a clean-up approach to ensure we don't leak
  useEffect(() => {
    // Initial test
    if (!initialTestDoneRef.current) {
      initialTestDoneRef.current = true;
      testAllRPCs();
    }

    // Set up interval but with cleanup
    const intervalId = setInterval(() => {
      testAllRPCs();
    }, 2000);

    // Clean up on component unmount
    return () => {
      clearInterval(intervalId);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [testAllRPCs]);

  // This component doesn't render anything visible
  return null;
};

export default TestRPCReliabilityMinimal;
