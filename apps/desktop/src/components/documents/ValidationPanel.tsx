// src/components/documents/ValidationPanel.tsx
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ValidationPanel({ validation }: { validation: any }) {
  if (!validation) return null;

  const hasErrors = validation.errors?.some((e: any) => e.severity === 'error');
  const hasWarnings = validation.errors?.some((e: any) => e.severity === 'warning');

  return (
    <div className={cn(
      "p-4 rounded-lg border",
      validation.valid 
        ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
        : hasErrors
        ? "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
        : "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800"
    )}>
      <div className="flex items-start gap-3">
        {validation.valid ? (
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
        ) : hasErrors ? (
          <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
        ) : (
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
        )}
        
        <div className="flex-1">
          <h3 className="font-medium">
            {validation.valid 
              ? "All requirements met" 
              : hasErrors 
              ? "Requirements incomplete"
              : "Some warnings present"}
          </h3>
          
          {validation.errors && validation.errors.length > 0 && (
            <ul className="mt-2 space-y-1">
              {validation.errors.map((error: any, index: number) => (
                <li key={index} className="text-sm flex items-center gap-2">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    error.severity === 'error' ? 'bg-red-500' : 'bg-amber-500'
                  )} />
                  {error.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}