import type { JobId } from '../game/types';

interface Props {
  jobId: JobId;
  size?: number;
  color?: string;
}

/**
 * ジョブ別 SVG アイコン。
 * スプライト画像が使えない場合のフォールバックとして使用。
 */
export default function JobIcon({ jobId, size = 48, color = '#fff' }: Props) {
  const s = size;
  const c = s / 2;

  switch (jobId) {
    case 'shielder':
      // 盾の形
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <path
            d="M24 4 L40 10 L40 26 C40 36 24 44 24 44 C24 44 8 36 8 26 L8 10 Z"
            fill={color} fillOpacity={0.9}
          />
          <path
            d="M24 10 L35 14.5 L35 26 C35 33 24 39 24 39 C24 39 13 33 13 26 L13 14.5 Z"
            fill="none" stroke={color} strokeWidth={1.5} strokeOpacity={0.4}
          />
          {/* 盾の十字紋 */}
          <line x1={24} y1={16} x2={24} y2={34} stroke={color} strokeWidth={2} strokeOpacity={0.5} />
          <line x1={16} y1={24} x2={32} y2={24} stroke={color} strokeWidth={2} strokeOpacity={0.5} />
        </svg>
      );

    case 'warrior':
      // 交差した剣
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          {/* 剣1: 左上→右下 */}
          <line x1={10} y1={10} x2={38} y2={38} stroke={color} strokeWidth={3.5} strokeLinecap="round" />
          <polygon points="10,10 7,18 15,15" fill={color} />
          <rect x={34} y={34} width={8} height={4} rx={1} fill={color} transform="rotate(45 38 36)" />
          {/* 剣2: 右上→左下 */}
          <line x1={38} y1={10} x2={10} y2={38} stroke={color} strokeWidth={3.5} strokeLinecap="round" />
          <polygon points="38,10 41,18 33,15" fill={color} />
          <rect x={6} y={34} width={8} height={4} rx={1} fill={color} transform="rotate(-45 10 36)" />
        </svg>
      );

    case 'spearman':
      // 槍
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          {/* 柄 */}
          <line x1={c} y1={42} x2={c} y2={12} stroke={color} strokeWidth={3} strokeLinecap="round" />
          {/* 穂先 */}
          <polygon
            points={`${c},4 ${c - 6},16 ${c},13 ${c + 6},16`}
            fill={color} fillOpacity={0.95}
          />
          {/* 石突き */}
          <polygon
            points={`${c},44 ${c - 3},40 ${c + 3},40`}
            fill={color} fillOpacity={0.7}
          />
        </svg>
      );

    case 'archer':
      // 弓と矢
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          {/* 弓 */}
          <path
            d="M14 6 Q8 24 14 42"
            fill="none" stroke={color} strokeWidth={3} strokeLinecap="round"
          />
          {/* 弦 */}
          <line x1={14} y1={6} x2={14} y2={42} stroke={color} strokeWidth={1.5} strokeOpacity={0.5} />
          {/* 矢 */}
          <line x1={14} y1={24} x2={38} y2={24} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
          {/* 矢尻 */}
          <polygon points="38,24 32,20 32,28" fill={color} />
          {/* 矢羽 */}
          <path d="M18 24 L14 20 M18 24 L14 28" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
        </svg>
      );

    case 'mage':
      // 魔法の杖と星
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          {/* 杖 */}
          <line x1={34} y1={14} x2={14} y2={44} stroke={color} strokeWidth={3} strokeLinecap="round" />
          {/* 星形 */}
          <polygon
            points="34,4 36,10 42,10 37,14 39,20 34,16 29,20 31,14 26,10 32,10"
            fill={color} fillOpacity={0.95}
          />
          {/* 魔法粒子 */}
          <circle cx={18} cy={30} r={2} fill={color} fillOpacity={0.6} />
          <circle cx={26} cy={22} r={1.5} fill={color} fillOpacity={0.4} />
          <circle cx={22} cy={36} r={1} fill={color} fillOpacity={0.5} />
        </svg>
      );

    default:
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <circle cx={c} cy={c} r={18} fill={color} fillOpacity={0.6} />
          <text x={c} y={c + 6} textAnchor="middle" fill={color} fontSize={18} fontWeight="bold">?</text>
        </svg>
      );
  }
}
