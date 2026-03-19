interface Props {
  className?: string;
}

export default function NorthStarIllustration({ className }: Props) {
  return (
    <svg
      viewBox="0 0 280 280"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="North Star illustration"
      role="img"
    >
      <style>{`
        @keyframes pulse-ray {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        .star-ray {
          animation: pulse-ray 3s ease-in-out infinite;
        }
      `}</style>

      {/* Amber glow ring */}
      <circle cx="140" cy="140" r="90" fill="#F5A623" opacity="0.15" />
      <circle cx="140" cy="140" r="70" fill="#F5A623" opacity="0.2" />

      {/* Animated rays */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x1 = 140 + 55 * Math.cos(rad);
        const y1 = 140 + 55 * Math.sin(rad);
        const x2 = 140 + 105 * Math.cos(rad);
        const y2 = 140 + 105 * Math.sin(rad);
        return (
          <line
            key={angle}
            className="star-ray"
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#F5A623"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ animationDelay: `${i * 0.375}s` }}
          />
        );
      })}

      {/* 8-pointed star */}
      <path
        d="M140,60 L148,125 L200,110 L157,148 L200,170 L148,155 L140,220 L132,155 L80,170 L123,148 L80,110 L132,125 Z"
        fill="#0D6E6E"
      />

      {/* Center highlight */}
      <circle cx="140" cy="140" r="10" fill="#FAFAF8" opacity="0.6" />
    </svg>
  );
}
