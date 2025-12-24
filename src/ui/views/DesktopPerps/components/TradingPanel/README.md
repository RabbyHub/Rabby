# Trading Panel Component

## 组件结构

```
TradingPanel/
├── index.tsx                   # 主组件
├── types.ts                    # 类型定义
├── README.md                   # 文档
└── components/
    ├── index.ts                # 统一导出
    ├── OrderSettings.tsx       # 订单设置（订单类型选择）
    ├── PositionSizeInput.tsx   # 仓位大小输入
    ├── PositionSlider.tsx      # 仓位滑杆
    ├── ReduceOnlyToggle.tsx    # 只减仓开关
    ├── TPSLSettings.tsx        # 止盈止损设置
    └── OrderSummary.tsx        # 订单摘要信息
```

## 功能特性

### 1. 订单设置
- **开仓模式**: Isolated / Cross（点击拉起弹窗）
- **杠杆倍数**: 显示当前杠杆（点击拉起操作弹窗）
- **订单类型**: Market, Limit, Stop Market, Stop Limit, Scale, TWAP

### 2. 仓位输入
- 支持按数量（ETH）或名义价值（USDC）输入
- 双向实时互算
- 遵循精度配置

### 3. 仓位滑杆
- 快速选择：0%, 25%, 50%, 75%, 100%
- 实时显示当前百分比
- 与输入框双向联动

### 4. 只减仓模式
- 无仓位时自动置灰
- 仅对当前订单有效
- 限制下单方向

### 5. 止盈止损
- 可选开关控制
- 支持价格和百分比输入
- 实时计算预期盈亏
- 取消时清空数据

### 6. 订单摘要
- 清算价格
- 订单价值
- 保证金使用
- 滑点信息
- TP/SL预期盈亏（启用时显示）

## 使用示例

```tsx
import { TradingPanel } from '@/ui/views/DesktopPerps/components/TradingPanel';

function App() {
  return <TradingPanel />;
}
```

## 待实现功能

- [ ] 杠杆调整弹窗
- [ ] 开仓模式切换弹窗
- [ ] 实际的价格计算逻辑
- [ ] 与后端API集成
- [ ] 表单验证
- [ ] 错误处理

