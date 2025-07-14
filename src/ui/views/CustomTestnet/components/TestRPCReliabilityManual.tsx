import { ethers } from 'ethers';

export interface RPCTestResult {
  url: string;
  reliability: number; // percentage of successful requests
  latency: number; // average latency in ms
  isWorking: boolean; // if at least one request was successful
  error?: string;
}

export async function testRPCReliabilityManual(
  rpcUrl: string,
  testCount = 5
): Promise<RPCTestResult> {
  let successfulRequests = 0;
  let totalLatency = 0;
  let lastError: any = null;

  // Using ethers v5 provider initialization
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

  // Make multiple requests to test reliability
  for (let i = 0; i < testCount; i++) {
    const startTime = Date.now();
    try {
      // Set a timeout for each request
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 3000);
      });

      // Test by getting the latest block number
      await Promise.race([provider.getBlockNumber(), timeoutPromise]);

      // If successful, increment counter and add to latency
      successfulRequests++;
      totalLatency += Date.now() - startTime;
    } catch (error) {
      lastError = error;
    }

    // Small delay between requests to avoid rate limiting
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
  };
}

// Helper function to get color based on reliability percentage
export function getReliabilityColor(reliability: number): string {
  if (reliability >= 90) return 'var(--green-9)';
  if (reliability >= 70) return 'var(--yellow-9)';
  if (reliability >= 50) return 'var(--orange-9)';
  return 'var(--red-9)';
}
