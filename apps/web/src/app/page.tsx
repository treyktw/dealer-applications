'use client'

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { isAdmin } = useCurrentUser();
  const router = useRouter();
  
  useEffect(() => {
    if (isAdmin) {
      router.push("/dashboard");
    } else {
      router.push("/sign-in");
    }
  }, [isAdmin, router]);

  // Return null or a loading state while redirecting
  return null;
}
