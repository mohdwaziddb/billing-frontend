import { useEffect, useMemo, useState } from "react";
import { Download, History, Pencil } from "lucide-react";
import { createProductSubCategory, deleteProductSubCategory, getProductSubCategoriesPage, updateProductSubCategory } from "../api/productSubCategories";
import { getProductCategories } from "../api/productCategories";
import { ActionDropdown } from "../components/ActionDropdown";
import { AuditLogModal } from "../components/AuditLogModal";
import { Button } from "../components/Button";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
import { CommonDeleteIcon } from "../components/CommonDeleteAction";
import { CommonDeleteModal } from "../components/CommonDeleteModal";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { DEFAULT_PAGE_SIZE, Pagination } from "../components/Pagination";
import { Select } from "../components/Select";
import { StatusBadge } from "../components/StatusBadge";
import { Table } from "../components/Table";
import { useAuth } from "../context/AuthContext";
import { useApiFormFeedback, useApiMessage } from "../hooks/useApiFeedback";
import { CommonErrorMessageUtil } from "../lib/CommonErrorMessageUtil";
import { CommonSuccessMessageUtil } from "../lib/CommonSuccessMessageUtil";
import { exportToExcel } from "../lib/excelExport";
import { formatDateTime } from "../lib/format";
import { notificationService } from "../services/notificationService";
import type { PageResponse, ProductCategory, ProductSubCategory, ProductSubCategoryRequest } from "../types/api";

type FormState = {
  categoryId: string;
  subCategoryName: string;
  description: string;
  active: string;
};

const emptyForm: FormState = {
  categoryId: "",
  subCategoryName: "",
  description: "",
  active: "true"
};

const emptySubCategoryPage: PageResponse<ProductSubCategory> = {
  records: [],
  page: 0,
  size: DEFAULT_PAGE_SIZE,
  totalRecords: 0,
  totalPages: 0
};

export const ProductSubCategoryPage = () => {
  const { can } = useAuth();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [subCategories, setSubCategories] = useState<ProductSubCategory[]>([]);
  const [subCategoryPage, setSubCategoryPage] = useState<PageResponse<ProductSubCategory>>(emptySubCategoryPage);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [editingSubCategory, setEditingSubCategory] = useState<ProductSubCategory | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductSubCategory | null>(null);
  const [logTarget, setLogTarget] = useState<ProductSubCategory | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { clearMessage, setApiError } = useApiMessage();
  const { fieldErrors, clearFeedback, applyApiError } = useApiFormFeedback();

  const canAdd = can("PRODUCT_SUB_CATEGORIES", "ADD");
  const canEdit = can("PRODUCT_SUB_CATEGORIES", "EDIT");
  const canDelete = can("PRODUCT_SUB_CATEGORIES", "DELETE");
  const canExport = can("PRODUCT_SUB_CATEGORIES", "EXPORT");
  const canSaveSubCategory = Boolean(form.categoryId && form.subCategoryName.trim());

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ label: category.categoryName, value: String(category.id) })),
    [categories]
  );

  const loadSubCategories = async (nextPage = page, searchOverride = search) => {
    const active = statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined;
    const response = await getProductSubCategoriesPage({
      search: searchOverride.trim() || undefined,
      active,
      categoryId: categoryFilter ? Number(categoryFilter) : undefined,
      page: nextPage,
      size: DEFAULT_PAGE_SIZE
    });
    setSubCategoryPage(response);
    setSubCategories(response.records);
  };

  useEffect(() => {
    void getProductCategories({ active: true, size: 1000 })
      .then((categoryData) => setCategories(categoryData.filter((category) => category.active)))
      .catch((err: any) => setApiError(err, "Unable to load product categories"));
  }, [setApiError]);

  useEffect(() => {
    setPage(0);
    void loadSubCategories(0).catch((err: any) => setApiError(err, "Unable to load product sub categories"));
  }, [statusFilter, categoryFilter]);

  const openCreate = () => {
    setEditingSubCategory(null);
    setForm(emptyForm);
    clearFeedback();
    setFormOpen(true);
  };

  const openEdit = (subCategory: ProductSubCategory) => {
    setEditingSubCategory(subCategory);
    setForm({
      categoryId: String(subCategory.categoryId),
      subCategoryName: subCategory.subCategoryName,
      description: subCategory.description ?? "",
      active: subCategory.active ? "true" : "false"
    });
    clearFeedback();
    setFormOpen(true);
  };

  const saveSubCategory = async () => {
    clearFeedback();
    setSaving(true);
    const payload: ProductSubCategoryRequest = {
      categoryId: Number(form.categoryId),
      subCategoryName: form.subCategoryName.trim(),
      description: form.description.trim() || undefined,
      active: form.active === "true"
    };

    try {
      if (editingSubCategory) {
        await updateProductSubCategory(editingSubCategory.id, payload);
        notificationService.showSuccess(CommonSuccessMessageUtil.updated("Product Sub Category"));
      } else {
        await createProductSubCategory(payload);
        notificationService.showSuccess(CommonSuccessMessageUtil.created("Product Sub Category"));
      }
      setFormOpen(false);
      clearMessage();
      await loadSubCategories(page);
    } catch (err: any) {
      applyApiError(err, "Unable to save product sub category");
    } finally {
      setSaving(false);
    }
  };

  const removeSubCategory = async () => {
    if (!deleteTarget) {
      return;
    }
    try {
      setDeleting(true);
      await deleteProductSubCategory(deleteTarget.id);
      clearMessage();
      await loadSubCategories(page);
      setDeleteTarget(null);
      notificationService.showSuccess(CommonSuccessMessageUtil.deleted("Product Sub Category"));
    } catch (err: any) {
      setApiError(err, CommonErrorMessageUtil.deleteFailed);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-col space-y-4 pb-6">
      <Header
        title="Product Sub Categories"
        subtitle="Manage product sub category names, descriptions, active status, and parent category setup."
      />
      <GlassCard className="flex flex-1 flex-col p-6 md:p-7">
        <div className="mb-5 flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CommonBreadcrumb items={[{ label: "Product Categories", to: "/setup/product-categories" }, { label: "Product Sub Categories" }]} />
            </div>
            <div className="flex flex-wrap gap-2">
              {canExport ? <Button type="button" variant="secondary" disabled={!subCategories.length} onClick={() => exportToExcel("product-sub-categories.xlsx", subCategories, [
                { key: "categoryName", header: "Category Name" },
                { key: "subCategoryName", header: "Sub Category Name" },
                { key: "description", header: "Description" },
                { key: "active", header: "Status", value: (row) => row.active ? "Active" : "Inactive" },
                { key: "createdAt", header: "Created At", type: "date" },
                { key: "updatedAt", header: "Updated At", type: "date" },
                { key: "createdBy", header: "Created By" },
                { key: "updatedBy", header: "Updated By" }
              ])}>
                <Download size={16} />
                Export Excel
              </Button> : null}
              {canAdd ? <Button onClick={openCreate}>Add Sub Category</Button> : null}
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_160px]">
            <Input
              label="Search Sub Category"
              placeholder="Enter Category or Sub Category"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onClear={() => {
                setPage(0);
                setSearch("");
                void loadSubCategories(0, "");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  setPage(0);
                  void loadSubCategories(0);
                }
              }}
            />
            <Select
              label="Category Filter"
              placeholder={null}
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              options={[
                { label: "All Categories", value: "" },
                ...categoryOptions
              ]}
            />
            <Select
              label="Status Filter"
              placeholder={null}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              options={[
                { label: "All Sub Categories", value: "all" },
                { label: "Active Only", value: "active" },
                { label: "Inactive Only", value: "inactive" }
              ]}
            />
            <div className="flex items-end">
              <Button className="w-full" variant="secondary" onClick={() => { setPage(0); void loadSubCategories(0); }}>
                Search
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <Table
            data={subCategories}
            emptyText="No product sub categories found."
            emptyAction={canAdd ? <Button onClick={openCreate}>Add Sub Category</Button> : null}
            columns={[
              { key: "categoryName", header: "Category Name", render: (item) => <span className="font-semibold text-white">{item.categoryName}</span> },
              { key: "subCategoryName", header: "Sub Category Name", render: (item) => <span className="font-semibold text-white">{item.subCategoryName}</span> },
              { key: "description", header: "Description", render: (item) => item.description ?? "--" },
              { key: "status", header: "Status", render: (item) => <StatusBadge label={item.active ? "ACTIVE" : "INACTIVE"} /> },
              { key: "createdAt", header: "Created At", render: (item) => formatDateTime(item.createdAt) },
              {
                key: "actions",
                header: "Actions",
                className: "text-right",
                render: (item) => (
                  <ActionDropdown
                    actions={[
                      {
                        label: "Edit",
                        icon: <Pencil size={15} />,
                        hidden: !canEdit,
                        onClick: () => openEdit(item)
                      },
                      {
                        label: "Show Logs",
                        icon: <History size={15} />,
                        hidden: !can("PRODUCT_SUB_CATEGORIES", "LOGS"),
                        onClick: () => setLogTarget(item)
                      },
                      {
                        label: "Delete",
                        icon: <CommonDeleteIcon />,
                        danger: true,
                        hidden: !canDelete,
                        onClick: () => setDeleteTarget(item)
                      }
                    ]}
                  />
                )
              }
            ]}
          />
        </div>
        <div className="mt-auto">
          <Pagination
            page={subCategoryPage.page}
            size={subCategoryPage.size}
            totalRecords={subCategoryPage.totalRecords}
            totalPages={subCategoryPage.totalPages}
            onPageChange={(nextPage) => {
              setPage(nextPage);
              void loadSubCategories(nextPage);
            }}
          />
        </div>
      </GlassCard>

      <Modal open={formOpen} title={editingSubCategory ? "Edit Sub Category" : "Add Sub Category"} onClose={() => setFormOpen(false)}>
        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Product Category"
            requiredMark
            error={fieldErrors.categoryId}
            value={form.categoryId}
            options={categoryOptions}
            onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
          />
          <Select
            label="Status"
            placeholder={null}
            value={form.active}
            onChange={(event) => setForm((current) => ({ ...current, active: event.target.value }))}
            options={[
              { label: "Active", value: "true" },
              { label: "Inactive", value: "false" }
            ]}
          />
          <Input
            label="Sub Category Name"
            requiredMark
            error={fieldErrors.subCategoryName}
            value={form.subCategoryName}
            onChange={(event) => setForm((current) => ({ ...current, subCategoryName: event.target.value }))}
          />
          <Input
            label="Description"
            className="md:col-span-2"
            error={fieldErrors.description}
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button disabled={saving || !canSaveSubCategory} onClick={() => void saveSubCategory()}>
            {saving ? "Saving..." : editingSubCategory ? "Update Sub Category" : "Create Sub Category"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
      <AuditLogModal open={Boolean(logTarget)} moduleName="Product Sub Category" entityId={logTarget?.id ?? null} title={logTarget ? `${logTarget.subCategoryName} Logs` : "Sub Category Logs"} onClose={() => setLogTarget(null)} />
      <CommonDeleteModal open={Boolean(deleteTarget)} loading={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={() => void removeSubCategory()} />
    </div>
  );
};
