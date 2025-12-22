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
import { Plus, Trash2, Search, Ticket, BookOpen } from "lucide-react";
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
}

const AdminPromoCodesPage = () => {
    const [promocodes, setPromocodes] = useState<PromoCode[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    
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

    const handleDelete = async (id: string) => {
        if (!confirm("هل أنت متأكد من حذف هذا الكود؟")) {
            return;
        }

        try {
            const response = await fetch(`/api/promocodes/${id}`, {
                method: "DELETE",
            });

            if (response.ok) {
                toast.success("تم حذف الكود بنجاح");
                fetchPromocodes();
            } else {
                toast.error("حدث خطأ أثناء حذف الكود");
            }
        } catch (error) {
            console.error("Error deleting promocode:", error);
            toast.error("حدث خطأ أثناء حذف الكود");
        }
    };

    const filteredPromocodes = promocodes.filter(promo =>
        promo.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        promo.course.title.toLowerCase().includes(searchTerm.toLowerCase())
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
                    الأكواد
                </h1>
                <Button onClick={openCreateDialog} className="bg-[#0083d3] hover:bg-[#0083d3]/90">
                    <Plus className="h-4 w-4 mr-2" />
                    إنشاء أكواد جديدة
                </Button>
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
                    {filteredPromocodes.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-right">الرمز</TableHead>
                                    <TableHead className="text-right">الكورس</TableHead>
                                    <TableHead className="text-right">الاستخدام</TableHead>
                                    <TableHead className="text-right">الحالة</TableHead>
                                    <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                                    <TableHead className="text-right">الإجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPromocodes.map((promo) => (
                                    <TableRow key={promo.id}>
                                        <TableCell className="font-mono font-bold">
                                            <Badge variant="outline" className="gap-1">
                                                <Ticket className="h-3 w-3" />
                                                {promo.code}
                                            </Badge>
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
                                            <Badge variant={promo.isActive ? "default" : "secondary"}>
                                                {promo.isActive ? "نشط" : "غير نشط"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(promo.createdAt).toLocaleDateString('ar-EG')}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleDelete(promo.id)}
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
                            {searchTerm ? "لا توجد نتائج" : "لا توجد أكواد"}
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
                                <SelectContent className="z-[102]">
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
        </div>
    );
};

export default AdminPromoCodesPage;
