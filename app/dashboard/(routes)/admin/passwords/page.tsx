"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Eye, Edit, Search, EyeOff, X } from "lucide-react";
import { toast } from "sonner";

interface User {
    id: string;
    fullName: string;
    phoneNumber: string;
    role: string;
}

const PasswordsPage = () => {
    const [staffUsers, setStaffUsers] = useState<User[]>([]);
    const [studentUsers, setStudentUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        fetchStaffUsers();
        fetchStudents(true);
    }, []);

    // Fetch all staff users (admins and teachers) - no pagination
    const fetchStaffUsers = async (search: string = "") => {
        try {
            const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
            const response = await fetch(`/api/admin/users?skip=0&take=1000${searchParam}`);
            if (response.ok) {
                const data = await response.json();
                const usersArray = Array.isArray(data) ? data : (data.users || []);
                const staff = usersArray.filter((user: User) => user.role === "ADMIN" || user.role === "TEACHER");
                setStaffUsers(staff);
            }
        } catch (error) {
            console.error("Error fetching staff users:", error);
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
            const response = await fetch(`/api/admin/users?skip=${skip}&take=25${searchParam}`);
            
            if (response.ok) {
                const data = await response.json();
                const usersArray = Array.isArray(data) ? data : (data.users || []);
                const students = usersArray.filter((user: User) => user.role === "USER");
                if (reset) {
                    setStudentUsers(students);
                } else {
                    setStudentUsers(prev => [...prev, ...students]);
                }
                // Check if there are more users (API returns hasMore based on all users)
                // If we got 25 users total and hasMore is true, there might be more students
                // If we got less than 25 users, definitely no more
                const hasMoreUsers = data.hasMore || false;
                const gotFullPage = usersArray.length === 25;
                // Estimate: if API says hasMore and we got a full page, there might be more students
                setHasMore(hasMoreUsers && gotFullPage);
                // Use totalCount from API (approximate for students)
                setTotalCount(data.totalCount || studentUsers.length + students.length);
            }
        } catch (error) {
            console.error("Error fetching students:", error);
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

    const handlePasswordChange = async () => {
        if (!selectedUser || !newPassword) {
            toast.error("يرجى إدخال كلمة مرور جديدة");
            return;
        }

        try {
            const response = await fetch(`/api/admin/users/${selectedUser.id}/password`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ newPassword }),
            });

            if (response.ok) {
                toast.success("تم تغيير كلمة المرور بنجاح");
                setNewPassword("");
                setIsDialogOpen(false);
                setSelectedUser(null);
            } else {
                toast.error("حدث خطأ أثناء تغيير كلمة المرور");
            }
        } catch (error) {
            console.error("Error changing password:", error);
            toast.error("حدث خطأ أثناء تغيير كلمة المرور");
        }
    };

    // Users are already filtered by server when searching
    const filteredStaffUsers = staffUsers;
    const filteredStudentUsers = studentUsers;

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
                    إدارة كلمات المرور
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
                                    <TableHead className="text-right">الدور</TableHead>
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
                                        <TableCell>
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setIsDialogOpen(true);
                                                }}
                                            >
                                                <Edit className="h-4 w-4" />
                                                تغيير كلمة المرور
                                            </Button>
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
                            {totalCount > 0 && (
                                <span className="text-sm text-muted-foreground">
                                    إجمالي: {totalCount} | معروض: {filteredStudentUsers.length}
                                </span>
                            )}
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
                                    <TableHead className="text-right">الدور</TableHead>
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
                                        <TableCell>
                                            <Badge variant="secondary">
                                                طالب
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setIsDialogOpen(true);
                                                }}
                                            >
                                                <Edit className="h-4 w-4" />
                                                تغيير كلمة المرور
                                            </Button>
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
            {/* Single lightweight dialog rendered once */}
            <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setIsDialogOpen(false);
                        setNewPassword("");
                        setSelectedUser(null);
                        setShowPassword(false);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            تغيير كلمة مرور {selectedUser?.fullName}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                            <div className="relative">
                                <Input
                                    id="newPassword"
                                    type={showPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="أدخل كلمة المرور الجديدة"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsDialogOpen(false);
                                    setNewPassword("");
                                    setSelectedUser(null);
                                }}
                            >
                                إلغاء
                            </Button>
                            <Button onClick={handlePasswordChange}>
                                تغيير كلمة المرور
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PasswordsPage; 