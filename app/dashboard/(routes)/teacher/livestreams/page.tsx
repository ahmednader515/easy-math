"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Eye, Video, Calendar, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface LiveStream {
    id: string;
    title: string;
    description?: string;
    meetingUrl: string;
    meetingType: string;
    courseId: string;
    isPublished: boolean;
    scheduledAt?: string;
    duration?: number;
    course: {
        id: string;
        title: string;
    };
    attendanceCount: number;
    isExpired: boolean;
    createdAt: string;
    updatedAt: string;
}

export default function TeacherLiveStreamsPage() {
    const router = useRouter();
    const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchLiveStreams();
    }, []);

    const fetchLiveStreams = async () => {
        try {
            const response = await fetch("/api/teacher/livestreams");
            if (response.ok) {
                const data = await response.json();
                setLiveStreams(data);
            } else {
                toast.error("حدث خطأ أثناء تحميل البثوث المباشرة");
            }
        } catch (error) {
            console.error("Error fetching livestreams:", error);
            toast.error("حدث خطأ أثناء تحميل البثوث المباشرة");
        } finally {
            setLoading(false);
        }
    };

    const handlePublish = async (liveStreamId: string, currentStatus: boolean) => {
        try {
            const response = await fetch(`/api/teacher/livestreams/${liveStreamId}/publish`, {
                method: 'PATCH',
            });
            if (response.ok) {
                setLiveStreams(prev => 
                    prev.map(ls => 
                        ls.id === liveStreamId
                            ? { ...ls, isPublished: !currentStatus }
                            : ls
                    )
                );
                toast.success(currentStatus ? "تم إلغاء النشر" : "تم النشر بنجاح");
            } else {
                toast.error("حدث خطأ");
            }
        } catch (error) {
            toast.error("حدث خطأ");
        }
    };

    const handleDelete = async (liveStreamId: string) => {
        if (!confirm("هل أنت متأكد من حذف هذا البث المباشر؟")) return;
        try {
            const response = await fetch(`/api/teacher/livestreams/${liveStreamId}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                setLiveStreams(prev => prev.filter(ls => ls.id !== liveStreamId));
                toast.success("تم حذف البث المباشر بنجاح");
            } else {
                toast.error("حدث خطأ");
            }
        } catch (error) {
            toast.error("حدث خطأ");
        }
    };

    const filteredLiveStreams = liveStreams.filter((liveStream) =>
        [liveStream.title, liveStream.course.title].some((v) => v.toLowerCase().includes(searchTerm.toLowerCase()))
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
                <h1 className="text-3xl font-bold">البثوث المباشرة</h1>
                <Button onClick={() => router.push('/dashboard/teacher/livestreams/create')} className="bg-[#090919] hover:bg-[#090919]/90 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    إنشاء بث مباشر جديد
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>البثوث المباشرة</CardTitle>
                    <div className="flex items-center space-x-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="البحث في البثوث المباشرة..."
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
                                <TableHead className="text-right">عنوان البث المباشر</TableHead>
                                <TableHead className="text-right">الكورس</TableHead>
                                <TableHead className="text-right">الموعد</TableHead>
                                <TableHead className="text-right">المدة</TableHead>
                                <TableHead className="text-right">الحالة</TableHead>
                                <TableHead className="text-right">الحضور</TableHead>
                                <TableHead className="text-right">الإجراءات</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLiveStreams.map((liveStream) => (
                                <TableRow key={liveStream.id}>
                                    <TableCell className="text-right">
                                        <div className="flex items-center gap-2">
                                            <Video className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">{liveStream.title}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {liveStream.course.title}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {liveStream.scheduledAt ? (
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {format(new Date(liveStream.scheduledAt), 'MMM dd, yyyy HH:mm', { locale: ar })}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">غير مجدول</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {liveStream.duration ? (
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {liveStream.duration} دقيقة
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">لا يوجد</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-col gap-1">
                                            <Badge variant={liveStream.isPublished ? "default" : "secondary"}>
                                                {liveStream.isPublished ? "منشور" : "مسودة"}
                                            </Badge>
                                            {liveStream.isExpired && (
                                                <Badge variant="destructive" className="text-xs">
                                                    منتهي
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant="outline">
                                            {liveStream.attendanceCount || 0} طالب
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => router.push(`/dashboard/teacher/livestreams/${liveStream.id}`)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handlePublish(liveStream.id, liveStream.isPublished)}
                                            >
                                                {liveStream.isPublished ? "إلغاء النشر" : "نشر"}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(liveStream.id)}
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {filteredLiveStreams.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            {searchTerm ? "لا توجد بثوث مباشرة مطابقة للبحث" : "لا توجد بثوث مباشرة"}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

