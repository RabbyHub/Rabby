import {
  PageBody,
  PageContainer,
  PageHeader,
  PageHeading,
} from '@/ui/component/PageContainer';
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Separator,
  Text,
} from '@radix-ui/themes';
import { LucideTrash2, LucideX } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface ConnectedSite {
  origin: string;
  timestamp: number;
}

// const storage = new Storage({ area: 'local' });

export default function ConnectedSitesPage() {
  const [connectedSites, setConnectedSites] = useState<Record<string, boolean>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  // const [storage] = useState(() => new Storage({ area: "local" }));

  // Load connected sites on component mount
  /*useEffect(() => {
    const loadConnectedSites = async () => {
      try {
        const sites = (await storage.get('connectedSites')) || {};
        setConnectedSites(sites);
      } catch (error) {
        console.error('Error loading connected sites:', error);
        toast.error('Failed to load connected sites');
      } finally {
        setLoading(false);
      }
    };

    loadConnectedSites();
  }, [storage]);*/

  // Handle disconnecting a site
  /*const handleDisconnect = async (origin: string) => {
    try {
      const sites = { ...connectedSites };
      delete sites[origin];

      await storage.set('connectedSites', sites);
      setConnectedSites(sites);

      // Notify background script about the disconnection
      chrome.runtime.sendMessage({
        type: 'DISCONNECT_SITE',
        payload: { origin },
      });

      toast.success(`Disconnected ${formatOrigin(origin)}`);
    } catch (error) {
      console.error('Error disconnecting site:', error);
      toast.error('Failed to disconnect site');
    }
  };*/

  // Handle disconnecting all sites
  /*const handleDisconnectAll = async () => {
    try {
      await storage.set('connectedSites', {});
      setConnectedSites({});

      // Notify background script about the disconnection
      chrome.runtime.sendMessage({
        type: 'DISCONNECT_ALL_SITES',
      });

      toast.success('Disconnected all sites');
    } catch (error) {
      console.error('Error disconnecting all sites:', error);
      toast.error('Failed to disconnect all sites');
    }
  };*/

  // Format origin for display
  const formatOrigin = (origin: string) => {
    return origin.replace(/^https?:\/\//, '').replace(/\/$/, '');
  };

  return (
    <PageContainer>
      <PageHeader>
        <PageHeading>Connected Sites</PageHeading>
      </PageHeader>

      <PageBody>
        <Flex direction="column" gap="3">
          <Text size="2" color="gray">
            These websites have permission to connect to your wallet. You can
            revoke access at any time.
          </Text>

          {loading ? (
            <Text size="2" align="center" my="4">
              Loading...
            </Text>
          ) : Object.keys(connectedSites).length > 0 ? (
            <>
              {Object.keys(connectedSites).map((origin) => (
                <Card key={origin}>
                  <Flex justify="between" align="center">
                    <Text>{formatOrigin(origin)}</Text>
                    <Button
                      color="red"
                      variant="soft"
                      size="1"
                      // onClick={() => handleDisconnect(origin)}
                    >
                      <LucideX size={16} />
                      Disconnect
                    </Button>
                  </Flex>
                </Card>
              ))}

              <Separator my="2" />

              <Button
                color="red"
                variant="soft"
                // onClick={handleDisconnectAll}
                style={{ alignSelf: 'center' }}
              >
                <LucideTrash2 size={16} />
                Disconnect All Sites
              </Button>
            </>
          ) : (
            <Text size="2" align="center" color="gray" my="4">
              No connected sites
            </Text>
          )}
        </Flex>
      </PageBody>
    </PageContainer>
  );
}
