import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import UserNotifications, { NoticeSummary } from "@/components/UserNotifications";
import { useState } from "react";

const StudentNotices = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<NoticeSummary>({ total: 0, unread: 0, pinned: 0, latest: null });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      <div className="sticky top-0 z-40 border-b border-white/30 bg-white/90 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/student-dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Student</p>
              <h1 className="text-lg font-semibold text-slate-900">Notices & Announcements</h1>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm">
            {summary.unread} unread
          </Badge>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        <Card className="shadow-md border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              All Notices
              {summary.unread > 0 && (
                <Badge className="bg-red-100 text-red-800">{summary.unread} new</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UserNotifications
              userId={user?.id || ""}
              userBranch={user?.branch}
              userType={user?.userType}
              onSummaryUpdate={setSummary}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentNotices;

