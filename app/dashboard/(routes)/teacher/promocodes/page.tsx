"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Search, Ticket, BookOpen, Copy, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface PromoCode {
    id: string;
    code: string;
    courseId: string;
    course: {
        id: string;
        title: string;
    };
    usedCount: number;
    usageLimit: number | null;
    isActive: boolean;
    createdAt: string;
}

interface Course {
    id: string;
    title: string;
    isPublished?: boolean;
}

const TeacherPromoCodesPage = () => {
    const [promocodes, setPromocodes] = useState<PromoCode[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectedInactiveIds, setSelectedInactiveIds] = useState<Set<string>>(new Set());
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isInactiveTableOpen, setIsInactiveTableOpen] = useState(false);
    const [deleteAction, setDeleteAction] = useState<"delete" | "deactivate" | null>(null);
    
    // Form state
    const [selectedCourseId, setSelectedCourseId] = useState("");
    const [numberOfCodes, setNumberOfCodes] = useState("");

    useEffect(() => {
        fetchPromocodes();
        fetchCourses();
    }, []);

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

    const fetchPromocodes = async () => {
        try {
            const response = await fetch("/api/promocodes");
            if (response.ok) {
                const data = await response.json();
                setPromocodes(data);
            } else {
                toast.error("حدث خطأ أثناء جلب الأكواد");
            }
        } catch (error) {
            console.error("Error fetching promocodes:", error);
            toast.error("حدث خطأ أثناء جلب الأكواد");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setSelectedCourseId("");
        setNumberOfCodes("");
    };

    const openCreateDialog = () => {
        resetForm();
        setIsDialogOpen(true);
    };

    const handleSubmit = async () => {
        // Validation
        if (!selectedCourseId) {
            toast.error("يرجى اختيار الكورس");
            return;
        }

        const numCodes = parseInt(numberOfCodes);
        if (!numberOfCodes || numCodes <= 0 || numCodes > 100) {
            toast.error("يرجى إدخال عدد صحيح بين 1 و 100");
            return;
        }

        try {
            const response = await fetch("/api/promocodes", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    courseId: selectedCourseId,
                    numberOfCodes: numCodes,
                }),
            });

            if (response.ok) {
                toast.success(`تم إنشاء ${numCodes} كود بنجاح`);
                setIsDialogOpen(false);
                resetForm();
                fetchPromocodes();
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || "حدث خطأ");
            }
        } catch (error) {
            console.error("Error creating promocodes:", error);
            toast.error("حدث خطأ أثناء إنشاء الأكواد");
        }
    };

    const copyToClipboard = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            toast.success("تم نسخ الكود بنجاح");
        } catch (error) {
            console.error("Error copying to clipboard:", error);
            toast.error("فشل نسخ الكود");
        }
    };

    const filteredPromocodes = promocodes.filter(promo =>
        promo.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        promo.course.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const activePromocodes = filteredPromocodes.filter(promo => promo.isActive);
    const inactivePromocodes = filteredPromocodes.filter(promo => !promo.isActive);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const allIds = new Set(activePromocodes.map(promo => promo.id));
            setSelectedIds(allIds);
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectOne = (id: string, checked: boolean) => {
        const newSelected = new Set(selectedIds);
        if (checked) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        setSelectedIds(newSelected);
    };

    const openDeleteDialog = () => {
        if (selectedIds.size === 0) {
            toast.error("يرجى تحديد الأكواد المراد حذفها");
            return;
        }
        setIsDeleteDialogOpen(true);
    };

    const handleBulkDelete = async (action: "delete" | "deactivate") => {
        if (selectedIds.size === 0) return;

        try {
            const response = await fetch("/api/promocodes/bulk", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ids: Array.from(selectedIds),
                    action: action,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(data.message);
                setSelectedIds(new Set());
                setIsDeleteDialogOpen(false);
                fetchPromocodes();
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || "حدث خطأ");
            }
        } catch (error) {
            console.error("Error bulk deleting promocodes:", error);
            toast.error("حدث خطأ أثناء حذف الأكواد");
        }
    };

    const handleBulkActivate = async () => {
        if (selectedInactiveIds.size === 0) return;

        try {
            const response = await fetch("/api/promocodes/bulk", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ids: Array.from(selectedInactiveIds),
                    action: "activate",
                }),
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(data.message);
                setSelectedInactiveIds(new Set());
                fetchPromocodes();
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || "حدث خطأ");
            }
        } catch (error) {
            console.error("Error activating promocodes:", error);
            toast.error("حدث خطأ أثناء تفعيل الأكواد");
        }
    };

    const handleSelectAllInactive = (checked: boolean) => {
        if (checked) {
            const allIds = new Set(inactivePromocodes.map(promo => promo.id));
            setSelectedInactiveIds(allIds);
        } else {
            setSelectedInactiveIds(new Set());
        }
    };

    const handleSelectOneInactive = (id: string, checked: boolean) => {
        const newSelected = new Set(selectedInactiveIds);
        if (checked) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        setSelectedInactiveIds(newSelected);
    };

    const handleSingleDelete = async (id: string) => {
        setSelectedIds(new Set([id]));
        setIsDeleteDialogOpen(true);
    };

    const allSelected = activePromocodes.length > 0 && activePromocodes.every(promo => selectedIds.has(promo.id));
    const allInactiveSelected = inactivePromocodes.length > 0 && inactivePromocodes.every(promo => selectedInactiveIds.has(promo.id));

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
                    الأكواد
                </h1>
                <div className="flex gap-2">
                    {selectedIds.size > 0 && (
                        <Button 
                            variant="destructive" 
                            onClick={openDeleteDialog}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            حذف المحدد ({selectedIds.size})
                        </Button>
                    )}
                    <Button onClick={openCreateDialog} className="bg-[#0083d3] hover:bg-[#0083d3]/90">
                        <Plus className="h-4 w-4 mr-2" />
                        إنشاء أكواد جديدة
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>قائمة الأكواد</CardTitle>
                    <div className="flex items-center space-x-2 mt-4">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="البحث برمز الكود أو اسم الكورس..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {activePromocodes.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-right w-12">
                                        <Checkbox
                                            checked={allSelected}
                                            onCheckedChange={handleSelectAll}
                                            aria-label="تحديد الكل"
                                        />
                                    </TableHead>
                                    <TableHead className="text-right">الرمز</TableHead>
                                    <TableHead className="text-right">الكورس</TableHead>
                                    <TableHead className="text-right">الاستخدام</TableHead>
                                    <TableHead className="text-right">الحالة</TableHead>
                                    <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                                    <TableHead className="text-right">الإجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {activePromocodes.map((promo) => (
                                    <TableRow key={promo.id}>
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedIds.has(promo.id)}
                                                onCheckedChange={(checked) => handleSelectOne(promo.id, checked as boolean)}
                                                aria-label={`تحديد ${promo.code}`}
                                            />
                                        </TableCell>
                                        <TableCell className="font-mono font-bold">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="gap-1">
                                                    <Ticket className="h-3 w-3" />
                                                    {promo.code}
                                                </Badge>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => copyToClipboard(promo.code)}
                                                    className="h-6 w-6 p-0"
                                                >
                                                    <Copy className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                                                <span>{promo.course.title}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {promo.usageLimit 
                                                ? `${promo.usedCount}/${promo.usageLimit}` 
                                                : promo.usedCount}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="default">
                                                نشط
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(promo.createdAt).toLocaleDateString('ar-EG')}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => copyToClipboard(promo.code)}
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleSingleDelete(promo.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center text-muted-foreground py-8">
                            {searchTerm ? "لا توجد نتائج" : "لا توجد أكواد نشطة"}
                        </div>
                    )}

                    {/* Inactive Promocodes Section */}
                    {inactivePromocodes.length > 0 && (
                        <div className="mt-6 border-t-2 border-dashed border-gray-300 dark:border-gray-700 pt-6">
                            <Button
                                variant="outline"
                                onClick={() => setIsInactiveTableOpen(!isInactiveTableOpen)}
                                className="w-full justify-between mb-4 h-auto py-3 px-4 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 border-2"
                            >
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="font-semibold">
                                        {inactivePromocodes.length}
                                    </Badge>
                                    <span className="font-semibold text-base">
                                        الأكواد غير النشطة
                                    </span>
                                </div>
                                {isInactiveTableOpen ? (
                                    <ChevronUp className="h-5 w-5" />
                                ) : (
                                    <ChevronDown className="h-5 w-5" />
                                )}
                            </Button>

                            {isInactiveTableOpen && (
                                <div className="space-y-4">
                                    {selectedInactiveIds.size > 0 && (
                                        <div className="flex justify-end">
                                            <Button
                                                variant="default"
                                                onClick={handleBulkActivate}
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                <RotateCcw className="h-4 w-4 mr-2" />
                                                تفعيل المحدد ({selectedInactiveIds.size})
                                            </Button>
                                        </div>
                                    )}
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-right w-12">
                                                    <Checkbox
                                                        checked={allInactiveSelected}
                                                        onCheckedChange={handleSelectAllInactive}
                                                        aria-label="تحديد الكل"
                                                    />
                                                </TableHead>
                                                <TableHead className="text-right">الرمز</TableHead>
                                                <TableHead className="text-right">الكورس</TableHead>
                                                <TableHead className="text-right">الاستخدام</TableHead>
                                                <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                                                <TableHead className="text-right">الإجراءات</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {inactivePromocodes.map((promo) => (
                                                <TableRow key={promo.id} className="opacity-60">
                                                    <TableCell>
                                                        <Checkbox
                                                            checked={selectedInactiveIds.has(promo.id)}
                                                            onCheckedChange={(checked) => handleSelectOneInactive(promo.id, checked as boolean)}
                                                            aria-label={`تحديد ${promo.code}`}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-mono font-bold">
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="secondary" className="gap-1">
                                                                <Ticket className="h-3 w-3" />
                                                                {promo.code}
                                                            </Badge>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => copyToClipboard(promo.code)}
                                                                className="h-6 w-6 p-0"
                                                            >
                                                                <Copy className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                                                            <span>{promo.course.title}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {promo.usageLimit 
                                                            ? `${promo.usedCount}/${promo.usageLimit}` 
                                                            : promo.usedCount}
                                                    </TableCell>
                                                    <TableCell>
                                                        {new Date(promo.createdAt).toLocaleDateString('ar-EG')}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-2 justify-end">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => copyToClipboard(promo.code)}
                                                            >
                                                                <Copy className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="default"
                                                                onClick={async () => {
                                                                    try {
                                                                        const response = await fetch("/api/promocodes/bulk", {
                                                                            method: "POST",
                                                                            headers: {
                                                                                "Content-Type": "application/json",
                                                                            },
                                                                            body: JSON.stringify({
                                                                                ids: [promo.id],
                                                                                action: "activate",
                                                                            }),
                                                                        });

                                                                        if (response.ok) {
                                                                            const data = await response.json();
                                                                            toast.success(data.message);
                                                                            fetchPromocodes();
                                                                        } else {
                                                                            const errorData = await response.json();
                                                                            toast.error(errorData.error || "حدث خطأ");
                                                                        }
                                                                    } catch (error) {
                                                                        console.error("Error activating promocode:", error);
                                                                        toast.error("حدث خطأ أثناء تفعيل الكود");
                                                                    }
                                                                }}
                                                                className="bg-green-600 hover:bg-green-700"
                                                            >
                                                                <RotateCcw className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>إنشاء أكواد جديدة</DialogTitle>
                        <DialogDescription>
                            اختر الكورس وعدد الأكواد المراد إنشاؤها. كل كود يعطي خصم 100% على الكورس المحدد.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="course">الكورس *</Label>
                            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر الكورس" />
                                </SelectTrigger>
                                <SelectContent>
                                    {courses.map((course) => (
                                        <SelectItem key={course.id} value={course.id}>
                                            {course.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="numberOfCodes">عدد الأكواد *</Label>
                            <Input
                                id="numberOfCodes"
                                type="number"
                                value={numberOfCodes}
                                onChange={(e) => setNumberOfCodes(e.target.value)}
                                placeholder="مثال: 10"
                                min="1"
                                max="100"
                            />
                            <p className="text-sm text-muted-foreground">
                                يمكن إنشاء من 1 إلى 100 كود في المرة الواحدة
                            </p>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                إلغاء
                            </Button>
                            <Button onClick={handleSubmit} className="bg-[#0083d3] hover:bg-[#0083d3]/90">
                                إنشاء
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>حذف الأكواد</DialogTitle>
                        <DialogDescription>
                            اختر نوع الحذف المطلوب لـ {selectedIds.size} كود محدد
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div className="space-y-3">
                            <Button
                                variant="outline"
                                className="w-full justify-start h-auto p-4"
                                onClick={() => handleBulkDelete("delete")}
                            >
                                <div className="flex flex-col items-start gap-1">
                                    <div className="font-semibold">حذف نهائي</div>
                                    <div className="text-sm text-muted-foreground">
                                        حذف الكود من قاعدة البيانات بشكل نهائي ولا يمكن استرجاعه
                                    </div>
                                </div>
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full justify-start h-auto p-4"
                                onClick={() => handleBulkDelete("deactivate")}
                            >
                                <div className="flex flex-col items-start gap-1">
                                    <div className="font-semibold">إزالة من القائمة</div>
                                    <div className="text-sm text-muted-foreground">
                                        إزالة الكود من القائمة ولكن يبقى في قاعدة البيانات ويمكن استرداده
                                    </div>
                                </div>
                            </Button>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                                إلغاء
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TeacherPromoCodesPage;
