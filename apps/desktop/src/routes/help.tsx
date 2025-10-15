// src/routes/help/index.tsx
import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/layout/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  HelpCircle, 
  Book, 
  MessageCircle, 
  Mail, 
  Search,
  ExternalLink,
  Video,
  FileText,
  Users,
  DollarSign,
  Shield,
  Zap,
  Send,
  CheckCircle2,
} from "lucide-react";
import { useId, useState } from "react";
import { toast } from "react-hot-toast";

export const Route = createFileRoute("/help")({
  component: HelpPage,
});

function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [supportForm, setSupportForm] = useState({
    subject: "",
    description: "",
    email: "",
  });

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement support ticket submission
    toast.success("Support ticket submitted! We'll get back to you within 24 hours.");
    setSupportForm({ subject: "", description: "", email: "" });
  };

  const categories = [
    {
      title: "Getting Started",
      description: "Learn the basics of DealerPro",
      icon: Book,
      articles: 12,
      color: "from-blue-500 to-cyan-500",
    },
    {
      title: "Deal Management",
      description: "Creating and managing deals",
      icon: FileText,
      articles: 18,
      color: "from-purple-500 to-pink-500",
    },
    {
      title: "Team Collaboration",
      description: "Working with your team",
      icon: Users,
      articles: 8,
      color: "from-green-500 to-emerald-500",
    },
    {
      title: "Billing & Subscription",
      description: "Manage your subscription",
      icon: DollarSign,
      articles: 6,
      color: "from-amber-500 to-orange-500",
    },
    {
      title: "Security & Privacy",
      description: "Keep your data safe",
      icon: Shield,
      articles: 10,
      color: "from-red-500 to-rose-500",
    },
    {
      title: "Integrations",
      description: "Connect with other tools",
      icon: Zap,
      articles: 5,
      color: "from-violet-500 to-purple-500",
    },
  ];

  const faqs = [
    {
      category: "General",
      questions: [
        {
          q: "What is DealerPro?",
          a: "DealerPro is a comprehensive dealership management platform that helps you streamline deal processing, manage your team, and grow your business. It includes features for deal management, document generation, team collaboration, and analytics.",
        },
        {
          q: "How do I get started?",
          a: "After signing up, you'll be guided through a quick setup process where you'll add your dealership information and invite team members. You can then start creating deals right away. Check out our Getting Started guide for detailed instructions.",
        },
        {
          q: "Can I import my existing data?",
          a: "Yes! DealerPro supports importing clients, vehicles, and deal data from CSV files. Navigate to Settings > Import Data to get started. We also offer migration assistance for large datasets.",
        },
      ],
    },
    {
      category: "Deals",
      questions: [
        {
          q: "How do I create a new deal?",
          a: "Click the 'New Deal' button from the Deals page. Enter the client and vehicle information, select the deal type (cash, finance, or lease), and DealerPro will automatically generate the required documents.",
        },
        {
          q: "What document types are supported?",
          a: "DealerPro supports all standard dealership documents including Bill of Sale, Purchase Agreement, Finance Contracts, Lease Agreements, Trade-In Forms, and more. You can also upload custom documents.",
        },
        {
          q: "Can clients sign documents electronically?",
          a: "Yes! DealerPro includes built-in e-signature capabilities. Once a deal is ready, you can send signature requests to clients via email. They can sign on any device.",
        },
      ],
    },
    {
      category: "Subscription",
      questions: [
        {
          q: "What plans are available?",
          a: "We offer three plans: Basic (small dealerships), Premium (growing businesses), and Enterprise (large operations). Each plan includes different features and user limits. Visit the Pricing page for details.",
        },
        {
          q: "Can I change my plan?",
          a: "Yes! You can upgrade or downgrade your plan at any time from the Subscription page. Changes take effect immediately, and billing is prorated.",
        },
        {
          q: "What payment methods do you accept?",
          a: "We accept all major credit cards (Visa, MasterCard, American Express, Discover) through our secure payment processor, Stripe. Enterprise customers can also pay via ACH or wire transfer.",
        },
      ],
    },
    {
      category: "Team & Security",
      questions: [
        {
          q: "How do I add team members?",
          a: "Navigate to Team Management and click 'Invite Team Member'. Enter their email and select a role (Admin, Manager, Employee, or Read-Only). They'll receive an invitation email to join.",
        },
        {
          q: "What are the different user roles?",
          a: "Admin: Full access to all features. Manager: Can manage deals and team members. Employee: Can create and manage deals. Read-Only: View-only access to deals and reports.",
        },
        {
          q: "Is my data secure?",
          a: "Yes! We use bank-level encryption (AES-256) for data at rest and TLS 1.3 for data in transit. We're SOC 2 Type II compliant and undergo regular security audits. All data is backed up daily.",
        },
      ],
    },
  ];

  const videoTutorials = [
    {
      title: "Getting Started with DealerPro",
      duration: "5:30",
      thumbnail: "https://via.placeholder.com/320x180?text=Getting+Started",
    },
    {
      title: "Creating Your First Deal",
      duration: "8:15",
      thumbnail: "https://via.placeholder.com/320x180?text=First+Deal",
    },
    {
      title: "Team Management Basics",
      duration: "6:45",
      thumbnail: "https://via.placeholder.com/320x180?text=Team+Management",
    },
  ];

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold">How can we help you?</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Search our knowledge base, watch tutorials, or get in touch with our support team
          </p>
          
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search for help articles, tutorials, FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 text-lg"
            />
          </div>
        </div>

        <Tabs defaultValue="browse" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="browse">
              <Book className="h-4 w-4 mr-2" />
              Browse
            </TabsTrigger>
            <TabsTrigger value="faq">
              <HelpCircle className="h-4 w-4 mr-2" />
              FAQ
            </TabsTrigger>
            <TabsTrigger value="videos">
              <Video className="h-4 w-4 mr-2" />
              Videos
            </TabsTrigger>
            <TabsTrigger value="contact">
              <MessageCircle className="h-4 w-4 mr-2" />
              Contact
            </TabsTrigger>
          </TabsList>

          {/* Browse Tab */}
          <TabsContent value="browse" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <Card 
                    key={category.title}
                    className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
                  >
                    <CardHeader>
                      <div className={`p-3 bg-gradient-to-br ${category.color} rounded-xl w-fit mb-3 group-hover:scale-110 transition-transform`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <CardTitle className="text-lg">{category.title}</CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {category.articles} articles
                        </span>
                        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Popular Articles</CardTitle>
                <CardDescription>
                  Most viewed help articles this month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    "How to create your first deal",
                    "Setting up electronic signatures",
                    "Understanding user roles and permissions",
                    "Importing client data from CSV",
                    "Managing your subscription and billing",
                  ].map((article) => (
                    <div
                      key={article}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors group"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                      <span className="flex-1 text-sm font-medium">{article}</span>
                      <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="space-y-6">
            {faqs.map((section) => (
              <Card key={section.category}>
                <CardHeader>
                  <CardTitle>{section.category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {section.questions.map((faq) => (
                      <AccordionItem key={faq.q} value={`item-${section.category}-${faq.q}`}>
                        <AccordionTrigger className="text-left">
                          {faq.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {faq.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Videos Tab */}
          <TabsContent value="videos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Video Tutorials</CardTitle>
                <CardDescription>
                  Step-by-step video guides to help you get the most out of DealerPro
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {videoTutorials.map((video) => (
                    <div
                      key={video.title}
                      className="group cursor-pointer rounded-lg overflow-hidden border hover:shadow-lg transition-all"
                    >
                      <div className="relative aspect-video bg-muted">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                            <Video className="h-8 w-8 text-primary ml-1" />
                          </div>
                        </div>
                        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                          {video.duration}
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="font-medium text-sm">{video.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>More Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="mr-2 h-4 w-4" />
                    Download User Guide (PDF)
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Visit Documentation
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Join Community Forum
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Support
                  </CardTitle>
                  <CardDescription>
                    Get help from our support team
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Response Time</p>
                      <p className="text-sm text-muted-foreground">
                        Within 24 hours (business days)
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Email Address</p>
                      <a 
                        href="mailto:support@dealerpro.com"
                        className="text-sm text-primary hover:underline"
                      >
                        support@dealerpro.com
                      </a>
                    </div>
                    <Button className="w-full">
                      <Mail className="mr-2 h-4 w-4" />
                      Send Email
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Live Chat
                  </CardTitle>
                  <CardDescription>
                    Chat with us in real-time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Availability</p>
                      <p className="text-sm text-muted-foreground">
                        Monday - Friday: 9 AM - 6 PM EST
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <p className="text-sm font-medium text-green-600">Currently Online</p>
                    </div>
                    <Button className="w-full">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Start Chat
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Submit a Support Ticket</CardTitle>
                <CardDescription>
                  Describe your issue and we'll get back to you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitTicket} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Your Email</Label>
                    <Input
                      id={useId()}
                      type="email"
                      value={supportForm.email}
                      onChange={(e) => setSupportForm({ ...supportForm, email: e.target.value })}
                      required
                      placeholder="you@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id={useId()}
                      value={supportForm.subject}
                      onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
                      required
                      placeholder="Brief description of your issue"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id={useId()}
                      rows={6}
                      value={supportForm.description}
                      onChange={(e) => setSupportForm({ ...supportForm, description: e.target.value })}
                      required
                      placeholder="Please provide as much detail as possible..."
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    <Send className="mr-2 h-4 w-4" />
                    Submit Ticket
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-2">Premium Support</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Get priority support with faster response times, dedicated account manager, and phone support.
                    </p>
                    <Button variant="outline" size="sm">
                      Upgrade to Premium
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}