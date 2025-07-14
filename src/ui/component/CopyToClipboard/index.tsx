import { ReactNode, useState } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { toast } from 'sonner';

const CopyTextComponent = ({
  textToCopy,
  feedbackMessage,
  clearClipboard = false,
  children,
}: {
  textToCopy: string;
  feedbackMessage?: string;
  clearClipboard?: boolean;
  children: ReactNode;
}) => {
  const [_, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    toast(feedbackMessage || 'Address copied to clipboard', { duration: 1000 });
    // TODO: Implement clearing clipboard functionality
  };

  return (
    <div>
      <CopyToClipboard text={textToCopy} onCopy={handleCopy}>
        {children}
      </CopyToClipboard>

      {/* {copied && <p style={{ color: "green" }}>Text copied to clipboard!</p>} */}
    </div>
  );
};

export default CopyTextComponent;
