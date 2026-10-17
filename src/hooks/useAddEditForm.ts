import { useState } from "react";
import { CommonErrorMessageUtil } from "../lib/CommonErrorMessageUtil";
import { CommonSuccessMessageUtil } from "../lib/CommonSuccessMessageUtil";
import { notificationService } from "../services/notificationService";
import { useApiFormFeedback, useApiMessage } from "./useApiFeedback";

/**
 * Add/Edit form + Delete + Logs ki common wiring (har master page me same hoti hai).
 * Fields ka JSX page me hi rahega — yaha sirf kholna/band karna/save/delete handle hota hai.
 */
export function useAddEditForm<
  TEntity extends { id: number },
  TFormValues,
  TRequest = unknown
>({
  emptyForm,
  toFormValues,
  buildRequest,
  create,
  update,
  remove,
  entityName,
  validate,
  errorMessage,
  onSaved
}: {
  emptyForm: TFormValues;
  toFormValues: (entity: TEntity) => TFormValues;
  buildRequest: (formValues: TFormValues, editingEntity: TEntity | null) => TRequest;
  create: (payload: TRequest) => Promise<unknown>;
  update: (id: number, payload: TRequest) => Promise<unknown>;
  remove: (id: number) => Promise<unknown>;
  entityName: string;
  validate?: (formValues: TFormValues) => string | null;
  errorMessage?: string;
  onSaved?: (context: { wasEditing: boolean; wasDelete: boolean; deletedId?: number }) => void | Promise<void>;
}) {
  const { clearMessage, setApiError } = useApiMessage();
  const { fieldErrors, clearFeedback, applyApiError } = useApiFormFeedback();
  const [formOpen, setFormOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<TEntity | null>(null);
  const [formValues, setFormValues] = useState<TFormValues>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TEntity | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [logsTarget, setLogsTarget] = useState<TEntity | null>(null);

  const openAddForm = (overrideValues?: TFormValues) => {
    setEditingEntity(null);
    setFormValues(overrideValues ?? emptyForm);
    clearFeedback();
    setFormOpen(true);
  };

  const openEditForm = (entity: TEntity) => {
    setEditingEntity(entity);
    setFormValues(toFormValues(entity));
    clearFeedback();
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
  };

  const saveForm = async () => {
    clearFeedback();
    const validationError = validate?.(formValues);
    if (validationError) {
      notificationService.showError(validationError);
      return;
    }
    setSaving(true);
    try {
      const payload = buildRequest(formValues, editingEntity);
      if (editingEntity) {
        await update(editingEntity.id, payload);
        notificationService.showSuccess(CommonSuccessMessageUtil.updated(entityName));
      } else {
        await create(payload);
        notificationService.showSuccess(CommonSuccessMessageUtil.created(entityName));
      }
      setFormOpen(false);
      clearMessage();
      await onSaved?.({ wasEditing: Boolean(editingEntity), wasDelete: false });
    } catch (err: any) {
      applyApiError(err, errorMessage ?? `Unable to save ${entityName}`);
    } finally {
      setSaving(false);
    }
  };

  const askDelete = (entity: TEntity) => {
    setDeleteTarget(entity);
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    setDeleting(true);
    try {
      await remove(deleteTarget.id);
      clearMessage();
      await onSaved?.({ wasEditing: false, wasDelete: true, deletedId: deleteTarget.id });
      setDeleteTarget(null);
      notificationService.showSuccess(CommonSuccessMessageUtil.deleted(entityName));
    } catch (err: any) {
      setApiError(err, CommonErrorMessageUtil.deleteFailed);
    } finally {
      setDeleting(false);
    }
  };

  const openLogs = (entity: TEntity) => {
    setLogsTarget(entity);
  };

  const closeLogs = () => {
    setLogsTarget(null);
  };

  return {
    formOpen,
    editingEntity,
    formValues,
    setFormValues,
    saving,
    fieldErrors,
    openAddForm,
    openEditForm,
    closeForm,
    saveForm,
    deleteTarget,
    askDelete,
    cancelDelete,
    confirmDelete,
    deleting,
    logsTarget,
    openLogs,
    closeLogs
  };
}
