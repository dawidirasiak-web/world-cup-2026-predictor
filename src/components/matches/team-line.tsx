import Image from "next/image";

export function TeamLine({
  name,
  flagUrl,
  align = "left",
}: {
  name: string;
  flagUrl?: string | null;
  align?: "left" | "right";
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
    >
      {flagUrl ? (
        <Image
          src={flagUrl}
          alt=""
          width={28}
          height={20}
          className="h-5 w-7 rounded-sm border border-slate-200 object-cover"
        />
      ) : (
        <span className="h-5 w-7 rounded-sm border border-slate-200 bg-slate-100" />
      )}
      <span>{name}</span>
    </span>
  );
}
