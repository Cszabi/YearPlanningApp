interface FlowkigaiLogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { height: 24, fontSize: "1rem" },       // text-base
  md: { height: 32, fontSize: "1.25rem" },    // text-xl
  lg: { height: 48, fontSize: "1.875rem" },   // text-3xl
} as const;

export default function FlowkigaiLogo({
  size = "md",
  showWordmark = true,
  className,
}: FlowkigaiLogoProps) {
  const { height, fontSize } = sizeMap[size];

  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
    >
      <img
        src="/icons/flowkigai-logo.png"
        alt="Flowkigai logo"
        style={{ height, width: "auto" }}
      />
      {showWordmark && (
        <span
          style={{
            fontFamily: "Georgia, serif",
            fontWeight: 600,
            fontSize,
            color: "inherit",
          }}
        >
          Flowkigai
        </span>
      )}
    </span>
  );
}
