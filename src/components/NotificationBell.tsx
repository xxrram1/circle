import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';

interface Notification {
  id: string;
  actor_nickname: string;
  action_type: string;
  memory_id: string | null;
  circle_id: string | null; // เพิ่ม circle_id เพื่อรองรับอนาคต
  is_read: boolean;
  created_at: string;
}

interface NotificationBellProps {
  personaId: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ personaId }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    // Fetch initial notifications
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_persona_id', personaId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching notifications:', error);
      } else if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    };

    fetchNotifications();

    // Set up real-time subscription
    const channel = supabase
      .channel(`realtime-notifications-${personaId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_persona_id=eq.${personaId}` },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // [ใหม่] ปรับปรุงข้อความ Toast ให้ละเอียดขึ้น
          let toastDescription = "มีการแจ้งเตือนใหม่";
          if (newNotification.action_type === 'join_circle') {
            toastDescription = `${newNotification.actor_nickname} ได้เข้าร่วมแวดวง!`;
          } else {
            toastDescription = `${newNotification.actor_nickname} ได้กระทำการบางอย่างบนโพสต์ของคุณ`;
          }

          toast({
            title: "การแจ้งเตือนใหม่",
            description: toastDescription,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [personaId, toast]);

  const getNotificationMessage = (noti: Notification) => {
    switch (noti.action_type) {
      case 'like_memory':
        return `${noti.actor_nickname} ถูกใจความทรงจำของคุณ`;
      case 'comment_on_memory':
        return `${noti.actor_nickname} แสดงความคิดเห็นบนความทรงจำของคุณ`;
      case 'reply_to_comment':
        return `${noti.actor_nickname} ตอบกลับความคิดเห็นของคุณ`;
      // [ใหม่] เพิ่มข้อความสำหรับการแจ้งเตือนเมื่อมีคนเข้าร่วมแวดวง
      case 'join_circle':
        return `${noti.actor_nickname} ได้เข้าร่วมแวดวง`;
      default:
        return 'มีการแจ้งเตือนใหม่';
    }
  };

  const handleOpenChange = async (isOpen: boolean) => {
    if (isOpen && unreadCount > 0) {
      setUnreadCount(0);
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);

      if (error) {
        console.error('Error marking notifications as read:', error);
        setUnreadCount(unreadIds.length); // Revert if failed
      }
    }
  };

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">การแจ้งเตือน</h4>
            <p className="text-sm text-muted-foreground">
              คุณมีการแจ้งเตือนล่าสุด {notifications.length} รายการ
            </p>
          </div>
          <div className="grid gap-2 max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((noti) => (
                <div key={noti.id} className={`grid grid-cols-[25px_1fr] items-start pb-4 last:mb-0 last:pb-0 ${!noti.is_read ? 'font-bold' : ''}`}>
                  <span className="flex h-2 w-2 translate-y-1 rounded-full bg-sky-500" />
                  <div className="grid gap-1">
                    <p className="text-sm">
                      {getNotificationMessage(noti)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(noti.created_at), { addSuffix: true, locale: th })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-center text-muted-foreground py-4">ไม่มีการแจ้งเตือน</p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
