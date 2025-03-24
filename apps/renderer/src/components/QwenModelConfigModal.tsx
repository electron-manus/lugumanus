import { useMutation } from '@tanstack/react-query';
import { useMemoizedFn } from 'ahooks';
import { Input, Modal, Select } from 'antd';
import { useState } from 'react';
import { trpc } from '../utils/trpc';
import { ErrorMessages } from './ErrorMessage';

interface QwenModelConfigModalProps {
  visible: boolean;
  onClose: () => void;
}

interface ModelSettings {
  defaultModel: string;
  longTextModel: string;
  visionModel: string;
  codeModel: string;
}

function QwenModelConfigModal({ visible, onClose }: QwenModelConfigModalProps) {
  const mutation = useMutation(
    trpc.system.updateModelConfig.mutationOptions({
      onSuccess: () => {
        onClose();
      },
    }),
  );

  const errors = mutation.error?.data?.zodError;

  const [apiKey, setApiKey] = useState<string>('');
  const [modelSettings, setModelSettings] = useState<ModelSettings>({
    defaultModel: 'qwen-max-latest',
    longTextModel: 'qwen-long-latest',
    visionModel: 'qwen-vl-ocr-latest',
    codeModel: 'qwen-coder-turbo-latest',
  });

  const handleAuthenticate = useMemoizedFn(async () => {
    mutation.mutateAsync({
      apiKey,
      longTextModel: modelSettings.longTextModel,
      textModel: modelSettings.defaultModel,
      codeModel: modelSettings.codeModel,
      imageModel: modelSettings.visionModel,
      voiceModel: modelSettings.defaultModel,
    });
  });

  const updateModelSetting = (key: keyof ModelSettings, value: string) => {
    setModelSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <Modal
      title="大模型配置"
      open={visible}
      onOk={handleAuthenticate}
      onCancel={onClose}
      cancelText="取消"
      okText="确认"
      closable={false}
      maskClosable={false}
      keyboard={false}
      style={{ margin: '0 100px 0 200px', top: '50%', transform: 'translateY(-50%)' }}
    >
      <div className="space-y-4 pb-10 pt-6">
        <div>
          <div className="mb-2 text-sm">千问 ApiKey</div>
          <Input.Password
            placeholder="请输入千问 ApiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>

        <div className="pb-4">
          <div className="mb-2 text-sm">默认模型</div>
          <Select
            value={modelSettings.defaultModel}
            className="w-full"
            onChange={(value) => updateModelSetting('defaultModel', value)}
            options={[
              { label: 'qwen-max', value: 'qwen-max-latest' },
              { label: 'qwen-plus', value: 'qwen-plus-latest' },
              { label: 'qwen-turbo', value: 'qwen-turbo-latest' },
              { label: 'qwen-long', value: 'qwen-long-latest' },
            ]}
          />
        </div>

        <div className="pb-4">
          <div className="mb-2 text-sm">长文本模型</div>
          <Select
            value={modelSettings.longTextModel}
            className="w-full"
            onChange={(value) => updateModelSetting('longTextModel', value)}
            options={[
              { label: 'qwen-long-latest', value: 'qwen-long-latest' },
              { label: 'qwen-turbo-latest', value: 'qwen-turbo-latest' },
            ]}
          />
        </div>

        <div className="pb-4">
          <div className="mb-2 text-sm">图文识别模型</div>
          <Select
            value={modelSettings.visionModel}
            className="w-full"
            onChange={(value) => updateModelSetting('visionModel', value)}
            options={[
              { label: 'qwen-vl-ocr', value: 'qwen-vl-ocr-latest' },
              { label: 'qwen-omni-turbo', value: 'qwen-omni-turbo-latest' },
            ]}
          />
        </div>

        <div>
          <div className="mb-2 text-sm">代码模型</div>
          <Select
            value={modelSettings.codeModel}
            className="w-full"
            onChange={(value) => updateModelSetting('codeModel', value)}
            options={[
              { label: 'qwen-coder-turbo', value: 'qwen-coder-turbo-latest' },
              { label: 'qwen-coder-plus', value: 'qwen-coder-plus-latest' },
            ]}
          />
        </div>

        {errors && <ErrorMessages errors={errors.fieldErrors} />}
      </div>
    </Modal>
  );
}

export default QwenModelConfigModal;
