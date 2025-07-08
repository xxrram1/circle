import React from 'react';
import { Button } from '@/components/ui/button';
import { Heart, CornerDownRight } from 'lucide-react';

export interface Comment {
  id: string;
  content: string;
  author_nickname: string;
  created_at: string;
  parent_id: string | null;
  likes_count?: number;
  is_liked?: boolean;
  replies?: Comment[];
}

interface CommentItemProps {
  comment: Comment;
  onReply: (commentId: string) => void;
  onLike: (commentId: string, isLiked: boolean) => void;
}

export const CommentItem: React.FC<CommentItemProps> = ({ comment, onReply, onLike }) => {
  return (
    <div className="flex flex-col">
      <div className="bg-gray-50 p-3 rounded-lg text-sm">
        <div className="flex justify-between items-start">
          <div className="flex-1 pr-2">
            <span className="font-medium mr-2">{comment.author_nickname}</span>
            <span className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleDateString('th-TH')}</span>
            <p className="mt-1 text-gray-800 break-words">{comment.content}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onLike(comment.id, comment.is_liked || false)}
            className={`flex items-center gap-1 shrink-0 ${comment.is_liked ? 'text-red-500' : 'text-gray-500'}`}
          >
            <Heart className={`w-4 h-4 ${comment.is_liked ? 'fill-current' : ''}`} />
            {comment.likes_count || 0}
          </Button>
        </div>
        <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => onReply(comment.id)}>
          <CornerDownRight className="w-3 h-3 mr-1" />
          ตอบกลับ
        </Button>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="pl-5 mt-2 space-y-2 border-l-2 ml-4">
          {comment.replies.map(reply => (
            <CommentItem key={reply.id} comment={reply} onReply={onReply} onLike={onLike} />
          ))}
        </div>
      )}
    </div>
  );
};