import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ArrowLeft, Users, Share2, Copy, Heart, MessageCircle, Calendar, Tag, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Comment, CommentItem } from './CommentItem';

interface Circle {
  id: string;
  name: string;
  creator_id: string;
  invite_code: string;
  member_count?: number;
}

interface CircleViewProps {
  circle: Circle;
  currentPersonaId: string;
  onBack: () => void;
}

const CircleView = ({ circle, currentPersonaId, onBack }: CircleViewProps) => {
  const [members, setMembers] = useState<any[]>([]);
  const [memories, setMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [loadedComments, setLoadedComments] = useState<Record<string, Comment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<{ memoryId: string; commentId: string | null } | null>(null);
  const [currentUserNickname, setCurrentUserNickname] = useState('');

  useEffect(() => {
    loadCircleData();
  }, [circle.id, currentPersonaId]);

  const loadCircleData = async () => {
    setLoading(true);
    await Promise.all([loadMembers(), loadMemories()]);
    setLoading(false);
  };

  const loadMembers = async () => {
    const { data, error } = await supabase.from('circle_members').select('persona_id, nickname, joined_at').eq('circle_id', circle.id).order('joined_at', { ascending: true });
    if (error) { console.error('Error loading members:', error); return; }
    setMembers(data || []);
    const user = data?.find(m => m.persona_id === currentPersonaId);
    if (user) setCurrentUserNickname(user.nickname);
  };

  const loadMemories = async () => {
    const { data: memoriesData, error } = await supabase.from('memories').select('*, likes(id, persona_id), comments(id), memory_tags(persona_id, nickname)').eq('circle_id', circle.id).order('created_at', { ascending: false });
    if (error) { console.error('Error loading memories:', error); return; }
    const memoriesWithData = memoriesData?.map((m: any) => ({ ...m, likes_count: m.likes?.length || 0, comments_count: m.comments?.length || 0, is_liked: m.likes?.some((l: any) => l.persona_id === currentPersonaId), tagged_users: m.memory_tags || [] })) || [];
    setMemories(memoriesWithData);
  };
  
  const structureComments = (list: any[]): Comment[] => {
    const map = new Map();
    const roots: Comment[] = [];
    list.forEach(itemData => {
      const comment: Comment = { ...itemData, is_liked: itemData.comment_likes.some((l: any) => l.persona_id === currentPersonaId), likes_count: itemData.comment_likes.length, replies: [] };
      map.set(itemData.id, comment);
    });
    map.forEach(comment => {
      if (comment.parent_id && map.has(comment.parent_id)) { map.get(comment.parent_id).replies?.push(comment); } else { roots.push(comment); }
    });
    return roots;
  };

  const loadCommentsForMemory = async (memoryId: string) => {
    const { data } = await supabase.from('comments').select('*, comment_likes(persona_id)').eq('memory_id', memoryId).order('created_at', { ascending: true });
    setLoadedComments(prev => ({ ...prev, [memoryId]: structureComments(data || []) }));
  };

  const toggleComments = async (memoryId: string) => {
    const isShowing = !showComments[memoryId];
    setShowComments(prev => ({ ...prev, [memoryId]: isShowing }));
    if (isShowing && !loadedComments[memoryId]) await loadCommentsForMemory(memoryId);
  };

  const handleAddComment = async (memoryId: string, parentId: string | null) => {
    const key = parentId || memoryId;
    const content = commentInputs[key]?.trim();
    if (!content || !currentUserNickname) return;
    await supabase.from('comments').insert({ memory_id: memoryId, author_persona_id: currentPersonaId, author_nickname: currentUserNickname, content, parent_id: parentId });
    setCommentInputs(prev => ({ ...prev, [key]: '' }));
    setReplyingTo(null);
    await loadCommentsForMemory(memoryId);
    await loadMemories();
  };

  const handleLikeComment = async (commentId: string, memoryId: string, isLiked: boolean) => {
    if (isLiked) await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('persona_id', currentPersonaId);
    else await supabase.from('comment_likes').insert({ comment_id: commentId, persona_id: currentPersonaId });
    await loadCommentsForMemory(memoryId);
  };
  
  const handleLikeMemory = async (memoryId: string, isCurrentlyLiked: boolean) => {
    if (isCurrentlyLiked) await supabase.from('likes').delete().eq('memory_id', memoryId).eq('persona_id', currentPersonaId);
    else await supabase.from('likes').insert({ memory_id: memoryId, persona_id: currentPersonaId, nickname: currentUserNickname });
    loadMemories();
  };

  const handleCopyInviteCode = () => {
    navigator.clipboard.writeText(circle.invite_code);
    toast({ title: "คัดลอกแล้ว!", description: "คัดลอกรหัสเชิญไปยังคลิปบอร์ดแล้ว" });
  };
  
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 pb-20 md:pb-0">
      <header className="bg-white/80 backdrop-blur-sm border-b border-orange-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-2" />กลับ</Button>
              <div><h1 className="text-xl font-bold">{circle.name}</h1><p className="text-sm text-gray-600">{members.length} สมาชิก</p></div>
            </div>
            <Button variant="outline" onClick={handleCopyInviteCode}><Share2 className="w-4 h-4 mr-2" />แบ่งปันรหัสเชิญ</Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />สมาชิกในแวดวง</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">{members.map(member => <Badge key={member.persona_id} variant="secondary" className="text-sm">{member.nickname}{member.persona_id === circle.creator_id && ' (ผู้สร้าง)'}</Badge>)}</div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">รหัสเชิญแวดวง:</p>
              <div className="flex items-center gap-2"><code className="bg-white px-3 py-1 rounded border text-sm font-mono">{circle.invite_code}</code><Button size="sm" variant="ghost" onClick={handleCopyInviteCode}><Copy className="w-4 h-4" /></Button></div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <h2 className="text-lg font-semibold">ความทรงจำในแวดวง</h2>
          {memories.length === 0 ? (
            <Card className="text-center py-12"><CardContent><Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-medium text-gray-600">ยังไม่มีความทรงจำ</h3><p className="text-gray-500">สร้างความทรงจำแรกสำหรับแวดวงนี้</p></CardContent></Card>
          ) : (
            memories.map(memory => (
              <Card key={memory.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <CardTitle className="text-xl mb-2">{memory.title}</CardTitle>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                        <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(memory.memory_date).toLocaleDateString('th-TH')}</span>
                        <span>โดย {memory.author_nickname}</span>
                      </div>
                    </div>
                    {memory.feeling_emoji && (<div className="flex-shrink-0 flex items-center gap-2 text-sm text-gray-600 rounded-full bg-gray-100 px-3 py-1"><p>{memory.feeling_emoji}</p><p>{memory.feeling_text}</p></div>)}
                  </div>
                </CardHeader>
                <CardContent>
                  {memory.photos && memory.photos.length > 0 && (<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">{memory.photos.map((url: string, index: number) => (<button key={index} onClick={() => setSelectedMedia(url)} className="focus:outline-none rounded-md overflow-hidden group relative bg-slate-100">{url.includes('.mp4') || url.includes('.mov') ? (<><video muted loop playsInline src={url} className="w-full h-32 object-cover" /><div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Camera className="w-8 h-8 text-white/70" /></div></>) : (<img src={url} alt={`photo ${index+1}`} className="w-full h-32 object-cover" />)}</button>))}</div>)}
                  <p className="text-gray-600 whitespace-pre-wrap">{memory.story}</p>
                  {memory.tagged_users && memory.tagged_users.length > 0 && (<div className="flex items-center flex-wrap gap-2 pt-4 mt-4 border-t"><Users className="w-4 h-4 text-gray-500"/><p className="text-sm text-gray-500">กับ:</p>{memory.tagged_users.map((tag: any) => (<Badge key={tag.persona_id} variant="outline">{tag.nickname}</Badge>))}</div>)}
                  <div className="flex items-center gap-4 pt-4 border-t mt-4"><Button variant="ghost" size="sm" onClick={() => handleLikeMemory(memory.id, memory.is_liked)} className={memory.is_liked ? 'text-red-500' : ''}><Heart className={`w-4 h-4 mr-1 ${memory.is_liked ? 'fill-current' : ''}`} />{memory.likes_count}</Button><Button variant="ghost" size="sm" onClick={() => toggleComments(memory.id)}><MessageCircle className="w-4 h-4 mr-1" />{memory.comments_count}</Button></div>
                  {showComments[memory.id] && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      {loadedComments[memory.id]?.map(comment => (
                        <div key={comment.id}>
                          <CommentItem comment={comment} onReply={(commentId) => setReplyingTo({ memoryId: memory.id, commentId })} onLike={(commentId, isLiked) => handleLikeComment(commentId, memory.id, isLiked)} />
                          {replyingTo?.commentId === comment.id && (
                            <div className="pl-5 mt-2 ml-4 border-l-2">
                              <div className="flex gap-2 pt-2">
                                <Input value={commentInputs[comment.id] || ''} onChange={(e) => setCommentInputs(prev => ({ ...prev, [comment.id]: e.target.value }))} placeholder={`ตอบกลับ...`} autoFocus />
                                <Button onClick={() => handleAddComment(memory.id, comment.id)}>ส่ง</Button>
                                <Button variant="ghost" onClick={() => setReplyingTo(null)}>ยกเลิก</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      <div className="flex gap-2 pt-4">
                        <Input value={commentInputs[memory.id] || ''} onChange={(e) => setCommentInputs(prev => ({ ...prev, [memory.id]: e.target.value }))} placeholder="แสดงความคิดเห็น..." />
                        <Button onClick={() => handleAddComment(memory.id, null)}>ส่ง</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
      
      <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
        <DialogContent className="max-w-4xl w-full p-0 bg-transparent border-0">
          {selectedMedia && (selectedMedia.includes('.mp4') || selectedMedia.includes('.mov')) ? (<video src={selectedMedia} controls autoPlay className="w-full max-h-[90vh] rounded-lg" />) : (<img src={selectedMedia} alt="Enlarged view" className="w-full h-auto max-h-[90vh] object-contain" />)}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CircleView;