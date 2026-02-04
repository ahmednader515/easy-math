"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Edit, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale/ar";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface User {
    id: string;
    fullName: string;
    phoneNumber: string;
    parentPhoneNumber: string;
    role: string;
    balance: number;
    grade?: string | null;
    division?: string | null;
    studyType?: string | null;
    governorate?: string | null;
    createdAt: string;
    updatedAt: string;
    _count: {
        courses: number;
        purchases: number;
        userProgress: number;
    };
}

interface EditUserData {
    fullName: string;
    phoneNumber: string;
    parentPhoneNumber: string;
    role: string;
}

const UsersPage = () => {
    const [staffUsers, setStaffUsers] = useState<User[]>([]);
    const [studentUsers, setStudentUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editData, setEditData] = useState<EditUserData>({
        fullName: "",
        phoneNumber: "",
        parentPhoneNumber: "",
        role: ""
    });
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [totalStudentCount, setTotalStudentCount] = useState(0);

    useEffect(() => {
        fetchStaffUsers();
        fetchStudents(true);
    }, []);

    // Fetch all staff users (admins and teachers) - no pagination
    const fetchStaffUsers = async (search: string = "") => {
        try {
            const url = search 
                ? `/api/admin/users?role=STAFF&search=${encodeURIComponent(search)}`
                : "/api/admin/users?role=STAFF";
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                setStaffUsers(data.users);
            } else {
                console.error("Error fetching staff users:", response.status, response.statusText);
                if (response.status === 403) {
                    toast.error("ليس لديك صلاحية للوصول إلى هذه الصفحة");
                } else {
                    toast.error("حدث خطأ في تحميل المشرفين والمعلمين");
                }
            }
        } catch (error) {
            console.error("Error fetching staff users:", error);
            toast.error("حدث خطأ في تحميل المشرفين والمعلمين");
        }
    };

    // Fetch students with pagination or search
    const fetchStudents = async (reset: boolean = false, search: string = "") => {
        try {
            if (reset) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            const skip = reset ? 0 : studentUsers.length;
            const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
            const response = await fetch(`/api/admin/users?role=USER&skip=${skip}&take=25${searchParam}`);
            
            if (response.ok) {
                const data = await response.json();
                if (reset) {
                    setStudentUsers(data.users);
                } else {
                    setStudentUsers(prev => [...prev, ...data.users]);
                }
                setHasMore(data.hasMore);
                setTotalStudentCount(data.totalCount);
            } else {
                console.error("Error fetching students:", response.status, response.statusText);
                if (response.status === 403) {
                    toast.error("ليس لديك صلاحية للوصول إلى هذه الصفحة");
                } else {
                    toast.error("حدث خطأ في تحميل الطلاب");
                }
            }
        } catch (error) {
            console.error("Error fetching students:", error);
            toast.error("حدث خطأ في تحميل الطلاب");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        fetchStudents(false, searchTerm);
    };

    const handleSearch = () => {
        if (searchInput.trim()) {
            setSearchTerm(searchInput.trim());
            setIsSearching(true);
            fetchStaffUsers(searchInput.trim());
            fetchStudents(true, searchInput.trim());
        }
    };

    const handleClearSearch = () => {
        setSearchInput("");
        setSearchTerm("");
        setIsSearching(false);
        fetchStaffUsers();
        fetchStudents(true);
    };

    const handleEditUser = (user: User) => {
        setEditingUser(user);
        setEditData({
            fullName: user.fullName,
            phoneNumber: user.phoneNumber,
            parentPhoneNumber: user.parentPhoneNumber,
            role: user.role
        });
        setIsEditDialogOpen(true);
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;

        try {
            const response = await fetch(`/api/admin/users/${editingUser.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(editData),
            });

            if (response.ok) {
                const userType = editingUser.role === "TEACHER" ? "المعلم" : editingUser.role === "ADMIN" ? "المشرف" : "الطالب";
                toast.success(`تم تحديث بيانات ${userType} بنجاح`);
                setIsEditDialogOpen(false);
                setEditingUser(null);
                // Refresh based on user role
                if (editingUser.role === "USER") {
                    fetchStudents(true);
                } else {
                    fetchStaffUsers();
                }
            } else {
                const error = await response.text();
                console.error("Error updating user:", response.status, error);
                if (response.status === 403) {
                    toast.error("ليس لديك صلاحية لتعديل البيانات");
                } else if (response.status === 404) {
                    toast.error("المستخدم غير موجود");
                } else if (response.status === 400) {
                    toast.error(error || "بيانات غير صحيحة");
                } else {
                    toast.error("حدث خطأ في تحديث البيانات");
                }
            }
        } catch (error) {
            console.error("Error updating user:", error);
            toast.error("حدث خطأ في تحديث بيانات الطالب");
        }
    };

    const handleDeleteUser = async (userId: string) => {
        setIsDeleting(true);
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                toast.success("تم حذف المستخدم بنجاح");
                // Find the deleted user to determine which list to refresh
                const deletedUser = [...staffUsers, ...studentUsers].find(u => u.id === userId);
                if (deletedUser?.role === "USER") {
                    fetchStudents(true);
                } else {
                    fetchStaffUsers();
                }
            } else {
                const error = await response.text();
                console.error("Error deleting user:", response.status, error);
                if (response.status === 403) {
                    toast.error("ليس لديك صلاحية لحذف المستخدم");
                } else if (response.status === 404) {
                    toast.error("المستخدم غير موجود");
                } else {
                    toast.error(error || "حدث خطأ في حذف المستخدم");
                }
            }
        } catch (error) {
            console.error("Error deleting user:", error);
            toast.error("حدث خطأ في حذف الطالب");
        } finally {
            setIsDeleting(false);
        }
    };

    // When searching, use the fetched results directly (already filtered by server)
    // When not searching, show all loaded users
    const filteredStaffUsers = staffUsers;
    const filteredStudentUsers = studentUsers;

    const renderSignupDetails = (user: User) => (
        <div className="space-y-1 text-sm text-muted-foreground text-right">
            <div>
                <span className="text-foreground font-medium">الصف: </span>
                {user.grade || "غير محدد"}
            </div>
            <div>
                <span className="text-foreground font-medium">القسم: </span>
                {user.division || "غير محدد"}
            </div>
            <div>
                <span className="text-foreground font-medium">نوع الدراسة: </span>
                {user.studyType || "غير محدد"}
            </div>
            <div>
                <span className="text-foreground font-medium">المحافظة: </span>
                {user.governorate || "غير محدد"}
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">جاري التحميل...</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    إدارة المستخدمين
                </h1>
            </div>

            {/* Staff Table (Admins and Teachers) */}
            {filteredStaffUsers.length > 0 && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>المشرفين والمعلمين</CardTitle>
                            <span className="text-sm text-muted-foreground">
                                إجمالي: {staffUsers.length} | معروض: {filteredStaffUsers.length}
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="البحث بالاسم أو رقم الهاتف..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleSearch();
                                    }
                                }}
                                className="max-w-sm"
                            />
                            <Button
                                onClick={handleSearch}
                                variant="default"
                                size="sm"
                            >
                                بحث
                            </Button>
                            {isSearching && (
                                <Button
                                    onClick={handleClearSearch}
                                    variant="outline"
                                    size="sm"
                                >
                                    <X className="h-4 w-4" />
                                    إلغاء
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-right">الاسم</TableHead>
                                    <TableHead className="text-right">رقم الهاتف</TableHead>
                                    <TableHead className="text-right">رقم هاتف الوالد</TableHead>
                                    <TableHead className="text-right">الدور</TableHead>
                                    <TableHead className="text-right">بيانات التسجيل</TableHead>
                                    <TableHead className="text-right">تاريخ التسجيل</TableHead>
                                    <TableHead className="text-right">الإجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStaffUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            {user.fullName}
                                        </TableCell>
                                        <TableCell>{user.phoneNumber}</TableCell>
                                        <TableCell>{user.parentPhoneNumber}</TableCell>
                                        <TableCell>
                                            <Badge 
                                                variant="secondary"
                                                className={
                                                    user.role === "ADMIN" ? "bg-orange-600 text-white hover:bg-orange-700" : 
                                                    user.role === "TEACHER" ? "bg-blue-600 text-white hover:bg-blue-700" : 
                                                    ""
                                                }
                                            >
                                                {user.role === "TEACHER" ? "معلم" : 
                                                 user.role === "ADMIN" ? "مشرف" : user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{renderSignupDetails(user)}</TableCell>
                                        <TableCell>
                                            {format(new Date(user.createdAt), "dd/MM/yyyy", { locale: ar })}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Dialog open={isEditDialogOpen && editingUser?.id === user.id} onOpenChange={(open) => {
                                                    if (!open) {
                                                        setIsEditDialogOpen(false);
                                                        setEditingUser(null);
                                                    }
                                                }}>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEditUser(user)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>تعديل بيانات {user.role === "TEACHER" ? "المعلم" : "المشرف"}</DialogTitle>
                                                            <DialogDescription>
                                                                قم بتعديل معلومات {user.role === "TEACHER" ? "المعلم" : "المشرف"}
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="grid gap-4 py-4">
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="fullName" className="text-right">
                                                                    الاسم
                                                                </Label>
                                                                <Input
                                                                    id="fullName"
                                                                    value={editData.fullName}
                                                                    onChange={(e) => setEditData({...editData, fullName: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="phoneNumber" className="text-right">
                                                                    رقم الهاتف
                                                                </Label>
                                                                <Input
                                                                    id="phoneNumber"
                                                                    value={editData.phoneNumber}
                                                                    onChange={(e) => setEditData({...editData, phoneNumber: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="parentPhoneNumber" className="text-right">
                                                                    رقم هاتف الوالد
                                                                </Label>
                                                                <Input
                                                                    id="parentPhoneNumber"
                                                                    value={editData.parentPhoneNumber}
                                                                    onChange={(e) => setEditData({...editData, parentPhoneNumber: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="role" className="text-right">
                                                                    الدور
                                                                </Label>
                                                                <Select
                                                                    value={editData.role}
                                                                    onValueChange={(value) => setEditData({...editData, role: value})}
                                                                >
                                                                    <SelectTrigger className="col-span-3">
                                                                        <SelectValue placeholder="اختر الدور" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="USER">طالب</SelectItem>
                                                                        <SelectItem value="TEACHER">معلم</SelectItem>
                                                                        <SelectItem value="ADMIN">مشرف</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                        <DialogFooter>
                                                            <Button variant="outline" onClick={() => {
                                                                setIsEditDialogOpen(false);
                                                                setEditingUser(null);
                                                            }}>
                                                                إلغاء
                                                            </Button>
                                                            <Button onClick={handleSaveUser}>
                                                                حفظ التغييرات
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                                
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            disabled={isDeleting}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                هذا الإجراء لا يمكن التراجع عنه. سيتم حذف {user.role === "TEACHER" ? "المعلم" : "المشرف"} وجميع البيانات المرتبطة به نهائياً.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDeleteUser(user.id)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                حذف
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Students Table */}
            {filteredStudentUsers.length > 0 && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>قائمة الطلاب</CardTitle>
                            <span className="text-sm text-muted-foreground">
                                إجمالي: {totalStudentCount} | معروض: {filteredStudentUsers.length}
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="البحث بالاسم أو رقم الهاتف..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleSearch();
                                    }
                                }}
                                className="max-w-sm"
                            />
                            <Button
                                onClick={handleSearch}
                                variant="default"
                                size="sm"
                            >
                                بحث
                            </Button>
                            {isSearching && (
                                <Button
                                    onClick={handleClearSearch}
                                    variant="outline"
                                    size="sm"
                                >
                                    <X className="h-4 w-4" />
                                    إلغاء
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-right">الاسم</TableHead>
                                    <TableHead className="text-right">رقم الهاتف</TableHead>
                                    <TableHead className="text-right">رقم هاتف الوالد</TableHead>
                                    <TableHead className="text-right">الدور</TableHead>
                                    <TableHead className="text-right">بيانات التسجيل</TableHead>
                                    <TableHead className="text-right">الرصيد</TableHead>
                                    <TableHead className="text-right">الكورسات المشتراة</TableHead>
                                    <TableHead className="text-right">تاريخ التسجيل</TableHead>
                                    <TableHead className="text-right">الإجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStudentUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            {user.fullName}
                                        </TableCell>
                                        <TableCell>{user.phoneNumber}</TableCell>
                                        <TableCell>{user.parentPhoneNumber}</TableCell>
                                        <TableCell>
                                            <Badge 
                                                variant="secondary"
                                                className="bg-green-600 text-white hover:bg-green-700"
                                            >
                                                طالب
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{renderSignupDetails(user)}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">
                                                {user.balance} جنيه
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {user._count.purchases}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(user.createdAt), "dd/MM/yyyy", { locale: ar })}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Dialog open={isEditDialogOpen && editingUser?.id === user.id} onOpenChange={(open) => {
                                                    if (!open) {
                                                        setIsEditDialogOpen(false);
                                                        setEditingUser(null);
                                                    }
                                                }}>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEditUser(user)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>تعديل بيانات الطالب</DialogTitle>
                                                            <DialogDescription>
                                                                قم بتعديل معلومات الطالب
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="grid gap-4 py-4">
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="fullName" className="text-right">
                                                                    الاسم
                                                                </Label>
                                                                <Input
                                                                    id="fullName"
                                                                    value={editData.fullName}
                                                                    onChange={(e) => setEditData({...editData, fullName: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="phoneNumber" className="text-right">
                                                                    رقم الهاتف
                                                                </Label>
                                                                <Input
                                                                    id="phoneNumber"
                                                                    value={editData.phoneNumber}
                                                                    onChange={(e) => setEditData({...editData, phoneNumber: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="parentPhoneNumber" className="text-right">
                                                                    رقم هاتف الوالد
                                                                </Label>
                                                                <Input
                                                                    id="parentPhoneNumber"
                                                                    value={editData.parentPhoneNumber}
                                                                    onChange={(e) => setEditData({...editData, parentPhoneNumber: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="role" className="text-right">
                                                                    الدور
                                                                </Label>
                                                                <Select
                                                                    value={editData.role}
                                                                    onValueChange={(value) => setEditData({...editData, role: value})}
                                                                >
                                                                    <SelectTrigger className="col-span-3">
                                                                        <SelectValue placeholder="اختر الدور" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="USER">طالب</SelectItem>
                                                                        <SelectItem value="TEACHER">معلم</SelectItem>
                                                                        <SelectItem value="ADMIN">مشرف</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                        <DialogFooter>
                                                            <Button variant="outline" onClick={() => {
                                                                setIsEditDialogOpen(false);
                                                                setEditingUser(null);
                                                            }}>
                                                                إلغاء
                                                            </Button>
                                                            <Button onClick={handleSaveUser}>
                                                                حفظ التغييرات
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                                
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            disabled={isDeleting}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                هذا الإجراء لا يمكن التراجع عنه. سيتم حذف الطالب وجميع البيانات المرتبطة به نهائياً.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDeleteUser(user.id)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                حذف
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {hasMore && !isSearching && (
                            <div className="flex justify-center mt-4">
                                <Button
                                    onClick={handleLoadMore}
                                    disabled={loadingMore}
                                    variant="outline"
                                >
                                    {loadingMore ? "جاري التحميل..." : "تحميل المزيد (25 مستخدم)"}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {filteredStaffUsers.length === 0 && filteredStudentUsers.length === 0 && !loading && (
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center text-muted-foreground">
                            لا يوجد مستخدمين مسجلين حالياً
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default UsersPage; 