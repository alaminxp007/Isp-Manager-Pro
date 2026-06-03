import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePermission } from "@/hooks/usePermission";
import {
  useListUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useListRoles,
  getListUsersQueryKey
} from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ShieldCheck, Plus, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";

const userSchema = z.object({
  username: z.string().min(3, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  roleId: z.coerce.number().min(1, "Role is required"),
  isActive: z.boolean().default(true),
});

type UserFormValues = z.infer<typeof userSchema>;

export default function Users() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { can } = usePermission();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  const { data: users = [], isLoading } = useListUsers();
  const { data: roles = [] } = useListRoles();

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      email: "",
      phone: "",
      roleId: 0,
      isActive: true,
    },
  });

  const openCreateModal = () => {
    setEditingUserId(null);
    form.reset({
      username: "",
      password: "",
      fullName: "",
      email: "",
      phone: "",
      roleId: roles.length > 0 ? roles[0].id : 0,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user: any) => {
    setEditingUserId(user.id);
    form.reset({
      username: user.username,
      password: "",
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || "",
      roleId: user.roleId || 0,
      isActive: user.isActive,
    });
    setIsModalOpen(true);
  };

  const onSubmit = (values: UserFormValues) => {
    if (editingUserId) {
      const updateData: any = {
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        roleId: values.roleId,
        isActive: values.isActive,
      };
      if (values.password) {
        updateData.password = values.password;
      }
      
      updateUser.mutate(
        { id: editingUserId, data: updateData },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
            toast({ title: "User updated successfully" });
            setIsModalOpen(false);
          },
          onError: (err: any) => {
            toast({ title: "Error updating user", description: err.message, variant: "destructive" });
          }
        }
      );
    } else {
      if (!values.password) {
        toast({ title: "Password is required for new users", variant: "destructive" });
        return;
      }
      createUser.mutate(
        { data: { ...values, password: values.password } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
            toast({ title: "User created successfully" });
            setIsModalOpen(false);
          },
          onError: (err: any) => {
            toast({ title: "Error creating user", description: err.message, variant: "destructive" });
          }
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this user?")) {
      deleteUser.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
            toast({ title: "User deleted successfully" });
          },
          onError: (err: any) => {
            toast({ title: "Error deleting user", description: err.message, variant: "destructive" });
          }
        }
      );
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-800">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
          <ShieldCheck className="w-5 h-5 text-sky-500" />
          System Users
        </h2>
        {can("users.create") && (
          <Button size="sm" onClick={openCreateModal} className="bg-sky-500 hover:bg-sky-600 text-white">
            <Plus className="w-4 h-4 mr-1" /> Add User
          </Button>
        )}
      </div>

      <Card className="flex-1 bg-white border-slate-200 overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><Skeleton className="h-10 w-48" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-10 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-16" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="h-8 w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{user.fullName}</div>
                      <div className="text-xs text-slate-500">@{user.username}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700">{user.email}</div>
                      <div className="text-xs text-slate-500">{user.phone || "-"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                        {user.roleName || "N/A"}
                      </Badge>
                      {user.isSuperAdmin && (
                        <Badge className="ml-2 bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200">Super</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.isActive ? (
                        <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100">Active</Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {can("users.edit") && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-sky-600 hover:bg-sky-50" onClick={() => openEditModal(user)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {can("users.delete") && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(user.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingUserId ? "Edit User" : "Add User"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField control={form.control} name="fullName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="username" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl><Input {...field} disabled={!!editingUserId} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{editingUserId ? "New Password (optional)" : "Password"}</FormLabel>
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4 items-end">
                <FormField control={form.control} name="roleId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? field.value.toString() : ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.map(r => (
                          <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="isActive" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-200 p-3 shadow-sm h-10">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">Active Account</FormLabel>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-sky-500 hover:bg-sky-600 text-white">Save</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
