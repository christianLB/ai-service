import React from 'react';
import { Form, Input, Button, Card, Typography, message, Checkbox } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const { Title } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
  remember?: boolean;
}

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);
  
  // Get redirect location from state
  const from = (location.state as any)?.from?.pathname || '/';

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      // Set remember me preference
      if (values.remember) {
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberMe');
      }
      
      await login(values.email, values.password);
      message.success('Login successful!');
      navigate(from, { replace: true });
    } catch (error: any) {
      message.error(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#f0f2f5'
    }}>
      <Card style={{ width: 400, boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2}>AI Service</Title>
          <Typography.Text type="secondary">Sign in to your account</Typography.Text>
        </div>

        <Form
          name="login"
          form={form}
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please input your email!' },
              { type: 'email', message: 'Please enter a valid email!' }
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Email"
              size="large"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox>Remember me</Checkbox>
            </Form.Item>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              block
            >
              Sign In
            </Button>
          </Form.Item>

          {import.meta.env.DEV && (
            <div style={{ 
              marginTop: 16, 
              padding: 12, 
              background: '#f6ffed', 
              border: '1px solid #b7eb8f',
              borderRadius: 4 
            }}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                <strong>Development Mode:</strong> Use admin@ai-service.local / admin123
              </Typography.Text>
            </div>
          )}
        </Form>
      </Card>
    </div>
  );
};