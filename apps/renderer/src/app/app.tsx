import { useQuery } from '@tanstack/react-query';
import { useToggle } from 'ahooks';
import { ConfigProvider, theme } from 'antd';
import { useEffect } from 'react';
import MainContent from '../components/MainContent';
import QwenModelConfigModal from '../components/QwenModelConfigModal';
import TitleBar from '../components/TitleBar';
import { trpc } from '../utils/trpc';

export function App() {
  const { data } = useQuery(trpc.system.getModelConfig.queryOptions());
  const [
    isModelConfigModalOpen,
    { setLeft: setModelConfigModalClose, setRight: setModelConfigModalOpen },
  ] = useToggle(false);

  useEffect(() => {
    if (data?.length === 0) {
      // 打开登录模态
      setModelConfigModalOpen();
    }
  }, [data, setModelConfigModalOpen]);

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorLink: '#259F71',
          colorPrimary: '#259F71',
          colorPrimaryBorder: '#259F71',
          colorPrimaryText: '#259F71',
          colorPrimaryBg: '#259F71',
        },
      }}
    >
      <div className="flex flex-col h-screen overflow-hidden">
        <TitleBar appName="麓咕" />

        <MainContent />

        <QwenModelConfigModal visible={isModelConfigModalOpen} onClose={setModelConfigModalClose} />
      </div>
    </ConfigProvider>
  );
}

export default App;
