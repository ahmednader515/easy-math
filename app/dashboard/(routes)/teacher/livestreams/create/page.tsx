"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Course {
    id: string;
    title: string;
    isPublished: boolean;
}

export default function CreateLiveStreamPage() {
    const router = useRouter();
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [meetingUrl, setMeetingUrl] = useState("");
    const [scheduledAt, setScheduledAt] = useState("");
    const [duration, setDuration] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const response = await fetch("/api/courses");
            if (response.ok) {
                const data = await response.json();
                const publishedCourses = data.filter((course: Course) => course.isPublished);
                setCourses(publishedCourses);
            }
        } catch (error) {
            console.error("Error fetching courses:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!title.trim()) {
            toast.error("الرجاء إدخال عنوان البث المباشر");
            return;
        }

        if (!meetingUrl.trim()) {
            toast.error("الرجاء إدخال رابط الاجتماع");
            return;
        }

        if (!selectedCourse) {
            toast.error("الرجاء اختيار الكورس");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch("/api/teacher/livestreams", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title,
                    description: description || null,
                    meetingUrl,
                    courseId: selectedCourse,
                    scheduledAt: scheduledAt || null,
                    duration: duration || null,
                }),
            });

            if (response.ok) {
                toast.success("تم إنشاء البث المباشر بنجاح");
                router.push("/dashboard/teacher/livestreams");
            } else {
                const error = await response.json();
                toast.error(error.error || "حدث خطأ أثناء إنشاء البث المباشر");
            }
        } catch (error) {
            console.error("Error creating livestream:", error);
            toast.error("حدث خطأ أثناء إنشاء البث المباشر");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">إنشاء بث مباشر جديد</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>معلومات البث المباشر</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="course">الكورس *</Label>
                            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
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
                            <Label htmlFor="title">عنوان البث المباشر *</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="مثال: محاضرة الرياضيات - الفصل الأول"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">الوصف</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="وصف البث المباشر (اختياري)"
                                rows={4}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="meetingUrl">رابط الاجتماع (Zoom أو Google Meet) *</Label>
                            <Input
                                id="meetingUrl"
                                type="url"
                                value={meetingUrl}
                                onChange={(e) => setMeetingUrl(e.target.value)}
                                placeholder="https://zoom.us/j/123456789 أو https://meet.google.com/abc-defg-hij"
                                required
                            />
                            <p className="text-sm text-muted-foreground">
                                يجب أن يكون الرابط من Zoom أو Google Meet
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="scheduledAt">الموعد المحدد</Label>
                            <Input
                                id="scheduledAt"
                                type="datetime-local"
                                value={scheduledAt}
                                onChange={(e) => setScheduledAt(e.target.value)}
                            />
                            <p className="text-sm text-muted-foreground">
                                اتركه فارغاً للبث المباشر الفوري
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="duration">المدة (بالدقائق)</Label>
                            <Input
                                id="duration"
                                type="number"
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                placeholder="مثال: 60"
                                min="1"
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "جاري الإنشاء..." : "إنشاء البث المباشر"}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                            >
                                إلغاء
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

