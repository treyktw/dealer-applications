import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg';

interface BaseButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  textClassName?: string;
}

interface ButtonProps extends BaseButtonProps {
  onPress?: () => void;
  href?: never;
}

interface LinkButtonProps extends BaseButtonProps {
  href: Parameters<typeof Link>[0]['href'];
  onPress?: never;
}

type AuthButtonProps = ButtonProps | LinkButtonProps;

const variantStyles: Record<ButtonVariant, { container: string; text: string }> = {
  primary: {
    container: 'bg-primary active:opacity-80',
    text: 'text-primary-foreground',
  },
  secondary: {
    container: 'bg-secondary active:opacity-80',
    text: 'text-secondary-foreground',
  },
  outline: {
    container: 'bg-transparent border-2 border-primary active:opacity-80',
    text: 'text-primary',
  },
  ghost: {
    container: 'bg-transparent active:opacity-80',
    text: 'text-foreground',
  },
  link: {
    container: 'bg-transparent',
    text: 'text-primary',
  },
};

const sizeStyles: Record<ButtonSize, { container: string; text: string }> = {
  sm: {
    container: 'px-4 py-2',
    text: 'text-sm',
  },
  md: {
    container: 'px-8 py-4',
    text: 'text-base',
  },
  lg: {
    container: 'px-10 py-6',
    text: 'text-lg',
  },
};

export function AuthButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  textClassName = '',
  ...props
}: AuthButtonProps) {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];
  
  const containerClasses = `
    rounded-xl
    ${variantStyle.container}
    ${sizeStyle.container}
    ${disabled || loading ? 'opacity-50' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const textClasses = `
    font-bold text-center
    ${variantStyle.text}
    ${sizeStyle.text}
    ${textClassName}
  `.trim().replace(/\s+/g, ' ');

  const isDisabled = disabled || loading;

  // If href is provided, render as Link
  if ('href' in props && props.href) {
    return (
      <Link href={props.href} asChild>
        <TouchableOpacity
          className={containerClasses}
          disabled={isDisabled}
        >
          {loading ? (
            <ActivityIndicator
              size="small"
              color={variant === 'primary' || variant === 'secondary' ? '#fff' : undefined}
            />
          ) : (
            <Text className={textClasses}>{children}</Text>
          )}
        </TouchableOpacity>
      </Link>
    );
  }

  // Otherwise render as regular button
  return (
    <TouchableOpacity
      className={containerClasses}
      onPress={props.onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'secondary' ? '#fff' : undefined}
        />
      ) : (
        <Text className={textClasses}>{children}</Text>
      )}
    </TouchableOpacity>
  );
}

