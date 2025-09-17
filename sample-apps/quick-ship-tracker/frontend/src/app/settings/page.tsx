'use client';

import {
  Page,
  Layout,
  Card,
  Text,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  Button,
  Banner,
  Toast,
} from '@shopify/polaris';
import NavigationLayout from '@/components/layout/Navigation';
import { useState, useCallback } from 'react';

interface Settings {
  notificationEmail: string;
  defaultCarrier: string;
  autoNotifyCustomers: boolean;
  includeTrackingInEmail: boolean;
  customEmailTemplate: boolean;
  webhookUrl: string;
  apiKey: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    notificationEmail: 'admin@example.com',
    defaultCarrier: 'USPS',
    autoNotifyCustomers: true,
    includeTrackingInEmail: true,
    customEmailTemplate: false,
    webhookUrl: '',
    apiKey: 'qst_1234567890abcdef',
  });

  const [saving, setSaving] = useState(false);
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleFieldChange = useCallback(
    (field: keyof Settings) => (value: string | boolean) => {
      setSettings((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    []
  );

  const handleSave = async () => {
    try {
      setSaving(true);
      // Save settings to API
      // await api.saveSettings(settings);
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      setToastMessage('Settings saved successfully');
      setToastActive(true);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setToastMessage('Failed to save settings');
      setToastActive(true);
    } finally {
      setSaving(false);
    }
  };

  const handleResetApiKey = async () => {
    try {
      setSaving(true);
      // Generate new API key
      // const newKey = await api.resetApiKey();
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const newKey = 'qst_' + Math.random().toString(36).substring(2, 18);
      
      setSettings((prev) => ({
        ...prev,
        apiKey: newKey,
      }));
      
      setToastMessage('API key regenerated successfully');
      setToastActive(true);
    } catch (error) {
      console.error('Failed to reset API key:', error);
      setToastMessage('Failed to regenerate API key');
      setToastActive(true);
    } finally {
      setSaving(false);
    }
  };

  const toggleToast = useCallback(() => setToastActive((active) => !active), []);

  const carrierOptions = [
    { label: 'USPS', value: 'USPS' },
    { label: 'FedEx', value: 'FedEx' },
    { label: 'UPS', value: 'UPS' },
    { label: 'DHL', value: 'DHL' },
    { label: 'Canada Post', value: 'Canada Post' },
  ];

  return (
    <NavigationLayout>
      <Page
        title="Settings"
        primaryAction={{
          content: 'Save',
          onAction: handleSave,
          loading: saving,
        }}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ padding: '1.5rem' }}>
                <Text variant="headingMd" as="h2">
                  General Settings
                </Text>
                
                <div style={{ marginTop: '1rem' }}>
                  <FormLayout>
                    <TextField
                      label="Notification Email"
                      value={settings.notificationEmail}
                      onChange={handleFieldChange('notificationEmail')}
                      type="email"
                      helpText="Receive notifications about tracking updates and errors"
                      autoComplete="email"
                    />
                    
                    <Select
                      label="Default Carrier"
                      options={carrierOptions}
                      onChange={handleFieldChange('defaultCarrier')}
                      value={settings.defaultCarrier}
                      helpText="Pre-select this carrier when adding new tracking numbers"
                    />
                  </FormLayout>
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ padding: '1.5rem' }}>
                <Text variant="headingMd" as="h2">
                  Customer Notifications
                </Text>
                
                <div style={{ marginTop: '1rem' }}>
                  <FormLayout>
                    <Checkbox
                      label="Automatically notify customers"
                      checked={settings.autoNotifyCustomers}
                      onChange={handleFieldChange('autoNotifyCustomers')}
                      helpText="Send tracking information to customers when added"
                    />
                    
                    <Checkbox
                      label="Include tracking link in emails"
                      checked={settings.includeTrackingInEmail}
                      onChange={handleFieldChange('includeTrackingInEmail')}
                      helpText="Add a direct tracking link in customer emails"
                      disabled={!settings.autoNotifyCustomers}
                    />
                    
                    <Checkbox
                      label="Use custom email template"
                      checked={settings.customEmailTemplate}
                      onChange={handleFieldChange('customEmailTemplate')}
                      helpText="Customize the tracking notification email (Pro plan only)"
                    />
                  </FormLayout>
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ padding: '1.5rem' }}>
                <Text variant="headingMd" as="h2">
                  Developer Settings
                </Text>
                
                <Banner tone="info">
                  These settings are for advanced users who want to integrate with external systems.
                </Banner>
                
                <div style={{ marginTop: '1rem' }}>
                  <FormLayout>
                    <TextField
                      label="Webhook URL"
                      value={settings.webhookUrl}
                      onChange={handleFieldChange('webhookUrl')}
                      type="url"
                      helpText="Receive POST requests when tracking is added or updated"
                      placeholder="https://your-domain.com/webhook"
                      autoComplete="off"
                    />
                    
                    <div>
                      <TextField
                        label="API Key"
                        value={settings.apiKey}
                        onChange={() => {}}
                        readOnly
                        helpText="Use this key to authenticate API requests"
                        autoComplete="off"
                        connectedRight={
                          <Button onClick={handleResetApiKey} loading={saving}>
                            Regenerate
                          </Button>
                        }
                      />
                    </div>
                  </FormLayout>
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ padding: '1.5rem' }}>
                <Text variant="headingMd" as="h2">
                  Data & Privacy
                </Text>
                
                <div style={{ marginTop: '1rem' }}>
                  <Text as="p" tone="subdued">
                    Your data is stored securely and encrypted. We comply with GDPR and other privacy regulations.
                  </Text>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <Button variant="plain" tone="critical">
                      Delete All Tracking Data
                    </Button>
                  </div>
                  
                  <div style={{ marginTop: '0.5rem' }}>
                    <Button variant="plain" url="/privacy-policy" external>
                      View Privacy Policy
                    </Button>
                  </div>
                  
                  <div style={{ marginTop: '0.5rem' }}>
                    <Button variant="plain" url="/terms-of-service" external>
                      View Terms of Service
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ padding: '1.5rem' }}>
                <Text variant="headingMd" as="h2">
                  Support
                </Text>
                
                <div style={{ marginTop: '1rem' }}>
                  <Text as="p" tone="subdued">
                    Need help? Contact our support team.
                  </Text>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <Button url="mailto:support@quickshiptracker.com" external>
                      Contact Support
                    </Button>
                  </div>
                  
                  <div style={{ marginTop: '0.5rem' }}>
                    <Button variant="plain" url="/docs" external>
                      View Documentation
                    </Button>
                  </div>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <Text as="p" tone="subdued" variant="bodySm">
                      App Version: 1.0.0
                    </Text>
                  </div>
                </div>
              </div>
            </Card>
          </Layout.Section>
        </Layout>

        {toastActive && (
          <Toast
            content={toastMessage}
            onDismiss={toggleToast}
          />
        )}
      </Page>
    </NavigationLayout>
  );
}