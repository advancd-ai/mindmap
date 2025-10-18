/**
 * NodeShape - 노드 형태 렌더링 컴포넌트
 * 타입에 따라 다른 SVG shape를 렌더링
 */

import type { NodeShapeType } from '../store/mindmap';

interface NodeShapeProps {
  x: number;
  y: number;
  w: number;
  h: number;
  nodeType?: NodeShapeType;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export default function NodeShape({ x, y, w, h, nodeType = 'rect', fill, stroke, strokeWidth }: NodeShapeProps) {
  const type = nodeType || 'rect';

  switch (type) {
    case 'circle': {
      // 원형 - 중심점과 반지름 계산
      const cx = x + w / 2;
      const cy = y + h / 2;
      const r = Math.min(w, h) / 2;
      return (
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );
    }

    case 'diamond': {
      // 마름모 - 결정 단계/분기점
      const points = `
        ${x + w / 2},${y}
        ${x + w},${y + h / 2}
        ${x + w / 2},${y + h}
        ${x},${y + h / 2}
      `;
      return (
        <polygon
          points={points}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );
    }

    case 'hex': {
      // 육각형
      const offset = w * 0.2;
      const points = `
        ${x + offset},${y}
        ${x + w - offset},${y}
        ${x + w},${y + h / 2}
        ${x + w - offset},${y + h}
        ${x + offset},${y + h}
        ${x},${y + h / 2}
      `;
      return (
        <polygon
          points={points}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );
    }

    case 'cloud': {
      // 구름형 - 부드러운 blob 형태
      const path = `
        M ${x + w * 0.25} ${y + h * 0.3}
        Q ${x} ${y + h * 0.3} ${x} ${y + h * 0.5}
        Q ${x} ${y + h * 0.8} ${x + w * 0.2} ${y + h}
        L ${x + w * 0.8} ${y + h}
        Q ${x + w} ${y + h * 0.8} ${x + w} ${y + h * 0.5}
        Q ${x + w} ${y + h * 0.2} ${x + w * 0.75} ${y}
        L ${x + w * 0.25} ${y}
        Q ${x} ${y} ${x} ${y + h * 0.3}
        Z
      `;
      return (
        <path
          d={path}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );
    }

    case 'capsule': {
      // 캡슐형 (라운드 엔드) - 진행 상태
      const radius = h / 2;
      return (
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx={radius}
          ry={radius}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );
    }

    case 'file': {
      // 파일형 - 우상단 접힌 모서리
      const foldSize = Math.min(w, h) * 0.2;
      const path = `
        M ${x} ${y}
        L ${x + w - foldSize} ${y}
        L ${x + w} ${y + foldSize}
        L ${x + w} ${y + h}
        L ${x} ${y + h}
        Z
        M ${x + w - foldSize} ${y}
        L ${x + w - foldSize} ${y + foldSize}
        L ${x + w} ${y + foldSize}
      `;
      return (
        <path
          d={path}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );
    }

    case 'card': {
      // 카드형 - 상단에 헤더 영역
      const headerHeight = h * 0.25;
      return (
        <g>
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            rx="10"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <line
            x1={x}
            y1={y + headerHeight}
            x2={x + w}
            y2={y + headerHeight}
            stroke={stroke}
            strokeWidth={strokeWidth}
            opacity="0.5"
          />
        </g>
      );
    }

    case 'rect':
    default: {
      // 사각형 - 기본 개념
      return (
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx="8"
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );
    }
  }
}

