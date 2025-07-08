import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Plus, Users, Camera, Heart, MessageCircle, Calendar, LogOut, Copy, UserPlus, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import CreateCircle from './CreateCircle';
import CreateMemory from './CreateMemory';
import CircleView from './CircleView';
import JoinCircleModal from './JoinCircleModal';
import { Comment, CommentItem } from './CommentItem';

interface DashboardProps {
  nickname: string;
  personaId: string;
  onLogout: () => void;
}

interface Circle {
  id: string;
  name: string;
  creator_id: string;
  invite_code: string;
  member_count?: number;
}

const Dashboard = ({ nickname, personaId, onLogout }: DashboardProps) => {
  const [activeView, setActiveView] = useState<'feed' | 'create-circle' | 'create-memory' | 'circle-view'>('feed');
  const [circles, setCircles] = useState<Circle[]>([]);
  const [memories, setMemories] = useState<any[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'tagged' | string>('all');
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const { toast } = useToast();
  
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [loadedComments, setLoadedComments] = useState<Record<string, Comment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<{ memoryId: string; commentId: string | null } | null>(null);

  // *** START: REALTIME SUBSCRIPTION EFFECT ***
  useEffect(() => {
    // ดักฟังเฉพาะเมื่อมี personaId เท่านั้น
    if (!personaId) return;

    // สร้าง Channel สำหรับการดักฟัง, ตั้งชื่ออะไรก็ได้
    const channel = supabase.channel(`public:dashboard:${personaId}`);

    const subscription = channel
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        console.log('Realtime event received:', payload);
        
        // Save scroll position before reloading
        const scrollY = window.scrollY;
        
        // โหลดข้อมูลใหม่โดยไม่แสดง loading spinner
        loadUserData(false).then(() => {
          // Restore scroll position after reload
          setTimeout(() => {
            window.scrollTo(0, scrollY);
          }, 50);
        });

        // หากต้องการจัดการที่ซับซ้อนขึ้น สามารถเช็ค payload.table เพื่ออัปเดตเฉพาะส่วนได้
        // เช่น: if (payload.table === 'comments') { loadCommentsForMemory(payload.new.memory_id) }
      })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Realtime channel subscribed!');
        }
        if (err) {
          console.error('Realtime subscription error:', err);
        }
      });

    // Cleanup function: จะทำงานเมื่อ component ถูก unmount
    // เพื่อยกเลิกการดักฟัง ป้องกัน memory leak
    return () => {
      supabase.removeChannel(channel);
    };
  }, [personaId]);
  // *** END: REALTIME SUBSCRIPTION EFFECT ***

  useEffect(() => {
    if (activeView === 'feed') {
      loadUserData();
    }
  }, [personaId, activeView]);

  const loadUserData = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    await Promise.all([loadCircles(), loadMemories()]);
    setLoading(false);
    setInitialLoading(false);
  };

  const loadCircles = async () => {
    const { data } = await supabase.from('circle_members').select('circles!inner(*)').eq('persona_id', personaId);
    if (!data) { setCircles([]); return; }
    const circlesWithCount = await Promise.all(
      data.map(async (member: any) => {
        const { count } = await supabase.from('circle_members').select('*', { count: 'exact', head: true }).eq('circle_id', member.circles.id);
        return { ...member.circles, member_count: count || 0 };
      })
    );
    setCircles(circlesWithCount);
  };

  const loadMemories = async () => {
    const { data: userCircles } = await supabase.from('circle_members').select('circle_id').eq('persona_id', personaId);
    if (!userCircles || userCircles.length === 0) { setMemories([]); return; }
    const circleIds = userCircles.map(c => c.circle_id);
    const { data } = await supabase.from('memories').select('*, circles(name), likes(id, persona_id), comments(id), memory_tags(persona_id, nickname)').in('circle_id', circleIds).order('created_at', { ascending: false });
    const memoriesWithData = data?.map((m: any) => ({ ...m, circle_name: m.circles?.name, likes_count: m.likes?.length || 0, comments_count: m.comments?.length || 0, is_liked: m.likes?.some((l: any) => l.persona_id === personaId), tagged_users: m.memory_tags || [] })) || [];
    setMemories(memoriesWithData);
  };
  
  const structureComments = (list: any[]): Comment[] => {
    const map = new Map();
    const roots: Comment[] = [];
    list.forEach(itemData => {
      const comment: Comment = {
        ...itemData,
        is_liked: itemData.comment_likes.some((l: any) => l.persona_id === personaId),
        likes_count: itemData.comment_likes.length,
        replies: []
      };
      map.set(itemData.id, comment);
    });
    map.forEach(comment => {
      if (comment.parent_id && map.has(comment.parent_id)) {
        map.get(comment.parent_id).replies?.push(comment);
      } else {
        roots.push(comment);
      }
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
    if (isShowing && !loadedComments[memoryId]) {
      await loadCommentsForMemory(memoryId);
    }
  };
  
  const handleAddComment = async (memoryId: string, parentId: string | null) => {
    const key = parentId || memoryId;
    const content = commentInputs[key]?.trim();
    if (!content) return;
    
    try {
      // Save scroll position before any state changes
      const scrollY = window.scrollY;
      
      // Optimistic update - clear input immediately
      setCommentInputs(prev => ({ ...prev, [key]: '' }));
      setReplyingTo(null);
      
      // Send to database
      const { error } = await supabase.from('comments').insert({ 
        memory_id: memoryId, 
        author_persona_id: personaId, 
        author_nickname: nickname, 
        content, 
        parent_id: parentId 
      });
      
      if (error) {
        console.error('Error adding comment:', error);
        setCommentInputs(prev => ({ ...prev, [key]: content }));
        return;
      }
      
      // Update comment count optimistically
      setMemories(prev => prev.map(m => 
        m.id === memoryId 
          ? { ...m, comments_count: m.comments_count + 1 }
          : m
      ));
      
      // Only reload comments for this specific memory if comments are visible
      if (showComments[memoryId]) {
        await loadCommentsForMemory(memoryId);
      }
      
      // Force scroll position after all updates
      setTimeout(() => {
        window.scrollTo(0, scrollY);
      }, 0);
      
    } catch (error) {
      console.error('Error in handleAddComment:', error);
      setCommentInputs(prev => ({ ...prev, [key]: content }));
    }
  };

  const handleLikeComment = async (commentId: string, memoryId: string, isLiked: boolean) => {
    try {
      // Save scroll position
      const scrollY = window.scrollY;
      
      // Optimistic update - update UI immediately
      setLoadedComments(prev => ({
        ...prev,
        [memoryId]: updateCommentLikes(prev[memoryId] || [], commentId, !isLiked)
      }));
      
      // Send to database
      if (isLiked) {
        await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('persona_id', personaId);
      } else {
        await supabase.from('comment_likes').insert({ comment_id: commentId, persona_id: personaId });
      }
      
      // Force scroll position
      setTimeout(() => {
        window.scrollTo(0, scrollY);
      }, 0);
    } catch (error) {
      console.error('Error in handleLikeComment:', error);
    }
  };
  
  const handleLikeMemory = async (memoryId: string, isCurrentlyLiked: boolean) => {
    try {
      // Save scroll position
      const scrollY = window.scrollY;
      
      // Optimistic update - update UI immediately
      setMemories(prev => prev.map(memory => 
        memory.id === memoryId 
          ? { 
              ...memory, 
              is_liked: !isCurrentlyLiked,
              likes_count: isCurrentlyLiked ? memory.likes_count - 1 : memory.likes_count + 1
            }
          : memory
      ));
      
      // Send to database
      if (isCurrentlyLiked) {
        await supabase.from('likes').delete().eq('memory_id', memoryId).eq('persona_id', personaId);
      } else {
        await supabase.from('likes').insert({ memory_id: memoryId, persona_id: personaId, nickname: nickname });
      }
      
      // Force scroll position
      setTimeout(() => {
        window.scrollTo(0, scrollY);
      }, 0);
    } catch (error) {
      console.error('Error in handleLikeMemory:', error);
    }
  };

  // Helper function to update comment likes
  const updateCommentLikes = (comments: Comment[], commentId: string, isLiked: boolean): Comment[] => {
    return comments.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          is_liked: isLiked,
          likes_count: isLiked ? comment.likes_count + 1 : comment.likes_count - 1
        };
      }
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: updateCommentLikes(comment.replies, commentId, isLiked)
        };
      }
      return comment;
    });
  };

  const handleCreateCircle = async (name: string) => {
    const inviteCode = Math.random().toString(36).substring(2, 10);
    const { data: circle, error } = await supabase.from('circles').insert({ name, creator_id: personaId, invite_code: inviteCode }).select().single();
    if (error || !circle) { toast({ title: "Error", description: "Could not create circle.", variant: "destructive" }); return; }
    await supabase.from('circle_members').insert({ circle_id: circle.id, persona_id: personaId, nickname: nickname });
    toast({ title: "Success", description: "Circle created successfully!" });
    setActiveView('feed');
  };

  const handleJoinCircle = async (inviteCode: string) => {
    const { data: circle, error } = await supabase.from('circles').select('*').eq('invite_code', inviteCode).single();
    if (error || !circle) { toast({ title: "Error", description: "Invalid invite code.", variant: "destructive" }); return; }
    const { error: joinError } = await supabase.from('circle_members').insert({ circle_id: circle.id, persona_id: personaId, nickname: nickname });
    if(joinError) { toast({ title: "Error", description: "Failed to join circle.", variant: "destructive" }); return; }
    toast({ title: "Success", description: `Joined "${circle.name}"!` });
    setShowJoinModal(false);
    // Realtime will handle update
  };

  const handleViewCircle = (circle: Circle) => {
    setSelectedCircle(circle);
    setActiveView('circle-view');
  };
  
  const filteredMemories = memories.filter(memory => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'tagged') return memory.tagged_users?.some((t: any) => t.persona_id === personaId);
    return memory.circle_name === selectedFilter;
  });

  if (initialLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div></div>;

  if (activeView === 'create-memory') return <CreateMemory circles={circles} personaId={personaId} authorNickname={nickname} onMemoryCreated={() => setActiveView('feed')} onCancel={() => setActiveView('feed')} />;
  if (activeView === 'create-circle') return <CreateCircle onCircleCreated={handleCreateCircle} onCancel={() => setActiveView('feed')} />;
  if (activeView === 'circle-view' && selectedCircle) return <CircleView circle={selectedCircle} currentPersonaId={personaId} onBack={() => setActiveView('feed')} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 pb-20 md:pb-0">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-orange-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent">Chronicle Circle</h1>
              <p className="text-sm text-gray-600">ยินดีต้อนรับ, {nickname}</p>
            </div>
            
            {/* Desktop navigation */}
            <div className="hidden md:flex items-center gap-2">
              <Button onClick={() => setActiveView('create-memory')} size="sm" disabled={circles.length === 0}>
                <Camera className="w-4 h-4 mr-1" />สร้างความทรงจำ
              </Button>
              <Button onClick={() => setActiveView('create-circle')} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-1" />สร้างแวดวง
              </Button>
              <Button onClick={() => setShowJoinModal(true)} variant="outline" size="sm">
                <UserPlus className="w-4 h-4 mr-1" />เข้าร่วมแวดวง
              </Button>
              <Button onClick={onLogout} variant="ghost" size="icon" aria-label="ออกจากระบบ">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>

            {/* Mobile logout button */}
            <div className="md:hidden">
              <Button onClick={onLogout} variant="ghost" size="icon" aria-label="ออกจากระบบ">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-6">
        {circles.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-600 mb-2">ยินดีต้อนรับ!</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">สร้างแวดวงแรก หรือเข้าร่วมแวดวงด้วยรหัสเชิญ</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => setActiveView('create-circle')} size="lg">
                  <Plus className="w-5 h-5 mr-2" />สร้างแวดวงแรก
                </Button>
                <Button variant="outline" size="lg" onClick={() => setShowJoinModal(true)}>
                  เข้าร่วมด้วยรหัส
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Filter Tabs */}
            <div className="mb-6">
              <div className="flex flex-wrap items-center gap-2">
                <Button 
                  variant={selectedFilter === 'all' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setSelectedFilter('all')}
                  className="flex items-center gap-2"
                >
                  <Camera className="w-3 h-3" />
                  ทั้งหมด
                  {memories.length > 0 && <Badge variant="secondary" className="ml-1">{memories.length}</Badge>}
                </Button>
                <Button 
                  variant={selectedFilter === 'tagged' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setSelectedFilter('tagged')}
                  className="flex items-center gap-2"
                >
                  <Tag className="w-3 h-3" />
                  ที่ถูกแท็ก
                  {memories.filter(m => m.tagged_users?.some((t: any) => t.persona_id === personaId)).length > 0 && 
                    <Badge variant="secondary" className="ml-1">
                      {memories.filter(m => m.tagged_users?.some((t: any) => t.persona_id === personaId)).length}
                    </Badge>
                  }
                </Button>
                {circles.map(circle => {
                  const circleMemoryCount = memories.filter(m => m.circle_name === circle.name).length;
                  return (
                    <Button 
                      key={circle.id} 
                      variant={selectedFilter === circle.name ? 'default' : 'outline'} 
                      size="sm" 
                      onClick={() => setSelectedFilter(circle.name)}
                      className="flex items-center gap-2"
                    >
                      <Users className="w-3 h-3" />
                      {circle.name}
                      {circleMemoryCount > 0 && <Badge variant="secondary" className="ml-1">{circleMemoryCount}</Badge>}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">แวดวงของคุณ</h2>
              <Button variant="outline" size="sm" onClick={() => setShowJoinModal(true)} className="hidden md:flex">
                เข้าร่วมด้วยรหัส
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {circles.map(circle => (
                <Card key={circle.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{circle.name}</CardTitle>
                      <Badge variant="secondary">{circle.member_count || 0} สมาชิก</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewCircle(circle)}>
                        ดูแวดวง
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => { 
                        navigator.clipboard.writeText(circle.invite_code); 
                        toast({ title: "คัดลอกแล้ว!" }); 
                      }}>
                        <Copy className="w-4 h-4 mr-2" />คัดลอกรหัส
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-6">
              {filteredMemories.length > 0 && <h2 className="text-lg font-semibold">ความทรงจำ</h2>}
              {filteredMemories.map((memory: any) => (
                <Card key={memory.id} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl mb-2">{memory.title}</CardTitle>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(memory.memory_date).toLocaleDateString('th-TH')}
                          </span>
                          <span>โดย {memory.author_nickname}</span>
                          <Badge variant="outline">{memory.circle_name}</Badge>
                        </div>
                      </div>
                      {memory.feeling_emoji && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 rounded-full bg-gray-100 px-3 py-1">
                          <p>{memory.feeling_emoji}</p>
                          <p>{memory.feeling_text}</p>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {memory.photos && memory.photos.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                        {memory.photos.map((url: string, index: number) => (
                          <button key={index} onClick={() => setSelectedMedia(url)} className="focus:outline-none rounded-md overflow-hidden group relative bg-slate-100">
                            {url.includes('.mp4') || url.includes('.mov') ? (
                              <>
                                <video muted loop playsInline src={url} className="w-full h-32 object-cover" />
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                  <Camera className="w-8 h-8 text-white/70" />
                                </div>
                              </>
                            ) : (
                              <img src={url} alt={`photo ${index+1}`} className="w-full h-32 object-cover" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="text-gray-600 whitespace-pre-wrap">{memory.story}</p>
                    {memory.tagged_users && memory.tagged_users.length > 0 && (
                      <div className="flex items-center flex-wrap gap-2 pt-4 mt-4 border-t">
                        <Users className="w-4 h-4 text-gray-500"/>
                        <p className="text-sm text-gray-500">กับ:</p>
                        {memory.tagged_users.map((tag: any) => (
                          <Badge key={tag.persona_id} variant="outline">{tag.nickname}</Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-4 pt-4 border-t mt-4">
                      <Button variant="ghost" size="sm" onClick={() => handleLikeMemory(memory.id, memory.is_liked)} className={memory.is_liked ? 'text-red-500' : ''}>
                        <Heart className={`w-4 h-4 mr-1 ${memory.is_liked ? 'fill-current' : ''}`} />
                        {memory.likes_count}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleComments(memory.id)}>
                        <MessageCircle className="w-4 h-4 mr-1" />
                        {memory.comments_count}
                      </Button>
                    </div>
                    {showComments[memory.id] && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        {loadedComments[memory.id]?.map(comment => (
                          <div key={comment.id}>
                            <CommentItem 
                              comment={comment} 
                              onReply={(commentId) => setReplyingTo({ memoryId: memory.id, commentId })} 
                              onLike={(commentId, isLiked) => handleLikeComment(commentId, memory.id, isLiked)} 
                            />
                            {replyingTo?.commentId === comment.id && (
                              <div className="pl-5 mt-2 ml-4 border-l-2">
                                <div className="flex gap-2 pt-2">
                                  <Input 
                                    value={commentInputs[comment.id] || ''} 
                                    onChange={(e) => setCommentInputs(prev => ({ ...prev, [comment.id]: e.target.value }))} 
                                    placeholder={`ตอบกลับ...`} 
                                    autoFocus 
                                  />
                                  <Button onClick={() => handleAddComment(memory.id, comment.id)}>ส่ง</Button>
                                  <Button variant="ghost" onClick={() => setReplyingTo(null)}>ยกเลิก</Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        <div className="flex gap-2 pt-4">
                          <Input 
                            value={commentInputs[memory.id] || ''} 
                            onChange={(e) => setCommentInputs(prev => ({ ...prev, [memory.id]: e.target.value }))} 
                            placeholder="แสดงความคิดเห็น..." 
                          />
                          <Button onClick={() => handleAddComment(memory.id, null)}>ส่ง</Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-20">
        {/* Modern minimal background */}
        <div className="bg-white/70 backdrop-blur-xl border-t border-gray-200/50 shadow-lg">
          <div className="flex items-center justify-around px-4 py-2 max-w-md mx-auto">
            
            {/* Create Memory Button - Primary */}
            <button
              onClick={() => setActiveView('create-memory')}
              disabled={circles.length === 0}
              className="group relative flex flex-col items-center justify-center p-2 rounded-xl bg-gradient-to-b from-orange-500 to-orange-600 text-white shadow-sm transform transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:transform-none min-w-[70px]"
            >
              <Camera className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform duration-200" />
              <span className="text-[10px] font-medium leading-tight">สร้างความทรงจำ</span>
              {/* Subtle glow */}
              <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            </button>

            {/* Create Circle Button - Secondary */}
            <button
              onClick={() => setActiveView('create-circle')}
              className="group relative flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 transform transition-all duration-200 hover:scale-105 active:scale-95 min-w-[70px]"
            >
              <Plus className="w-5 h-5 mb-1 group-hover:rotate-90 transition-transform duration-200" />
              <span className="text-[10px] font-medium leading-tight">สร้างแวดวง</span>
            </button>

            {/* Join Circle Button - Tertiary */}
            <button
              onClick={() => setShowJoinModal(true)}
              className="group relative flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 transform transition-all duration-200 hover:scale-105 active:scale-95 min-w-[70px]"
            >
              <div className="relative">
                <UserPlus className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform duration-200" />
                {/* Small notification dot */}
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full"></div>
              </div>
              <span className="text-[10px] font-medium leading-tight">เข้าร่วมแวดวง</span>
            </button>
          </div>
        </div>
      </div>

      <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
        <DialogContent className="max-w-4xl w-full p-0 bg-transparent border-0">
          {selectedMedia && (selectedMedia.includes('.mp4') || selectedMedia.includes('.mov')) ? (
            <video src={selectedMedia} controls autoPlay className="w-full max-h-[90vh] rounded-lg" />
          ) : (
            <img src={selectedMedia} alt="Enlarged view" className="w-full h-auto max-h-[90vh] object-contain" />
          )}
        </DialogContent>
      </Dialog>
      
      <JoinCircleModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} onJoin={handleJoinCircle} />
    </div>
  );
};

export default Dashboard;