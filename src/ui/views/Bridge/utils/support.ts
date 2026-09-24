import { SCREENSHOT_FEEDBACK_ENTRY_CLICKED } from '@/constant/screenshot';

/** 复用右键截图反馈流程，保留当前跨链页面或弹窗作为截图内容。 */
export const openBridgeSupport = () => {
  window.dispatchEvent(new Event(SCREENSHOT_FEEDBACK_ENTRY_CLICKED));
};
