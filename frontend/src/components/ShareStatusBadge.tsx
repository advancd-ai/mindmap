/**
 * Share Status Badge
 * Displays share status on map cards in dashboard
 */

import './ShareStatusBadge.css';

interface ShareStatusBadgeProps {
  isShared: boolean;
  viewCount?: number;
  onClick?: () => void;
}

export default function ShareStatusBadge({
  isShared,
  viewCount,
  onClick
}: ShareStatusBadgeProps) {
  if (!isShared) return null;

  return (
    <div 
      className="share-status-badge"
      onClick={onClick}
      title="This map is shared"
    >
      <span className="share-icon">🔗</span>
      {viewCount !== undefined && viewCount > 0 && (
        <span className="share-views">{viewCount}</span>
      )}
    </div>
  );
}

