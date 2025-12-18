"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import axios, { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Video, Calendar, Clock, ExternalLink } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface LiveStream {
    id: string;
    title: string;
    description?: string;
    meetingUrl: string;
    meetingType: string;
    scheduledAt?: string;
    duration?: number;
    nextChapterId?: string;
    previousChapterId?: string;
    nextContentType?: 'chapter' | 'quiz' | 'livestream' | null;
    previousContentType?: 'chapter' | 'quiz' | 'livestream' | null;
}

const LiveStreamPage = () => {
    const router = useRouter();
    const routeParams = useParams() as { courseId: string; livestreamId: string };
    const [liveStream, setLiveStream] = useState<LiveStream | null>(null);
    const [loading, setLoading] = useState(true);
    const [courseProgress, setCourseProgress] = useState(0);
    const [hasAccess, setHasAccess] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [liveStreamResponse, progressResponse, accessResponse] = await Promise.all([
                    axios.get(`/api/courses/${routeParams.courseId}/livestreams/${routeParams.livestreamId}`),
                    axios.get(`/api/courses/${routeParams.courseId}/progress`),
                    axios.get(`/api/courses/${routeParams.courseId}/access`)
                ]);
                
                setLiveStream(liveStreamResponse.data);
                setCourseProgress(progressResponse.data.progress);
                setHasAccess(accessResponse.data.hasAccess);
            } catch (error) {
                const axiosError = error as AxiosError;
                console.error("Error fetching data:", axiosError);
                if (axiosError.response) {
                    toast.error(`فشل تحميل البث المباشر: ${axiosError.response.data}`);
                } else if (axiosError.request) {
                    toast.error("فشل الاتصال");
                } else {
                    toast.error("حدث خطأ غير معروف");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [routeParams.courseId, routeParams.livestreamId]);

    const onNext = () => {
        if (liveStream?.nextChapterId) {
            if (liveStream.nextContentType === 'quiz') {
                router.push(`/courses/${routeParams.courseId}/quizzes/${liveStream.nextChapterId}`);
            } else if (liveStream.nextContentType === 'livestream') {
                router.push(`/courses/${routeParams.courseId}/livestreams/${liveStream.nextChapterId}`);
            } else {
                router.push(`/courses/${routeParams.courseId}/chapters/${liveStream.nextChapterId}`);
            }
        }
    };

    const onPrevious = () => {
        if (liveStream?.previousChapterId) {
            if (liveStream.previousContentType === 'quiz') {
                router.push(`/courses/${routeParams.courseId}/quizzes/${liveStream.previousChapterId}`);
            } else if (liveStream.previousContentType === 'livestream') {
                router.push(`/courses/${routeParams.courseId}/livestreams/${liveStream.previousChapterId}`);
            } else {
                router.push(`/courses/${routeParams.courseId}/chapters/${liveStream.previousChapterId}`);
            }
        }
    };

    const openMeeting = async () => {
        if (liveStream?.meetingUrl) {
            // Track attendance
            try {
                await axios.post(`/api/courses/${routeParams.courseId}/livestreams/${routeParams.livestreamId}/attend`);
            } catch (error) {
                console.error("Error tracking attendance:", error);
            }
            
            window.open(liveStream.meetingUrl, '_blank');
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-muted-foreground">جاري التحميل...</div>
            </div>
        );
    }

    if (!liveStream) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-muted-foreground">البث المباشر غير موجود</div>
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Video className="h-8 w-8 mx-auto text-muted-foreground" />
                    <h2 className="text-2xl font-semibold">البث المباشر مقفل</h2>
                    <p className="text-muted-foreground">يرجى شراء الكورس للوصول إلى البث المباشر</p>
                    <Button onClick={() => router.push(`/courses/${routeParams.courseId}/purchase`)}>
                        شراء الكورس
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full">
            <div className="max-w-5xl mx-auto p-6">
                <div className="flex flex-col gap-8">
                    {/* Course Progress */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">التقدم</span>
                            <span className="text-sm font-medium">{courseProgress}%</span>
                        </div>
                        <Progress value={courseProgress} className="h-2" />
                    </div>

                    {/* Live Stream Information */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl font-bold">{liveStream.title}</h1>
                            <div className="flex items-center gap-2 text-red-600">
                                <Video className="h-5 w-5" />
                                <span className="text-sm font-medium">بث مباشر</span>
                            </div>
                        </div>
                        
                        {/* Live Stream Details */}
                        <div className="bg-card rounded-lg p-6 border">
                            <div className="space-y-4">
                                {liveStream.scheduledAt && (
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">
                                            الموعد المحدد: {format(new Date(liveStream.scheduledAt), "PPP p", { locale: ar })}
                                        </span>
                                    </div>
                                )}
                                
                                {liveStream.duration && (
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">
                                            المدة: {liveStream.duration} دقيقة
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Description */}
                        {liveStream.description && (
                            <div className="prose max-w-none">
                                <div dangerouslySetInnerHTML={{ __html: liveStream.description }} />
                            </div>
                        )}

                        {/* Join Meeting Button */}
                        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
                            <div className="text-center space-y-4">
                                <h3 className="text-xl font-semibold">
                                    {liveStream.scheduledAt && new Date(liveStream.scheduledAt) > new Date()
                                        ? "انضم إلى البث المباشر المجدول"
                                        : "انضم إلى البث المباشر"
                                    }
                                </h3>
                                <p className="text-blue-100">
                                    {liveStream.scheduledAt && new Date(liveStream.scheduledAt) > new Date()
                                        ? "سيتم فتح رابط الاجتماع في نافذة جديدة عند الموعد المحدد"
                                        : "انقر على الزر أدناه للانضمام إلى الاجتماع"
                                    }
                                </p>
                                <Button
                                    onClick={openMeeting}
                                    className="bg-white text-blue-600 hover:bg-gray-100 font-semibold px-8 py-3 text-lg"
                                >
                                    <ExternalLink className="h-5 w-5 mr-2" />
                                    {liveStream.meetingType === 'zoom' ? 'انضم إلى اجتماع Zoom' : 'انضم إلى Google Meet'}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between mt-8">
                        <Button
                            variant="outline"
                            onClick={onPrevious}
                            disabled={!liveStream.previousChapterId}
                            className="flex items-center gap-2"
                        >
                            <ChevronRight className="h-4 w-4" />
                            الفصل السابق
                        </Button>
                        <Button
                            onClick={onNext}
                            disabled={!liveStream.nextChapterId}
                            className="flex items-center gap-2"
                        >
                            الفصل التالي
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveStreamPage;

