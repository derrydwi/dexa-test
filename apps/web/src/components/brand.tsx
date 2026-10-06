import { House } from "lucide-react";

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={`brand ${light ? "light" : ""}`}>
      <span className="brand-mark">
        <House size={24} strokeWidth={1.8} />
      </span>
      <span>
        WFH<span className="brand-caption">Attendance</span>
      </span>
    </div>
  );
}
