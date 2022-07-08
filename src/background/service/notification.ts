import Events from 'events';
import { ethErrors } from 'eth-rpc-errors';
import { EthereumProviderError } from 'eth-rpc-errors/dist/classes';
import { winMgr } from 'background/webapi';
import { CHAINS } from 'consts';
import { createPersistStore } from 'background/utils';
import { browser } from 'webextension-polyfill-ts';

interface Task {
  approval: Approval;
  id: number;
}

interface TaskStore {
  tasks: Task[];
}

type IApprovalComponents = typeof import('@/ui/views/Approval/components');
type IApprovalComponent = IApprovalComponents[keyof IApprovalComponents];

export interface Approval {
  id: number;
  taskId: number | null;
  data: {
    params?: import('react').ComponentProps<IApprovalComponent>['params'];
    origin?: string;
    approvalComponent: keyof IApprovalComponents;
    requestDefer?: Promise<any>;
    approvalType?: string;
  };
  winProps: any;
  resolve?(params?: any): void;
  reject?(err: EthereumProviderError<any>): void;
}

// something need user approval in window
// should only open one window, unfocus will close the current notification
class NotificationService extends Events {
  currentApproval: Approval | null = null;
  _approvals: Approval[] = [];
  notifiWindowId = 0;
  isLocked = false;
  store: TaskStore = {
    tasks: [],
  };

  get approvals() {
    return this._approvals;
  }

  set approvals(val: Approval[]) {
    this._approvals = val;
    if (val.length <= 0) {
      browser.browserAction.setBadgeText({
        text: null,
      });
    } else {
      browser.browserAction.setBadgeText({
        text: val.length + '',
      });
      browser.browserAction.setBadgeBackgroundColor({
        color: '#FE815F',
      });
    }
  }

  constructor() {
    super();

    winMgr.event.on('windowRemoved', (winId: number) => {
      if (winId === this.notifiWindowId) {
        this.notifiWindowId = 0;
        this.rejectAllApprovals();
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

    if (this.store.tasks.length > 0) {
      this.approvals = this.store.tasks.map((task) => ({
        taskId: task.id,
        id: task.approval.id,
        data: task.approval.data,
        winProps: task.approval.winProps,
      }));
      this.currentApproval = this.approvals[0];
    }
  };

  activeFirstApproval = () => {
    if (this.notifiWindowId) {
      browser.windows.update(this.notifiWindowId, {
        focused: true,
      });
      return;
    }

    if (this.approvals.length < 0) return;

    const approval = this.approvals[0];
    this.currentApproval = approval;
    this.openNotification(approval.winProps);
  };

  createTask = (approval: Approval) => {
    const id = approval.taskId!;
    this.store.tasks = [
      ...this.store.tasks,
      {
        id,
        approval: {
          id: approval.id,
          taskId: approval.taskId,
          data: {
            params: approval.data.params,
            origin: approval.data.origin,
            approvalComponent: approval.data.approvalComponent,
            approvalType: approval.data.approvalType,
          },
          winProps: approval.winProps,
        },
      },
    ];
  };

  deleteTask = (id: number) => {
    this.store.tasks = this.store.tasks.filter((task) => task.id !== id);
  };

  deleteApproval = (approval) => {
    if (approval && this.approvals.length > 1) {
      this.approvals = this.approvals.filter((item) => approval.id !== item.id);
    } else {
      this.currentApproval = null;
      this.approvals = [];
    }
  };

  getApproval = () => this.currentApproval;

  resolveApproval = async (data?: any, forceReject = false) => {
    if (forceReject) {
      this.currentApproval?.reject &&
        this.currentApproval?.reject(
          new EthereumProviderError(4001, 'User Cancel')
        );
    } else {
      this.currentApproval?.resolve && this.currentApproval?.resolve(data);
    }

    const approval = this.currentApproval;

    this.deleteApproval(approval);

    if (approval && approval.taskId !== null) {
      this.deleteTask(approval.taskId);
    }
    if (this.approvals.length > 0) {
      this.currentApproval = this.approvals[0];
    } else {
      this.currentApproval = null;
    }

    this.emit('resolve', data);
  };

  rejectApproval = async (err?: string, stay = false, isInternal = false) => {
    if (isInternal) {
      this.currentApproval?.reject &&
        this.currentApproval?.reject(ethErrors.rpc.internal(err));
    } else {
      this.currentApproval?.reject &&
        this.currentApproval?.reject(
          ethErrors.provider.userRejectedRequest<any>(err)
        );
    }

    const approval = this.currentApproval;
    if (approval && approval.taskId !== null) {
      this.deleteTask(approval.taskId);
    }

    if (approval && this.approvals.length > 1) {
      this.deleteApproval(approval);
      this.currentApproval = this.approvals[0];
    } else {
      await this.clear(stay);
    }
    this.emit('reject', err);
  };

  requestApproval = async (data, winProps?): Promise<any> => {
    return new Promise((resolve, reject) => {
      const approval: Approval = {
        taskId: this.store.tasks.length,
        id: this.approvals.length,
        data,
        winProps,
        resolve,
        reject,
      };
      if (
        ['SignTx', 'SignText', 'SignTypedData'].includes(
          data.approvalComponent || ''
        )
      ) {
        this.createTask(approval);
      }
      this.approvals = [...this.approvals, approval];
      if (!this.currentApproval) {
        this.currentApproval = approval;
      }
      if (this.notifiWindowId) {
        browser.windows.update(this.notifiWindowId, {
          focused: true,
        });
      } else {
        this.openNotification(approval.winProps);
      }
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
    });
  };

  clear = async (stay = false) => {
    this.approvals = [];
    this.currentApproval = null;
    if (this.notifiWindowId && !stay) {
      await winMgr.remove(this.notifiWindowId);
      this.notifiWindowId = 0;
    }
  };

  rejectAllApprovals = () => {
    this.approvals.forEach((approval) => {
      approval.reject &&
        approval.reject(
          new EthereumProviderError(4001, 'User rejected the request.')
        );
    });
    this.approvals = [];
    this.currentApproval = null;
    this.store.tasks = [];
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
