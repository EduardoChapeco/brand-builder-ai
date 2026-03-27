import { Images, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const LibraryPage = () => {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground">Biblioteca</h1>
            <Badge variant="secondary" className="text-xs">0 posts</Badge>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          {["Todos", "Posts", "Carrosséis", "Templates"].map((f) => (
            <button
              key={f}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground first:border-primary/50 first:text-foreground"
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar posts..." className="pl-9" />
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <Images className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Nenhum post criado ainda</p>
        <p className="text-xs text-muted-foreground/60">Comece pelo chat e seus posts aparecerão aqui</p>
      </div>
    </div>
  );
};

export default LibraryPage;
