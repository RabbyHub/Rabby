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

  /** Called when the user submits their report with context text */
  onSubmit: (context: string) => void;

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

  actions.appendChild(cancelBtn);
  actions.appendChild(submitBtn);

  // --- Assemble modal ---
  modal.appendChild(title);
  modal.appendChild(subtitle);
  modal.appendChild(textarea);
  modal.appendChild(actions);
  overlay.appendChild(modal);

  // --- Event handlers ---

  // Cancel: close modal
  const closeModal = () => {
    overlay.remove();
    options.onCancel();
  };

  cancelBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeModal();
  });

  // Clicking overlay background closes modal
  overlay.addEventListener('click', closeModal);

  // Submit: validate context is not empty, then callback
  submitBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const context = textarea.value.trim();
    if (!context) {
      textarea.style.borderColor = '#E34935';
      textarea.setAttribute('placeholder', 'Please provide a reason before submitting.');
      textarea.focus();
      return;
    }
    overlay.remove();
    options.onSubmit(context);
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
