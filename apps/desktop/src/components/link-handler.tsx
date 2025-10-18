// src/components/LinkHandler.tsx - Handle external links properly
import { open } from '@tauri-apps/plugin-shell';
import type { ReactNode } from 'react';

interface LinkHandlerProps {
  href: string;
  children: ReactNode;
  className?: string;
  openInBrowser?: boolean; // Force browser instead of in-app
}

/**
 * LinkHandler - Opens links properly in Tauri desktop app
 * 
 * Why we need this:
 * - Regular <a> tags don't work properly in Tauri
 * - External links need to open in system browser
 * - Internal navigation should use TanStack Router
 * 
 * Usage:
 * <LinkHandler href="https://dealer.universalautobrokers.net/dashboard">
 *   Go to Dashboard
 * </LinkHandler>
 */
export function LinkHandler({ 
  href, 
  children, 
  className = '',
  openInBrowser = true 
}: LinkHandlerProps) {
  
  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    try {
      if (openInBrowser || href.startsWith('http://') || href.startsWith('https://')) {
        // Open external links in system browser
        console.log('🌐 Opening in browser:', href);
        await open(href);
      } else {
        // For relative links, you could use TanStack Router here
        console.log('🔗 Internal link:', href);
        // Example: navigate({ to: href })
      }
    } catch (error) {
      console.error('❌ Failed to open link:', error);
    }
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className={className}
      style={{ cursor: 'pointer' }}
    >
      {children}
    </a>
  );
}

/**
 * WebAppLink - Shorthand for links to the main web app
 * Automatically handles the base URL
 */
interface WebAppLinkProps {
  path?: string; // e.g., "/dashboard" or "/settings"
  children: ReactNode;
  className?: string;
}

export function WebAppLink({ path = '', children, className = '' }: WebAppLinkProps) {
  const webAppUrl = import.meta.env.PROD 
    ? 'https://dealer.universalautobrokers.net'
    : 'http://localhost:3000';
  
  const fullUrl = `${webAppUrl}${path}`;
  
  return (
    <LinkHandler href={fullUrl} className={className}>
      {children}
    </LinkHandler>
  );
}

/**
 * QuickLinks - Pre-built links to common web app pages
 */
export const QuickLinks = {
  Dashboard: ({ children, className }: { children: ReactNode; className?: string }) => (
    <WebAppLink path="/dashboard" className={className}>{children}</WebAppLink>
  ),
  
  Settings: ({ children, className }: { children: ReactNode; className?: string }) => (
    <WebAppLink path="/settings" className={className}>{children}</WebAppLink>
  ),
  
  Deals: ({ children, className }: { children: ReactNode; className?: string }) => (
    <WebAppLink path="/deals" className={className}>{children}</WebAppLink>
  ),
  
  Documents: ({ children, className }: { children: ReactNode; className?: string }) => (
    <WebAppLink path="/documents" className={className}>{children}</WebAppLink>
  ),
  
  ContactAdmin: ({ children, className }: { children: ReactNode; className?: string }) => (
    <WebAppLink path="/contact" className={className}>{children}</WebAppLink>
  ),
  
  RequestDemo: ({ children, className }: { children: ReactNode; className?: string }) => (
    <WebAppLink path="/demo" className={className}>{children}</WebAppLink>
  ),
};

/**
 * useOpenLink - Hook for programmatic link opening
 */
export function useOpenLink() {
  const openLink = async (href: string) => {
    try {
      console.log('🌐 Opening link:', href);
      await open(href);
    } catch (error) {
      console.error('❌ Failed to open link:', error);
      throw error;
    }
  };

  const openWebApp = async (path: string = '') => {
    const webAppUrl = import.meta.env.PROD 
      ? 'https://dealer.universalautobrokers.net'
      : 'http://localhost:3000';
    
    await openLink(`${webAppUrl}${path}`);
  };

  return { openLink, openWebApp };
}