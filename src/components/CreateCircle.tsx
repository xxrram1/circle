
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Users, Link, Copy, Check } from 'lucide-react';

interface CreateCircleProps {
  onCircleCreated: (name: string) => void;
  onCancel: () => void;
}

const CreateCircle = ({ onCircleCreated, onCancel }: CreateCircleProps) => {
  const [circleName, setCircleName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateCircle = async () => {
    if (!circleName.trim()) return;
    
    setIsCreating(true);
    
    try {
      await onCircleCreated(circleName.trim());
    } catch (error) {
      console.error('Error creating circle:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <Button 
          variant="ghost" 
          onClick={onCancel}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          กลับสู่หน้าหลัก
        </Button>

        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 mx-auto mb-4 flex items-center justify-center">
              <Users className="text-white" size={24} />
            </div>
            <CardTitle className="text-2xl">สร้างแวดวงใหม่</CardTitle>
            <CardDescription>
              สร้างพื้นที่ส่วนตัวเพื่อแบ่งปันความทรงจำกับเพื่อนสนิทหรือครอบครัว
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">ชื่อแวดวง:</label>
              <Input
                value={circleName}
                onChange={(e) => setCircleName(e.target.value)}
                placeholder="เช่น เพื่อนมหาลัย, ทริปครอบครัว, กลุ่มหนังสือ..."
                className="text-lg"
                maxLength={50}
              />
              <p className="text-xs text-gray-500">
                เลือกชื่อที่จดจำง่ายและเป็นตัวแทนของกลุ่มคุณ
              </p>
            </div>
            
            <Alert className="border-blue-200 bg-blue-50">
              <Users className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                เมื่อสร้างแล้ว คุณจะได้รับรหัสเชิญพิเศษเพื่อแบ่งปันกับคนอื่น 
                เฉพาะคนที่มีรหัสนี้เท่านั้นที่สามารถเข้าร่วมแวดวงของคุณได้
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={handleCreateCircle} 
              disabled={!circleName.trim() || isCreating}
              className="w-full"
              size="lg"
            >
              {isCreating ? 'กำลังสร้างแวดวง...' : 'สร้างแวดวง'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateCircle;
