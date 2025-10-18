// src/routes/auth-verify.tsx - Verify Magic Link Token
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

export const Route = createFileRoute('/auth-verify')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      token: (search.token as string) || '',
    };
  },
  component: AuthVerifyPage,
});

function AuthVerifyPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const { verifyMagicLink, isAuthenticated } = useAuth();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Invalid verification link');
      return;
    }

    const verify = async () => {
      try {
        setStatus('verifying');
        await verifyMagicLink(token);
        setStatus('success');
        toast.success('Successfully signed in!');
        
        // Redirect after a short delay
        setTimeout(() => {
          navigate({ to: '/' });
        }, 1500);
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        const message = error instanceof Error ? error.message : 'Verification failed';
        setErrorMessage(message);
        toast.error(message);
      }
    };

    verify();
  }, [token, verifyMagicLink, navigate]);

  // If already authenticated (shouldn't happen but just in case)
  useEffect(() => {
    if (isAuthenticated && status === 'verifying') {
      navigate({ to: '/' });
    }
  }, [isAuthenticated, status, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <Card className="w-full max-w-md">
        {status === 'verifying' && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
              <CardTitle className="text-2xl">Verifying...</CardTitle>
              <CardDescription>
                Please wait while we sign you in
              </CardDescription>
            </CardHeader>
          </>
        )}

        {status === 'success' && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Success!</CardTitle>
              <CardDescription>
                You're signed in. Redirecting...
              </CardDescription>
            </CardHeader>
          </>
        )}

        {status === 'error' && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl">Verification Failed</CardTitle>
              <CardDescription className="text-red-600">
                {errorMessage}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate({ to: '/login' })}
                className="w-full"
              >
                Back to Login
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}