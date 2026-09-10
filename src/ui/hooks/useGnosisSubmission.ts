import { useRef } from 'react';
import type { WalletControllerType } from '@/ui/utils/WalletContext';
import type {
  ApprovalSigningContext,
  SigningAttemptFinishedEvent,
  SigningAttemptRef,
} from '@/utils/signingTypes';
import { sameSigningAttempt } from '@/utils/signingTypes';

type SubmissionWallet = Pick<
  WalletControllerType,
  | 'isApprovalCurrent'
  | 'getGnosisTransactionSignatures'
  | 'getGnosisMessageSignatures'
  | 'gnosisAddConfirmation'
  | 'gnosisAddSignature'
  | 'postGnosisTransaction'
  | 'addGnosisMessage'
  | 'addGnosisMessageSignature'
>;

export const useGnosisSubmission = ({
  wallet,
  attemptRef,
  isGnosis,
  isMessage,
  signerAddress,
  onFinished,
}: {
  wallet: SubmissionWallet;
  attemptRef: { current?: SigningAttemptRef };
  isGnosis?: boolean;
  isMessage: boolean;
  signerAddress: string;
  onFinished: (event: SigningAttemptFinishedEvent) => void | Promise<void>;
}) => {
  const finishedRef = useRef(onFinished);
  finishedRef.current = onFinished;
  const resultRef = useRef<SigningAttemptFinishedEvent>();
  const runningRef = useRef(false);
  const submissionRef = useRef<{
    attempt: SigningAttemptRef;
    run: () => Promise<unknown>;
  }>();

  const handleFinished = async (event: SigningAttemptFinishedEvent) => {
    if (!sameSigningAttempt(attemptRef.current, event.attempt)) return;
    if (runningRef.current) return;
    if (isGnosis && event.success) resultRef.current = event;
    runningRef.current = true;
    try {
      await finishedRef.current(event);
    } finally {
      runningRef.current = false;
    }
  };

  return {
    onFinished: handleFinished,
    retry: async () => {
      if (runningRef.current) return true;
      const event = resultRef.current;
      if (!event || !sameSigningAttempt(attemptRef.current, event.attempt)) {
        return false;
      }
      await handleFinished(event);
      return true;
    },
    submit: async (signature: string, context: ApprovalSigningContext) => {
      const attempt = context.signing?.attempt;
      const assertCurrent = async () => {
        if (
          !(await wallet.isApprovalCurrent(context.approval.approvalId)) ||
          !sameSigningAttempt(attemptRef.current, attempt)
        ) {
          throw new Error('Signing approval is no longer current');
        }
      };
      await assertCurrent();
      if (!sameSigningAttempt(submissionRef.current?.attempt, attempt)) {
        const signatures = isMessage
          ? await wallet.getGnosisMessageSignatures()
          : await wallet.getGnosisTransactionSignatures();
        await assertCurrent();
        // Select before adding a local signature: a failed first submission
        // must retry that submission, not switch to adding a confirmation.
        const hasSignatures = signatures.length > 0;
        const message = { signature, signerAddress, context };
        let signatureAdded = false;
        submissionRef.current = {
          attempt: attempt!,
          run: isMessage
            ? () =>
                hasSignatures
                  ? wallet.addGnosisMessageSignature(message)
                  : wallet.addGnosisMessage(message)
            : hasSignatures
            ? () =>
                wallet.gnosisAddConfirmation(signerAddress, signature, context)
            : async () => {
                if (!signatureAdded) {
                  await wallet.gnosisAddSignature(
                    signerAddress,
                    signature,
                    context
                  );
                  signatureAdded = true;
                }
                await assertCurrent();
                return wallet.postGnosisTransaction(context);
              },
        };
      }
      await assertCurrent();
      await submissionRef.current!.run();
      await assertCurrent();
      resultRef.current = undefined;
    },
  };
};
