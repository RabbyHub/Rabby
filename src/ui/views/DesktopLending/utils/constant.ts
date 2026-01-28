// 个人剩余借款安全边际系数
export const BORROW_SAFE_MARGIN = 0.99;

// 池子剩余存/借款额度安全边际系数
export const SUPPLY_UI_SAFE_MARGIN = 0.995;
export const BORROW_UI_SAFE_MARGIN = 0.99;

// 池子黄色警告阈值
export const RESERVE_USAGE_WARNING_THRESHOLD = 0.98;
// 池子红色警告阈值
export const RESERVE_USAGE_BLOCK_THRESHOLD = 0.9999;

// 借款/质押等操作后的健康因子低于该值时，显示风险确认复选框
export const HF_RISK_CHECKBOX_THRESHOLD = 1.5; // 1.5

// 顶部/通用健康因子颜色阈值：>=3 绿色，<1.1 红色，其余为黄色
export const HF_COLOR_GOOD_THRESHOLD = 3; // 3.0
export const HF_COLOR_BAD_THRESHOLD = 1.1; // 1.1

// 清算线
export const LIQUIDATION_HF_THRESHOLD = 1.0; // 1.0

// emode操作预估时，健康因子低于该值时，阻断用户操作
export const HF_BLOCK_THRESHOLD = 1.01;

export const USD_DECIMALS = 8;

// 模拟原生代币的地址
export const API_ETH_MOCK_ADDRESS =
  '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

export const referralCode = '1608';

// withdraw：最大可提取金额的健康因子阈值
export const MAX_CLICK_WITHDRAW_HF_THRESHOLD = 1.05;

// max时为了偿还利息额外给的阈值
export const REPAY_AMOUNT_MULTIPLIER = 1.0025;

export const APP_CODE_LENDING_DEBT_SWAP = 'rabby-mobile-lending-debt-swap';

export const APP_CODE_LENDING_REPAY_WITH_COLLATERAL =
  'rabby-mobile-lending-repay-with-collateral';

export const MAX_UINT_AMOUNT =
  '115792089237316195423570985008687907853269984665640564039457584007913129639935';

export const LIQUIDATION_SAFETY_THRESHOLD = 1.05;
export const LIQUIDATION_DANGER_THRESHOLD = 1.01;
