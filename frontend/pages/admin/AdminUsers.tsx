// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { KeyRound, Pencil, Plus, Search, Shield, ShieldAlert, Trash2, UserCog, Users, Wrench, Eye, Lock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { TableSkeleton } from '../../components/ui/loading-spinner';
import Pagination from '../../components/ui/pagination';
import PageHeader from '../../components/ui/page-header';
import ResponsiveTabs from '../../components/ui/responsive-tabs';
import { useToast } from '../../hooks/use-toast';
import { adminAPI } from '../../services/api';
import { getApiErrorMessage } from '../../services/api-error';
import { createEmptyPageState, extractPaginatedResponse } from '../../lib/paginated-response';
import { getAdminRoleLabel, isPermissionActionLocked, togglePermissionKeySelection, useAdminAccess } from '../../lib/admin-rbac';

const tabs = [{ id: 'users', label: 'User', icon: Users }, { id: 'roles', label: 'Role & Permission', icon: Shield }];
const emptyUser = { username: '', email: '', password: '', adminRoleId: '' };
const emptyRole = { name: '', description: '', permissionKeys: [] };

export default function AdminUsers() {
  const { toast } = useToast();
  const access = useAdminAccess();
  const [activeTab, setActiveTab] = useState('users');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [roleSearch, setRoleSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState(createEmptyPageState(10));
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState(emptyUser);
  const [savingUser, setSavingUser] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleForm, setRoleForm] = useState(emptyRole);
  const [savingRole, setSavingRole] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState(null);

  const canCreate = access.hasPermission('admin_management.create');
  const canEdit = access.hasPermission('admin_management.edit');
  const canDelete = access.hasPermission('admin_management.delete');
  const canManage = access.hasPermission('admin_management.manage');

  useEffect(() => { void loadRoles(); }, []);
  useEffect(() => { void loadUsers(); }, [page, pageSize, userSearch]);

  useEffect(() => {
    if (!roles.length) {
      setSelectedRoleId(null);
      return;
    }

    setSelectedRoleId((current) => (roles.some((role) => role.id === current) ? current : roles[0].id));
  }, [roles]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await adminAPI.getAdminUsers({ page, pageSize, search: userSearch || undefined });
      const next = extractPaginatedResponse(res.data, pageSize);
      setUsers(next.items || []);
      setPagination(next);
    } catch (error) {
      toast({ title: 'Gagal memuat admin', description: getApiErrorMessage(error, 'Daftar admin belum bisa dimuat.'), variant: 'destructive' });
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadRoles = async () => {
    setLoadingRoles(true);
    try {
      const [rolesRes, permissionsRes] = await Promise.all([adminAPI.getAdminRoles(), adminAPI.getPermissionCatalog()]);
      setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : []);
      setCatalog(Array.isArray(permissionsRes.data) ? permissionsRes.data : []);
    } catch (error) {
      toast({ title: 'Gagal memuat role', description: getApiErrorMessage(error, 'Role dan permission belum bisa dimuat.'), variant: 'destructive' });
    } finally {
      setLoadingRoles(false);
    }
  };

  const filteredRoles = useMemo(() => {
    const search = String(roleSearch || '').trim().toLowerCase();
    if (!search) return roles;
    return roles.filter((role) => `${role.name || ''} ${role.description || ''}`.toLowerCase().includes(search));
  }, [roleSearch, roles]);

  useEffect(() => {
    if (!filteredRoles.length) return;
    if (!filteredRoles.some((role) => role.id === selectedRoleId)) {
      setSelectedRoleId(filteredRoles[0].id);
    }
  }, [filteredRoles, selectedRoleId]);

  const selectedRole = useMemo(
    () => filteredRoles.find((role) => role.id === selectedRoleId) || filteredRoles[0] || null,
    [filteredRoles, selectedRoleId],
  );

  const catalogTotals = useMemo(() => {
    const totalGroups = catalog.length;
    const totalPages = catalog.reduce((sum, group) => sum + (group.pages?.length || 0), 0);
    const totalPermissions = catalog.reduce(
      (sum, group) => sum + (group.pages || []).reduce((pageSum, page) => pageSum + (page.actions?.length || 0), 0),
      0,
    );

    return { totalGroups, totalPages, totalPermissions };
  }, [catalog]);

  const selectedRoleInsights = useMemo(() => {
    if (!selectedRole) return null;

    const grantedKeys = new Set(selectedRole.permissionKeys || []);
    let visiblePages = 0;
    let managePermissions = 0;
    let inheritedLocks = 0;

    const groups = catalog.map((group) => {
      const pages = (group.pages || []).map((page) => {
        const actions = (page.actions || []).map((action) => ({
          ...action,
          enabled: grantedKeys.has(action.key),
        }));
        const enabledCount = actions.filter((action) => action.enabled).length;
        const hasView = actions.find((action) => action.actionKey === 'view')?.enabled || false;
        const lockedActions = actions.filter((action) => action.actionKey !== 'view' && !action.enabled).length;

        if (hasView) {
          visiblePages += 1;
        }
        inheritedLocks += lockedActions;
        managePermissions += actions.filter((action) => action.actionKey === 'manage' && action.enabled).length;

        return {
          ...page,
          actions,
          enabledCount,
          totalCount: actions.length,
          hasView,
        };
      });

      const enabledPages = pages.filter((page) => page.hasView).length;
      const enabledActions = pages.reduce((sum, page) => sum + page.enabledCount, 0);
      const totalActions = pages.reduce((sum, page) => sum + page.totalCount, 0);

      return {
        ...group,
        pages,
        enabledPages,
        totalPages: pages.length,
        enabledActions,
        totalActions,
      };
    });

    return {
      groups,
      grantedPermissions: grantedKeys.size,
      visiblePages,
      hiddenPages: Math.max(catalogTotals.totalPages - visiblePages, 0),
      managePermissions,
      inheritedLocks,
    };
  }, [catalog, catalogTotals.totalPages, selectedRole]);

  const openCreateUser = () => {
    setEditingUser(null);
    setUserForm({ ...emptyUser, adminRoleId: roles.find((role) => !role.isProtected)?.id || roles[0]?.id || '' });
    setUserDialogOpen(true);
  };

  const openEditUser = (user) => {
    setEditingUser(user);
    setUserForm({ username: user.username || '', email: user.email || '', password: '', adminRoleId: user.adminRoleId || '' });
    setUserDialogOpen(true);
  };

  const closeUserDialog = () => {
    setEditingUser(null);
    setUserForm(emptyUser);
    setUserDialogOpen(false);
  };

  const saveUser = async (event) => {
    event.preventDefault();
    setSavingUser(true);
    try {
      if (editingUser) {
        await adminAPI.updateAdminUser(editingUser._id || editingUser.id, { username: userForm.username, email: userForm.email, adminRoleId: userForm.adminRoleId });
      } else {
        await adminAPI.createAdminUser(userForm);
      }
      toast({ title: editingUser ? 'Admin diperbarui' : 'Admin dibuat', description: 'Perubahan akun admin berhasil disimpan.' });
      closeUserDialog();
      await Promise.all([loadUsers(), loadRoles()]);
    } catch (error) {
      toast({ title: 'Gagal menyimpan admin', description: getApiErrorMessage(error, 'Perubahan akun admin belum tersimpan.'), variant: 'destructive' });
    } finally {
      setSavingUser(false);
    }
  };

  const openPasswordDialog = (user) => {
    setSelectedAdmin(user);
    setNewPassword('');
    setPasswordDialogOpen(true);
  };

  const savePassword = async (event) => {
    event.preventDefault();
    if (!selectedAdmin) return;
    setSavingPassword(true);
    try {
      await adminAPI.changeAdminPassword(selectedAdmin._id || selectedAdmin.id, { newPassword });
      toast({ title: 'Password diperbarui', description: 'Password admin berhasil direset.' });
      setPasswordDialogOpen(false);
      setSelectedAdmin(null);
      setNewPassword('');
    } catch (error) {
      toast({ title: 'Gagal reset password', description: getApiErrorMessage(error, 'Password admin belum berubah.'), variant: 'destructive' });
    } finally {
      setSavingPassword(false);
    }
  };

  const removeUser = async (user) => {
    if (!window.confirm(`Hapus akun admin ${user.username || user.email}?`)) return;
    try {
      await adminAPI.deleteAdminUser(user._id || user.id);
      toast({ title: 'Admin dihapus', description: 'Akun admin berhasil dihapus.' });
      await Promise.all([loadUsers(), loadRoles()]);
    } catch (error) {
      toast({ title: 'Gagal menghapus admin', description: getApiErrorMessage(error, 'Akun admin belum bisa dihapus.'), variant: 'destructive' });
    }
  };

  const openCreateRole = () => { setEditingRole(null); setRoleForm(emptyRole); setRoleDialogOpen(true); };
  const openEditRole = (role) => {
    setSelectedRoleId(role.id);
    setEditingRole(role);
    setRoleForm({ name: role.name || '', description: role.description || '', permissionKeys: role.permissionKeys || [] });
    setRoleDialogOpen(true);
  };
  const closeRoleDialog = () => { setEditingRole(null); setRoleForm(emptyRole); setRoleDialogOpen(false); };
  const roleLocked = Boolean(editingRole?.isProtected);

  const saveRole = async (event) => {
    event.preventDefault();
    setSavingRole(true);
    try {
      const payload = { name: roleForm.name, description: roleForm.description, permissionKeys: roleForm.permissionKeys };
      if (editingRole) await adminAPI.updateAdminRole(editingRole.id, payload);
      else await adminAPI.createAdminRole(payload);
      toast({ title: editingRole ? 'Role diperbarui' : 'Role dibuat', description: 'Role dan permission berhasil disimpan.' });
      closeRoleDialog();
      await Promise.all([loadRoles(), loadUsers()]);
    } catch (error) {
      toast({ title: 'Gagal menyimpan role', description: getApiErrorMessage(error, 'Role belum bisa disimpan.'), variant: 'destructive' });
    } finally {
      setSavingRole(false);
    }
  };

  const removeRole = async (role) => {
    if (!window.confirm(`Hapus role ${role.name}?`)) return;
    try {
      await adminAPI.deleteAdminRole(role.id);
      toast({ title: 'Role dihapus', description: 'Role berhasil dihapus.' });
      await Promise.all([loadRoles(), loadUsers()]);
    } catch (error) {
      toast({ title: 'Gagal menghapus role', description: getApiErrorMessage(error, 'Role belum bisa dihapus.'), variant: 'destructive' });
    }
  };

  const updatePermission = (key, checked) => setRoleForm((current) => ({ ...current, permissionKeys: togglePermissionKeySelection(current.permissionKeys, key, checked) }));

  return (
    <div className="space-y-6">
      <PageHeader icon={Users} title="Manajemen Admin" description="Kelola akun admin dashboard serta role-permission granular per halaman dan aksi." />
      <ResponsiveTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'users' ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input value={userSearch} onChange={(event) => { setUserSearch(event.target.value); setPage(1); }} placeholder="Cari username atau email admin..." className="border-yellow-400/30 bg-[#2a2a2a] pl-9 text-white" />
            </div>
            <Button onClick={openCreateUser} disabled={!canCreate} className="bg-yellow-400 text-black hover:bg-yellow-500"><Plus className="mr-2 h-4 w-4" />Tambah Admin</Button>
          </div>

          <Card className="border-yellow-400/20 bg-[#2a2a2a]">
            <CardHeader><CardTitle className="text-white">Daftar Akun Admin</CardTitle><CardDescription className="text-gray-400">Setiap akun login memakai username, password, dan satu role admin aktif.</CardDescription></CardHeader>
            <CardContent className="p-0">
              {loadingUsers ? <TableSkeleton rows={5} cols={5} /> : !users.length ? <div className="p-10 text-center text-gray-400">Belum ada akun admin yang cocok.</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-yellow-400/10 text-left text-gray-400"><th className="px-4 py-3">Admin</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Permission</th><th className="px-4 py-3">Proteksi</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead>
                    <tbody>
                      {users.map((user) => {
                        const userId = user._id || user.id;
                        const self = userId === (access.adminUser?._id || access.adminUser?.id);
                        return (
                          <tr key={userId} className="border-b border-yellow-400/5">
                            <td className="px-4 py-4"><div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-400/10 text-yellow-400"><UserCog className="h-5 w-5" /></div><div><p className="font-medium text-white">{user.username || '-'}</p><p className="text-xs text-gray-400">{user.email || '-'}</p>{self ? <p className="mt-1 text-[11px] text-blue-300">Akun Anda</p> : null}</div></div></td>
                            <td className="px-4 py-4"><p className="text-white">{user.adminRole?.name || getAdminRoleLabel(user)}</p><p className="text-xs text-gray-500">{user.adminRole?.description || 'Role legacy / transisi'}</p></td>
                            <td className="px-4 py-4 text-gray-300">{user.permissionKeys?.length || 0} permission aktif</td>
                            <td className="px-4 py-4">{user.isProtectedAdminRole ? <span className="inline-flex items-center gap-1 rounded-full bg-blue-400/15 px-2.5 py-1 text-xs text-blue-300"><ShieldAlert className="h-3.5 w-3.5" />Protected</span> : <span className="inline-flex rounded-full bg-gray-400/15 px-2.5 py-1 text-xs text-gray-300">Standard</span>}</td>
                            <td className="px-4 py-4"><div className="flex justify-end gap-1">{canEdit ? <Button size="sm" variant="ghost" onClick={() => openEditUser(user)} className="text-yellow-400 hover:bg-yellow-400/10"><Pencil className="h-4 w-4" /></Button> : null}{canManage ? <Button size="sm" variant="ghost" onClick={() => openPasswordDialog(user)} className="text-purple-400 hover:bg-purple-400/10"><KeyRound className="h-4 w-4" /></Button> : null}{canDelete && !self ? <Button size="sm" variant="ghost" onClick={() => removeUser(user)} className="text-red-400 hover:bg-red-400/10"><Trash2 className="h-4 w-4" /></Button> : null}</div></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.total} pageSize={pagination.pageSize} onPageChange={setPage} onPageSizeChange={(nextSize) => { setPageSize(nextSize); setPage(1); }} />
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)] xl:items-start">
          <Card className="border-yellow-400/20 bg-[#2a2a2a] xl:sticky xl:top-6">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-white">Role Library</CardTitle>
                  <CardDescription className="text-gray-400">Pilih role di kiri, lalu audit detail aksesnya di panel kanan.</CardDescription>
                </div>
                <Button onClick={openCreateRole} disabled={!canCreate} className="bg-yellow-400 text-black hover:bg-yellow-500">
                  <Plus className="mr-2 h-4 w-4" />
                  Role
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input value={roleSearch} onChange={(event) => setRoleSearch(event.target.value)} placeholder="Cari nama role..." className="border-yellow-400/30 bg-[#1a1a1a] pl-9 text-white" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-yellow-400/10 bg-[#1a1a1a] p-3">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-gray-500">Total Role</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{roles.length}</p>
                </div>
                <div className="rounded-xl border border-yellow-400/10 bg-[#1a1a1a] p-3">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-gray-500">Protected</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{roles.filter((role) => role.isProtected).length}</p>
                </div>
              </div>

              {loadingRoles ? (
                <TableSkeleton rows={4} cols={1} />
              ) : !filteredRoles.length ? (
                <p className="text-sm text-gray-400">Tidak ada role yang cocok.</p>
              ) : (
                <div className="space-y-3">
                  {filteredRoles.map((role) => {
                    const active = selectedRole?.id === role.id;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setSelectedRoleId(role.id)}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          active
                            ? 'border-yellow-400/40 bg-gradient-to-br from-yellow-400/14 via-[#1f1b10] to-[#1a1a1a] shadow-[0_0_0_1px_rgba(250,204,21,0.15)]'
                            : 'border-yellow-400/10 bg-[#1a1a1a] hover:border-yellow-400/25 hover:bg-[#1d1d1d]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-white">{role.name}</p>
                            <p className="mt-1 line-clamp-2 text-xs text-gray-500">{role.description || 'Tanpa deskripsi role'}</p>
                          </div>
                          {role.isProtected ? (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-400/15 px-2.5 py-1 text-[11px] text-blue-300">
                              <Shield className="h-3.5 w-3.5" />
                              Protected
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-yellow-400/10 px-2.5 py-1 text-yellow-100">{role.permissionKeys?.length || 0} permission</span>
                          <span className="rounded-full bg-white/5 px-2.5 py-1 text-gray-300">{role.userCount || 0} admin</span>
                        </div>

                        <div className="mt-4 flex gap-2">
                          {canEdit ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(event) => { event.stopPropagation(); openEditRole(role); }}
                              className="border-yellow-400/30 text-yellow-400"
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                          ) : null}
                          {canDelete && !role.isProtected ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(event) => { event.stopPropagation(); void removeRole(role); }}
                              className="border-red-400/40 text-red-400"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Hapus
                            </Button>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card className="overflow-hidden border-yellow-400/20 bg-[#2a2a2a]">
              <CardContent className="p-0">
                {selectedRole ? (
                  <div className="space-y-0">
                    <div className="border-b border-yellow-400/10 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.15),transparent_32%),linear-gradient(135deg,#1e1e1e_0%,#2a2a2a_55%,#242424_100%)] p-6">
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="max-w-3xl space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-medium text-yellow-100">
                              <Shield className="h-3.5 w-3.5" />
                              Role yang dipilih
                            </span>
                            {selectedRole.isProtected ? (
                              <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-xs font-medium text-blue-100">
                                <Lock className="h-3.5 w-3.5" />
                                Proteksi sistem aktif
                              </span>
                            ) : null}
                          </div>
                          <div>
                            <h3 className="text-2xl font-semibold text-white">{selectedRole.name}</h3>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">
                              {selectedRole.description || 'Role ini belum memiliki deskripsi khusus. Gunakan panel ini untuk memeriksa cakupan akses per grup, per halaman, dan per aksi.'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {canEdit ? (
                            <Button onClick={() => openEditRole(selectedRole)} className="bg-yellow-400 text-black hover:bg-yellow-500">
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit Role
                            </Button>
                          ) : null}
                          {canDelete && !selectedRole.isProtected ? (
                            <Button variant="outline" onClick={() => removeRole(selectedRole)} className="border-red-400/40 text-red-300 hover:bg-red-400/10">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Hapus Role
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-yellow-400/15 bg-black/20 p-4">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-gray-400">Permission Aktif</p>
                          <p className="mt-2 text-3xl font-semibold text-white">{selectedRoleInsights?.grantedPermissions || 0}</p>
                          <p className="mt-1 text-xs text-gray-400">dari {catalogTotals.totalPermissions} permission sistem</p>
                        </div>
                        <div className="rounded-2xl border border-yellow-400/15 bg-black/20 p-4">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-gray-400">Halaman Terlihat</p>
                          <p className="mt-2 text-3xl font-semibold text-white">{selectedRoleInsights?.visiblePages || 0}</p>
                          <p className="mt-1 text-xs text-gray-400">{selectedRoleInsights?.hiddenPages || 0} halaman otomatis tersembunyi</p>
                        </div>
                        <div className="rounded-2xl border border-yellow-400/15 bg-black/20 p-4">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-gray-400">Aksi Manage</p>
                          <p className="mt-2 text-3xl font-semibold text-white">{selectedRoleInsights?.managePermissions || 0}</p>
                          <p className="mt-1 text-xs text-gray-400">reset, blokir, approval, utility action</p>
                        </div>
                        <div className="rounded-2xl border border-yellow-400/15 bg-black/20 p-4">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-gray-400">Admin Pengguna</p>
                          <p className="mt-2 text-3xl font-semibold text-white">{selectedRole.userCount || 0}</p>
                          <p className="mt-1 text-xs text-gray-400">{selectedRole.isProtected ? 'Minimal satu akun harus tetap aktif' : 'Bisa dipakai untuk akun admin lain'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 border-b border-yellow-400/10 p-6 lg:grid-cols-3">
                      <div className="rounded-2xl border border-yellow-400/10 bg-[#1b1b1b] p-4">
                        <div className="mb-3 flex items-center gap-2 text-white">
                          <Eye className="h-4 w-4 text-yellow-300" />
                          <p className="font-medium">`view` adalah permission induk</p>
                        </div>
                        <p className="text-sm leading-6 text-gray-400">Saat `view` mati, semua aksi turunan di halaman itu ikut mati dan menu sidebar untuk halaman tersebut juga hilang.</p>
                      </div>
                      <div className="rounded-2xl border border-yellow-400/10 bg-[#1b1b1b] p-4">
                        <div className="mb-3 flex items-center gap-2 text-white">
                          <Wrench className="h-4 w-4 text-yellow-300" />
                          <p className="font-medium">`manage` untuk aksi utility</p>
                        </div>
                        <p className="text-sm leading-6 text-gray-400">Gunakan `manage` untuk blokir, reset password, verifikasi, approval, dan aksi operasional yang tidak cukup diwakili edit atau hapus.</p>
                      </div>
                      <div className="rounded-2xl border border-blue-400/20 bg-blue-400/10 p-4">
                        <div className="mb-3 flex items-center gap-2 text-blue-100">
                          <ShieldAlert className="h-4 w-4" />
                          <p className="font-medium">Perlindungan akses minimal</p>
                        </div>
                        <p className="text-sm leading-6 text-blue-100/85">Role protected tetap terlihat untuk audit, tetapi tidak boleh diubah atau dihapus agar dashboard selalu punya akses penuh darurat.</p>
                      </div>
                    </div>

                    <div className="space-y-4 p-6">
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                          <h4 className="text-lg font-semibold text-white">Cakupan Akses per Grup</h4>
                          <p className="text-sm text-gray-400">Panel ini menunjukkan grup mana yang terbuka, halaman mana yang terlihat, dan aksi mana yang benar-benar aktif untuk role terpilih.</p>
                        </div>
                        <div className="rounded-full border border-yellow-400/15 bg-[#1a1a1a] px-4 py-2 text-xs text-gray-300">
                          {catalogTotals.totalGroups} grup menu • {catalogTotals.totalPages} halaman admin
                        </div>
                      </div>

                      <div className="grid gap-4">
                        {selectedRoleInsights?.groups.map((group) => {
                          const completion = group.totalActions ? Math.round((group.enabledActions / group.totalActions) * 100) : 0;
                          return (
                            <div key={group.groupKey} className="rounded-3xl border border-yellow-400/10 bg-[#1a1a1a] p-5">
                              <div className="flex flex-col gap-4 border-b border-yellow-400/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                  <h5 className="text-base font-semibold text-white">{group.groupLabel}</h5>
                                  <p className="mt-1 text-sm text-gray-400">{group.enabledPages} dari {group.totalPages} halaman terlihat di grup ini.</p>
                                </div>
                                <div className="min-w-[220px]">
                                  <div className="mb-2 flex items-center justify-between text-xs text-gray-400">
                                    <span>{group.enabledActions} / {group.totalActions} permission aktif</span>
                                    <span>{completion}% coverage</span>
                                  </div>
                                  <div className="h-2 overflow-hidden rounded-full bg-black/30">
                                    <div className="h-full rounded-full bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500" style={{ width: `${completion}%` }} />
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                                {group.pages.map((page) => (
                                  <div key={page.pageKey} className={`rounded-2xl border p-4 ${page.hasView ? 'border-yellow-400/20 bg-[#171717]' : 'border-white/8 bg-[#141414]'}`}>
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                      <div>
                                        <p className="font-medium text-white">{page.pageLabel}</p>
                                        <p className="mt-1 text-xs text-gray-500">{page.pageKey}</p>
                                      </div>
                                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] ${page.hasView ? 'bg-emerald-400/10 text-emerald-300' : 'bg-white/5 text-gray-400'}`}>
                                        {page.hasView ? 'Tampil di sidebar' : 'Tersembunyi'}
                                      </span>
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-2">
                                      {page.actions.map((action) => (
                                        <span
                                          key={action.key}
                                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] ${
                                            action.enabled
                                              ? 'border-yellow-400/20 bg-yellow-400/10 text-yellow-100'
                                              : 'border-white/10 bg-white/5 text-gray-500'
                                          }`}
                                        >
                                          {action.actionLabel}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-10 text-center text-gray-400">Pilih role untuk melihat detail permission dan dampaknya ke sidebar serta aksi dashboard.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <Dialog open={userDialogOpen} onOpenChange={(open) => (!open ? closeUserDialog() : setUserDialogOpen(true))}>
        <DialogContent className="max-w-lg border-yellow-400/20 bg-[#2a2a2a]">
          <DialogHeader><DialogTitle className="text-white">{editingUser ? 'Edit Admin' : 'Tambah Admin Baru'}</DialogTitle></DialogHeader>
          <form onSubmit={saveUser} className="space-y-4">
            <div><Label className="text-white">Username</Label><Input value={userForm.username} onChange={(event) => setUserForm((current) => ({ ...current, username: event.target.value }))} className="border-yellow-400/20 bg-[#1a1a1a] text-white" required /></div>
            <div><Label className="text-white">Email</Label><Input type="email" value={userForm.email} onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))} className="border-yellow-400/20 bg-[#1a1a1a] text-white" required /></div>
            {!editingUser ? <div><Label className="text-white">Password</Label><Input type="password" value={userForm.password} onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))} className="border-yellow-400/20 bg-[#1a1a1a] text-white" minLength={6} required /></div> : null}
            <div><Label className="text-white">Role</Label><Select value={userForm.adminRoleId || undefined} onValueChange={(value) => setUserForm((current) => ({ ...current, adminRoleId: value }))}><SelectTrigger className="border-yellow-400/20 bg-[#1a1a1a] text-white"><SelectValue placeholder="Pilih role admin" /></SelectTrigger><SelectContent className="border-yellow-400/20 bg-[#1a1a1a] text-white">{roles.map((role) => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex justify-end gap-3 pt-2"><Button type="button" variant="outline" onClick={closeUserDialog} className="border-yellow-400/30 text-yellow-400">Batal</Button><Button type="submit" disabled={savingUser} className="bg-yellow-400 text-black hover:bg-yellow-500">{savingUser ? 'Menyimpan...' : editingUser ? 'Simpan Perubahan' : 'Buat Admin'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordDialogOpen} onOpenChange={(open) => { setPasswordDialogOpen(open); if (!open) { setSelectedAdmin(null); setNewPassword(''); } }}>
        <DialogContent className="max-w-lg border-yellow-400/20 bg-[#2a2a2a]">
          <DialogHeader><DialogTitle className="text-white">Reset Password Admin</DialogTitle></DialogHeader>
          <form onSubmit={savePassword} className="space-y-4">
            <div className="rounded-xl border border-yellow-400/10 bg-[#1a1a1a] p-4 text-sm text-gray-300">Password baru akan langsung menggantikan password akun <span className="font-medium text-white">{selectedAdmin?.username || selectedAdmin?.email || 'admin'}</span>.</div>
            <div><Label className="text-white">Password Baru</Label><Input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="border-yellow-400/20 bg-[#1a1a1a] text-white" minLength={6} required /></div>
            <div className="flex justify-end gap-3 pt-2"><Button type="button" variant="outline" onClick={() => setPasswordDialogOpen(false)} className="border-yellow-400/30 text-yellow-400">Batal</Button><Button type="submit" disabled={savingPassword} className="bg-yellow-400 text-black hover:bg-yellow-500">{savingPassword ? 'Menyimpan...' : 'Simpan Password'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={roleDialogOpen} onOpenChange={(open) => (!open ? closeRoleDialog() : setRoleDialogOpen(true))}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto border-yellow-400/20 bg-[#2a2a2a]">
          <DialogHeader><DialogTitle className="text-white">{editingRole ? 'Edit Role & Permission' : 'Buat Role Baru'}</DialogTitle></DialogHeader>
          <form onSubmit={saveRole} className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-2">
              <div><Label className="text-white">Nama Role</Label><Input value={roleForm.name} onChange={(event) => setRoleForm((current) => ({ ...current, name: event.target.value }))} className="border-yellow-400/20 bg-[#1a1a1a] text-white" disabled={roleLocked} required /></div>
              <div><Label className="text-white">Deskripsi</Label><Input value={roleForm.description} onChange={(event) => setRoleForm((current) => ({ ...current, description: event.target.value }))} className="border-yellow-400/20 bg-[#1a1a1a] text-white" disabled={roleLocked} /></div>
            </div>
            {roleLocked ? <div className="rounded-xl border border-blue-400/20 bg-blue-400/10 p-4 text-sm text-blue-100">Role ini diproteksi sistem. Permission tetap terlihat untuk audit, tetapi tidak dapat diubah atau dihapus.</div> : null}
            <div className="space-y-4">{catalog.map((group) => <Card key={group.groupKey} className="border-yellow-400/10 bg-[#1a1a1a]"><CardHeader><CardTitle className="text-base text-white">{group.groupLabel}</CardTitle></CardHeader><CardContent className="space-y-4">{group.pages.map((page) => <div key={page.pageKey} className="rounded-xl border border-yellow-400/10 bg-[#121212] p-4"><div className="mb-3 flex items-start justify-between gap-3"><div><p className="font-medium text-white">{page.pageLabel}</p><p className="text-xs text-gray-500">{page.pageKey}</p></div><span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/10 px-2.5 py-1 text-[11px] text-yellow-200"><Wrench className="h-3.5 w-3.5" />View adalah induk</span></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">{page.actions.map((action) => { const checked = roleForm.permissionKeys.includes(action.key); const disabled = roleLocked || (action.actionKey !== 'view' && isPermissionActionLocked(roleForm.permissionKeys, action.key)); return <label key={action.key} className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${checked ? 'border-yellow-400/40 bg-yellow-400/10 text-yellow-100' : 'border-yellow-400/10 bg-[#1a1a1a] text-gray-300'} ${disabled ? 'opacity-50' : 'cursor-pointer hover:border-yellow-400/30'}`}><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => updatePermission(action.key, event.target.checked)} className="h-4 w-4 accent-yellow-400" /><div><p className="font-medium">{action.actionLabel}</p><p className="text-[11px] text-gray-500">{action.key}</p></div></label>; })}</div></div>)}</CardContent></Card>)}</div>
            <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={closeRoleDialog} className="border-yellow-400/30 text-yellow-400">Batal</Button>{!roleLocked ? <Button type="submit" disabled={savingRole} className="bg-yellow-400 text-black hover:bg-yellow-500">{savingRole ? 'Menyimpan...' : editingRole ? 'Simpan Role' : 'Buat Role'}</Button> : null}</div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
