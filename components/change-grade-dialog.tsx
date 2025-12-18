"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";

interface ChangeGradeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const ChangeGradeDialog = ({ open, onOpenChange }: ChangeGradeDialogProps) => {
    const { data: session, update } = useSession();
    const [grade, setGrade] = useState("");
    const [division, setDivision] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);

    // Get division options - all grades have the same options
    const getDivisionOptions = () => {
        return [
            { value: "بكالوريا", label: "بكالوريا" },
            { value: "عام", label: "عام" },
        ];
    };

    // Load user profile when dialog opens
    useEffect(() => {
        if (open) {
            loadUserProfile();
        }
    }, [open]);

    const loadUserProfile = async () => {
        setIsLoadingProfile(true);
        try {
            const response = await axios.get("/api/user/profile");
            if (response.data) {
                setGrade(response.data.grade || "");
                setDivision(response.data.division || "");
            }
        } catch (error) {
            console.error("Error loading user profile:", error);
        } finally {
            setIsLoadingProfile(false);
        }
    };

    const handleGradeChange = (value: string) => {
        setGrade(value);
        setDivision(""); // Reset division when grade changes
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!grade) {
            toast.error("الرجاء اختيار الصف الدراسي");
            return;
        }

        const divisionOptions = getDivisionOptions();
        if (divisionOptions.length > 0 && !division) {
            toast.error("الرجاء اختيار القسم");
            return;
        }

        setIsLoading(true);
        try {
            const response = await axios.patch("/api/user/profile", {
                grade,
                division: division || null
            });

            if (response.status === 200) {
                toast.success("تم تحديث المرحلة الدراسية بنجاح");
                // Update session to reflect changes
                await update();
                onOpenChange(false);
                // Reload the page to refresh course filters
                window.location.reload();
            }
        } catch (error: any) {
            console.error("Error updating profile:", error);
            const errorMessage = error?.response?.data?.error || "حدث خطأ أثناء تحديث المرحلة الدراسية";
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const divisionOptions = getDivisionOptions();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>تغيير المرحلة الدراسية</DialogTitle>
                    <DialogDescription>
                        اختر الصف الدراسي والقسم الخاص بك
                    </DialogDescription>
                </DialogHeader>
                {isLoadingProfile ? (
                    <div className="py-4 text-center">جاري التحميل...</div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="grade">الصف الدراسي *</Label>
                            <Select value={grade} onValueChange={handleGradeChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر الصف الدراسي" />
                                </SelectTrigger>
                                <SelectContent className="z-[102]">
                                    <SelectItem value="الأول الثانوي">الأول الثانوي</SelectItem>
                                    <SelectItem value="الثاني الثانوي">الثاني الثانوي</SelectItem>
                                    <SelectItem value="الثالث الثانوي">الثالث الثانوي</SelectItem>
                                    <SelectItem value="الأول الاعدادي">الأول الاعدادي</SelectItem>
                                    <SelectItem value="الثاني الاعدادي">الثاني الاعدادي</SelectItem>
                                    <SelectItem value="الثالث الاعدادي">الثالث الاعدادي</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {divisionOptions.length > 0 && (
                            <div className="space-y-2">
                                <Label htmlFor="division">القسم *</Label>
                                <Select value={division} onValueChange={setDivision}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="اختر القسم" />
                                    </SelectTrigger>
                                    <SelectContent className="z-[102]">
                                        {divisionOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isLoading}
                            >
                                إلغاء
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "جاري الحفظ..." : "حفظ"}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
};

