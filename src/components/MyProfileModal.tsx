import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { deleteMyPhoto, updateMyProfile, uploadMyPhoto } from "../api/users";
import { useAuth } from "../context/AuthContext";
import { useApiFormFeedback } from "../hooks/useApiFeedback";
import { CommonSuccessMessageUtil } from "../lib/CommonSuccessMessageUtil";
import { notificationService } from "../services/notificationService";
import { Button } from "./Button";
import { Input } from "./Input";
import { Modal } from "./Modal";
import { PhotoUploadField } from "./PhotoUploadField";
import { StatusBadge } from "./StatusBadge";
import { UserDevicesList } from "./UserDevicesList";

/**
 * Header se khulne wala "My Profile" (har role). Sirf naam + photo badalte hain;
 * email / mobile / username sirf dikhte hain — backend bhi /users/me par sirf
 * naam leta hai, isliye disabled hata ke bhejne par bhi save nahi hote.
 */
export const MyProfileModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { user, refreshProfile } = useAuth();
  const { fieldErrors, clearFeedback, applyApiError } = useApiFormFeedback();
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const readOnly = Boolean(user?.superAdmin);

  useEffect(() => {
    if (open) {
      clearFeedback();
      setFullName(user?.fullName ?? "");
    }
    // Sirf modal khulte waqt form bharo (typing ke beech profile refresh se overwrite na ho).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const trimmedName = fullName.trim();
  const nameError = !trimmedName ? "Full name is required" : trimmedName.length > 120 ? "Full name is too long" : null;
  const dirty = Boolean(user && trimmedName !== user.fullName);

  const handleSave = async () => {
    if (nameError) {
      notificationService.showError(nameError);
      return;
    }
    clearFeedback();
    setSaving(true);
    try {
      await updateMyProfile({ fullName: trimmedName });
      await refreshProfile();
      notificationService.showSuccess(CommonSuccessMessageUtil.updated("Profile"));
      onClose();
    } catch (error) {
      applyApiError(error, "Unable to update profile");
    } finally {
      setSaving(false);
    }
  };

  const changePhoto = async (file: File | null) => {
    setPhotoBusy(true);
    try {
      if (file) {
        await uploadMyPhoto(file);
      } else {
        await deleteMyPhoto();
      }
      await refreshProfile();
      notificationService.showSuccess(CommonSuccessMessageUtil.updated("Profile Photo"));
    } catch (error) {
      applyApiError(error, file ? "Unable to upload photo" : "Unable to remove photo");
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <Modal open={open} title="My Profile" eyebrow="Account" onClose={onClose} maxWidthClass="max-w-2xl">
      <div className="space-y-5">
        <PhotoUploadField
          name={trimmedName || user?.fullName}
          photoUrl={user?.photoUrl}
          busy={photoBusy}
          disabled={readOnly}
          hint="JPG, PNG or WEBP, up to 2 MB. Saved immediately."
          onSelect={(file) => void changePhoto(file)}
          onRemove={() => void changePhoto(null)}
        />

        {readOnly ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            You are signed in as super admin. This profile cannot be edited here.
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Full Name"
            requiredMark
            maxLength={120}
            disabled={readOnly}
            error={fieldErrors.fullName ?? (fullName && nameError ? nameError : undefined)}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
          <Input label="Username" value={user?.username ?? ""} disabled />
          <Input label="Email" value={user?.email ?? ""} disabled />
          <Input label="Mobile Number" value={user?.mobileNumber ?? ""} disabled />
        </div>
        <p className="fs-11 text-slate-500">Username, email and mobile number can be changed only by the company owner from Users.</p>

        {!readOnly && open ? (
          <section className="space-y-2 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-bold text-slate-800">My Devices</h3>
            <UserDevicesList />
          </section>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <StatusBadge label={user?.role} />
            {user?.company?.name ? <span>{user.company.name}</span> : null}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Close
            </Button>
            {!readOnly ? (
              <Button type="button" onClick={() => void handleSave()} disabled={saving || !dirty || Boolean(nameError)}>
                <Save size={16} />
                {saving ? "Saving…" : "Save"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </Modal>
  );
};
