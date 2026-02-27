/**
 * ============================================================================
 * Sentinel Trust Layer — Context Modal Component
 * ============================================================================
 *
 * A small modal that appears when the user clicks the Red (Scam) or Green
 * (Legit) button on a tweet. It provides a text field for the user to
 * explain their reasoning (e.g., "This is a drainer link", "Official link
 * verified by team").
 *
 * The modal is rendered into the Sentinel Shadow DOM root to avoid
 * interfering with X's own modal/popup system.
 * ============================================================================
 */

import { SENTINEL_CSS_PREFIX } from '../constants';

export interface ContextModalOptions {
  /** The type of claim being made */
  claimType: 'negative' | 'positive';

  /** The tweet URL being reported */
  tweetUrl: string;

  /** Called when the user submits their report with context text.
   *  Returns a result object so the modal can show success/error feedback. */
  onSubmit: (context: string) => Promise<{ success: boolean; error?: string }>;

  /** Called when the user cancels */
  onCancel: () => void;
}

/**
 * Create and display the Context Modal.
 *
 * @param options — configuration for the modal
 * @returns The overlay element (for cleanup/removal)
 */
export function showContextModal(options: ContextModalOptions): HTMLElement {
  const p = SENTINEL_CSS_PREFIX;
  const isScam = options.claimType === 'negative';

  // --- Overlay (click-to-dismiss backdrop) ---
  const overlay = document.createElement('div');
  overlay.className = `${p}-modal-overlay`;

  // --- Modal container ---
  const modal = document.createElement('div');
  modal.className = `${p}-modal`;

  // Prevent clicks inside modal from closing it
  modal.addEventListener('click', (e) => e.stopPropagation());

  // --- Title ---
  const title = document.createElement('div');
  title.className = `${p}-modal__title`;
  title.innerHTML = isScam
    ? `<span>\u{1F6A8}</span> Report as Scam / Hack`
    : `<span>\u{2705}</span> Confirm as Legitimate`;

  // --- Subtitle with truncated tweet URL ---
  const subtitle = document.createElement('div');
  subtitle.className = `${p}-modal__subtitle`;
  const displayUrl =
    options.tweetUrl.length > 60
      ? options.tweetUrl.slice(0, 57) + '...'
      : options.tweetUrl;
  subtitle.textContent = displayUrl;

  // --- Textarea for context ---
  const textarea = document.createElement('textarea');
  textarea.className = `${p}-modal__textarea`;
  textarea.placeholder = isScam
    ? 'Why do you believe this is a scam? (e.g., "This is a drainer", "Compromised account")'
    : 'Why do you believe this is safe? (e.g., "Official link verified", "Known team account")';
  textarea.maxLength = 500;

  // --- Feedback message area (hidden initially) ---
  const feedback = document.createElement('div');
  feedback.className = `${p}-modal__feedback`;
  feedback.style.display = 'none';

  // --- Action buttons row ---
  const actions = document.createElement('div');
  actions.className = `${p}-modal__actions`;

  const cancelBtn = document.createElement('button');
  cancelBtn.className = `${p}-modal__btn ${p}-modal__btn--cancel`;
  cancelBtn.textContent = 'Cancel';

  const submitBtn = document.createElement('button');
  submitBtn.className = `${p}-modal__btn ${
    isScam ? `${p}-modal__btn--submit-scam` : `${p}-modal__btn--submit-legit`
  }`;
  submitBtn.textContent = isScam ? 'Submit Report' : 'Confirm Safe';

  const originalBtnText = submitBtn.textContent;

  actions.appendChild(cancelBtn);
  actions.appendChild(submitBtn);

  // --- Assemble modal ---
  modal.appendChild(title);
  modal.appendChild(subtitle);
  modal.appendChild(textarea);
  modal.appendChild(feedback);
  modal.appendChild(actions);
  overlay.appendChild(modal);

  // --- Track submission state to prevent double-submits ---
  let isSubmitting = false;

  // --- Event handlers ---

  // Cancel: close modal
  const closeModal = () => {
    if (isSubmitting) return; // Don't close while submitting
    overlay.remove();
    options.onCancel();
  };

  cancelBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeModal();
  });

  // Clicking overlay background closes modal
  overlay.addEventListener('click', closeModal);

  // Submit: validate, show loading, await result, show feedback
  submitBtn.addEventListener('click', async (e) => {
    e.stopPropagation();

    if (isSubmitting) return; // Prevent double-click

    const context = textarea.value.trim();
    if (!context) {
      textarea.style.borderColor = '#E34935';
      textarea.setAttribute('placeholder', 'Please provide a reason before submitting.');
      textarea.focus();
      return;
    }

    // --- Enter loading state ---
    isSubmitting = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    submitBtn.style.opacity = '0.7';
    submitBtn.style.cursor = 'not-allowed';
    cancelBtn.disabled = true;
    cancelBtn.style.opacity = '0.5';
    textarea.readOnly = true;
    textarea.style.opacity = '0.7';
    feedback.style.display = 'none';

    // --- Await the submission result ---
    const result = await options.onSubmit(context);

    if (result.success) {
      // --- Success feedback ---
      feedback.textContent = isScam
        ? 'Report submitted successfully.'
        : 'Confirmation submitted successfully.';
      feedback.style.display = 'block';
      feedback.style.color = '#2ABB7F';
      submitBtn.textContent = 'Done';
      submitBtn.style.opacity = '1';
      cancelBtn.style.display = 'none';

      // Auto-close after 1.5s
      setTimeout(() => overlay.remove(), 1500);
    } else {
      // --- Error feedback ---
      feedback.textContent = result.error || 'Something went wrong. Please try again.';
      feedback.style.display = 'block';
      feedback.style.color = '#E34935';

      // Reset submit button so user can retry
      isSubmitting = false;
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
      submitBtn.style.opacity = '1';
      submitBtn.style.cursor = 'pointer';
      cancelBtn.disabled = false;
      cancelBtn.style.opacity = '1';
      textarea.readOnly = false;
      textarea.style.opacity = '1';
    }
  });

  // Escape key closes modal
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);

  // Auto-focus the textarea after render
  requestAnimationFrame(() => textarea.focus());

  return overlay;
}
