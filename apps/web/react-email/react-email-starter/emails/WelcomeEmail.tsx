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
} from "@react-email/components";
import * as React from "react";

interface WelcomeEmailProps {
  userName: string;
  dealershipName: string;
  dashboardLink: string;
  supportLink: string;
}

export const WelcomeEmail = ({
  userName,
  dealershipName,
  dashboardLink,
  supportLink,
}: WelcomeEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>🎉 Welcome to {dealershipName} - Let's get started!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSection}>
            <div style={iconWrapper}>
              <div style={welcomeIcon}>🎉</div>
            </div>
            <Heading style={h1}>Welcome aboard, {userName}!</Heading>
            <Text style={subtitle}>
              Your account at <strong>{dealershipName}</strong> is ready to go.
            </Text>
          </Section>

          <Section style={contentSection}>
            <Text style={text}>
              You're now part of a modern dealership management ecosystem designed 
              to boost your productivity and drive results.
            </Text>

            {/* Quick start guide */}
            <Section style={quickStartSection}>
              <Text style={sectionTitle}>🚀 Quick Start Guide</Text>
              <div style={stepsList}>
                <div style={stepItem}>
                  <div style={stepNumber}>1</div>
                  <div style={stepContent}>
                    <Text style={stepTitle}>Complete Your Profile</Text>
                    <Text style={stepDescription}>Add your details and preferences</Text>
                  </div>
                </div>
                <div style={stepItem}>
                  <div style={stepNumber}>2</div>
                  <div style={stepContent}>
                    <Text style={stepTitle}>Explore the Dashboard</Text>
                    <Text style={stepDescription}>Get familiar with key features</Text>
                  </div>
                </div>
                <div style={stepItem}>
                  <div style={stepNumber}>3</div>
                  <div style={stepContent}>
                    <Text style={stepTitle}>Import Your Data</Text>
                    <Text style={stepDescription}>Upload existing inventory and customers</Text>
                  </div>
                </div>
              </div>
            </Section>

            <Section style={buttonContainer}>
              <Link style={primaryButton} href={dashboardLink}>
                Go to Dashboard
              </Link>
              <Link style={secondaryButton} href={supportLink}>
                Get Help
              </Link>
            </Section>
          </Section>

          <Section style={footerSection}>
            <Text style={footer}>
              Need help? Our support team is here 24/7.
            </Text>
            <Text style={footerCopyright}>
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
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  padding: "48px 32px",
  textAlign: "center" as const,
};

const iconWrapper = {
  marginBottom: "24px",
};

const welcomeIcon = {
  fontSize: "64px",
  backgroundColor: "rgba(255, 255, 255, 0.2)",
  borderRadius: "50%",
  width: "100px",
  height: "100px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const h1 = {
  color: "#ffffff",
  fontSize: "32px",
  fontWeight: "700",
  margin: "0 0 16px 0",
};

const subtitle = {
  color: "rgba(255, 255, 255, 0.9)",
  fontSize: "18px",
  margin: "0",
};

const contentSection = {
  padding: "40px 32px",
};

const text = {
  color: "#475569",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "16px 0",
};

const quickStartSection = {
  backgroundColor: "#f8fafc",
  borderRadius: "12px",
  padding: "32px 24px",
  margin: "32px 0",
};

const sectionTitle = {
  color: "#1e293b",
  fontSize: "20px",
  fontWeight: "600",
  margin: "0 0 24px 0",
};

const stepsList = {
  display: "grid",
  gap: "20px",
};

const stepItem = {
  display: "flex",
  alignItems: "flex-start",
  gap: "16px",
};

const stepNumber = {
  backgroundColor: "#3b82f6",
  color: "#ffffff",
  borderRadius: "50%",
  width: "32px",
  height: "32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "14px",
  fontWeight: "600",
  flexShrink: "0" as const,
};

const stepContent = {
  flex: "1",
};

const stepTitle = {
  color: "#1e293b",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 4px 0",
};

const stepDescription = {
  color: "#64748b",
  fontSize: "14px",
  margin: "0",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const primaryButton = {
  backgroundColor: "#3b82f6",
  borderRadius: "12px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  display: "inline-block",
  padding: "16px 32px",
  boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.3)",
  marginRight: "12px",
};

const secondaryButton = {
  backgroundColor: "transparent",
  border: "2px solid #e2e8f0",
  borderRadius: "12px",
  color: "#475569",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  display: "inline-block",
  padding: "14px 30px",
};

const footerSection = {
  backgroundColor: "#f8fafc",
  padding: "24px 32px",
  textAlign: "center" as const,
};

const footer = {
  color: "#64748b",
  fontSize: "16px",
  margin: "0 0 12px 0",
  fontWeight: "500",
};

const footerCopyright = {
  color: "#64748b",
  fontSize: "14px",
  margin: "0",
};

export default WelcomeEmail;