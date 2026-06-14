import { Trash } from "lucide-react";
import { Button } from "./Button";

type DeleteIconProps = {
  size?: number;
};

type DeleteIconButtonProps = {
  disabled?: boolean;
  label?: string;
  onClick: () => void;
};

export const CommonDeleteIcon = ({ size = 15 }: DeleteIconProps) => <Trash size={size} strokeWidth={2.2} />;

export const CommonDeleteIconButton = ({ disabled, label = "Remove", onClick }: DeleteIconButtonProps) => (
  <Button
    type="button"
    variant="danger"
    className="h-10 w-10 min-w-0 rounded-full px-0"
    disabled={disabled}
    aria-label={label}
    title={label}
    onClick={onClick}
  >
    <CommonDeleteIcon size={17} />
  </Button>
);
