import { Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "./Button";

/**
 * List page toolbar ka "Import" button — sirf us module ke DataPort ki VIEW
 * permission par dikhe. Saari list pages yahi use karein (ek jaisa label/icon).
 */
export const DataPortLink = ({ menuCode, moduleKey }: { menuCode: string; moduleKey: string }) => {
  const { can } = useAuth();
  if (!can(menuCode, "VIEW")) {
    return null;
  }
  return (
    <Link to={`/data-port/${moduleKey}`}>
      <Button type="button" variant="secondary" title="Bulk import from Excel">
        <Upload size={16} />
        Import
      </Button>
    </Link>
  );
};
