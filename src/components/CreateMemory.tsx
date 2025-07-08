import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ArrowLeft, Camera, UploadCloud, Loader2, X, Smile, Users, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Member { id: string; nickname: string; }
interface Circle { id: string; name: string; }
interface Feeling { emoji: string; text: string; }

interface CreateMemoryProps {
  circles: Circle[];
  personaId: string;
  authorNickname: string;
  onMemoryCreated: () => void;
  onCancel: () => void;
}

const feelings: Feeling[] = [
  { emoji: '😊', text: 'กำลังมีความสุข' },
  { emoji: '🥰', text: 'รู้สึกรัก' },
  { emoji: '😂', text: 'ตลกสุดๆ' },
  { emoji: '🥳', text: 'กำลังฉลอง' },
  { emoji: '😢', text: 'รู้สึกเศร้า' },
  { emoji: '🤔', text: 'กำลังใช้ความคิด' },
  { emoji: '😮', text: 'ประหลาดใจ' },
];

const CreateMemory = ({ circles, personaId, authorNickname, onMemoryCreated, onCancel }: CreateMemoryProps) => {
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [selectedFeeling, setSelectedFeeling] = useState<Feeling | null>(null);
  
  const [circleMembers, setCircleMembers] = useState<Member[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedCircle) {
      const fetchMembers = async () => {
        const { data } = await supabase.from('circle_members').select('persona_id, nickname').eq('circle_id', selectedCircle.id);
        setCircleMembers(data?.map(m => ({ id: m.persona_id, nickname: m.nickname })) || []);
      };
      fetchMembers();
    } else {
      setCircleMembers([]);
    }
    setSelectedMembers([]);
  }, [selectedCircle]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    for (const file of Array.from(files)) {
        const filePath = `${personaId}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from('photos').upload(filePath, file);
        if (error) { toast({ title: 'อัปโหลดล้มเหลว', variant: 'destructive' }); continue; }
        const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(filePath);
        setMediaUrls(prev => [...prev, publicUrl]);
    }
    setIsUploading(false);
  };
  
  const handleCreateMemory = async () => {
    if (!title.trim() || !selectedCircle) { toast({ title: 'ข้อมูลไม่ครบ', description: 'กรุณากรอกหัวข้อและเลือกแวดวง', variant: 'destructive'}); return; }
    setIsCreating(true);
    try {
      const { data: memory, error } = await supabase.from('memories').insert({
        title: title.trim(), story: story.trim(), circle_id: selectedCircle.id, memory_date: date,
        photos: mediaUrls, author_persona_id: personaId, author_nickname: authorNickname,
        feeling_emoji: selectedFeeling?.emoji, feeling_text: selectedFeeling?.text
      }).select('id').single();

      if(error || !memory) throw error;

      if (selectedMembers.length > 0) {
        const userTags = selectedMembers.map(member => ({ memory_id: memory.id, persona_id: member.id, nickname: member.nickname }));
        await supabase.from('memory_tags').insert(userTags);
      }
      toast({ title: 'สำเร็จ!', description: 'ความทรงจำของคุณถูกบันทึกแล้ว' });
      onMemoryCreated();
    } catch (error) {
      console.error(error)
      toast({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถสร้างความทรงจำได้', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <Button variant="ghost" onClick={onCancel} className="mb-6"><ArrowLeft className="w-4 h-4 mr-2" />กลับ</Button>
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 mx-auto mb-4 flex items-center justify-center">
              <Camera className="text-white" size={24} />
            </div>
            <CardTitle>สร้างความทรงจำใหม่</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">เพิ่มรูปภาพหรือวิดีโอ</label>
              <label htmlFor="media-upload" className="w-full p-6 border-2 border-dashed rounded-lg text-center cursor-pointer hover:bg-gray-50 transition-colors flex flex-col items-center justify-center">
                <input type="file" multiple accept="image/*,video/mp4,video/quicktime" onChange={handleFileUpload} className="hidden" id="media-upload" disabled={isUploading} />
                {isUploading ? <Loader2 className="animate-spin w-8 h-8 text-gray-400" /> : <UploadCloud className="w-8 h-8 text-gray-400" />}
                <p className="mt-2 text-sm text-gray-600">{isUploading ? 'กำลังอัปโหลด...' : 'เลือกไฟล์'}</p>
              </label>
              {mediaUrls.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-4">
                  {mediaUrls.map(url => (
                    <div key={url} className="relative group">
                      {url.includes('.mp4') || url.includes('.mov') ? (
                        <video src={url} className="w-full h-24 object-cover rounded-md bg-slate-200" />
                      ) : (
                        <img src={url} alt="preview" className="w-full h-24 object-cover rounded-md" />
                      )}
                      <button onClick={() => setMediaUrls(mediaUrls.filter(m => m !== url))} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">หัวข้อ</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น วันเกิด, ทริปหัวหิน..." />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">เลือกแวดวง</label>
                <Select onValueChange={(val) => setSelectedCircle(circles.find(c => c.id === val) || null)}>
                  <SelectTrigger><SelectValue placeholder="เลือกแวดวง" /></SelectTrigger>
                  <SelectContent>{circles.map(circle => <SelectItem key={circle.id} value={circle.id}>{circle.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">วันที่</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="text-sm font-medium">ความรู้สึก</label>
                 <Select onValueChange={(val) => setSelectedFeeling(feelings[parseInt(val)])}>
                   <SelectTrigger>
                     {selectedFeeling ? <div className='flex items-center gap-2'>{selectedFeeling.emoji} {selectedFeeling.text}</div> : 'คุณกำลังรู้สึก...'}
                   </SelectTrigger>
                   <SelectContent>{feelings.map((f, i) => <SelectItem key={i} value={String(i)}>{f.emoji} {f.text}</SelectItem>)}</SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                <label className="text-sm font-medium">แท็กเพื่อน</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start font-normal" disabled={!selectedCircle}>
                      <Users className="mr-2 h-4 w-4" />
                      {selectedMembers.length > 0 ? selectedMembers.map(m => m.nickname).join(', ') : 'เลือกเพื่อน'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="ค้นหาเพื่อน..." />
                      <CommandList>
                        <CommandEmpty>ไม่พบสมาชิก</CommandEmpty>
                        <CommandGroup>
                          {circleMembers.map(member => {
                            const isSelected = selectedMembers.some(m => m.id === member.id);
                            return (
                              <CommandItem key={member.id} onSelect={() => {
                                if (isSelected) {
                                  setSelectedMembers(selectedMembers.filter(m => m.id !== member.id));
                                } else {
                                  setSelectedMembers([...selectedMembers, member]);
                                }
                              }}>
                                <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                                  <Check className="h-4 w-4" />
                                </div>
                                <span>{member.nickname}</span>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
               </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">เล่าเรื่องราว</label>
              <Textarea value={story} onChange={(e) => setStory(e.target.value)} placeholder="เกิดอะไรขึ้นบ้างในวันนั้น..." />
            </div>

            <Button onClick={handleCreateMemory} disabled={isCreating || isUploading} className="w-full" size="lg">
              {isCreating ? 'กำลังบันทึก...' : 'สร้างความทรงจำ'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateMemory;