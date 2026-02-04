"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, BookOpen, User, Plus, X } from "lucide-react";
import { toast } from "sonner";

interface User {
    id: string;
    fullName: string;
    phoneNumber: string;
    role: string;
    _count?: {
        purchases: number;
    };
}

interface Course {
    id: string;
    title: string;
    price: number;
    isPublished: boolean;
}

const AddCoursesPage = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [ownedCourses, setOwnedCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedCourse, setSelectedCourse] = useState<string>("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<"add" | "delete">("add");
    const [isAddingCourse, setIsAddingCourse] = useState(false);
    const [isDeletingCourse, setIsDeletingCourse] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        fetchUsers(true);
        fetchCourses();
    }, []);

    useEffect(() => {
        // fetch owned courses when a user is selected for delete mode
        const fetchOwned = async () => {
            if (!selectedUser) {
                setOwnedCourses([]);
                return;
            }
            try {
                const res = await fetch(`/api/admin/users/${selectedUser.id}/courses`);
                if (res.ok) {
                    const data = await res.json();
                    setOwnedCourses(data.courses || []);
                }
            } catch (e) {
                console.error("Error fetching owned courses", e);
            }
        };
        fetchOwned();
    }, [selectedUser]);

    const fetchUsers = async (reset: boolean = false, search: string = "") => {
        try {
            if (reset) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            const skip = reset ? 0 : users.length;
            const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
            const response = await fetch(`/api/admin/users?skip=${skip}&take=25${searchParam}`);
            
            if (response.ok) {
                const data = await response.json();
                const usersArray = Array.isArray(data) ? data : (data.users || []);
                // Filter only students
                const studentUsers = usersArray.filter((user: User) => user.role === "USER");
                if (reset) {
                    setUsers(studentUsers);
                } else {
                    setUsers(prev => [...prev, ...studentUsers]);
                }
                setHasMore(data.hasMore || false);
                setTotalCount(data.totalCount || studentUsers.length);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        fetchUsers(false, searchTerm);
    };

    const handleSearch = () => {
        if (searchInput.trim()) {
            setSearchTerm(searchInput.trim());
            setIsSearching(true);
            fetchUsers(true, searchInput.trim());
        }
    };

    const handleClearSearch = () => {
        setSearchInput("");
        setSearchTerm("");
        setIsSearching(false);
        fetchUsers(true);
    };

    const fetchCourses = async () => {
        try {
            const response = await fetch("/api/courses");
            if (response.ok) {
                const data = await response.json();
                // Filter only published courses
                const publishedCourses = data.filter((course: Course) => course.isPublished);
                setCourses(publishedCourses);
            }
        } catch (error) {
            console.error("Error fetching courses:", error);
        }
    };

    const handleAddCourse = async () => {
        if (!selectedUser || !selectedCourse) {
            toast.error("يرجى اختيار الطالب والكورس");
            return;
        }

        setIsAddingCourse(true);
        try {
            const response = await fetch(`/api/admin/users/${selectedUser.id}/add-course`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ courseId: selectedCourse }),
            });

            if (response.ok) {
                toast.success("تم إضافة الكورس للطالب بنجاح");
                setIsDialogOpen(false);
                setSelectedUser(null);
                setSelectedCourse("");
            } else {
                const error = await response.json();
                toast.error(error.message || "حدث خطأ أثناء إضافة الكورس");
            }
        } catch (error) {
            console.error("Error adding course:", error);
            toast.error("حدث خطأ أثناء إضافة الكورس");
        } finally {
            setIsAddingCourse(false);
        }
    };

    const handleDeleteCourse = async () => {
        if (!selectedUser || !selectedCourse) {
            toast.error("يرجى اختيار الطالب والكورس");
            return;
        }

        setIsDeletingCourse(true);
        try {
            const res = await fetch(`/api/admin/users/${selectedUser.id}/add-course`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ courseId: selectedCourse })
            });
            if (res.ok) {
                toast.success("تم حذف الكورس من الطالب بنجاح");
                setIsDialogOpen(false);
                setSelectedCourse("");
                setSelectedUser(null);
                fetchUsers(true);
            } else {
                const data = await res.json().catch(() => ({} as any));
                toast.error((data as any).error || "حدث خطأ أثناء حذف الكورس");
            }
        } catch (error) {
            console.error("Error deleting course:", error);
            toast.error("حدث خطأ أثناء حذف الكورس");
        } finally {
            setIsDeletingCourse(false);
        }
    };

    // Users are already filtered by server when searching
    const filteredUsers = users;

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
                    اضافة و حذف الكورسات للطلاب
                </h1>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>قائمة الطلاب</CardTitle>
                        {totalCount > 0 && (
                            <span className="text-sm text-muted-foreground">
                                إجمالي: {totalCount} | معروض: {filteredUsers.length}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center space-x-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="البحث بالاسم أو رقم الهاتف..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-right">الاسم</TableHead>
                                <TableHead className="text-right">رقم الهاتف</TableHead>
                                <TableHead className="text-right">الدور</TableHead>
                                <TableHead className="text-right">الكورسات المشتراة</TableHead>
                                <TableHead className="text-right">الإجراءات</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.map((user) => (
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
                                        <Badge variant="outline">{user._count?.purchases ?? 0}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setDialogMode("add");
                                                    setSelectedCourse("");
                                                    setIsDialogOpen(true);
                                                }}
                                            >
                                                <Plus className="h-4 w-4" />
                                                إضافة كورس
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="destructive"
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setDialogMode("delete");
                                                    setSelectedCourse("");
                                                    setIsDialogOpen(true);
                                                }}
                                            >
                                                حذف الكورس
                                            </Button>
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
            {/* Single lightweight dialog rendered once */}
            <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setIsDialogOpen(false);
                        setSelectedCourse("");
                        setSelectedUser(null);
                        setDialogMode("add");
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {dialogMode === "add" ? (
                                <>إضافة كورس لـ {selectedUser?.fullName}</>
                            ) : (
                                <>حذف كورس من {selectedUser?.fullName}</>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">اختر الكورس</label>
                            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر كورس..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {(dialogMode === "delete" ? ownedCourses : courses).map((course) => (
                                        <SelectItem key={course.id} value={course.id}>
                                            <div className="flex items-center justify-between w-full">
                                                <span>{course.title}</span>
                                                {typeof course.price === "number" && (
                                                    <Badge variant="outline" className="mr-2">
                                                        {course.price} جنيه
                                                    </Badge>
                                                )}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-end space-x-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsDialogOpen(false);
                                    setSelectedCourse("");
                                    setSelectedUser(null);
                                    setDialogMode("add");
                                }}
                            >
                                إلغاء
                            </Button>
                            {dialogMode === "add" ? (
                                <Button 
                                    onClick={handleAddCourse}
                                    disabled={!selectedCourse || isAddingCourse}
                                >
                                    {isAddingCourse ? "جاري الإضافة..." : "إضافة الكورس"}
                                </Button>
                            ) : (
                                <Button 
                                    variant="destructive"
                                    onClick={handleDeleteCourse}
                                    disabled={!selectedCourse || isDeletingCourse}
                                >
                                    {isDeletingCourse ? "جاري الحذف..." : "حذف الكورس"}
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AddCoursesPage; 