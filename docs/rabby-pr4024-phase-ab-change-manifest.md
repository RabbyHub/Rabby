# Rabby PR #4024 Phase A+B Change Manifest

基线：`origin/develop` (`f30e7cbf8a8a55fab338074e78eb198a2608fed5`)，审计日期：2026-09-03。

## Scope gate

在加入本 manifest 前，相对 `origin/develop` 有 68 个 tracked changed files；另有 12 个有意新增的源码/测试文件。按当前工作树统计，tracked diff 为 3,605 additions / 945 deletions（net 2,660），新增文件约 2,075 LOC，合计约 4,735 implementation/test LOC；因此超过文档规定的 55 files / 3,800 LOC 上限。当前超出主要由 B1–B4 的核心生命周期迁移、所有等待页迁移、MiniSign/批量硬件入口迁移和回归测试共同造成，不是无关业务变更。

该范围必须按以下顺序拆分后再合并：

1. **A1/A2 contract**：branded refs、`ApprovalScope`、scoped approval actions、静态限制和 Phase A tests。可先以兼容 API 形式落地；最终提交必须删除兼容调用。
2. **B1/B2 core**：`SigningFlowService`、notification 生命周期、canonical `ProviderRequest`、runner/promise ownership、Cobo parent/child binding 及对应 state/provider tests。该组是一个可独立验证的后台核心组。
3. **B3/B4 migration**：waiting pages、MiniSign、QR、hardware operation identity、account invalidation、internal `personal_sign`、Cobo/Perps UI handoff 及对应 UI/event tests。该组依赖第 2 组，不能通过保留旧全局签名状态来并行合并。
4. **B5/G13**：mocked Ledger/WalletConnect/QR/software transport tests、manual smoke matrix、legacy cleanup、最终 manifest 和 rollout/rollback 记录。

第 1 组可以先行，第 2 组在第 1 组 API 稳定后可独立验证；第 3 组不能在第 2 组之前独立发布。拆分只改变提交边界，不恢复最终树中的 legacy fallback。

## File mapping

每个当前工作树中的 changed/untracked path 都在下表中出现。`G*` 为 PRD blocker，`A*`/`B*` 为实施组，`TEST` 为测试，`DOC` 为本文件和最终报告。

| File | Requirement / group |
| --- | --- |
| `docs/rabby-pr4024-phase-ab-change-manifest.md` | G12, B12, DOC |
| `.eslintrc` | A2, B5 |
| `__tests__/service/notificationQueue.test.ts` | G1, G2, B1, TEST |
| `src/background/controller/provider/controller.ts` | G3, G5, G8, G9, G10, B2, B3, B4 |
| `src/background/controller/provider/index.ts` | G9, G11, B2, B4 |
| `src/background/controller/provider/internalMethod.ts` | G7, B4 |
| `src/background/controller/provider/rpcFlow.ts` | G1, G3, G5, G9, G10, G11, B1, B2, B3, B4 |
| `src/background/controller/provider/type.ts` | G9, G11, B2 |
| `src/background/controller/wallet.ts` | G6, G7, G9, G10, G11, B1, B2, B4 |
| `src/background/index.ts` | G6, G9, G10, B2, B4 |
| `src/background/service/index.ts` | G1, B1 |
| `src/background/service/notification.ts` | G1, G2, G3, G5, G7, G9, G10, G11, B1, B2, B4 |
| `src/background/service/preference.ts` | G6, B4 |
| `src/background/utils/buildinProvider.ts` | G7, G9, G10, G11, B2, B4 |
| `src/constant/index.ts` | G3, G4, G6, G8, B3, B4 |
| `src/ui/component/MiniSignV2/domain/types.ts` | G8, G11, B3 |
| `src/ui/component/MiniSignV2/services/SignatureService.ts` | G1, G3, G5, G8, G10, B1, B2, B3 |
| `src/ui/component/MiniSignV2/services/SignatureSteps.ts` | G1, G3, G5, G8, G9, G10, B1, B2, B3, B4 |
| `src/ui/component/MiniSignV2/state/SignatureManager.ts` | G1, G3, G5, G8, G10, B1, B2, B3 |
| `src/ui/component/MiniSignV2/state/TypedDataSignatureManager.ts` | G1, G3, G5, G8, G10, B1, B2, B3 |
| `src/ui/utils/WalletContext.tsx` | A2, G3, G9, G10, B2, B3 |
| `src/ui/utils/hooks.ts` | A1, A2, G4, B3 |
| `src/ui/utils/sendPersonalMessage.ts` | G7, G9, G10, B2, B4 |
| `src/ui/utils/sendTransaction.ts` | G9, G10, G11, B2, B4 |
| `src/ui/utils/sendTypedData.ts` | G7, G9, G10, B2, B4 |
| `src/ui/utils/useDeviceConnect.ts` | A2, G8, B3 |
| `src/ui/views/Approval/components/AddAsset.tsx` | A2, G4, B3 |
| `src/ui/views/Approval/components/AddChain/AddChain.tsx` | A2, G4, B3 |
| `src/ui/views/Approval/components/CoinbaseWaiting/index.tsx` | G4, G8, B3 |
| `src/ui/views/Approval/components/CommonWaiting.tsx` | G4, G8, B3 |
| `src/ui/views/Approval/components/Connect/ConnectContent.tsx` | A2, G4, B3 |
| `src/ui/views/Approval/components/Connect/PerpsInviteContent.tsx` | G7, G9, G10, B4 |
| `src/ui/views/Approval/components/Connect/SelectWalletApproval.tsx` | A2, G7, B4 |
| `src/ui/views/Approval/components/Connect/index.tsx` | A2, G4, B3 |
| `src/ui/views/Approval/components/Decrypt.tsx` | A2, G4, B3 |
| `src/ui/views/Approval/components/EIP7702Warning.tsx` | A2, G4, B3 |
| `src/ui/views/Approval/components/ETHSign.tsx` | A2, G4, G7, B3, B4 |
| `src/ui/views/Approval/components/FooterBar/ActionsContainer.tsx` | A2, G4, B3 |
| `src/ui/views/Approval/components/GetPublicKey.tsx` | A2, G4, G8, B3 |
| `src/ui/views/Approval/components/ImKeyHardwareWaiting.tsx` | G4, G8, B3 |
| `src/ui/views/Approval/components/LedgerHardwareWaiting.tsx` | G4, G8, B3 |
| `src/ui/views/Approval/components/MiniPersonalMessgae/useBatchPersonalMessageTask.tsx` | G7, G8, G10, B3, B4 |
| `src/ui/views/Approval/components/MiniSignTx/MiniLedgerAction.tsx` | G3, G5, G8, G10, B3 |
| `src/ui/views/Approval/components/MiniSignTx/MiniOneKeyAction.tsx` | G3, G5, G8, G10, B3 |
| `src/ui/views/Approval/components/MiniSignTx/useBatchSignTxTask.ts` | G3, G5, G8, G10, B3 |
| `src/ui/views/Approval/components/MiniSignTypedData/useTypedDataTask.ts` | G3, G5, G8, G10, B3 |
| `src/ui/views/Approval/components/PrivatekeyWaiting.tsx` | G3, G4, G5, G10, B3 |
| `src/ui/views/Approval/components/QRHardWareWaiting/QRHardWareWaiting.tsx` | G3, G4, G5, G8, G10, B3 |
| `src/ui/views/Approval/components/SignTestnetTx/index.tsx` | A2, G3, G4, G9, B2, B3 |
| `src/ui/views/Approval/components/SignText.tsx` | A2, G3, G4, G5, G7, B3, B4 |
| `src/ui/views/Approval/components/SignTx.tsx` | A2, G3, G4, G5, G9, G10, B2, B3 |
| `src/ui/views/Approval/components/SignTypedData.tsx` | A2, G3, G4, G5, G7, G9, B2, B3, B4 |
| `src/ui/views/Approval/components/SwitchChain/SwitchChain.tsx` | A2, G4, B3 |
| `src/ui/views/Approval/components/WatchAddressWaiting/index.tsx` | G4, G8, G9, B3, B4 |
| `src/ui/views/Approval/hooks/useApprovalUtils.tsx` | A1, A2, G3, B3 |
| `src/ui/views/Approval/index.tsx` | A1, A2, G4, B3 |
| `src/ui/views/CommonPopup/index.tsx` | A2, G4, B3 |
| `src/ui/views/DesktopProfile/components/ApprovalsTabPane/components/BatchRevoke/RevokeActionLedgerButton.tsx` | G8, B3 |
| `src/ui/views/DesktopProfile/components/ApprovalsTabPane/components/BatchRevoke/useBatchRevokeTask.ts` | G8, G10, B3 |
| `src/ui/views/DesktopProfile/components/ApprovalsTabPane/components/RevokeButton.tsx` | A2, G8, B3 |
| `src/ui/views/DesktopSmallSwap/components/SwapActionLedgerButton.tsx` | G8, B3 |
| `src/ui/views/DesktopSmallSwap/hooks/useBatchSwapTask.ts` | G8, G10, B3 |
| `src/ui/views/ImportCoboArgus/ImportCoboArgus.tsx` | G6, G9, G11, B4 |
| `src/ui/views/ImportSuccess/index.tsx` | G6, B4 |
| `src/ui/views/ManageBatchApprovals/components/RevokeActionButton/RevokeActionLedgerButton.tsx` | G8, B3 |
| `src/ui/views/ManageBatchApprovals/components/RevokeActionButton/RevokeActionOnekeyButton.tsx` | G8, B3 |
| `src/ui/views/ManageBatchApprovals/hooks/useBatchRevokeTask.ts` | G8, G10, B3 |
| `src/ui/views/SortHat.tsx` | A2, G6, B4 |
| `src/ui/views/Unlock/index.tsx` | A2, G6, B4 |
| `src/utils/signEvent.ts` | G3, G4, G5, G8, G10, G11, B3 |
| `src/utils/signingTypes.ts` | G3, G8, G9, G11, B1, B2, B3 |
| `src/background/service/signingFlow.ts` | G1, G3, G4, G5, G10, G11, B1, B2, B3, B4 |
| `src/ui/approval/actions.ts` | A1, A2, G3, G6, B3, B4 |
| `src/ui/approval/context.ts` | A1, A2, G3, G11, B3 |
| `src/ui/approval/global.ts` | A1, A2 |
| `src/ui/hooks/useSigningAttemptEvents.ts` | G4, G8, G10, B3 |
| `__tests__/background/approvalActions.test.ts` | G2, G3, G5, G6, G7, G9, G10, TEST |
| `__tests__/background/providerContext.test.ts` | G9, G11, TEST |
| `__tests__/background/signingFlow.test.ts` | G1, G3, G4, G5, G10, G11, TEST |
| `__tests__/ui/approvalActions.test.ts` | A1, A2, G3, G6, TEST |
| `__tests__/ui/approvalScope.test.ts` | A1, A2, G11, TEST |
| `__tests__/utils/signEvent.test.ts` | G3, G4, G8, TEST |
| `__tests__/background/approvalFailClosed.test.ts` *(deleted from local HEAD; absent in develop baseline)* | A2, G3, TEST |
| `__tests__/ui/approvalBinding.test.ts` *(deleted from local HEAD; absent in develop baseline)* | A1, A2, TEST |
| `__tests__/ui/approvalBindingStack.test.ts` *(deleted from local HEAD; absent in develop baseline)* | A1, A2, TEST |
| `__tests__/ui/approvalSideEffectsGuarded.test.ts` *(deleted from local HEAD; absent in develop baseline)* | A2, G6, TEST |
| `__tests__/ui/useApprovalBinding.test.ts` *(deleted from local HEAD; absent in develop baseline)* | A1, A2, TEST |
| `src/ui/utils/approval-binding-stack.ts` *(deleted from local HEAD; absent in develop baseline)* | A1, A2 |
| `src/ui/utils/approval-context.ts` *(deleted from local HEAD; absent in develop baseline)* | A1, A2 |

## Review disposition

- G1–G11：当前定向 review 未发现仍可由代码直接证明的 P1/P2 缺口。
- G12/B12：代码范围仍超过 revised upper guard；本 manifest 和上面的拆分方案是合并前置条件，不能把超范围视为已自动豁免。
- G13/B13：已运行的 focused checks 记录在最终报告；真实 Ledger、WalletConnect、QR transport、全量 suite、CI 和 manual smoke 仍必须分别记录，不能用 focused tests 代替。
