"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Edit, Search, Wallet, X } from "lucide-react";
import { toast } from "sonner";

interface User {
    id: string;
    fullName: string;
    phoneNumber: string;
    role: string;
    balance: number;
}

const BalancesPage = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [newBalance, setNewBalance] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        fetchUsers(true);
    }, []);

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
                if (reset) {
                    setUsers(usersArray);
                } else {
                    setUsers(prev => [...prev, ...usersArray]);
                }
                setHasMore(data.hasMore || false);
                setTotalCount(data.totalCount || usersArray.length);
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

    const handleBalanceUpdate = async () => {
        if (!selectedUser || !newBalance) {
            toast.error("يرجى إدخال رصيد جديد");
            return;
        }

        const balance = parseFloat(newBalance);
        if (isNaN(balance) || balance < 0) {
            toast.error("يرجى إدخال رصيد صحيح");
            return;
        }

        try {
            const response = await fetch(`/api/admin/users/${selectedUser.id}/balance`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ newBalance: balance }),
            });

            if (response.ok) {
                toast.success("تم تحديث الرصيد بنجاح");
                setNewBalance("");
                setIsDialogOpen(false);
                setSelectedUser(null);
                fetchUsers(true); // Refresh the list from beginning
            } else {
                toast.error("حدث خطأ أثناء تحديث الرصيد");
            }
        } catch (error) {
            console.error("Error updating balance:", error);
            toast.error("حدث خطأ أثناء تحديث الرصيد");
        }
    };

    // Users are already filtered by server when searching
    const studentUsers = users.filter(user => user.role === "USER");

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
                    إدارة الأرصدة
                </h1>
            </div>

            {/* Students Table */}
            {studentUsers.length > 0 && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>قائمة الطلاب</CardTitle>
                            {totalCount > 0 && (
                                <span className="text-sm text-muted-foreground">
                                    إجمالي: {totalCount} | معروض: {studentUsers.length}
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
                                    <TableHead className="text-right">الرصيد الحالي</TableHead>
                                    <TableHead className="text-right">الإجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {studentUsers.map((user) => (
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
                                            <Badge variant="outline" className="flex items-center gap-1">
                                                <Wallet className="h-3 w-3" />
                                                {user.balance} جنيه
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setNewBalance(user.balance.toString());
                                                    setIsDialogOpen(true);
                                                }}
                                            >
                                                <Edit className="h-4 w-4" />
                                                تعديل الرصيد
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
                        setNewBalance("");
                        setSelectedUser(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            تعديل رصيد {selectedUser?.fullName}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="newBalance">الرصيد الجديد (جنيه)</Label>
                            <Input
                                id="newBalance"
                                type="number"
                                value={newBalance}
                                onChange={(e) => setNewBalance(e.target.value)}
                                placeholder="أدخل الرصيد الجديد"
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div className="flex justify-end space-x-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsDialogOpen(false);
                                    setNewBalance("");
                                    setSelectedUser(null);
                                }}
                            >
                                إلغاء
                            </Button>
                            <Button onClick={handleBalanceUpdate}>
                                تحديث الرصيد
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default BalancesPage; 