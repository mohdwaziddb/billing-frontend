import { notificationService } from "../services/notificationService";

export const handlePermissionDenied = () => {
  notificationService.handlePermissionDenied();
};
