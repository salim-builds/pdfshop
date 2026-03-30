import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Sparkles, Zap, Crown, Building2 } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    description: "All PDF tools, no AI features",
    icon: Zap,
    features: [
      { text: "Merge, split, rotate PDFs", included: true },
      { text: "Compress & convert PDFs", included: true },
      { text: "JPG to PDF conversion", included: true },
      { text: "AI Summaries", included: false },
      { text: "AI Chat with PDF", included: false },
      { text: "OCR for scanned PDFs", included: false },
    ],
    cta: "Get Started",
    popular: false,
    bestValue: false,
    highlightColor: "",
  },
  {
    name: "AI Basic",
    price: "₹99",
    period: "/month",
    description: "Essential AI features for individuals",
    icon: Sparkles,
    features: [
      { text: "All Free PDF tools", included: true },
      { text: "15 AI summaries/day", included: true },
      { text: "5 AI chats/day", included: true },
      { text: "Process first 2 pages", included: true },
      { text: "Faster processing", included: true },
      { text: "No watermark on output", included: false },
    ],
    cta: "Start AI Basic",
    popular: true,
    bestValue: false,
    highlightColor: "border-primary",
  },
  {
    name: "AI Pro",
    price: "₹299",
    period: "/month",
    description: "Full AI power for professionals",
    icon: Crown,
    features: [
      { text: "All AI Basic features", included: true },
      { text: "80 AI summaries/day", included: true },
      { text: "30 AI chats/day", included: true },
      { text: "Full document processing", included: true },
      { text: "Fastest speed", included: true },
      { text: "No watermark on output", included: true },
    ],
    cta: "Upgrade to Pro",
    popular: false,
    bestValue: true,
    highlightColor: "border-accent",
  },
  {
    name: "Business",
    price: "₹499",
    period: "/month",
    description: "For teams and heavy usage",
    icon: Building2,
    features: [
      { text: "All AI Pro features", included: true },
      { text: "150 AI summaries/day", included: true },
      { text: "80 AI chats/day", included: true },
      { text: "API access", included: true },
      { text: "Team workspace", included: true },
      { text: "Priority support", included: true },
    ],
    cta: "Go Business",
    popular: false,
    bestValue: false,
    highlightColor: "",
  },
];

export default function Pricing() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 py-16 md:py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="mr-1 h-3 w-3" /> Simple Pricing
            </Badge>
            <h1 className="text-4xl font-extrabold text-foreground md:text-5xl">
              Unlock AI-powered PDF tools
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Free PDF tools for everyone. Upgrade to unlock AI summaries, chat, and more.
            </p>
          </div>

          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => {
              const Icon = plan.icon;
              return (
                <Card
                  key={plan.name}
                  className={`relative flex flex-col transition-all hover:shadow-lg ${
                    plan.popular
                      ? "border-primary shadow-lg ring-2 ring-primary/20 scale-[1.02]"
                      : plan.bestValue
                      ? "border-accent shadow-md"
                      : ""
                  }`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  )}
                  {plan.bestValue && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground">
                      Best Value
                    </Badge>
                  )}
                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription className="text-sm">{plan.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-extrabold text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    <ul className="flex-1 space-y-3 mb-8">
                      {plan.features.map((f) => (
                        <li key={f.text} className="flex items-start gap-2 text-sm">
                          {f.included ? (
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          ) : (
                            <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
                          )}
                          <span className={f.included ? "text-foreground" : "text-muted-foreground/60"}>
                            {f.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Link to="/auth">
                      <Button
                        className="w-full"
                        variant={plan.popular ? "default" : "outline"}
                        size="lg"
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Free tier callout */}
          <div className="mx-auto mt-16 max-w-2xl text-center rounded-2xl border bg-muted/30 p-8">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              🛠️ All PDF tools are free — forever
            </h3>
            <p className="text-muted-foreground">
              Merge, split, compress, rotate, convert, watermark, and protect your PDFs without any cost.
              AI features require a paid plan.
            </p>
            <Link to="/">
              <Button variant="outline" className="mt-4">
                Try PDF Tools Free →
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
