import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Lock, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LoginPromptProps {
  onLogin: (nickname: string, password: string) => Promise<boolean>;
  onCreateNew: () => void;
}

const LoginPrompt = ({ onLogin, onCreateNew }: LoginPromptProps) => {
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !password.trim()) return;
    
    setIsLoading(true);
    
    const success = await onLogin(nickname.trim(), password.trim());
    
    if (success) {
      toast({ title: "เข้าสู่ระบบสำเร็จ", description: "ยินดีต้อนรับกลับมา!" });
    } else {
      toast({ title: "ข้อผิดพลาด", description: "ชื่อเล่นหรือรหัสลับไม่ถูกต้อง", variant: "destructive" });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4">
      <div className="max-w-md mx-auto pt-20">
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 mx-auto mb-4 flex items-center justify-center">
              <Lock className="text-white" size={24} />
            </div>
            <CardTitle className="text-2xl">ยินดีต้อนรับกลับมา</CardTitle>
            <CardDescription>
              กรอกชื่อเล่นและรหัสลับเพื่อเข้าสู่บัญชีของคุณ
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">ชื่อเล่น</label>
                <Input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="กรอกชื่อเล่นของคุณ" className="text-lg" maxLength={30} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">รหัสลับ</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="กรอกรหัสลับ" className="text-lg" maxLength={50} />
              </div>
              <Button type="submit" disabled={!nickname.trim() || !password.trim() || isLoading} className="w-full" size="lg">
                {isLoading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex-col items-center gap-2 pt-4 border-t">
              <p className="text-sm text-muted-foreground">ยังไม่มีบัญชี?</p>
              <Button variant="outline" className="w-full" onClick={onCreateNew}>
                  <Plus className="w-4 h-4 mr-2" />
                  สร้างบัญชีใหม่
              </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default LoginPrompt;