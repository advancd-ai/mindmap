/**
 * ProgressIndicator - Loading progress overlay
 */

import './ProgressIndicator.css';

interface ProgressStep {
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}

interface ProgressIndicatorProps {
  steps: ProgressStep[];
  message?: string;
}

export default function ProgressIndicator({ steps, message }: ProgressIndicatorProps) {
  return (
    <div className="progress-overlay">
      <div className="progress-dialog">
        <div className="progress-spinner">
          <div className="spinner"></div>
        </div>
        
        {message && <p className="progress-message">{message}</p>}
        
        <div className="progress-steps">
          {steps.map((step, index) => (
            <div key={index} className={`progress-step ${step.status}`}>
              <div className="step-indicator">
                {step.status === 'completed' && <span className="step-icon">✓</span>}
                {step.status === 'error' && <span className="step-icon">✕</span>}
                {step.status === 'active' && <span className="step-icon spinner-small"></span>}
                {step.status === 'pending' && <span className="step-icon">○</span>}
              </div>
              <span className="step-label">{step.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

