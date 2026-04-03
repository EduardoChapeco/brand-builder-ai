import { useEffect, useState } from 'react';
import { useMCP } from '@/contexts/MCPContext';

export type CCPSnapshotState = {
  xml: string | null;
  isLoading: boolean;
  error: string | null;
};

export const useCCPSnapshot = (): CCPSnapshotState => {
  const { mcp } = useMCP();
  const [state, setState] = useState<CCPSnapshotState>({
    xml: null,
    isLoading: Boolean(mcp),
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!mcp) {
        if (isMounted) {
          setState({ xml: null, isLoading: false, error: null });
        }
        return;
      }

      if (isMounted) {
        setState((current) => ({ ...current, isLoading: true, error: null }));
      }

      const result = await mcp.callTool({ name: 'ccp_get_snapshot', params: {} });
      if (!isMounted) return;

      if (!result.success) {
        setState({ xml: null, isLoading: false, error: result.error || 'Falha ao carregar CCP.' });
        return;
      }

      setState({
        xml: typeof result.result === 'string' ? result.result : JSON.stringify(result.result),
        isLoading: false,
        error: null,
      });
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [mcp]);

  return state;
};
