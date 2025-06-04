import {
  Box,
  Container,
  Flex,
  Heading,
  IconButton,
  ScrollArea,
  Section,
  Spinner,
} from '@radix-ui/themes';
import { ReactNode, Suspense } from 'react';
import { useHistory } from 'react-router-dom';

export const PageContainer = ({
  fallback,
  children,
}: {
  fallback?: ReactNode;
  children: ReactNode;
}) => {
  return (
    <Suspense fallback={fallback || <Spinner size={'3'} />}>
      <Container>
        <Flex direction={'column'} width={'100%'} height={'100dvh'}>
          {children}
        </Flex>
      </Container>
    </Suspense>
  );
};

export const PageHeading = ({
  center = false,
  children,
}: {
  center?: boolean;
  children: ReactNode;
}) => {
  return (
    <Heading
      align={center ? 'center' : 'left'}
      size={'5'}
      style={{ width: center ? '100%' : 'auto' }}
    >
      {children}
    </Heading>
  );
};

export const PageHeader = ({
  showBackButton = true,
  children,
}: {
  showBackButton?: boolean;
  children: ReactNode;
}) => {
  const history = useHistory();

  return (
    <Flex
      direction={'column'}
      justify={'center'}
      px={'3'}
      className={'min-h-16 leading-[48px]'}
    >
      {showBackButton ? (
        <Flex align={'center'} gapX={'4'}>
          <IconButton
            variant={'ghost'}
            radius={'large'}
            style={{ width: '40px' }}
            onClick={() => history.go(-1)}
          >
            {/*<LucideArrowLeft size={24} strokeWidth={4} />*/}
          </IconButton>
          {children}
        </Flex>
      ) : (
        <>{children}</>
      )}
    </Flex>
  );
};

export const PageBody = ({ children }: { children: ReactNode }) => {
  return (
    <ScrollArea
      type="hover"
      scrollbars="vertical"
      style={{ width: '100%', height: '100%', maxWidth: '100%' }}
    >
      <Box px={'3'} width={'100%'} maxWidth={'100%'}>
        {children}
      </Box>
    </ScrollArea>
  );
};
