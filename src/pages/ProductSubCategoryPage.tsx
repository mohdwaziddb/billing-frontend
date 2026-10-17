import { useEffect, useMemo, useState } from "react";
import { Download, History, Pencil } from "lucide-react";
import { createProductSubCategory, deleteProductSubCategory, getProductSubCategoriesPage, updateProductSubCategory } from "../api/productSubCategories";
import { getProductCategories } from "../api/productCategories";
import { ActionDropdown } from "../components/ActionDropdown";
import { AuditLogModal } from "../components/AuditLogModal";
import { Button } from "../components/Button";
import { applyVisibleColumns } from "../components/CommonColumnSelector";
import { CommonDeleteIcon } from "../components/CommonDeleteAction";
import { CommonDeleteModal } from "../components/CommonDeleteModal";
import { CommonListPage } from "../components/CommonListPage";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { Select } from "../components/Select";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { useAddEditForm } from "../hooks/useAddEditForm";
import { useApiMessage } from "../hooks/useApiFeedback";
import { useListPage } from "../hooks/useListPage";
import { exportToExcel } from "../lib/excelExport";
import { formatDateTime } from "../lib/format";
import type { ProductCategory, ProductSubCategory, ProductSubCategoryRequest } from "../types/api";

type SubCategoryFilters = {
  search: string;
  categoryId: string;
  status: string;
};

type FormState = {
  categoryId: string;
  subCategoryName: string;
  description: string;
  active: string;
};

const emptyFilters: SubCategoryFilters = {
  search: "",
  categoryId: "",
  status: "active"
};

const emptyForm: FormState = {
  categoryId: "",
  subCategoryName: "",
  description: "",
  active: "true"
};

export const ProductSubCategoryPage = () => {
  const { can } = useAuth();
  const canAdd = can("PRODUCT_SUB_CATEGORIES", "ADD");
  const canEdit = can("PRODUCT_SUB_CATEGORIES", "EDIT");
  const canDelete = can("PRODUCT_SUB_CATEGORIES", "DELETE");
  const canExport = can("PRODUCT_SUB_CATEGORIES", "EXPORT");
  const { setApiError } = useApiMessage();
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ label: category.categoryName, value: String(category.id) })),
    [categories]
  );

  useEffect(() => {
    void getProductCategories({ active: true, size: 1000 })
      .then((categoryData) => setCategories(categoryData.filter((category) => category.active)))
      .catch((err: any) => setApiError(err, "Unable to load product categories"));
  }, [setApiError]);

  const list = useListPage<ProductSubCategory, SubCategoryFilters>({
    initialFilters: emptyFilters,
    errorMessage: "Unable to load product sub categories",
    fetchPage: ({ page, size, search, filters }) =>
      getProductSubCategoriesPage({
        search: search.trim() || undefined,
        active: filters.status === "active" ? true : filters.status === "inactive" ? false : undefined,
        categoryId: filters.categoryId ? Number(filters.categoryId) : undefined,
        page,
        size
      })
  });

  const form = useAddEditForm<ProductSubCategory, FormState, ProductSubCategoryRequest>({
    emptyForm,
    entityName: "Product Sub Category",
    errorMessage: "Unable to save product sub category",
    toFormValues: (subCategory) => ({
      categoryId: String(subCategory.categoryId),
      subCategoryName: subCategory.subCategoryName,
      description: subCategory.description ?? "",
      active: subCategory.active ? "true" : "false"
    }),
    buildRequest: (values) => ({
      categoryId: Number(values.categoryId),
      subCategoryName: values.subCategoryName.trim(),
      description: values.description.trim() || undefined,
      active: values.active === "true"
    }),
    create: createProductSubCategory,
    update: updateProductSubCategory,
    remove: deleteProductSubCategory,
    onSaved: list.refreshTable
  });

  const canSaveSubCategory = Boolean(form.formValues.categoryId && form.formValues.subCategoryName.trim());
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const subCategoryColumns = useMemo(() => [
    { key: "categoryName", header: "Category Name", render: (item: ProductSubCategory) => <span className="font-semibold text-white">{item.categoryName}</span> },
    { key: "subCategoryName", header: "Sub Category Name", render: (item: ProductSubCategory) => <span className="font-semibold text-white">{item.subCategoryName}</span> },
    { key: "description", header: "Description", render: (item: ProductSubCategory) => item.description ?? "--" },
    { key: "status", header: "Status", render: (item: ProductSubCategory) => <StatusBadge label={item.active ? "ACTIVE" : "INACTIVE"} /> },
    { key: "createdAt", header: "Created At", render: (item: ProductSubCategory) => formatDateTime(item.createdAt) }
  ], []);
  const visibleSubCategoryColumns = useMemo(() => applyVisibleColumns(subCategoryColumns, visibleColumns), [subCategoryColumns, visibleColumns]);

  return (
    <CommonListPage<ProductSubCategory, SubCategoryFilters>
      pageTitle="Product Sub Categories"
      pageSubtitle="Manage product sub category names, descriptions, active status, and parent category setup."
      list={list}
      searchPlaceholder="Search Sub Category"
      activeFilterCount={(filters) => (filters.categoryId ? 1 : 0) + (filters.status !== "active" ? 1 : 0)}
      filterFields={
        <>
          <Select
            label="Category Filter"
            placeholder={null}
            value={list.formFilters.categoryId}
            onChange={(event) => list.updateFormFilters({ categoryId: event.target.value })}
            options={[
              { label: "All Categories", value: "" },
              ...categoryOptions
            ]}
          />
          <Select
            label="Status Filter"
            placeholder={null}
            value={list.formFilters.status}
            onChange={(event) => list.updateFormFilters({ status: event.target.value })}
            options={[
              { label: "All Sub Categories", value: "all" },
              { label: "Active Only", value: "active" },
              { label: "Inactive Only", value: "inactive" }
            ]}
          />
        </>
      }
      toolbarButtons={
        <>
          {canExport ? (
            <Button
              type="button"
              variant="secondary"
              disabled={!list.tableData.length}
              onClick={() =>
                exportToExcel("product-sub-categories.xlsx", list.tableData, [
                  { key: "categoryName", header: "Category Name" },
                  { key: "subCategoryName", header: "Sub Category Name" },
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
          {canAdd ? <Button onClick={() => form.openAddForm()}>Add Sub Category</Button> : null}
        </>
      }
      columnSelector={{ tableName: "PRODUCT_SUB_CATEGORIES", columns: subCategoryColumns, visible: visibleColumns, onChange: setVisibleColumns, lockedKeys: ["subCategoryName"] }}
      tableColumns={[
        ...visibleSubCategoryColumns,
        {
          key: "actions",
          header: "Actions",
          className: "text-right",
          render: (item: ProductSubCategory) => (
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
                  hidden: !can("PRODUCT_SUB_CATEGORIES", "LOGS"),
                  onClick: () => form.openLogs(item)
                },
                {
                  label: "Delete",
                  icon: <CommonDeleteIcon />,
                  danger: true,
                  hidden: !canDelete,
                  onClick: () => form.askDelete(item)
                }
              ]}
            />
          )
        }
      ]}
      emptyMessage="No product sub categories found."
      fullHeight
      modals={
        <>
          <Modal open={form.formOpen} title={form.editingEntity ? "Edit Sub Category" : "Add Sub Category"} onClose={form.closeForm}>
            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Product Category"
                requiredMark
                error={form.fieldErrors.categoryId}
                value={form.formValues.categoryId}
                options={categoryOptions}
                onChange={(event) => form.setFormValues((current) => ({ ...current, categoryId: event.target.value }))}
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
                label="Sub Category Name"
                requiredMark
                error={form.fieldErrors.subCategoryName}
                value={form.formValues.subCategoryName}
                onChange={(event) => form.setFormValues((current) => ({ ...current, subCategoryName: event.target.value }))}
              />
              <Input
                label="Description"
                className="md:col-span-2"
                error={form.fieldErrors.description}
                value={form.formValues.description}
                onChange={(event) => form.setFormValues((current) => ({ ...current, description: event.target.value }))}
              />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button disabled={form.saving || !canSaveSubCategory} onClick={() => void form.saveForm()}>
                {form.saving ? "Saving..." : form.editingEntity ? "Update Sub Category" : "Create Sub Category"}
              </Button>
              <Button type="button" variant="ghost" onClick={form.closeForm}>
                Cancel
              </Button>
            </div>
          </Modal>
          <AuditLogModal open={Boolean(form.logsTarget)} moduleName="Product Sub Category" entityId={form.logsTarget?.id ?? null} title={form.logsTarget ? `${form.logsTarget.subCategoryName} Logs` : "Sub Category Logs"} onClose={form.closeLogs} />
          <CommonDeleteModal open={Boolean(form.deleteTarget)} loading={form.deleting} onCancel={form.cancelDelete} onConfirm={() => void form.confirmDelete()} />
        </>
      }
    />
  );
};
