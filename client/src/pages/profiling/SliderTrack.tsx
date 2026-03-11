import { useCallback, useEffect, useRef, useState } from "react";

interface SliderTrackProps {
  value: number;
  onChange: (value: number) => void;
}

export function SliderTrack({ value, onChange }: SliderTrackProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const updateFromEvent = useCallback((clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    onChange(Math.round(pct));
  }, [onChange]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const x = "touches" in e ? e.touches[0].clientX : e.clientX;
      updateFromEvent(x);
    };
    const handleUp = () => setIsDragging(false);

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("touchmove", handleMove);
    document.addEventListener("mouseup", handleUp);
    document.addEventListener("touchend", handleUp);

    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      document.removeEventListener("touchend", handleUp);
    };
  }, [isDragging, updateFromEvent]);

  return (
    <div ref={trackRef} className="relative w-full h-1.5 bg-[var(--surface-alt)] rounded-[3px] cursor-pointer" onClick={(e) => updateFromEvent(e.clientX)}>
      <div className="absolute left-0 top-0 h-full rounded-[3px] transition-[width] duration-150" style={{ width: `${value}%`, background: "linear-gradient(90deg, #E94560, #F06B83)" }} />
      <div
        className="absolute top-1/2 -translate-y-1/2 w-[30px] h-[30px] bg-[var(--surface-card)] border-[3px] border-[#E94560] rounded-full cursor-grab active:cursor-grabbing active:scale-[1.15] z-[2] hover:shadow-[0_0_0_12px_rgba(233,69,96,0.08)] active:shadow-[0_0_0_18px_rgba(233,69,96,0.1)] transition-all"
        style={{ left: `${value}%`, transform: "translate(-50%, -50%)" }}
        onMouseDown={() => setIsDragging(true)}
        onTouchStart={() => setIsDragging(true)}
      />
    </div>
  );
}
