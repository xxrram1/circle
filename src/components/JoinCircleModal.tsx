
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users } from 'lucide-react';

interface JoinCircleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (inviteCode: string) => void;
}

const JoinCircleModal = ({ isOpen, onClose, onJoin }: JoinCircleModalProps) => {
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    
    setIsJoining(true);
    try {
      await onJoin(inviteCode.trim());
      setInviteCode('');
    } catch (error) {
      console.error('Error joining circle:', error);
    } finally {
      setIsJoining(false);
    }
  };

  const handleClose = () => {
    setInviteCode('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 mx-auto mb-4 flex items-center justify-center">
            <Users className="text-white" size={24} />
          </div>
          <DialogTitle className="text-xl">เข้าร่วมแวดวง</DialogTitle>
          <DialogDescription>
            กรอกรหัสเชิญเพื่อเข้าร่วมแวดวงของเพื่อนหรือครอบครัว
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">รหัสเชิญ:</label>
            <Input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="กรอกรหัสเชิญที่ได้รับ..."
              className="text-center text-lg tracking-wider"
              maxLength={20}
            />
          </div>
          
          <div className="flex gap-3">
            <Button 
              type="button"
              variant="outline" 
              onClick={handleClose}
              className="flex-1"
            >
              ยกเลิก
            </Button>
            <Button 
              type="submit"
              disabled={!inviteCode.trim() || isJoining}
              className="flex-1"
            >
              {isJoining ? 'กำลังเข้าร่วม...' : 'เข้าร่วม'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default JoinCircleModal;
