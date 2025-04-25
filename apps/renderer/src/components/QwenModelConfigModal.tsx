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
  const [baseURL, setBaseURL] = useState<string>(
    'https://dashscope.aliyuncs.com/compatible-mode/v1',
  );
  const [modelSettings, setModelSettings] = useState<ModelSettings>({
    defaultModel: 'qwen-max-latest',
    longTextModel: 'qwen-long-latest',
    visionModel: 'qwen-vl-ocr-latest',
    codeModel: 'qwen-coder-turbo-latest',
  });

  const handleAuthenticate = useMemoizedFn(async () => {
    mutation.mutateAsync({
      apiKey,
      baseURL,
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
          <div className="mb-2 text-sm">ApiKey</div>
          <Input.Password
            placeholder="请输入 ApiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>

        <div>
          <div className="mb-2 text-sm">baseURL</div>
          <Input
            placeholder="请输入 baseURL"
            value={baseURL}
            onChange={(e) => setBaseURL(e.target.value)}
          />
        </div>

        <div className="pb-4">
          <div className="mb-2 text-sm">默认模型</div>
          <Input
            placeholder="请输入模型名称"
            value={modelSettings.defaultModel}
            onChange={(e) => updateModelSetting('defaultModel', e.target.value)}
            defaultValue="qwen-max-latest"
          />
          <div className="mt-2 text-xs text-gray-500">
            常用模型：qwen-max-latest, qwen-plus-latest, qwen-turbo-latest, qwen-long-latest
          </div>
        </div>

        <div className="pb-4">
          <div className="mb-2 text-sm">长文本模型</div>
          <Input
            placeholder="请输入长文本模型名称"
            value={modelSettings.longTextModel}
            onChange={(e) => updateModelSetting('longTextModel', e.target.value)}
            defaultValue="qwen-long-latest"
          />
          <div className="mt-2 text-xs text-gray-500">
            常用模型：qwen-long-latest, qwen-turbo-latest
          </div>
        </div>

        <div className="pb-4">
          <div className="mb-2 text-sm">图文识别模型</div>
          <Input
            placeholder="请输入图文识别模型名称"
            value={modelSettings.visionModel}
            onChange={(e) => updateModelSetting('visionModel', e.target.value)}
            defaultValue="qwen-vl-ocr-latest"
          />
          <div className="mt-2 text-xs text-gray-500">
            常用模型：qwen-vl-ocr-latest, qwen-omni-turbo-latest
          </div>
        </div>

        <div>
          <div className="mb-2 text-sm">代码模型</div>
          <Input
            placeholder="请输入代码模型名称"
            value={modelSettings.codeModel}
            onChange={(e) => updateModelSetting('codeModel', e.target.value)}
            defaultValue="qwen-coder-turbo-latest"
          />
          <div className="mt-2 text-xs text-gray-500">
            常用模型：qwen-coder-turbo-latest, qwen-coder-plus-latest
          </div>
        </div>

        {errors && <ErrorMessages errors={errors.fieldErrors} />}
      </div>
    </Modal>
  );
}

export default QwenModelConfigModal;
