// src/app/(auth)/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs';

export default function Page() {

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">Dealership Admin</h1>
        <SignIn />
      </div>
    </div>
  );
}
