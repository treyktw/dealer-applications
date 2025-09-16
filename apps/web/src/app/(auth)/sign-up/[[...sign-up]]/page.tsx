// src/app/(auth)/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from '@clerk/nextjs';

export default async function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">Create Account</h1>
        <SignUp />
      </div>
    </div>
  );
}
