// src/components/deeplink-handler.tsx
import { useEffect } from 'react';
import { useStore } from '@tanstack/react-store';
import { deepLinkStore, clearPendingLink, setExchanging, setError } from '@/state/deeplink.slice';
import { performDeepLinkExchange } from '@/deeplink/exchange';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'react-hot-toast';
import { Effect } from 'effect';
import { AuthService } from '@/effect/domain/Auth';

export function DeepLinkHandler() {
  const navigate = useNavigate();
  const pendingLink = useStore(deepLinkStore, (state) => state.pendingLink);
  const isExchanging = useStore(deepLinkStore, (state) => state.isExchanging);

  useEffect(() => {
    if (pendingLink && !isExchanging) {
      handleDeepLink();
    }
  }, [pendingLink]);

  const handleDeepLink = async () => {
    if (!pendingLink) return;

    setExchanging(true);
    toast.loading('Processing deep-link...');

    try {
      const result = await Effect.runPromise(
        Effect.provideService(performDeepLinkExchange(pendingLink.dealId, pendingLink.token), AuthService, AuthService.of({
          getToken: () => Effect.succeed(''),
          validateSession: () => Effect.succeed(true),
          requireStepUp: () => Effect.succeed(''),
          getSessionInfo: () => Effect.succeed({
            session: null,  
            user: null,
            role: '',
            dealership: null,
            userId: '',
            email: '',
            permissions: [],
            sessionId: '',
            expiresAt: 0,
          }),
        }))
      );

      if (result.success) {
        toast.success('Deep-link validated!');
        // Navigate to deal page
        navigate({ 
          to: '/deals/$dealId', 
          params: { dealId: pendingLink.dealId } 
        });
        clearPendingLink();
      } else {
        toast.error(result.error || 'Invalid deep-link');
        setError(result.error || 'Invalid deep-link');
      }
    } catch (error) {
      toast.error('Failed to process deep-link');
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setExchanging(false);
    }
  };

  return null; // This is a handler component, no UI
}