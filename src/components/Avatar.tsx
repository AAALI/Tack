import { avatarColor, initials } from "@/lib/types";

export default function Avatar({
  name,
  size = 20,
}: {
  name: string | null | undefined;
  size?: number;
}) {
  return (
    <span
      className="rounded-full flex items-center justify-center text-white font-semibold shrink-0"
      style={{
        background: name ? avatarColor(name) : "#9AA39E",
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
      }}
      title={name ?? "Unassigned"}
    >
      {initials(name)}
    </span>
  );
}
