import React, { useState, useRef } from 'react';
import { UploadCloud, Loader2, Image as ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface MediaUploaderProps {
  value?: string | null;
  onChange: (url: string) => void;
  folderPath?: string; // Optional folder path. e.g. workspace_id
  label?: string;
  accept?: string;
  className?: string;
}

export function MediaUploader({
  value,
  onChange,
  folderPath = 'uploads',
  label = 'Fazer upload de imagem',
  accept = 'image/*',
  className = '',
}: MediaUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);

      // Clean file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${folderPath}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('workspace_assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        throw error;
      }

      // Automatically get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('workspace_assets').getPublicUrl(filePath);

      onChange(publicUrl);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao fazer upload da imagem.');
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className={`relative w-full ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUpload}
        accept={accept}
        className="hidden"
      />
      
      {!value ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer border-[var(--border)] hover:border-violet-500/50 hover:bg-violet-500/5 transition-all duration-200"
        >
          {isUploading ? (
            <Loader2 className="w-8 h-8 mb-2 animate-spin text-violet-500" />
          ) : (
            <UploadCloud className="w-8 h-8 mb-2 text-[var(--text-secondary)]" />
          )}
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {isUploading ? 'Enviando...' : label}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1 text-center">
            Arraste e solte ou clique para selecionar
          </p>
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden border border-[var(--border)] group">
          <div className="aspect-video w-full bg-black/20 flex items-center justify-center overflow-hidden">
            <img src={value} alt="Uploaded" className="w-full h-full object-contain" />
          </div>
          
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Trocar imagem"
            >
              <UploadCloud size={18} />
            </button>
            <button
              onClick={handleRemove}
              className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-100 transition-colors"
              title="Remover imagem"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
