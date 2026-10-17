import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./Button";
import { CommonBreadcrumb, type BreadcrumbItem } from "./CommonBreadcrumb";
import { GlassCard } from "./GlassCard";

export const FormActionBar = ({
  items,
  backTo,
  formId,
  saveLabel,
  saving = false,
  saveDisabled = false,
  extraActions
}: {
  items: BreadcrumbItem[];
  backTo: string;
  formId: string;
  saveLabel: string;
  saving?: boolean;
  saveDisabled?: boolean;
  extraActions?: ReactNode;
}) => {
  const navigate = useNavigate();

  return (
    <GlassCard className="p-3.5 md:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CommonBreadcrumb items={items} />
        <div className="flex flex-wrap gap-2">
          {extraActions}
          <Button type="button" variant="secondary" onClick={() => navigate(backTo)}>
            <ArrowLeft size={16} />
            Back
          </Button>
          <Button disabled={saving || saveDisabled} type="submit" form={formId}>
            {saving ? "Saving..." : saveLabel}
          </Button>
        </div>
      </div>
    </GlassCard>
  );
};
