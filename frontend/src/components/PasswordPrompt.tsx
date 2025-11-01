/**
 * Password Prompt Dialog
 * Shown when accessing password-protected shared map
 */

import { useState } from 'react';
import './PasswordPrompt.css';

interface PasswordPromptProps {
  onSubmit: (password: string) => void;
  onCancel: () => void;
  error?: string;
}

export default function PasswordPrompt({
  onSubmit,
  onCancel,
  error
}: PasswordPromptProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      onSubmit(password);
    }
  };

  return (
    <div className="modal-overlay password-prompt-overlay">
      <div className="modal-content password-prompt">
        <h2>Password Required</h2>
        <p>This map is password protected. Please enter the password to view it.</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group password-input-group">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoFocus
              className="password-input"
            />
            <button
              type="button"
              className="btn-toggle-password"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>

          {error && (
            <div className="error-message">{error}</div>
          )}

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={!password.trim()}>
              Access Map
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

