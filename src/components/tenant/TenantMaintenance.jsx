import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import StatusBadge from '../common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import {
  BellIcon,
  BoltIcon,
  CameraIcon,
  FaucetIcon,
  SettingsIcon,
  SnowflakeIcon,
  SofaIcon,
} from '../common/LineIcons';

const ISSUE_LIMIT = 500;
const ISSUE_PHOTO_MAX_BYTES = 500 * 1024;
const ISSUE_PHOTO_MAX_DATA_URL_LENGTH = 850000;

const MAINTENANCE_CATEGORIES = [
  { value: 'Plumbing', Icon: FaucetIcon },
  { value: 'Electrical', Icon: BoltIcon },
  { value: 'HVAC', Icon: SnowflakeIcon },
  { value: 'Furniture', Icon: SofaIcon },
  { value: 'General', Icon: SettingsIcon },
];

const PRIORITY_OPTIONS = ['Low', 'Normal', 'High', 'Urgent'];

const optimizeImageToDataUrl = (file, maxDimension = 900, quality = 0.82) => new Promise((resolve, reject) => {
  const reader = new FileReader();

  reader.onload = () => {
    const image = new Image();

    image.onload = () => {
      const largestSide = Math.max(image.width, image.height) || 1;
      const scale = Math.min(1, maxDimension / largestSide);
      const targetWidth = Math.max(1, Math.round(image.width * scale));
      const targetHeight = Math.max(1, Math.round(image.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Image processing is unavailable right now.'));
        return;
      }

      context.drawImage(image, 0, 0, targetWidth, targetHeight);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    image.onerror = () => reject(new Error('Image read failed.'));
    image.src = String(reader.result || '');
  };

  reader.onerror = () => reject(new Error('Image read failed.'));
  reader.readAsDataURL(file);
});

function TenantMaintenance() {
  const { user } = useAuth();
  const [category, setCategory] = useState('General');
  const [issueText, setIssueText] = useState('');
  const [submitStatus, setSubmitStatus] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [issuePhoto, setIssuePhoto] = useState(null);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (!db || !user?.uid) {
      return undefined;
    }

    const requestsQuery = query(collection(db, 'maintenanceRequests'), where('tenantUid', '==', user.uid));

    const unsubscribe = onSnapshot(
      requestsQuery,
      (snapshot) => {
        const rows = snapshot.docs
          .map((item) => {
            const data = item.data() || {};
            const created = data.createdAt?.toDate ? data.createdAt.toDate().toISOString().slice(0, 10) : '-';

            return {
              id: item.id,
              category: data.category || 'General',
              issue: data.issue || '-',
              createdAt: created,
              priority: data.priority || 'Normal',
              status: data.status || 'Pending',
            };
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        setRequests(rows);
      },
      () => {
        setRequests([]);
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  const handleSubmitIssue = async (event) => {
    event.preventDefault();

    const trimmedIssue = issueText.trim();
    if (!trimmedIssue) {
      setSubmitStatus('Please describe your room maintenance concern.');
      return;
    }

    if (!db || !user?.uid) {
      setSubmitStatus('Unable to submit maintenance request right now.');
      return;
    }

    let issuePhotoDataUrl = null;
    if (issuePhoto) {
      if (!String(issuePhoto.type || '').startsWith('image/')) {
        setSubmitStatus('Only image files are allowed for maintenance photos.');
        return;
      }

      if (Number(issuePhoto.size || 0) > ISSUE_PHOTO_MAX_BYTES) {
        setSubmitStatus('Photo is too large. Please upload an image under 500KB.');
        return;
      }

      try {
        issuePhotoDataUrl = await optimizeImageToDataUrl(issuePhoto);
        if (!issuePhotoDataUrl || issuePhotoDataUrl.length > ISSUE_PHOTO_MAX_DATA_URL_LENGTH) {
          setSubmitStatus('Photo could not be optimized safely. Try a smaller image.');
          return;
        }
      } catch {
        setSubmitStatus('Unable to process maintenance photo right now.');
        return;
      }
    }

    try {
      await addDoc(collection(db, 'maintenanceRequests'), {
        tenantUid: user.uid,
        tenantEmail: user.email || '',
        category,
        issue: trimmedIssue,
        priority,
        photoDataUrl: issuePhotoDataUrl,
        photoName: issuePhoto?.name || null,
        status: 'Pending',
        createdAt: serverTimestamp(),
      });
    } catch {
      setSubmitStatus('Unable to submit maintenance request right now.');
      return;
    }

    setIssueText('');
    setCategory('General');
    setPriority('Normal');
    setIssuePhoto(null);
    setSubmitStatus('Maintenance request submitted. Admin will review it soon.');
  };

  const requestRows = useMemo(() => requests, [requests]);

  const issueCount = issueText.length;

  const priorityTypeClass = (value) => `tenant-priority-${String(value || 'normal').toLowerCase()}`;

  const categoryIconMap = useMemo(
    () => Object.fromEntries(MAINTENANCE_CATEGORIES.map((item) => [item.value, item.Icon])),
    []
  );

  return (
    <section className="tenant-page">
      <header className="tenant-page-header tenant-maintenance-page-header">
        <div>
          <h1>Maintenance Requests</h1>
          <p>Monitoring room concerns and request history</p>
        </div>
        <div className="tenant-header-actions" aria-label="Maintenance utilities">
          <button type="button" className="tenant-header-action-btn" aria-label="Notifications">
            <BellIcon className="ui-icon" size={18} />
          </button>
          <button type="button" className="tenant-header-action-btn" aria-label="Settings">
            <SettingsIcon className="ui-icon" size={18} />
          </button>
        </div>
      </header>

      <form className="tenant-maintenance-form" onSubmit={handleSubmitIssue}>
        <div className="tenant-maintenance-top-row">
          <div>
            <label className="tenant-maintenance-label">New category</label>
            <div className="tenant-maintenance-categories" role="radiogroup" aria-label="Maintenance category">
              {MAINTENANCE_CATEGORIES.map((item) => {
                const CategoryIcon = item.Icon;

                return (
                  <button
                    key={item.value}
                    type="button"
                    className={category === item.value ? 'tenant-category-chip active' : 'tenant-category-chip'}
                    onClick={() => setCategory(item.value)}
                  >
                    <CategoryIcon className="ui-icon" size={15} />
                    <span>{item.value}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="tenant-maintenance-issue-row">
          <div>
            <div className="tenant-maintenance-issue-head">
              <label htmlFor="maintenance-issue">Describe the maintenance needed</label>
              <small>{issueCount}/{ISSUE_LIMIT}</small>
            </div>
            <textarea
              id="maintenance-issue"
              value={issueText}
              onChange={(event) => setIssueText(event.target.value.slice(0, ISSUE_LIMIT))}
              rows={4}
              placeholder="Example: The sink in Room 201 is leaking and water is dripping continuously."
              maxLength={ISSUE_LIMIT}
            />
          </div>

          <div>
            <label htmlFor="maintenance-photo" className="tenant-maintenance-label">Upload Photo of Issue (optional)</label>
            <label htmlFor="maintenance-photo" className="tenant-maintenance-upload">
              <CameraIcon className="ui-icon" size={31} />
              <span>{issuePhoto ? issuePhoto.name : 'Upload Photo Issue'}</span>
            </label>
            <input
              id="maintenance-photo"
              type="file"
              accept="image/*"
              onChange={(event) => setIssuePhoto(event.target.files?.[0] || null)}
            />
          </div>
        </div>

        <label htmlFor="maintenance-priority" className="tenant-maintenance-label">Priority</label>
        <select
          id="maintenance-priority"
          value={priority}
          onChange={(event) => setPriority(event.target.value)}
        >
          {PRIORITY_OPTIONS.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>

        <button type="submit" className="tenant-pay-btn tenant-maintenance-submit">Submit Maintenance Request</button>

        {submitStatus && <p className="tenant-payment-status">{submitStatus}</p>}
      </form>

      <section className="tenant-table-wrap">
        <div className="tenant-panel-header">
          <h2>History</h2>
        </div>

        {requestRows.length === 0 ? (
          <div className="tenant-history-empty">
            <p>No maintenance requests yet.</p>
            <small>Your submitted requests will appear here.</small>
          </div>
        ) : (
          <table className="tenant-simple-table tenant-maintenance-history-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Issue</th>
                <th>Date Filed</th>
                <th>Priority</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requestRows.map((row) => {
                const RowCategoryIcon = categoryIconMap[row.category] || SettingsIcon;

                return (
                  <tr key={row.id}>
                    <td>
                      <span className="tenant-maintenance-category-badge">
                        <RowCategoryIcon className="ui-icon" size={14} />
                        <span>{row.category}</span>
                      </span>
                    </td>
                    <td title={row.issue}>{row.issue}</td>
                    <td>{row.createdAt}</td>
                    <td>
                      <span className={priorityTypeClass(row.priority)}>
                        <i />
                        {row.priority}
                      </span>
                    </td>
                    <td><StatusBadge status={String(row.status).toUpperCase()} type={String(row.status).toLowerCase().replace(' ', '-')} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </section>
  );
}

export default TenantMaintenance;
