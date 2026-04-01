import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BioLinkRenderer, BioLinkData } from '@/components/biolink/BioLinkRenderer';

const PublicBioLink = () => {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<BioLinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLink = async () => {
      if (!slug) return;
      try {
        const { data: dbData, error: dbError } = await supabase
          .from('bio_links')
          .select('*')
          .eq('slug', slug)
          .eq('is_published', true)
          .maybeSingle();

        if (dbError) throw dbError;
        if (!dbData) {
          setError('BioLink não encontrado.');
          return;
        }

        setData(dbData as unknown as BioLinkData);
      } catch (err) {
        console.error(err);
        setError('Ocorreu um erro ao carregar.');
      } finally {
        setLoading(false);
      }
    };
    fetchLink();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#06060A]">
        <Loader2 className="animate-spin text-purple-500 w-8 h-8" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#06060A]">
        <div className="text-center">
          <h1 className="text-white text-2xl font-bold mb-2">404</h1>
          <p className="text-gray-400">{error || 'BioLink não encontrado'}</p>
        </div>
      </div>
    );
  }

  return <BioLinkRenderer data={data} />;
};

export default PublicBioLink;
