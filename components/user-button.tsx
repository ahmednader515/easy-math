"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";
import { ChangeGradeDialog } from "./change-grade-dialog";

export const UserButton = () => {
  const { data: session } = useSession();
  const [isGradeDialogOpen, setIsGradeDialogOpen] = useState(false);

  if (!session?.user) {
    return null;
  }

  const isStudent = session.user.role === "USER";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Avatar>
            <AvatarImage src={session.user.image || ""} />
            <AvatarFallback>
              {session.user.name?.charAt(0) || session.user.email?.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isStudent && (
            <DropdownMenuItem
              onClick={() => setIsGradeDialogOpen(true)}
              className="cursor-pointer"
            >
              <User className="h-4 w-4 mr-2" />
              تغيير المرحلة الدراسية
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => signOut()}
            className="text-red-600 cursor-pointer"
          >
            <LogOut className="h-4 w-4 mr-2" />
            تسجيل الخروج
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {isStudent && (
        <ChangeGradeDialog
          open={isGradeDialogOpen}
          onOpenChange={setIsGradeDialogOpen}
        />
      )}
    </>
  );
}; 