import { ArrowUpRight } from "lucide-react";
export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark">
        <ArrowUpRight size={23} strokeWidth={2.8} />
      </span>
      PayTrack<span className="brand-dot">.</span>
    </span>
  );
}
