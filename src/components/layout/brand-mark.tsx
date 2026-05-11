export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <div
      className="grid place-items-center rounded-lg bg-primary text-primary-foreground font-bold"
      style={{ height: size, width: size, fontSize: size * 0.45 }}
      aria-label="Tec5"
    >
      T5
    </div>
  );
}
