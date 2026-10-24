import { useMemo, useState } from "react";
import { Download, History, Pencil, Plus } from "lucide-react";
import { createProductCategory, deleteProductCategory, getProductCategoriesPage, updateProductCategory } from "../api/productCategories";
import { ActionDropdown } from "../components/ActionDropdown";
import { AuditLogModal } from "../components/AuditLogModal";
import { Button } from "../components/Button";
import { applyVisibleColumns } from "../components/CommonColumnSelector";
import { CommonDeleteIcon } from "../components/CommonDeleteAction";
import { CommonDeleteModal } from "../components/CommonDeleteModal";
import { CommonListPage } from "../components/CommonListPage";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { ModalFormActions } from "../components/ModalFormActions";
import { Select } from "../components/Select";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { useAddEditForm } from "../hooks/useAddEditForm";
import { useListPage } from "../hooks/useListPage";
import { exportToExcel } from "../lib/excelExport";
import { formatDateTime } from "../lib/format";
import type { ProductCategory, ProductCategoryRequest } from "../types/api";

type CategoryFilters = {
  search: string;
  status: string;
};

type FormState = {
  categoryName: string;
  description: string;
  active: string;
};

const emptyFilters: CategoryFilters = {
  search: "",
  status: "active"
};

const emptyForm: FormState = {
  categoryName: "",
  description: "",
  active: "true"
};

export const ProductCategoryPage = () => {
  const { can } = useAuth();
  const canAdd = can("PRODUCT_CATEGORY", "ADD");
  const canEdit = can("PRODUCT_CATEGORY", "EDIT");
  const canDelete = can("PRODUCT_CATEGORY", "DELETE");
  const canExport = can("PRODUCT_CATEGORY", "EXPORT");

  const list = useListPage<ProductCategory, CategoryFilters>({
    initialFilters: emptyFilters,
    errorMessage: "Unable to load product categories",
    fetchPage: ({ page, size, search, filters }) =>
      getProductCategoriesPage({
        search: search.trim() || undefined,
        active: filters.status === "active" ? true : filters.status === "inactive" ? false : undefined,
        page,
        size
      })
  });

  const form = useAddEditForm<ProductCategory, FormState, ProductCategoryRequest>({
    emptyForm,
    entityName: "Product Category",
    errorMessage: "Unable to save product category",
    toFormValues: (category) => ({
      categoryName: category.categoryName,
      description: category.description ?? "",
      active: category.active ? "true" : "false"
    }),
    buildRequest: (values) => ({
      categoryName: values.categoryName.trim(),
      description: values.description.trim() || undefined,
      active: values.active === "true"
    }),
    create: createProductCategory,
    update: updateProductCategory,
    remove: deleteProductCategory,
    onSaved: list.refreshTable
  });

  const canSaveCategory = Boolean(form.formValues.categoryName.trim());
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const categoryColumns = useMemo(() => [
    { key: "category", header: "Category Name", render: (item: ProductCategory) => <span className="font-semibold text-white">{item.categoryName}</span> },
    { key: "description", header: "Description", render: (item: ProductCategory) => item.description ?? "--" },
    { key: "status", header: "Status", render: (item: ProductCategory) => <StatusBadge label={item.active ? "ACTIVE" : "INACTIVE"} /> },
    { key: "updated", header: "Updated At", render: (item: ProductCategory) => formatDateTime(item.updatedAt) }
  ], []);
  const visibleCategoryColumns = useMemo(() => applyVisibleColumns(categoryColumns, visibleColumns), [categoryColumns, visibleColumns]);

  return (
    <CommonListPage<ProductCategory, CategoryFilters>
      pageTitle="Product Categories"
      pageSubtitle="Manage product category names, descriptions, and active status for product setup."
      list={list}
      searchPlaceholder="Search Category"
      activeFilterCount={(filters) => (filters.status !== "active" ? 1 : 0)}
      filterFields={
        <Select
          label="Status Filter"
          placeholder={null}
          value={list.formFilters.status}
          onChange={(event) => list.updateFormFilters({ status: event.target.value })}
          options={[
            { label: "All Categories", value: "all" },
            { label: "Active Only", value: "active" },
            { label: "Inactive Only", value: "inactive" }
          ]}
        />
      }
      toolbarButtons={
        <>
          {canExport ? (
            <Button
              type="button"
              variant="secondary"
              disabled={!list.tableData.length}
              onClick={() =>
                exportToExcel("product-categories.xlsx", list.tableData, [
                  { key: "categoryName", header: "Category Name" },
                  { key: "description", header: "Description" },
                  { key: "active", header: "Status", value: (row) => row.active ? "Active" : "Inactive" },
                  { key: "createdAt", header: "Created At", type: "date" },
                  { key: "updatedAt", header: "Updated At", type: "date" },
                  { key: "createdBy", header: "Created By" },
                  { key: "updatedBy", header: "Updated By" }
                ])
              }
            >
              <Download size={16} />
              Export Excel
            </Button>
          ) : null}
          {canAdd ? <Button type="button" onClick={() => form.openAddForm()}><Plus size={16} />Add Category</Button> : null}
        </>
      }
      columnSelector={{ tableName: "PRODUCT_CATEGORY", columns: categoryColumns, visible: visibleColumns, onChange: setVisibleColumns, lockedKeys: ["category"] }}
      tableColumns={[
        ...visibleCategoryColumns,
        {
          key: "actions",
          header: "Actions",
          className: "text-right",
          render: (item: ProductCategory) => (
            <ActionDropdown
              actions={[
                {
                  label: "Edit",
                  icon: <Pencil size={15} />,
                  hidden: !canEdit,
                  onClick: () => form.openEditForm(item)
                },
                {
                  label: "Show Logs",
                  icon: <History size={15} />,
                  hidden: !can("PRODUCT_CATEGORY", "LOGS"),
                  onClick: () => form.openLogs(item)
                },
                {
                  label: "Delete",
                  icon: <CommonDeleteIcon />,
                  danger: true,
                  // Inactive record pehle se "deleted" (soft delete) hai — dobara Delete ka matlab nahi.
                  hidden: !canDelete || !item.active,
                  onClick: () => form.askDelete(item)
                }
              ]}
            />
          )
        }
      ]}
      emptyMessage="No product categories found."
      fullHeight
      modals={
        <>
          <Modal open={form.formOpen} eyebrow="Product Category" title={form.editingEntity ? "Edit Category" : "Add Category"} onClose={form.closeForm} maxWidthClass="max-w-2xl">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Category Name"
                requiredMark
                maxLength={100}
                error={form.fieldErrors.categoryName}
                value={form.formValues.categoryName}
                onChange={(event) => form.setFormValues((current) => ({ ...current, categoryName: event.target.value }))}
              />
              <Select
                label="Status"
                placeholder={null}
                value={form.formValues.active}
                onChange={(event) => form.setFormValues((current) => ({ ...current, active: event.target.value }))}
                options={[
                  { label: "Active", value: "true" },
                  { label: "Inactive", value: "false" }
                ]}
              />
              <Input
                label="Description"
                className="md:col-span-2"
                maxLength={1000}
                error={form.fieldErrors.description}
                value={form.formValues.description}
                onChange={(event) => form.setFormValues((current) => ({ ...current, description: event.target.value }))}
              />
            </div>
            <ModalFormActions editing={Boolean(form.editingEntity)} saving={form.saving} disabled={!canSaveCategory} entityLabel="Category" onCancel={form.closeForm} onSave={() => void form.saveForm()} />
          </Modal>
          <AuditLogModal open={Boolean(form.logsTarget)} moduleName="Product Category" entityId={form.logsTarget?.id ?? null} title={form.logsTarget ? `${form.logsTarget.categoryName} Logs` : "Category Logs"} onClose={form.closeLogs} />
          <CommonDeleteModal open={Boolean(form.deleteTarget)} itemName={form.deleteTarget?.categoryName} softDelete loading={form.deleting} onCancel={form.cancelDelete} onConfirm={() => void form.confirmDelete()} />
        </>
      }
    />
  );
};
