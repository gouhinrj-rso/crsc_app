import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface SessionTimeoutWarningProps {
  open: boolean
  onContinue: () => void
}

export function SessionTimeoutWarning({ open, onContinue }: SessionTimeoutWarningProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
          <AlertDialogDescription>
            Your session will expire in approximately 2 minutes due to inactivity.
            For the security of your protected health information, you will be
            automatically signed out. Click below to continue your session.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onContinue}>
            Continue Session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
