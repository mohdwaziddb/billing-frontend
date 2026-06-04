import { Edit3, Plus, UserX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { createCompanyUser, deactivateCompanyUser, getCompanyUsers, updateCompanyUser } from "../api/users";
import { Button } from "../components/Button";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { Select } from "../components/Select";
import { StatusBadge } from "../components/StatusBadge";
import { Table } from "../components/Table";
import { useAuth } from "../context/AuthContext";
import { useApiFormFeedback, useApiMessage } from "../hooks/useApiFeedback";
import type { CompanyUserRequest, Role, UserProfile } from "../types/api";

type FormValues = {
  fullName: string;
  mobileNumber: string;
  email: string;
  password: string;
  role: Role;
  active: string;
};

const roleOptions: Array<{ label: string; value: Role }> = [
  { label: "Owner", value: "OWNER" },
  { label: "Admin", value: "ADMIN" },
  { label: "User", value: "USER" }
];

export const UserManagementPage = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { message: pageError, clearMessage, setApiError } = useApiMessage();
  const { message: formError, fieldErrors, clearFeedback, applyApiError } = useApiFormFeedback();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues: {
      fullName: "",
      mobileNumber: "",
      email: "",
      password: "",
      role: "USER",
      active: "true"
    }
  });

  const ownerCount = useMemo(() => users.filter((item) => item.role === "OWNER" && item.active).length, [users]);

  const loadUsers = async () => {
    setUsers(await getCompanyUsers());
  };

  useEffect(() => {
    if (user?.role === "OWNER") {
      void loadUsers().catch((err: any) => setApiError(err, "Unable to load users"));
    }
  }, [user?.role]);

  const openCreateModal = () => {
    clearFeedback();
    setEditingUser(null);
    reset({
      fullName: "",
      mobileNumber: "",
      email: "",
      password: "",
      role: "USER",
      active: "true"
    });
    setModalOpen(true);
  };

  const openEditModal = (target: UserProfile) => {
    clearFeedback();
    setEditingUser(target);
    reset({
      fullName: target.fullName,
      mobileNumber: target.mobileNumber,
      email: target.email,
      password: "",
      role: target.role,
      active: target.active ? "true" : "false"
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    clearFeedback();

    const payload: CompanyUserRequest = {
      fullName: values.fullName.trim(),
      mobileNumber: values.mobileNumber.trim(),
      email: values.email.trim(),
      role: values.role,
      active: values.active === "true"
    };

    if (values.password.trim()) {
      payload.password = values.password.trim();
    }

    try {
      if (editingUser) {
        await updateCompanyUser(editingUser.id, payload);
      } else {
        await createCompanyUser({ ...payload, password: values.password.trim() });
      }
      setModalOpen(false);
      clearMessage();
      await loadUsers();
    } catch (err: any) {
      applyApiError(err, editingUser ? "Unable to update user" : "Unable to create user");
    }
  };

  const deactivateUser = async (target: UserProfile) => {
    clearMessage();
    try {
      await deactivateCompanyUser(target.id);
      await loadUsers();
    } catch (err: any) {
      setApiError(err, "Unable to deactivate user");
    }
  };

  if (user?.role !== "OWNER") {
    return (
      <div className="space-y-4 pb-6">
        <Header title="Users" subtitle="Only owner users can manage company team access." />
        <GlassCard className="p-6 md:p-7">
          <p className="text-sm text-slate-300">You do not have permission to manage users.</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <Header title="Users" subtitle="Create, update, and deactivate company users from one owner-controlled workspace." />

      {pageError ? (
        <div className="glass rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">
          {pageError}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <GlassCard className="p-5">
          <p className="text-sm text-slate-400">Total users</p>
          <p className="mt-3 text-3xl font-extrabold text-white">{users.length}</p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-sm text-slate-400">Active owners</p>
          <p className="mt-3 text-3xl font-extrabold text-white">{ownerCount}</p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-sm text-slate-400">Active users</p>
          <p className="mt-3 text-3xl font-extrabold text-white">{users.filter((item) => item.active).length}</p>
        </GlassCard>
      </div>

      <GlassCard className="p-6 md:p-7">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Access control</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Company users</h2>
          </div>
          <Button type="button" onClick={openCreateModal}>
            <Plus size={16} />
            Add user
          </Button>
        </div>

        <Table
          data={users}
          emptyText="No company users found."
          columns={[
            {
              key: "name",
              header: "User",
              render: (item) => (
                <div className="min-w-[220px]">
                  <p className="font-semibold text-white">{item.fullName}</p>
                  <p className="text-xs text-slate-300">{item.mobileNumber}</p>
                  <p className="text-xs text-slate-400">{item.email}</p>
                </div>
              )
            },
            { key: "role", header: "Role", render: (item) => <StatusBadge label={item.role} /> },
            { key: "status", header: "Status", render: (item) => <StatusBadge label={item.active ? "ACTIVE" : "INACTIVE"} /> },
            {
              key: "actions",
              header: "Actions",
              render: (item) => (
                <div className="grid min-w-[190px] grid-cols-2 items-center gap-2">
                  <Button className="w-full min-h-10 px-3" type="button" variant="secondary" onClick={() => openEditModal(item)}>
                    <Edit3 size={15} />
                    Edit
                  </Button>
                  <Button className="w-full min-h-10 px-3" type="button" variant="danger" disabled={!item.active} onClick={() => void deactivateUser(item)}>
                    <UserX size={15} />
                    Disable
                  </Button>
                </div>
              )
            }
          ]}
        />
      </GlassCard>

      <Modal open={modalOpen} title={editingUser ? "Edit User" : "Add User"} onClose={() => setModalOpen(false)}>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Full Name"
            requiredMark
            error={fieldErrors.fullName ?? errors.fullName?.message}
            {...register("fullName", { required: "Full name is required" })}
          />
          <Input
            label="Email Address"
            requiredMark
            type="email"
            error={fieldErrors.email ?? errors.email?.message}
            {...register("email", { required: "Email address is required" })}
          />
          <Input
            label="Mobile Number"
            requiredMark
            type="tel"
            error={fieldErrors.mobileNumber ?? errors.mobileNumber?.message}
            {...register("mobileNumber", { required: "Mobile number is required" })}
          />
          <Input
            label={editingUser ? "New Password" : "Password"}
            requiredMark={!editingUser}
            type="password"
            hint={editingUser ? "Leave blank to keep the current password." : undefined}
            error={fieldErrors.password ?? errors.password?.message}
            {...register("password", {
              required: editingUser ? false : "Password is required",
              minLength: { value: 8, message: "Password must be at least 8 characters" }
            })}
          />
          <Select
            label="Role"
            requiredMark
            placeholder={null}
            error={fieldErrors.role}
            options={roleOptions}
            {...register("role", { required: "Role is required" })}
          />
          <Select
            label="Status"
            placeholder={null}
            error={fieldErrors.active}
            options={[
              { label: "Active", value: "true" },
              { label: "Inactive", value: "false" }
            ]}
            {...register("active")}
          />

          {formError ? (
            <div className="rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-200 md:col-span-2">
              {formError}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row md:col-span-2">
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : editingUser ? "Update User" : "Create User"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
