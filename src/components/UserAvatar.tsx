import clsx from "clsx";
import { useEffect, useState } from "react";
import { resolveAssetUrl } from "../config/env";

const sizeClasses = {
  sm: "h-8 w-8 fs-12",
  md: "h-9 w-9 text-sm",
  lg: "h-20 w-20 fs-24"
} as const;

const initialsOf = (name?: string | null) => {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "U";
  }
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
};

/** User photo ya (photo na ho / load fail ho) to naam ke initials — header, list, profile sab jagah same. */
export const UserAvatar = ({
  name,
  photoUrl,
  size = "md",
  className
}: {
  name?: string | null;
  photoUrl?: string | null;
  size?: keyof typeof sizeClasses;
  className?: string;
}) => {
  // blob:/data: = abhi chuni file ka local preview; baaki stored URL (/uploads/... ya S3).
  const src = photoUrl && /^(blob:|data:)/.test(photoUrl) ? photoUrl : resolveAssetUrl(photoUrl);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <div
      className={clsx(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--theme-color)] bg-[image:var(--theme-gradient)] font-bold text-[var(--theme-contrast)]",
        sizeClasses[size],
        className
      )}
    >
      {src && !failed ? (
        <img className="h-full w-full object-cover" src={src} alt={name ? `${name} photo` : "User photo"} onError={() => setFailed(true)} />
      ) : (
        initialsOf(name)
      )}
    </div>
  );
};
