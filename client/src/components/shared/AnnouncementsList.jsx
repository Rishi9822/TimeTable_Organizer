import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { Megaphone, Loader2 } from "lucide-react";

const priorityColors = {
  urgent: "bg-destructive text-destructive-foreground",
  important: "bg-warning text-warning-foreground",
  normal: "bg-secondary text-secondary-foreground",
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const AnnouncementsList = () => {
  const { data: announcements, isLoading } = useAnnouncements();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!announcements?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Megaphone className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No announcements yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {announcements.map((ann) => (
        <Card key={ann._id || ann.id} className="border-l-4 border-l-primary/30">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-foreground truncate">
                    {ann.title}
                  </h4>
                  <Badge
                    className={`text-[10px] px-1.5 py-0 ${
                      priorityColors[ann.priority] || priorityColors.normal
                    }`}
                  >
                    {ann.priority}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {ann.content}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                {timeAgo(ann.createdAt)}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AnnouncementsList;
