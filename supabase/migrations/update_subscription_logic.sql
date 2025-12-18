-- Add tournaments_created_count to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tournaments_created_count integer DEFAULT 0;

-- Function to increment tournament count
CREATE OR REPLACE FUNCTION public.increment_tournament_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET tournaments_created_count = tournaments_created_count + 1
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run after a new tournament is created
DROP TRIGGER IF EXISTS on_tournament_created ON public.tournaments;
CREATE TRIGGER on_tournament_created
AFTER INSERT ON public.tournaments
FOR EACH ROW
EXECUTE FUNCTION public.increment_tournament_count();

-- Optional: Backfill existing counts for current users
-- Uncomment the following line if you want to initialize counts based on current data
-- UPDATE public.profiles p SET tournaments_created_count = (SELECT count(*) FROM public.tournaments t WHERE t.user_id = p.id);
