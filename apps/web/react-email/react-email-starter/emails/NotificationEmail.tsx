import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components";

interface NotificationEmailProps {
  title: string;
  message: string;
  actionLink?: string;
  actionText?: string;
  priority: 'low' | 'medium' | 'high';
  dealershipName: string;
}

export const NotificationEmail = ({
  title,
  message,
  actionLink,
  actionText,
  priority,
  dealershipName,
}: NotificationEmailProps) => {
  const priorityStyles = {
    low: { backgroundColor: "#10B981", icon: "ℹ️" },
    medium: { backgroundColor: "#F59E0B", icon: "⚠️" },
    high: { backgroundColor: "#EF4444", icon: "🚨" },
  };

  return (
    <Html>
      <Head />
      <Preview>{title} - {dealershipName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSection}>
            <div style={{...priorityBadge, backgroundColor: priorityStyles[priority].backgroundColor}}>
              <span style={priorityIcon}>{priorityStyles[priority].icon}</span>
              <span style={priorityText}>{priority.toUpperCase()}</span>
            </div>
          </Section>

          <Section style={contentSection}>
            <Heading style={h1}>{title}</Heading>
            <Text style={text}>{message}</Text>

            {actionLink && actionText && (
              <Section style={buttonContainer}>
                <Link style={button} href={actionLink}>
                  {actionText}
                </Link>
              </Section>
            )}

            <Hr style={divider} />
            
            <Text style={disclaimerText}>
              This notification was sent to all {dealershipName} team members.
            </Text>
          </Section>

          <Section style={footerSection}>
            <Text style={footer}>
              © {new Date().getFullYear()} DealerHub Pro. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: "#f8fafc",
  fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  padding: "40px 0",
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  borderRadius: "16px",
  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  overflow: "hidden",
  maxWidth: "600px",
};

const headerSection = {
  padding: "24px 32px",
  textAlign: "center" as const,
};

const priorityBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 16px",
  borderRadius: "20px",
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: "600",
};

const priorityIcon = {
  fontSize: "16px",
};

const priorityText = {
  letterSpacing: "0.5px",
};

const contentSection = {
  padding: "40px 32px",
};

const h1 = {
  color: "#1e293b",
  fontSize: "24px",
  fontWeight: "600",
  margin: "24px 0",
};

const text = {
  color: "#475569",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "16px 0",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#3b82f6",
  borderRadius: "12px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  display: "inline-block",
  padding: "16px 32px",
  boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.3)",
};

const divider = {
  border: "none",
  borderTop: "1px solid #e2e8f0",
  margin: "32px 0",
};

const disclaimerText = {
  color: "#64748b",
  fontSize: "14px",
  textAlign: "center" as const,
  lineHeight: "1.5",
};

const footerSection = {
  backgroundColor: "#f8fafc",
  padding: "24px 32px",
  textAlign: "center" as const,
};

const footer = {
  color: "#64748b",
  fontSize: "14px",
  margin: "0",
};

export default NotificationEmail;