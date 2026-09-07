import { Trash2 } from "lucide-react";
import { Button } from "./Button";

type DeleteIconProps = {
  size?: number;
};

type DeleteIconButtonProps = {
  disabled?: boolean;
  label?: string;
  onClick: () => void;
};

export const CommonDeleteIcon = ({ size = 18 }: DeleteIconProps) => <Trash2 size={size} strokeWidth={2} />;

export const CommonDeleteIconButton = ({ disabled, label = "Remove", onClick }: DeleteIconButtonProps) => (
  <Button
    type="button"
    variant="danger"
    className="h-[46px] w-[46px] min-w-[46px] rounded-[var(--radius-control)] px-0"
    disabled={disabled}
    aria-label={label}
    title={label}
    onClick={onClick}
  >
    <CommonDeleteIcon size={18} />
  </Button>
);
