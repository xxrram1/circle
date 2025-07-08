import React, { useState, useEffect } from 'react';
import CreatePersona from '../components/CreatePersona';
import Dashboard from '../components/Dashboard';
import LoginPrompt from '../components/LoginPrompt';
import { supabase } from '../integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

interface CurrentPersona {
  id: string;
  nickname: string;
}

const Index = () => {
  const [currentPersona, setCurrentPersona] = useState<CurrentPersona | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'create' | 'login' | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const savedData = JSON.parse(localStorage.getItem('chronicleCirclePersonas') || '[]') as {nickname: string, accessLink: string, password?: string, createdAt: string}[];
      const urlParams = new URLSearchParams(window.location.search);
      const personaId = urlParams.get('persona');

      if (personaId) {
        const { data, error } = await supabase.from('personas').select('id, nickname').eq('id', personaId).single();
        if (data && !error) {
          setCurrentPersona(data);
          setView(null);
        } else {
          window.history.replaceState({}, '', '/');
          setView('login');
        }
      } else {
        setView('login');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setView('login');
    } finally {
      setIsLoading(false);
    }
  };
  
  const joinCircleAfterCreation = async (inviteCode: string, personaId: string, nickname: string) => {
    if (!inviteCode.trim()) return;
    try {
      const { data: circle } = await supabase.from('circles').select('id, name').eq('invite_code', inviteCode.trim()).single();
      if (!circle) {
        toast({ title: "ไม่พบแวดวง", description: "รหัสเชิญที่กรอกไม่ถูกต้อง", variant: "destructive" });
        return;
      }
      const { error: joinError } = await supabase.from('circle_members').insert({ circle_id: circle.id, persona_id: personaId, nickname: nickname });
      if (joinError) {
        if (joinError.code === '23505') toast({ title: "เข้าร่วมแล้ว", description: `คุณเป็นสมาชิกของแวดวง "${circle.name}" อยู่แล้ว` });
        else throw joinError;
      } else {
        toast({ title: "สำเร็จ!", description: `คุณได้เข้าร่วมแวดวง "${circle.name}" เรียบร้อยแล้ว` });
      }
    } catch (error) {
      console.error('Error auto-joining circle:', error);
      toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถเข้าร่วมแวดวงได้", variant: "destructive" });
    }
  };

  const handlePersonaCreated = async (nickname: string, password?: string, inviteCode?: string): Promise<boolean> => {
    const personaId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const { data, error } = await supabase
      .from('personas')
      .insert({ id: personaId, nickname, password })
      .select('id, nickname')
      .single();
      
    if (error || !data) {
      if (error && error.code === '23505') {
        toast({ title: "ชื่อเล่นซ้ำ", description: "มีคนใช้ชื่อเล่นนี้แล้ว กรุณาใช้ชื่ออื่น", variant: "destructive" });
      } else {
        console.error("Create Persona Error:", error);
        toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถสร้างบัญชีได้", variant: "destructive" });
      }
      return false;
    }

    window.history.replaceState({}, '', `/?persona=${data.id}`);
    setCurrentPersona(data);
    setView(null);
    if (inviteCode) await joinCircleAfterCreation(inviteCode, data.id, data.nickname);
    toast({ title: "สร้างบัญชีสำเร็จ!", description: `ยินดีต้อนรับ, ${data.nickname}` });
    return true;
  };

  const handleLogin = async (nickname: string, password: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('personas')
      .select('id, nickname')
      .eq('nickname', nickname)
      .eq('password', password)
      .single();
    
    if (error || !data) {
      return false;
    }

    window.history.replaceState({}, '', `/?persona=${data.id}`);
    setCurrentPersona(data);
    setView(null);
    return true;
  };
  
  const handleLogout = () => {
    setCurrentPersona(null);
    setView('login');
    window.history.replaceState({}, '', '/');
    toast({ title: "ออกจากระบบสำเร็จ" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (currentPersona) {
    return <Dashboard nickname={currentPersona.nickname} personaId={currentPersona.id} onLogout={handleLogout} />;
  }
  
  if (view === 'login') {
    return <LoginPrompt onLogin={handleLogin} onCreateNew={() => setView('create')} />;
  }
  
  return <CreatePersona onPersonaCreated={handlePersonaCreated} onSwitchToLogin={() => setView('login')} />;
};

export default Index;