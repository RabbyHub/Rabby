import {
  Box,
  Card,
  CardProps,
  Container,
  Flex,
  Heading,
  IconButton,
  ScrollArea,
  Section,
  Spinner,
  Text,
} from '@radix-ui/themes';
import { ReactNode, Suspense } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { LucideArrowLeft } from 'lucide-react';
import clsx from 'clsx';

export const CardContainer = ({
  fallback,
  className,
  variant,
  children,
}: {
  fallback?: ReactNode;
  className?: string;
  variant?: CardProps['variant'];
  children: ReactNode;
}) => {
  return (
    <Suspense fallback={fallback || <Spinner size={'3'} />}>
      <Box>
        <Flex
          position={'relative'}
          direction={'column'}
          gap={'3'}
          height={'100dvh'}
          width={'100%'}
          align={'center'}
          justify={'center'}
        >
          <Card
            variant={variant}
            className={clsx('w-[360px]', className)}
            size={'3'}
          >
            <Flex
              direction={'column'}
              align={'center'}
              justify={'center'}
              gap={'5'}
              height={'100%'}
            >
              {children}
            </Flex>
          </Card>
        </Flex>
      </Box>
    </Suspense>
  );
};

export const CardHeading = ({
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

export const CardDescription = ({
  center = false,
  children,
}: {
  center?: boolean;
  children: ReactNode;
}) => {
  return (
    <Text
      align={center ? 'center' : 'left'}
      size={'3'}
      style={{ width: center ? '100%' : 'auto' }}
    >
      {children}
    </Text>
  );
};

export const CardHeader = ({
  showBackButton = true,
  children,
  onPress,
}: {
  showBackButton?: boolean;
  children?: ReactNode;
  onPress?: () => void;
}) => {
  const history = useHistory();

  const handleBack = () => {
    if (onPress) {
      onPress();
    } else {
      if (history.length) {
        history.goBack();
      } else {
        history.replace('/'); // Fallback to home if no history
      }
    }
  };

  return (
    <Flex
      direction={'column'}
      align={'start'}
      justify={'center'}
      px={'2'}
      width={'100%'}
      // className={'min-h-16 leading-[48px]'}
    >
      {showBackButton ? (
        <Flex align={'center'} gapX={'4'}>
          <IconButton
            className={'cursor-pointer'}
            variant={'ghost'}
            radius={'large'}
            style={{ width: '20px' }}
            onClick={handleBack}
          >
            <LucideArrowLeft size={24} strokeWidth={4} />
          </IconButton>
          {children}
        </Flex>
      ) : (
        <>{children}</>
      )}
    </Flex>
  );
};

export const CardBody = ({ children }: { children: ReactNode }) => {
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

export const SettingsCardTemplate = ({
  icon,
  title,
  description,
  children,
  size,
  variant,
  path,
  onClick,
}: {
  icon?: ReactNode | string;
  title?: ReactNode | string;
  description?: ReactNode | string;
  children?: ReactNode;
  size?: CardProps['size'];
  variant?: CardProps['variant'];
  path?: string;
  onClick?: () => void;
}) => {
  const Container = ({ children }: { children: ReactNode }) => {
    if (path) {
      return (
        <Link to={path} className="w-full">
          {children}
        </Link>
      );
    }

    return <Box onClick={onClick}>{children}</Box>;
  };

  return (
    <Card
      asChild={!!path}
      className={clsx(onClick ? 'cursor-pointer' : '')}
      variant={variant}
      size={size}
    >
      <Container>
        <Flex align={'center'} gap={'3'}>
          {icon && <Flex align={'stretch'}>{icon}</Flex>}
          <Box width={'100%'}>
            <Text as="div" size="2" weight="bold">
              {title}
            </Text>
            <Text as="div" color="gray" size="2" wrap={'balance'}>
              {description}
            </Text>
          </Box>
          <Box>{children}</Box>
        </Flex>
      </Container>
    </Card>
  );
};
