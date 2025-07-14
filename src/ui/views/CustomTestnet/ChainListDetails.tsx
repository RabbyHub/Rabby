// popup/routes/networks/[chainId].tsx
import {
  Avatar,
  Badge,
  Box,
  Button,
  Callout,
  Card,
  Flex,
  Grid,
  Heading,
  Link,
  Spinner,
  Strong,
  Text,
  Tooltip,
} from '@radix-ui/themes';
import { ethers } from 'ethers';
import { LucideExternalLink, LucideInfo } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { useParams } from 'react-router';
import { toast } from 'sonner';
// import { useChainList } from 'ui/views/CustomTestnet/hooks/useChainList';
import {
  PageBody,
  PageContainer,
  PageHeader,
  PageHeading,
} from '@/ui/component/PageContainer';
import { DotSpacer } from '@/ui/component/DotSpacer';
import { capitalize, sortBy } from 'lodash';
import { useChainList } from './hooks/useChainList';
import { findChain, updateChainStore } from '@/utils/chain';
import { useWallet } from 'ui/utils';
import {
  TestnetChainBase,
  createTestnetChain,
} from 'background/service/customTestnet';
import { useMemoizedFn, useRequest } from 'ahooks';
import TestRPCReliability, {
  RPCTestResult,
} from './components/TestRPCReliability';
import TestRPCReliabilityMinimal from './components/TestRPCReliabilityMinimal';

export default function ChainListExplorerDetails() {
  // const { chainId } = useParams();
  const { chainId } = useParams<{ chainId: string }>();
  const wallet = useWallet();
  console.log('Chainlist - ChainId', chainId);
  const {
    data,
    isLoading: chainListIsLoading,
    error: chainListError,
  } = useChainList();
  const [isAdding, setIsAdding] = useState(false);
  // const { addNetwork } = useAddNetwork();
  const [isNetworkAdded, setIsNetworkAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /*// RPC States
  const [rpcStatus, setRpcStatus] = useState<Record<string, RPCTestResult>>({});
  const [testingRpcUrls, setTestingRpcUrls] = useState<string[]>([]);

  const handleTestRPC = async (rpcUrl: string) => {
    if (testingRpcUrls.includes(rpcUrl)) return;

    setTestingRpcUrls((prev) => [...prev, rpcUrl]);
    try {
      const result = await TestRPCReliability(rpcUrl);
      setRpcStatus((prev) => ({
        ...prev,
        [rpcUrl]: result,
      }));
    } finally {
      setTestingRpcUrls((prev) => prev.filter((url) => url !== rpcUrl));
    }
  };*/

  const { data: list, runAsync: runGetCustomTestnetList } = useRequest(
    async () => {
      const res = await wallet.getCustomTestnetList();
      return sortBy(res, 'name');
    }
  );

  // const chainData = data?.[chainId];
  const chainData = data?.find(
    (it) => it.chainId.toString() === chainId.toString()
  );
  if (!chainData) return <div>Chain not found</div>;

  // Check if chain exists.
  const chainExists =
    findChain({ id: Number(chainId) }) ||
    list?.find((it) => it.id.toString() === chainId);

  const [sortedRpcs, setSortedRpcs] = useState(chainData.rpc || []);

  // Handler for when sorted RPCs change
  // Use useCallback to prevent the callback from changing on every render
  const handleSortedRpcsChange = useCallback((newSortedRpcs) => {
    setSortedRpcs((prevRpcs) => {
      // Only update if the order actually changed
      if (prevRpcs.length !== newSortedRpcs.length) {
        return newSortedRpcs;
      }

      // Check if the order has changed by comparing URLs
      const prevUrls = prevRpcs.map((rpc) => rpc.url);
      const newUrls = newSortedRpcs.map((rpc) => rpc.url);

      if (prevUrls.join(',') !== newUrls.join(',')) {
        return newSortedRpcs;
      }

      return prevRpcs;
    });
  }, []);

  /*const checkNetwork = async () => {
    const networks = await walletLocalStorage.get('networks');
    const encryptedWallet = await walletLocalStorage.get('encryptedWallet');
    const exists = networks?.some((net) => net.chainId === chainData.chainId);
    setIsNetworkAdded(exists);
    console.log(
      'Checking if networks exists',
      networks,
      exists,
      encryptedWallet
    );
  };

  if (chainData.name) checkNetwork();*/

  // Check if network is already added
  /*useEffect(() => {

  }, [])*/

  /*const handleAddNetwork = async () => {
    try {
      setIsAdding(true);
      const response = await addNetwork(chainData);
      if (response.success) {
        toast.success(response.message);
      }
      setIsNetworkAdded(true);
      // You might want to add a success toast here
    } catch (error) {
      // You might want to add an error toast here
      console.error('Failed to add network:', error);
      toast.error('Failed to add network:', { description: error });
    } finally {
      setIsAdding(false);
    }
  };*/

  const handleConfirm = useMemoizedFn(async () => {
    try {
      await runGetCustomTestnetList();
      updateChainStore({
        testnetList: list,
      });
      wallet.clearPageStateCache();
      toast.success('Wallet has been confirmed successfully!');
    } catch (e) {
      console.log('Failed to update chain list', e);
      toast.error('Failed to update chain list');
    }
  });

  async function handleAddNetwork() {
    console.log('Handle Add Network:: SortedRPCs', sortedRpcs);
    setIsSubmitting(true);
    try {
      // const res = await runAddTestnet(values, ctx);
      const formValues = createTestnetChain({
        name: chainData.name,
        id: chainData.chainId,
        nativeTokenSymbol: chainData.nativeCurrency.symbol,
        rpcUrl: sortedRpcs?.[0]?.url || '',
        scanLink: chainData.explorers?.[0]?.url || '',
      });
      const addNetworkResult = await wallet.addCustomTestnet(
        formValues as Required<TestnetChainBase>
      );
      console.log(
        'Custom testnet added successfully:',
        formValues,
        addNetworkResult
      );

      if (addNetworkResult.error) {
        setError(addNetworkResult.error.message);
        toast.error(addNetworkResult.error.key, {
          description: addNetworkResult.error,
        });
        return;
      }

      await handleConfirm();
      console.log('Network added successfully:', addNetworkResult);
      toast.success('Network added successfully!');
    } catch (err: any) {
      // Handle error
      if (err?.message) {
        setError(err.message);
      } else {
        setError('An error occurred while adding the network');
      }
      console.error('Error adding network:', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (chainListIsLoading) {
    return (
      <PageContainer>
        <PageHeader showBackButton>
          <PageHeading>Loading Chain Details</PageHeading>
        </PageHeader>
        <Flex
          height={'100%'}
          width={'100%'}
          direction={'column'}
          align={'center'}
          justify={'center'}
        >
          <Flex direction={'column'} align={'center'}>
            <Spinner size={'3'} />
            <Text>Loading chain details...</Text>
          </Flex>
        </Flex>
      </PageContainer>
    );
  }

  if (chainListError) return <div>Error loading chain details</div>;

  const networkButton = (
    <Card>
      <Flex align="center" justify="between" gap="2">
        <Box>
          <Heading size="2" mb="1">
            Add Network
          </Heading>
          <Text size="2" color="gray">
            Add this network to your wallet
          </Text>
        </Box>
        <Button
          className={'cursor-pointer'}
          color={'grass'}
          disabled={isSubmitting}
          loading={isSubmitting}
          size="2"
          variant="solid"
          onClick={handleAddNetwork}
        >
          {/*<Spinner loading={isSubmitting} />*/}
          {isSubmitting ? 'Adding...' : 'Add to Wallet'}
        </Button>
      </Flex>
    </Card>
  );

  return (
    <PageContainer>
      {/* Add the minimal component that doesn't render anything but sorts RPCs */}
      {/* Only render the minimal component if we have RPCs to test */}
      {chainData?.rpc?.length > 0 && (
        <TestRPCReliabilityMinimal
          rpcs={chainData.rpc}
          chainId={chainData.chainId} // Pass the chainId for validation
          onSortedRpcsChange={handleSortedRpcsChange}
        />
      )}

      <PageHeader>
        <PageHeading>{chainData.name}</PageHeading>
      </PageHeader>

      <PageBody>
        <Flex direction="column" gap="4" py={'2'}>
          {/*<Text>{isNetworkAdded ? 'Network added' : 'Network not added'}</Text>*/}
          {chainExists && (
            <Callout.Root color={'grass'}>
              <Callout.Icon>
                <LucideInfo size={16} />
              </Callout.Icon>
              <Callout.Text>
                {chainExists ? 'Network already added' : 'Network not added'}
              </Callout.Text>
            </Callout.Root>
          )}

          <Card>
            <Flex direction={'column'} gap={'3'}>
              <Flex gap="4" align="center">
                <Avatar
                  size="6"
                  src={`https://icons.llamao.fi/icons/chains/rsz_${
                    chainData.chainSlug || chainData.icon
                  }.jpg`}
                  radius="full"
                  fallback={chainData.name[0]}
                />
                <Flex direction="column" gap="1">
                  <Heading size="4">{chainData.name}</Heading>
                  <Text color="gray" size={'3'} weight={'medium'}>
                    {capitalize(chainData.chainSlug || chainData.shortName)}
                  </Text>
                </Flex>
              </Flex>
              <Box>
                <Flex align="center" gap="2">
                  <Text color="gray" size={'2'} weight={'bold'}>
                    {chainData.nativeCurrency.symbol}
                  </Text>
                  <DotSpacer />
                  <Text color="gray" size={'2'} weight={'bold'}>
                    Network ID: {chainData.networkId} (
                    {/*{ethers.toBeHex(chainData.chainId)})*/}
                    {ethers.utils.hexlify(chainData.chainId)})
                  </Text>
                </Flex>
              </Box>

              {chainData.features?.length > 0 && (
                <Card>
                  <Heading size="2" mb="4" color={'gray'}>
                    Network Features
                  </Heading>
                  <Flex gap="2" wrap="wrap">
                    {chainData.features?.map((feature) => (
                      /*<Text key={feature.name} className="plasmo-bg-[var(--accent-3)] plasmo-px-2 plasmo-py-1 plasmo-rounded">
                        {feature.name}
                      </Text>*/
                      <Badge key={feature.name} size="3" color="gray">
                        {feature.name}
                      </Badge>
                    ))}
                  </Flex>
                </Card>
              )}
            </Flex>
          </Card>

          <Card>
            <Link
              href={chainData.infoURL}
              target={'_blank'}
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              Learn more about {chainData.chainSlug} here...
              <LucideExternalLink size={14} />
            </Link>
          </Card>

          {/*{!isNetworkAdded && networkButton}*/}
          {!chainExists && networkButton}

          <Grid columns="1" gap="4">
            <Card>
              <Heading size="2" mb="4" color={'gray'}>
                Native Currency
              </Heading>
              <Flex direction={'column'} gapY={'2'}>
                <Text as="div">
                  Name: <Strong>{chainData.nativeCurrency.name}</Strong>
                </Text>
                <Text as="div">
                  Symbol: <Strong>{chainData.nativeCurrency.symbol}</Strong>
                </Text>
                <Text as="div">
                  Decimals: <Strong>{chainData.nativeCurrency.decimals}</Strong>
                </Text>
              </Flex>
            </Card>
          </Grid>

          <Grid columns={'1'} gap={'2'}>
            {chainData.faucets?.length > 0 && (
              <Card variant={'surface'}>
                <Heading size="3" mb="2">
                  Faucets
                </Heading>
                <Flex direction="column" gap="1">
                  {chainData.faucets.map((faucet, index) => (
                    <Link
                      key={index}
                      href={faucet}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1"
                    >
                      {faucet}
                      <LucideExternalLink size={14} />
                    </Link>
                  ))}
                </Flex>
              </Card>
            )}

            <Card>
              <Heading size="3" mb="2">
                Block Explorers
              </Heading>
              <Flex direction="column" gap="1">
                {chainData.explorers?.map((explorer) => (
                  <Link
                    key={explorer.url}
                    href={explorer.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    {explorer.name}
                    <LucideExternalLink size={14} />
                  </Link>
                ))}
              </Flex>
            </Card>

            {/*<TestRPCReliability chainData={chainData} />*/}
            <TestRPCReliability chainData={{ ...chainData, rpc: sortedRpcs }} />
          </Grid>
        </Flex>
      </PageBody>
    </PageContainer>
  );
}
