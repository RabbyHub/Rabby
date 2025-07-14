import React, { useState } from 'react';
import { useAddAddressFromSeedPhrase } from '@/ui/hooks/useAddAddressFromSeedPhrase';
import { Button } from '@radix-ui/themes';
import { toast } from 'sonner';

interface AddAddressFromSeedPhraseButtonProps {
  publicKey: string;
  onSuccess?: (result: {
    address: string;
    index: number;
    aliasName: string;
  }) => void;
  onError?: (error: Error) => void;
  buttonText?: string;
  className?: string;
}

/**
 * A button component that adds a new address from a seed phrase when clicked
 */
export const AddAddressFromSeedPhraseButton: React.FC<AddAddressFromSeedPhraseButtonProps> = ({
  publicKey,
  onSuccess,
  onError,
  buttonText = 'Add Address',
  className,
}) => {
  const [loading, setLoading] = useState(false);
  const addAddress = useAddAddressFromSeedPhrase();

  const handleClick = async () => {
    if (!publicKey) {
      toast.error('Public key is required');
      return;
    }

    setLoading(true);
    try {
      const result = await addAddress(publicKey);
      toast.success(
        `Address ${result.address.slice(0, 6)}...${result.address.slice(
          -4
        )} added successfully`
      );
      onSuccess?.(result);
    } catch (error) {
      console.error('Error adding address:', error);
      toast.error(error.message || 'Failed to add address');
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      highContrast
      size="3"
      onClick={handleClick}
      disabled={loading || !publicKey}
      className={className}
    >
      {loading ? 'Adding...' : buttonText}
    </Button>
  );
};

/**
 * Example usage:
 *
 * ```jsx
 * import { AddAddressFromSeedPhraseButton } from '@/ui/components/AddAddressFromSeedPhraseButton';
 *
 * const MyComponent = () => {
 *   const handleSuccess = (result) => {
 *     console.log('Added address:', result.address);
 *   };
 *
 *   return (
 *     <AddAddressFromSeedPhraseButton
 *       publicKey="your-seed-phrase-public-key"
 *       onSuccess={handleSuccess}
 *       buttonText="Add New Address"
 *     />
 *   );
 * };
 * ```
 */
