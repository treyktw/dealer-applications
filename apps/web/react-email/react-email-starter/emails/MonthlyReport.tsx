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
import * as React from "react";

interface MonthlyReportEmailProps {
  dealershipName: string;
  month: string;
  year: number;
  totalSales: number;
  salesGrowth: number;
  vehiclesSold: number;
  topSalesperson: string;
  reportLink: string;
  userName: string;
}

export const MonthlyReportEmail = ({
  dealershipName,
  month,
  year,
  totalSales,
  salesGrowth,
  vehiclesSold,
  topSalesperson,
  reportLink,
  userName,
}: MonthlyReportEmailProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  return (
    <Html>
      <Head />
      <Preview>📊 {month} {year.toString()} Performance Report - {dealershipName}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={headerSection}>
            <div style={iconWrapper}>
              <div style={reportIcon}>📊</div>
            </div>
            <Heading style={h1}>{month} {year} Report</Heading>
            <Text style={headerSubtitle}>Performance Summary for {dealershipName}</Text>
          </Section>

          {/* Content */}
          <Section style={contentSection}>
            <Text style={greeting}>Hi {userName},</Text>
            
            <Text style={text}>
              Here's your monthly performance report with key metrics and insights 
              for {month} {year}.
            </Text>

            {/* Key Metrics Grid */}
            <Section style={metricsGrid}>
              <div style={metricCard}>
                <div style={metricIcon}>💰</div>
                <div style={metricValue}>{formatCurrency(totalSales)}</div>
                <div style={metricLabel}>Total Sales</div>
                <div style={salesGrowth >= 0 ? metricGrowthPositive : metricGrowthNegative}>
                  {formatPercentage(salesGrowth)} vs last month
                </div>
              </div>

              <div style={metricCard}>
                <div style={metricIcon}>🚗</div>
                <div style={metricValue}>{vehiclesSold}</div>
                <div style={metricLabel}>Vehicles Sold</div>
                <div style={metricSubtext}>Units moved this month</div>
              </div>

              <div style={metricCard}>
                <div style={metricIcon}>🏆</div>
                <div style={metricValue}>{topSalesperson}</div>
                <div style={metricLabel}>Top Performer</div>
                <div style={metricSubtext}>Sales champion</div>
              </div>
            </Section>

            {/* Performance Insights */}
            <Section style={insightsSection}>
              <Text style={sectionTitle}>📈 Key Insights</Text>
              <div style={insightsList}>
                <div style={insightItem}>
                  <span style={insightBullet}>•</span>
                  <span style={insightText}>
                    {salesGrowth >= 0 ? 'Strong growth momentum' : 'Focus on conversion improvement'} 
                    compared to previous month
                  </span>
                </div>
                <div style={insightItem}>
                  <span style={insightBullet}>•</span>
                  <span style={insightText}>
                    Average sale value: {formatCurrency(totalSales / vehiclesSold)}
                  </span>
                </div>
                <div style={insightItem}>
                  <span style={insightBullet}>•</span>
                  <span style={insightText}>
                    {topSalesperson} led the team with exceptional performance
                  </span>
                </div>
              </div>
            </Section>

            {/* CTA to full report */}
            <Section style={buttonContainer}>
              <Link style={button} href={reportLink}>
                View Complete Report →
              </Link>
            </Section>

            <Hr style={divider} />

            <Text style={footerText}>
              Questions about your report? Contact your account manager or 
              visit our analytics dashboard for real-time insights.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footer}>
              © {new Date().getFullYear()} DealerHub Pro. All rights reserved.
            </Text>
            <Text style={footerNote}>
              Reports are generated monthly on the 1st of each month.
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
  background: "linear-gradient(135deg, #1e40af 0%, #3730a3 100%)",
  padding: "40px 32px",
  textAlign: "center" as const,
};

const iconWrapper = {
  marginBottom: "20px",
};

const reportIcon = {
  fontSize: "48px",
  backgroundColor: "rgba(255, 255, 255, 0.2)",
  borderRadius: "50%",
  width: "80px",
  height: "80px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto",
};

const h1 = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "700",
  margin: "0 0 8px 0",
};

const headerSubtitle = {
  color: "rgba(255, 255, 255, 0.8)",
  fontSize: "16px",
  margin: "0",
};

const contentSection = {
  padding: "40px 32px",
};

const greeting = {
  color: "#1e293b",
  fontSize: "18px",
  fontWeight: "500",
  margin: "0 0 16px 0",
};

const text = {
  color: "#475569",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "16px 0",
};

const metricsGrid = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "20px",
  margin: "32px 0",
};

const metricCard = {
  backgroundColor: "#f8fafc",
  borderRadius: "12px",
  padding: "24px",
  textAlign: "center" as const,
  border: "1px solid #e2e8f0",
};

const metricIcon = {
  fontSize: "32px",
  marginBottom: "12px",
};

const metricValue = {
  color: "#1e293b",
  fontSize: "24px",
  fontWeight: "700",
  margin: "8px 0",
};

const metricLabel = {
  color: "#64748b",
  fontSize: "14px",
  fontWeight: "500",
  margin: "4px 0",
};

const metricGrowthPositive = {
  color: "#059669",
  fontSize: "12px",
  fontWeight: "500",
  backgroundColor: "#d1fae5",
  padding: "4px 8px",
  borderRadius: "12px",
  display: "inline-block",
  marginTop: "4px",
};

const metricGrowthNegative = {
  color: "#dc2626",
  fontSize: "12px",
  fontWeight: "500",
  backgroundColor: "#fee2e2",
  padding: "4px 8px",
  borderRadius: "12px",
  display: "inline-block",
  marginTop: "4px",
};

const metricSubtext = {
  color: "#94a3b8",
  fontSize: "12px",
  margin: "4px 0 0 0",
};

const insightsSection = {
  backgroundColor: "#eff6ff",
  borderRadius: "12px",
  padding: "24px",
  margin: "32px 0",
};

const sectionTitle = {
  color: "#1e40af",
  fontSize: "18px",
  fontWeight: "600",
  margin: "0 0 16px 0",
};

const insightsList = {
  display: "grid",
  gap: "12px",
};

const insightItem = {
  display: "flex",
  alignItems: "flex-start",
  gap: "8px",
};

const insightBullet = {
  color: "#3b82f6",
  fontWeight: "bold",
  flexShrink: "0" as const,
};

const insightText = {
  color: "#1e40af",
  fontSize: "14px",
  lineHeight: "1.5",
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

const footerText = {
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
  margin: "0 0 8px 0",
};

const footerNote = {
  color: "#94a3b8",
  fontSize: "12px",
  margin: "0",
};

export default MonthlyReportEmail;