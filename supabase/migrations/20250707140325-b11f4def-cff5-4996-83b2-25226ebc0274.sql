
-- Create circles table
CREATE TABLE public.circles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create circle_members table
CREATE TABLE public.circle_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  circle_id UUID REFERENCES public.circles(id) ON DELETE CASCADE NOT NULL,
  persona_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(circle_id, persona_id)
);

-- Create memories table
CREATE TABLE public.memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  circle_id UUID REFERENCES public.circles(id) ON DELETE CASCADE NOT NULL,
  author_persona_id TEXT NOT NULL,
  author_nickname TEXT NOT NULL,
  title TEXT NOT NULL,
  story TEXT,
  photos TEXT[], -- Array of photo URLs
  memory_date DATE NOT NULL,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create memory_tags table (for people tagged in memories)
CREATE TABLE public.memory_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id UUID REFERENCES public.memories(id) ON DELETE CASCADE NOT NULL,
  persona_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  UNIQUE(memory_id, persona_id)
);

-- Create likes table
CREATE TABLE public.likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id UUID REFERENCES public.memories(id) ON DELETE CASCADE NOT NULL,
  persona_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(memory_id, persona_id)
);

-- Create comments table
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id UUID REFERENCES public.memories(id) ON DELETE CASCADE NOT NULL,
  author_persona_id TEXT NOT NULL,
  author_nickname TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (since we don't have traditional auth, we'll create permissive policies)
ALTER TABLE public.circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for all tables (since we're using anonymous access)
CREATE POLICY "Allow all operations on circles" ON public.circles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on circle_members" ON public.circle_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on memories" ON public.memories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on memory_tags" ON public.memory_tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on likes" ON public.likes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on comments" ON public.comments FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_circle_members_circle_id ON public.circle_members(circle_id);
CREATE INDEX idx_memories_circle_id ON public.memories(circle_id);
CREATE INDEX idx_memory_tags_memory_id ON public.memory_tags(memory_id);
CREATE INDEX idx_likes_memory_id ON public.likes(memory_id);
CREATE INDEX idx_comments_memory_id ON public.comments(memory_id);
CREATE INDEX idx_circles_invite_code ON public.circles(invite_code);
