import Events from 'events';
import { ethErrors } from 'eth-rpc-errors';
import { EthereumProviderError } from 'eth-rpc-errors/dist/classes';
import { winMgr } from 'background/webapi';
import {
  CHAINS,
  IS_CHROME,
  IS_LINUX,
  KEYRING_TYPE,
  NOT_CLOSE_UNFOCUS_LIST,
} from 'consts';
import preferenceService from './preference';
import { createPersistStore } from 'background/utils';

interface TransactionParams {
  from?: string;
  to: string;
  gas?: string;
  gasLimit?: string;
  gasPrice?: string;
  maxFeePeerGas?: string;
  maxPriorityFeePeerGas?: string;
  data?: string;
  value?: string;
}

type TextMessageParams = string[];

type TaskParams = TransactionParams[] | TextMessageParams;

interface Task {
  params: TaskParams;
  id: number;
}

interface TaskStore {
  tasks: Task[];
}

interface Approval {
  id: number;
  taskId: number | null;
  data: {
    state: number;
    params?: TaskParams;
    origin?: string;
    approvalComponent: string;
    requestDefer?: Promise<any>;
    approvalType: string;
  };
  resolve(params?: any): void;
  reject(err: EthereumProviderError<any>): void;
}

// interface RequestApprovalParams {
//   approvalComponent:
//     | 'SignTx'
//     | 'SignText'
//     | 'SignTypedData'
//     | 'Connect'
//     | 'AddChain'
//     | 'AddAsset';
//   params: {
//     method: string
//     data: params,
//     session: {
//       origin: string;
//       name: string
//       icon: string;
//     }
//   },
//   origin: string;
// }

// something need user approval in window
// should only open one window, unfocus will close the current notification
class NotificationService extends Events {
  currentApproval: Approval | null = null;
  approvals: Approval[] = [];
  notifiWindowId = 0;
  isLocked = false;
  store: TaskStore = {
    tasks: [],
  };

  constructor() {
    super();

    winMgr.event.on('windowRemoved', (winId: number) => {
      if (winId === this.notifiWindowId) {
        this.notifiWindowId = 0;
      }
    });

    winMgr.event.on('windowFocusChange', (winId: number) => {
      const account = preferenceService.getCurrentAccount()!;
      if (this.notifiWindowId && winId !== this.notifiWindowId) {
        if (process.env.NODE_ENV === 'production') {
          if (
            (IS_CHROME &&
              winId === chrome.windows.WINDOW_ID_NONE &&
              IS_LINUX) ||
            (account?.type === KEYRING_TYPE.WalletConnectKeyring &&
              NOT_CLOSE_UNFOCUS_LIST.includes(account.brandName))
          ) {
            // Wired issue: When notification popuped, will focus to -1 first then focus on notification
            return;
          }
          this.rejectApproval();
        }
      }
    });
  }

  init = async () => {
    const storage = await createPersistStore<TaskStore>({
      name: 'tasks',
      template: {
        tasks: [],
      },
    });

    this.store = storage || this.store;

    if (!this.store.tasks) {
      this.store.tasks = [];
    }

    // TODO: set the latest task as currentApproval
  };

  createTask = (task: TaskParams) => {
    const id = this.store.tasks.length;

    this.store.tasks.push({
      id,
      params: task,
    });
  };

  deleteTask = (id: number) => {
    this.store.tasks = this.store.tasks.filter((task) => task.id !== id);
  };

  getApproval = () => this.currentApproval;

  resolveApproval = (data?: any, forceReject = false) => {
    if (forceReject) {
      this.currentApproval?.reject(
        new EthereumProviderError(4001, 'User Cancel')
      );
    } else {
      this.currentApproval?.resolve(data);
    }
    this.currentApproval = null;
    this.emit('resolve', data);
  };

  rejectApproval = async (err?: string, stay = false, isInternal = false) => {
    if (isInternal) {
      this.currentApproval?.reject(ethErrors.rpc.internal(err));
    } else {
      this.currentApproval?.reject(
        ethErrors.provider.userRejectedRequest<any>(err)
      );
    }

    const approval = this.currentApproval;
    if (approval && approval.taskId !== null) {
      this.deleteTask(approval.taskId);
    }
    if (approval && this.approvals.length > 1) {
      const index = this.approvals.findIndex((item) => item.id === approval.id);
      this.approvals.splice(index, 1);
    } else {
      this.clear(stay);
    }
    this.emit('reject', err);
  };

  requestApproval = async (data, winProps?): Promise<any> => {
    return new Promise((resolve, reject) => {
      let taskId: number | null = null;
      if (['SignTx', 'SignText', 'SignTypedData'].includes(data.approvalType)) {
        taskId = this.store.tasks.length;
        this.createTask(data.params);
      }
      const approval: Approval = {
        taskId,
        id: this.approvals.length,
        data,
        resolve,
        reject,
      };
      this.approvals.push(approval);
      this.currentApproval = approval;

      if (
        ['wallet_switchEthereumChain', 'wallet_addEthereumChain'].includes(
          data?.params?.method
        )
      ) {
        const chainId = data.params?.data?.[0]?.chainId;
        const chain = Object.values(CHAINS).find(
          (chain) => chain.hex === chainId
        );
        if (chain) {
          this.resolveApproval(null);
          return;
        }
      }
      this.openNotification(winProps);
    });
  };

  clear = async (stay = false) => {
    this.currentApproval = null;
    if (this.notifiWindowId && !stay) {
      await winMgr.remove(this.notifiWindowId);
      this.notifiWindowId = 0;
    }
  };

  unLock = () => {
    this.isLocked = false;
  };

  lock = () => {
    this.isLocked = true;
  };

  openNotification = (winProps) => {
    if (this.isLocked) return;
    this.lock();
    if (this.notifiWindowId) {
      winMgr.remove(this.notifiWindowId);
      this.notifiWindowId = 0;
    }
    winMgr.openNotification(winProps).then((winId) => {
      this.notifiWindowId = winId!;
    });
  };
}

export default new NotificationService();
