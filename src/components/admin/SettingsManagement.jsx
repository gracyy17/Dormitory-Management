import React, { useEffect, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import AdminLayout from './AdminLayout';
import { db } from '../../lib/firebase';

const defaultSettings = {
  dormitoryName: 'Dormitory Management',
  supportEmail: '',
  supportPhone: '',
  allowEmailReminders: true,
  maintenanceEscalationDays: 3,
  defaultMonthlyRate: 0,
};

function SettingsManagement() {
  const [settings, setSettings] = useState(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      if (!db) {
        setError('Firestore is not configured.');
        setIsLoading(false);
        return;
      }

      try {
        const settingsRef = doc(db, 'settings', 'general');
        const settingsDoc = await getDoc(settingsRef);

        if (settingsDoc.exists()) {
          setSettings((prev) => ({ ...prev, ...settingsDoc.data() }));
        }
      } catch {
        setError('Unable to load settings right now.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!db) {
      setError('Firestore is not configured.');
      return;
    }

    setError('');
    setSuccess('');

    if (!settings.dormitoryName.trim()) {
      setError('Dormitory name is required.');
      return;
    }

    if (Number(settings.maintenanceEscalationDays) < 1 || Number(settings.maintenanceEscalationDays) > 30) {
      setError('Maintenance escalation days must be between 1 and 30.');
      return;
    }

    if (Number(settings.defaultMonthlyRate) < 0) {
      setError('Default monthly rate must be 0 or greater.');
      return;
    }

    setIsSaving(true);

    try {
      await setDoc(
        doc(db, 'settings', 'general'),
        {
          dormitoryName: settings.dormitoryName.trim(),
          supportEmail: settings.supportEmail.trim(),
          supportPhone: settings.supportPhone.trim(),
          allowEmailReminders: Boolean(settings.allowEmailReminders),
          maintenanceEscalationDays: Number(settings.maintenanceEscalationDays),
          defaultMonthlyRate: Number(settings.defaultMonthlyRate),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setSuccess('Settings saved successfully.');
    } catch {
      setError('Unable to save settings right now.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="rooms-management-page">
        <div className="page-header">
          <h1>Settings</h1>
          <p className="page-subtitle">Configure default system values for admin operations.</p>
        </div>

        <section className="dashboard-widget">
          <div className="widget-header">
            <h2>General Settings</h2>
          </div>

          {isLoading ? (
            <p>Loading settings...</p>
          ) : (
            <form className="add-room-form" onSubmit={handleSave}>
              <div className="form-group">
                <label>Dormitory Name</label>
                <input
                  type="text"
                  name="dormitoryName"
                  value={settings.dormitoryName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Support Email</label>
                <input
                  type="email"
                  name="supportEmail"
                  value={settings.supportEmail}
                  onChange={handleChange}
                  placeholder="support@example.com"
                />
              </div>

              <div className="form-group">
                <label>Support Phone</label>
                <input
                  type="text"
                  name="supportPhone"
                  value={settings.supportPhone}
                  onChange={handleChange}
                  placeholder="09171234567"
                />
              </div>

              <div className="form-group">
                <label>Maintenance Escalation Days</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  name="maintenanceEscalationDays"
                  value={settings.maintenanceEscalationDays}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Default Monthly Rate</label>
                <input
                  type="number"
                  min="0"
                  name="defaultMonthlyRate"
                  value={settings.defaultMonthlyRate}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    name="allowEmailReminders"
                    checked={settings.allowEmailReminders}
                    onChange={handleChange}
                    style={{ marginRight: 8 }}
                  />
                  Enable Email Reminder Features
                </label>
              </div>

              {error && <p style={{ color: '#b91c1c', marginTop: 4 }}>{error}</p>}
              {success && <p style={{ color: '#166534', marginTop: 4 }}>{success}</p>}

              <div className="modal-actions" style={{ marginTop: 8 }}>
                <button type="submit" className="btn-primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}

export default SettingsManagement;
