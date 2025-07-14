import { ethers } from 'ethers';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Card,
  Flex,
  Heading,
  Spinner,
  Text,
  Tooltip,
} from '@radix-ui/themes';

export interface RPCTestResult {
  url: string;
  reliability: number;
  latency: number;
  isWorking: boolean;
  error?: string;
  lastTested: number;
}

// TestRPCReliability component to be used in the ChainListExplorerDetails
const TestRPCReliability = ({ chainData }) => {
  const [rpcStatus, setRpcStatus] = useState<Record<string, RPCTestResult>>({});
  const [testingRpcUrls, setTestingRpcUrls] = useState<string[]>([]);
  const [sortedRpcs, setSortedRpcs] = useState(chainData.rpc || []);

  const testRPCReliability = async (
    rpcUrl: string,
    testCount = 5
  ): Promise<RPCTestResult> => {
    let successfulRequests = 0;
    let totalLatency = 0;
    let lastError: any = null;

    // Using ethers v5 provider initialization
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

    return {
      url: rpcUrl,
      reliability: Math.round(reliability),
      latency: Math.round(avgLatency),
      isWorking: successfulRequests > 0,
      error: lastError instanceof Error ? lastError.message : undefined,
      lastTested: Date.now(),
    };
  };

  const handleTestRPC = useCallback(
    async (rpcUrl: string) => {
      if (testingRpcUrls.includes(rpcUrl)) return;

      setTestingRpcUrls((prev) => [...prev, rpcUrl]);
      try {
        const result = await testRPCReliability(rpcUrl);
        setRpcStatus((prev) => ({
          ...prev,
          [rpcUrl]: result,
        }));
      } finally {
        setTestingRpcUrls((prev) => prev.filter((url) => url !== rpcUrl));
      }
    },
    [testingRpcUrls]
  );

  const testAllRPCs = useCallback(async () => {
    // Test only RPCs that haven't been tested in the last 30 seconds
    const currentTime = Date.now();
    const rpcsToTest = chainData.rpc.filter((rpc) => {
      const status = rpcStatus[rpc.url];
      return !status || currentTime - status.lastTested > 30000;
    });

    // Test RPCs in parallel
    const testPromises = rpcsToTest.map((rpc) => {
      setTestingRpcUrls((prev) => [...prev, rpc.url]);
      return testRPCReliability(rpc.url)
        .then((result) => {
          setRpcStatus((prev) => ({
            ...prev,
            [rpc.url]: result,
          }));
          return result;
        })
        .finally(() => {
          setTestingRpcUrls((prev) => prev.filter((url) => url !== rpc.url));
        });
    });

    await Promise.allSettled(testPromises);
  }, [chainData.rpc, rpcStatus]);

  // Sort RPCs by reliability
  useEffect(() => {
    // Clone the original RPCs
    const newSortedRpcs = [...chainData.rpc];

    // Sort by reliability if we have test results
    if (Object.keys(rpcStatus).length > 0) {
      newSortedRpcs.sort((a, b) => {
        const statusA = rpcStatus[a.url];
        const statusB = rpcStatus[b.url];

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

    setSortedRpcs(newSortedRpcs);
  }, [chainData.rpc, rpcStatus]);

  // Set up periodic testing every 2 seconds
  useEffect(() => {
    // Initial test on component mount
    testAllRPCs();

    // Set up interval for periodic testing
    const intervalId = setInterval(() => {
      testAllRPCs();
    }, 2000);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [testAllRPCs]);

  const getReliabilityColor = (reliability: number): string => {
    if (reliability >= 90) return 'var(--green-9)';
    if (reliability >= 70) return 'var(--yellow-9)';
    if (reliability >= 50) return 'var(--orange-9)';
    return 'var(--red-9)';
  };

  return (
    <Card>
      <Heading size="3" mb="2">
        RPC Endpoints
      </Heading>
      <Flex direction="column" gap="2">
        {sortedRpcs.map((rpc, index) => {
          const status = rpcStatus[rpc.url];
          const isTesting = testingRpcUrls.includes(rpc.url);

          return (
            <Flex key={index} align="center" justify="between">
              <Text size="2" className="">
                {rpc.url}
                {status && (
                  <Tooltip content={`Average latency: ${status.latency}ms`}>
                    <Text
                      as="span"
                      size="1"
                      ml="2"
                      style={{
                        color: getReliabilityColor(status.reliability),
                        fontWeight: 'bold',
                      }}
                    >
                      {status.reliability}% reliable
                    </Text>
                  </Tooltip>
                )}
              </Text>

              <Button
                size="1"
                variant="soft"
                onClick={() => handleTestRPC(rpc.url)}
                disabled={isTesting}
              >
                {isTesting ? <Spinner size="1" /> : 'Test'}
              </Button>
            </Flex>
          );
        })}
      </Flex>
    </Card>
  );
};

export default TestRPCReliability;
