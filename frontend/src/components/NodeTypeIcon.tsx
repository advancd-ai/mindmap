/**
 * NodeTypeIcon - Icon based on node type/content
 * Embed 타입과 Node Shape 타입을 모두 고려
 */

import { type Node } from '../store/mindmap';
import AppleIcon from './AppleIcon';

interface NodeTypeIconProps {
  node: Node;
  x: number;
  y: number;
}

export default function NodeTypeIcon({ node, x, y }: NodeTypeIconProps) {
  const getIconName = () => {
    // Embed type이 우선
    if (node.embedType === 'youtube') return 'video';
    if (node.embedType === 'webpage') return 'globe';
    if (node.embedType === 'image') return 'image';
    if (node.embedType === 'pdf') return 'file';
    
    // Node shape type
    switch (node.nodeType) {
      case 'circle': return 'circle';
      case 'diamond': return 'diamond';
      case 'hex': return 'hexagon';
      case 'cloud': return 'cloud';
      case 'capsule': return 'capsule';
      case 'file': return 'file';
      case 'card': return 'card';
      case 'rect':
      default: return 'square';
    }
  };

  const getColor = () => {
    // Embed type이 우선
    if (node.embedType === 'youtube') return '#ff0000';
    if (node.embedType === 'webpage') return '#2563eb';
    if (node.embedType === 'image') return '#10b981';    // 에메랄드 - 이미지
    if (node.embedType === 'pdf') return '#dc2626';      // 빨간색 - PDF
    
    // Node shape type별 색상
    switch (node.nodeType) {
      case 'circle': return '#3B82F6';     // 파란색
      case 'diamond': return '#8B5CF6';    // 보라색 - 결정/분기
      case 'hex': return '#10B981';        // 에메랄드
      case 'cloud': return '#0EA5E9';      // 하늘색
      case 'capsule': return '#F59E0B';    // 앰버 - 진행 상태
      case 'file': return '#64748B';       // 회색 - 참고자료
      case 'card': return '#EC4899';       // 핑크
      case 'rect':
      default: return '#6b7280';           // 기본 회색
    }
  };

  return (
    <foreignObject
      x={x + 2}
      y={y + 2}
      width="28"
      height="28"
      className="node-type-icon"
    >
      <div 
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: getColor(),
          opacity: 0.12,
          borderRadius: '50%',
          color: getColor()
        }}
      >
        <AppleIcon 
          name={getIconName()} 
          size="medium" 
          weight="medium"
        />
      </div>
    </foreignObject>
  );
}
