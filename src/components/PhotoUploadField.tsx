import { Camera, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { notificationService } from "../services/notificationService";
import { Button } from "./Button";
import { UserAvatar } from "./UserAvatar";

export const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
// Backend app.upload.max-bytes default (2 MB) — pehle hi bata do, upload ka wait na karwao.
const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

export const validatePhotoFile = (file: File): string | null => {
  if (!PHOTO_TYPES.includes(file.type)) {
    return "Only JPG, PNG, and WEBP images are allowed";
  }
  if (file.size > PHOTO_MAX_BYTES) {
    return "Image must be smaller than 2 MB";
  }
  return null;
};

/**
 * Common photo picker: avatar preview + Upload/Change + Remove.
 * `onSelect` ko validated file milti hai — turant upload karo (profile / edit user)
 * ya baad me (add user: save ke baad). `pendingFile` ho to uska local preview dikhta hai.
 */
export const PhotoUploadField = ({
  name,
  photoUrl,
  pendingFile,
  busy = false,
  disabled = false,
  onSelect,
  onRemove,
  hint = "JPG, PNG or WEBP, up to 2 MB."
}: {
  name?: string | null;
  photoUrl?: string | null;
  pendingFile?: File | null;
  busy?: boolean;
  disabled?: boolean;
  onSelect: (file: File) => void;
  onRemove?: () => void;
  hint?: string;
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  const shownUrl = previewUrl ?? photoUrl;
  const hasPhoto = Boolean(shownUrl);

  return (
    <div className="flex flex-wrap items-center gap-4">
      <UserAvatar name={name} photoUrl={shownUrl} size="lg" />
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <label
            className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 ${disabled || busy ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
          >
            <Camera size={16} />
            {busy ? "Uploading…" : hasPhoto ? "Change photo" : "Upload photo"}
            <input
              className="hidden"
              type="file"
              accept={PHOTO_ACCEPT}
              disabled={disabled || busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                // Same file dobara chunne par bhi onChange aaye.
                event.target.value = "";
                if (!file) {
                  return;
                }
                const error = validatePhotoFile(file);
                if (error) {
                  notificationService.showError(error);
                  return;
                }
                onSelect(file);
              }}
            />
          </label>
          {hasPhoto && onRemove ? (
            <Button type="button" variant="ghost" disabled={disabled || busy} onClick={onRemove}>
              <Trash2 size={15} />
              Remove
            </Button>
          ) : null}
        </div>
        <p className="fs-11 text-slate-500">{hint}</p>
      </div>
    </div>
  );
};
