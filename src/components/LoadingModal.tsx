import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from './ui/button';

interface LoadingModalProps {
  open: boolean;
  title: string;
  description?: string;
  status: 'loading' | 'success' | 'error';
  errorMessage?: string;
  onClose?: () => void;
}

export function LoadingModal({
  open,
  title,
  description,
  status,
  errorMessage,
  onClose,
}: LoadingModalProps) {
  return (
    <Dialog open={open} onOpenChange={status !== 'loading' ? onClose : undefined}>
      <DialogContent 
        className="sm:max-w-md"
        // Prevent closing during loading
        onInteractOutside={(e) => {
          if (status === 'loading') {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (status === 'loading') {
            e.preventDefault();
          }
        }}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          {description || errorMessage || '처리 중입니다'}
        </DialogDescription>
        
        <div className="flex flex-col items-center justify-center py-6 space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 className="size-16 text-blue-600 animate-spin" />
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-lg">{title}</h3>
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-4">
                  잠시만 기다려 주세요...
                </p>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="size-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="size-10 text-green-600" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-lg text-green-600">완료되었습니다</h3>
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
              </div>
              {onClose && (
                <Button onClick={onClose} className="mt-4">
                  확인
                </Button>
              )}
            </>
          )}

          {status === 'error' && (
            <>
              <div className="size-16 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="size-10 text-red-600" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-lg text-red-600">오류가 발생했습니다</h3>
                {errorMessage && (
                  <p className="text-sm text-muted-foreground">{errorMessage}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  다시 시도해 주세요.
                </p>
              </div>
              {onClose && (
                <Button onClick={onClose} variant="destructive" className="mt-4">
                  닫기
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}