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

interface PasswordResetEmailProps {
  userName: string;
  resetLink: string;
  dealershipName: string;
  expiryHours?: number;
}

export const PasswordResetEmail = ({
  userName,
  resetLink,
  dealershipName,
  expiryHours = 24,
}: PasswordResetEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Reset your password for {dealershipName}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={headerSection}>
            <div style={iconWrapper}>
              <div style={lockIcon}>🔐</div>
            </div>
            <Heading style={h1}>Password Reset Request</Heading>
          </Section>

          {/* Content */}
          <Section style={contentSection}>
            <Text style={greeting}>Hi {userName},</Text>
            
            <Text style={text}>
              We received a request to reset your password for your {dealershipName} account. 
              If you didn&apos;t make this request, you can safely ignore this email.
            </Text>

            <Text style={text}>
              To reset your password, click the button below:
            </Text>

            {/* CTA Button */}
            <Section style={buttonContainer}>
              <Link style={button} href={resetLink}>
                Reset Password
              </Link>
            </Section>

            {/* Alternative link */}
            <Text style={alternativeText}>
              Or copy and paste this link into your browser:
            </Text>
            <Text style={linkText}>
              {resetLink}
            </Text>

            <Hr style={divider} />

            {/* Security info */}
            <Section style={securitySection}>
              <Text style={securityTitle}>🛡️ Security Information</Text>
              <Text style={securityText}>
                • This link expires in <strong>{expiryHours} hours</strong>
              </Text>
              <Text style={securityText}>
                • You can only use this link once
              </Text>
              <Text style={securityText}>
                • If you didn&apos;t request this, please contact support
              </Text>
            </Section>

            <Text style={supportText}>
              Having trouble? Contact our support team at{" "}
              <Link href="mailto:support@dealerhub.com" style={supportLink}>
                support@dealerhub.com
              </Link>
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footer}>
              © {new Date().getFullYear()} DealerHub Pro. All rights reserved.
            </Text>
            <Text style={footerNote}>
              This is an automated email. Please do not reply to this message.
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
  backgroundColor: "#f1f5f9",
  padding: "40px 32px",
  textAlign: "center" as const,
};

const iconWrapper = {
  marginBottom: "20px",
};

const lockIcon = {
  fontSize: "48px",
  backgroundColor: "#fee2e2",
  borderRadius: "50%",
  width: "80px",
  height: "80px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto",
};

const h1 = {
  color: "#1e293b",
  fontSize: "24px",
  fontWeight: "600",
  margin: "0",
};

const contentSection = {
  padding: "40px 32px",
};

const greeting = {
  color: "#1e293b",
  fontSize: "18px",
  fontWeight: "500",
  margin: "0 0 24px 0",
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
  backgroundColor: "#dc2626",
  borderRadius: "12px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  display: "inline-block",
  padding: "16px 32px",
  boxShadow: "0 4px 6px -1px rgba(220, 38, 38, 0.3)",
};

const alternativeText = {
  color: "#64748b",
  fontSize: "14px",
  textAlign: "center" as const,
  margin: "24px 0 8px 0",
};

const linkText = {
  color: "#3b82f6",
  fontSize: "14px",
  wordBreak: "break-all" as const,
  textAlign: "center" as const,
  margin: "0 0 32px 0",
  padding: "12px",
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
};

const divider = {
  border: "none",
  borderTop: "1px solid #e2e8f0",
  margin: "32px 0",
};

const securitySection = {
  backgroundColor: "#fef3c7",
  borderRadius: "12px",
  padding: "20px",
  margin: "24px 0",
};

const securityTitle = {
  color: "#92400e",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 12px 0",
};

const securityText = {
  color: "#92400e",
  fontSize: "14px",
  margin: "4px 0",
};

const supportText = {
  color: "#64748b",
  fontSize: "14px",
  textAlign: "center" as const,
  margin: "32px 0 0 0",
};

const supportLink = {
  color: "#3b82f6",
  textDecoration: "none",
};

const footerSection = {
  backgroundColor: "#f8fafc",
  padding: "24px 32px",
  textAlign: "center" as const,
};

const footer = {
  color: "#64748b",
  fontSize: "14px",
  margin: "0 0 8px 0",
};

const footerNote = {
  color: "#94a3b8",
  fontSize: "12px",
  margin: "0",
};

export default PasswordResetEmail;