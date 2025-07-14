import React, { useEffect } from 'react';
import { Card, Form, Input, Button, message } from 'antd';
import type { CryptoConfig } from '../services/cryptoService';
import cryptoService from '../services/cryptoService';

interface FormValues {
  cryptoComApiKey?: string;
  cryptoComSecret?: string;
  binanceApiKey?: string;
  binanceSecret?: string;
  metamaskPrivateKey?: string;
}

const Settings: React.FC = () => {
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    cryptoService.getConfigs().then((configs) => {
      const values: FormValues = {};
      configs.forEach((c: CryptoConfig) => {
        switch (c.provider) {
          case 'cryptocom':
            values.cryptoComApiKey = c.api_key;
            values.cryptoComSecret = c.secret_key;
            break;
          case 'binance':
            values.binanceApiKey = c.api_key;
            values.binanceSecret = c.secret_key;
            break;
          case 'metamask':
            values.metamaskPrivateKey = c.secret_key;
            break;
        }
      });
      form.setFieldsValue(values);
    });
  }, [form]);

  const onFinish = async (values: FormValues) => {
    try {
      if (values.cryptoComApiKey || values.cryptoComSecret) {
        await cryptoService.saveConfig({
          provider: 'cryptocom',
          apiKey: values.cryptoComApiKey,
          secretKey: values.cryptoComSecret
        });
      }
      if (values.binanceApiKey || values.binanceSecret) {
        await cryptoService.saveConfig({
          provider: 'binance',
          apiKey: values.binanceApiKey,
          secretKey: values.binanceSecret
        });
      }
      if (values.metamaskPrivateKey) {
        await cryptoService.saveConfig({
          provider: 'metamask',
          secretKey: values.metamaskPrivateKey
        });
      }
      message.success('Configuración guardada');
    } catch (err: any) {
      message.error('Error al guardar configuración');
    }
  };

  return (
    <div>
      <h1>Configuración de Integraciones Crypto</h1>
      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item label="Crypto.com API Key" name="cryptoComApiKey">
            <Input.Password placeholder="API Key" />
          </Form.Item>
          <Form.Item label="Crypto.com Secret" name="cryptoComSecret">
            <Input.Password placeholder="Secret" />
          </Form.Item>
          <Form.Item label="Binance API Key" name="binanceApiKey">
            <Input.Password placeholder="API Key" />
          </Form.Item>
          <Form.Item label="Binance Secret" name="binanceSecret">
            <Input.Password placeholder="Secret" />
          </Form.Item>
          <Form.Item label="MetaMask Private Key" name="metamaskPrivateKey">
            <Input.Password placeholder="Private Key" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">Guardar</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Settings;