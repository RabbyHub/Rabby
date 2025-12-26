import styled from 'styled-components';

export const DesktopPageWrap = styled.div`
  height: 100%;
  width: 100%;
  overflow: auto;
  background: var(--rb-neutral-bg-1, #fff);
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: center;
  gap: 16px;
  padding-bottom: 120px;

  .main-content {
    padding-left: 80px;
    flex-shrink: 0;

    transition: padding 0.3s;

    &.is-open {
      padding-left: 0;
    }
  }

  .layout-container {
    /* max-width: 1440px; */
    min-width: 1120px;
    /* margin-left: auto; */
    /* margin-right: auto; */
    background-color: var(--rb-neutral-bg-1, #ffffff);
  }

  /* antd */
  .ant-tabs-tab {
    color: var(--r-neutral-foot, #6a7587);
    font-size: 18px;
    font-weight: 400;

    padding-top: 16px;
    padding-bottom: 13px;

    &:hover {
      color: var(--r-blue-default, #4c65ff);
    }
  }
  .ant-tabs > .ant-tabs-nav .ant-tabs-nav-wrap {
    padding-left: 20px;
  }
  .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
    color: var(--r-blue-default, #4c65ff);
    font-weight: 700;
    font-size: 18px;
    text-shadow: none;
  }
  .ant-tabs-top > .ant-tabs-nav .ant-tabs-ink-bar {
    height: 4px;
    border-radius: 4px 4px 0 0;
    background-color: var(--r-blue-default, #4c65ff);
  }
  .ant-tabs-top > .ant-tabs-nav {
    margin-bottom: 0;
    position: sticky;
    z-index: 10;
    background: var(--rb-neutral-bg-1, #fff);
  }
  .ant-tabs-top > .ant-tabs-nav::before {
    border-bottom: 1px solid var(--rb-neutral-bg-4, #ebedf0);
  }

  .aside-list {
    width: 60px;
    transition: width 0.3s;
  }

  .is-open + .aside-list {
    width: 256px;
  }
`;
