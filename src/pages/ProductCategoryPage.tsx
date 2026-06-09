import { useEffect, useState } from "react";
import { Download, History, Pencil, Trash2 } from "lucide-react";
import { createProductCategory, deleteProductCategory, getProductCategoriesPage, updateProductCategory } from "../api/productCategories";
import { ActionDropdown } from "../components/ActionDropdown";
import { AuditLogModal } from "../components/AuditLogModal";
import { Button } from "../components/Button";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
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
import type { PageResponse, ProductCategory, ProductCategoryRequest } from "../types/api";

type FormState = {
  categoryName: string;
  description: string;
  active: string;
};

const emptyForm: FormState = {
  categoryName: "",
  description: "",
  active: "true"
};

const emptyCategoryPage: PageResponse<ProductCategory> = {
  records: [],
  page: 0,
  size: DEFAULT_PAGE_SIZE,
  totalRecords: 0,
  totalPages: 0
};

export const ProductCategoryPage = () => {
  const { can } = useAuth();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [categoryPage, setCategoryPage] = useState<PageResponse<ProductCategory>>(emptyCategoryPage);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductCategory | null>(null);
  const [logTarget, setLogTarget] = useState<ProductCategory | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { message: errorMessage, clearMessage, setApiError } = useApiMessage();
  const { message: formError, fieldErrors, clearFeedback, applyApiError } = useApiFormFeedback();

  const canAdd = can("PRODUCT_CATEGORY", "ADD");
  const canEdit = can("PRODUCT_CATEGORY", "EDIT");
  const canDelete = can("PRODUCT_CATEGORY", "DELETE");
  const canExport = can("PRODUCT_CATEGORY", "EXPORT");

  const loadCategories = async (nextPage = page) => {
    const active = statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined;
    const response = await getProductCategoriesPage({ search: search.trim() || undefined, active, page: nextPage, size: DEFAULT_PAGE_SIZE });
    setCategoryPage(response);
    setCategories(response.records);
  };

  useEffect(() => {
    setPage(0);
    void loadCategories(0).catch((err: any) => setApiError(err, "Unable to load product categories"));
  }, [statusFilter]);

  const openCreate = () => {
    setEditingCategory(null);
    setForm(emptyForm);
    clearFeedback();
    setFormOpen(true);
  };

  const openEdit = (category: ProductCategory) => {
    setEditingCategory(category);
    setForm({
      categoryName: category.categoryName,
      description: category.description ?? "",
      active: category.active ? "true" : "false"
    });
    clearFeedback();
    setFormOpen(true);
  };

  const saveCategory = async () => {
    clearFeedback();
    setSaving(true);
    const payload: ProductCategoryRequest = {
      categoryName: form.categoryName.trim(),
      description: form.description.trim() || undefined,
      active: form.active === "true"
    };

    try {
      if (editingCategory) {
        await updateProductCategory(editingCategory.id, payload);
        notificationService.showSuccess(CommonSuccessMessageUtil.updated("Product Category"));
      } else {
        await createProductCategory(payload);
        notificationService.showSuccess(CommonSuccessMessageUtil.created("Product Category"));
      }
      setFormOpen(false);
      clearMessage();
      await loadCategories(page);
    } catch (err: any) {
      applyApiError(err, "Unable to save product category");
    } finally {
      setSaving(false);
    }
  };

  const removeCategory = async () => {
    if (!deleteTarget) {
      return;
    }
    try {
      setDeleting(true);
      await deleteProductCategory(deleteTarget.id);
      clearMessage();
      await loadCategories(page);
      setDeleteTarget(null);
      notificationService.showSuccess(CommonSuccessMessageUtil.deleted("Product Category"));
    } catch (err: any) {
      setApiError(err, CommonErrorMessageUtil.deleteFailed);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-col space-y-4 pb-6">
      <Header
        title="Product Categories"
        subtitle="Manage product category names, descriptions, and active status for product setup."
      />
      {errorMessage ? (
        <div className="glass rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">
          {errorMessage}
        </div>
      ) : null}

      <GlassCard className="flex flex-1 flex-col p-6 md:p-7">
        <div className="mb-5 flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CommonBreadcrumb items={[{ label: "Product Categories" }]} />
            </div>
            <div className="flex flex-wrap gap-2">
              {canExport ? <Button type="button" variant="secondary" disabled={!categories.length} onClick={() => exportToExcel("product-categories.xlsx", categories, [
                { key: "categoryName", header: "Category Name" },
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
              {canAdd ? <Button onClick={openCreate}>Add Category</Button> : null}
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_160px]">
            <Input
              label="Search Category"
              placeholder="Enter Category Name"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  setPage(0);
                  void loadCategories(0);
                }
              }}
            />
            <Select
              label="Status Filter"
              placeholder={null}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              options={[
                { label: "All Categories", value: "all" },
                { label: "Active Only", value: "active" },
                { label: "Inactive Only", value: "inactive" }
              ]}
            />
            <div className="flex items-end">
              <Button className="w-full" variant="secondary" onClick={() => { setPage(0); void loadCategories(0); }}>
                Search
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <Table
            data={categories}
            emptyText="No product categories found."
            emptyAction={canAdd ? <Button onClick={openCreate}>Add Category</Button> : null}
            columns={[
            { key: "category", header: "Category Name", render: (item) => <span className="font-semibold text-white">{item.categoryName}</span> },
            { key: "description", header: "Description", render: (item) => item.description ?? "--" },
            { key: "status", header: "Status", render: (item) => <StatusBadge label={item.active ? "ACTIVE" : "INACTIVE"} /> },
            { key: "updated", header: "Updated At", render: (item) => formatDateTime(item.updatedAt) },
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
                      hidden: !can("PRODUCT_CATEGORY", "VIEW_LOGS"),
                      onClick: () => setLogTarget(item)
                    },
                    {
                      label: "Delete",
                      icon: <Trash2 size={15} />,
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
          page={categoryPage.page}
          size={categoryPage.size}
          totalRecords={categoryPage.totalRecords}
          totalPages={categoryPage.totalPages}
          onPageChange={(nextPage) => {
            setPage(nextPage);
            void loadCategories(nextPage);
          }}
          />
        </div>
      </GlassCard>

      <Modal open={formOpen} title={editingCategory ? "Edit Category" : "Add Category"} onClose={() => setFormOpen(false)}>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Category Name"
            requiredMark
            error={fieldErrors.categoryName}
            value={form.categoryName}
            onChange={(event) => setForm((current) => ({ ...current, categoryName: event.target.value }))}
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
            label="Description"
            className="md:col-span-2"
            error={fieldErrors.description}
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />
        </div>
        {formError ? <div className="mt-4 rounded-[24px] border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">{formError}</div> : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <Button disabled={saving} onClick={() => void saveCategory()}>
            {saving ? "Saving..." : editingCategory ? "Update Category" : "Create Category"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
      <AuditLogModal open={Boolean(logTarget)} moduleName="Product Category" entityId={logTarget?.id ?? null} title="Product Category Change History" onClose={() => setLogTarget(null)} />
      <CommonDeleteModal open={Boolean(deleteTarget)} loading={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={() => void removeCategory()} />
    </div>
  );
};
