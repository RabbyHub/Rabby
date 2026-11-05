import { SCREENSHOT_FEEDBACK_ENTRY_CLICKED } from '@/constant/screenshot';

/** 复用右键截图反馈，截取当前界面。 */
export const openBridgeSupport = () => {
  window.dispatchEvent(new Event(SCREENSHOT_FEEDBACK_ENTRY_CLICKED));
};
