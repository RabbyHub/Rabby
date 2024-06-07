import styled from 'styled-components';

export const OptionsWrapper = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;

  .content {
    padding: 20px;
  }

  .title {
    color: #13141a;
    font-size: 20px;
    font-style: normal;
    font-weight: 500;
    line-height: normal;
    margin-bottom: 40px;
  }
  .connect-site-card {
    border-radius: 8px;
    background: #f5f6fa;
    display: inline-flex;
    padding: 28px 28px 32px 28px;
    width: 100%;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    margin-bottom: 40px;

    .site-origin {
      color: #13141a;
      text-align: center;
      font-size: 22px;
      font-style: normal;
      font-weight: 500;
      line-height: normal;
    }
  }
  .switch-chain {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }
  .chain-card {
    display: flex;
    width: 260px;
    padding: 12px;
    justify-content: center;
    align-items: center;
    gap: 8px;
    border-radius: 6px;
    border: 1px solid #e5e9ef;

    color: #13141a;
    font-size: 20px;
    font-style: normal;
    font-weight: 500;
    line-height: normal;

    img {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      flex-shrink: 0;
    }
  }
`;

export const Footer = styled.div`
  margin-top: auto;
  height: 84px;
  border-top: 1px solid #e5e9ef;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  .ant-btn-primary[disabled],
  .ant-btn-primary[disabled]:hover,
  .ant-btn-primary[disabled]:focus,
  .ant-btn-primary[disabled]:active {
    background-color: rgba(112, 132, 255, 0.4);
    border: none;
    &:before {
      display: none;
    }
  }
`;
