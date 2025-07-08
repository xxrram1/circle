import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Lock } from 'lucide-react';

interface CreatePersonaProps {
  onPersonaCreated: (nickname: string, password?: string, inviteCode?: string) => Promise<boolean>;
  onSwitchToLogin: () => void;
}

const CreatePersona = ({ onPersonaCreated, onSwitchToLogin }: CreatePersonaProps) => {
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreatePersona = async () => {
    if (!nickname.trim()) { setError('กรุณากรอกชื่อเล่น'); return; }
    if (!password.trim()) { setError('กรุณากรอกรหัสลับ'); return; }
    if (password !== confirmPassword) { setError('รหัสลับไม่ตรงกัน'); return; }
    if (password.length < 4) { setError('รหัสลับต้องมีอย่างน้อย 4 ตัวอักษร'); return; }
    
    setError('');
    setIsCreating(true);
    
    try {
      const success = await onPersonaCreated(nickname.trim(), password.trim(), inviteCode.trim());
      if (!success) {
        setIsCreating(false);
      }
    } catch (err) {
      console.error('Error creating persona:', err);
      setError('เกิดข้อผิดพลาดในการสร้างบัญชี');
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4">
      <div className="max-w-md mx-auto pt-12">
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 mx-auto mb-4 flex items-center justify-center">
              <Sparkles className="text-white" size={24} />
            </div>
            <CardTitle className="text-2xl">ยินดีต้อนรับสู่ Chronicle Circle</CardTitle>
            <CardDescription>
              สร้างบัญชีของคุณเพื่อเริ่มแบ่งปันความทรงจำ
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">ชื่อเล่น (Nickname)</label>
                <Input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="ต้องไม่ซ้ำกับคนอื่น" className="text-lg" maxLength={30} />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">รหัสลับ (Password)</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="ตั้งรหัสลับ (อย่างน้อย 4 ตัวอักษร)" className="text-lg" maxLength={50} />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">ยืนยันรหัสลับ</label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="กรอกรหัสลับอีกครั้ง" className="text-lg" maxLength={50} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">รหัสเชิญแวดวง (ถ้ามี)</label>
                <Input value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="วางรหัสเชิญที่นี่" className="text-lg" />
              </div>
            </div>
            
            <Button onClick={handleCreatePersona} disabled={!nickname.trim() || !password.trim() || !confirmPassword.trim() || isCreating} className="w-full" size="lg">
              {isCreating ? 'กำลังสร้างบัญชี...' : 'สร้างบัญชีและเข้าสู่ระบบ'}
            </Button>
          </CardContent>
          <CardFooter className="flex-col items-center gap-2 pt-4 border-t">
              <p className="text-sm text-muted-foreground">มีบัญชีอยู่แล้ว?</p>
              <Button variant="outline" className="w-full" onClick={onSwitchToLogin}>
                  <Lock className="w-4 h-4 mr-2" />
                  เข้าสู่ระบบด้วยรหัสลับ
              </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default CreatePersona;