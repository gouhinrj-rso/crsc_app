import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Shield,
  FileText,
  MessageSquare,
  Download,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  Award,
  ArrowRight,
  Settings,
} from 'lucide-react'

export default function Landing() {
  const navigate = useNavigate()

  const handleGetStarted = async () => {
    try {
      const apiKey = await window.electronAPI.settings.get('api_key')
      if (!apiKey) {
        navigate('/settings')
      } else {
        navigate('/onboarding')
      }
    } catch {
      navigate('/settings')
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-primary">CRSC Filing Assistant</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
              <Settings className="h-5 w-5" />
            </Button>
            <Button onClick={handleGetStarted}>Get Started</Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-20">
        <div className="container mx-auto px-4 text-center">
          <Badge className="mb-4" variant="secondary">
            Trusted by Veterans Nationwide
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 max-w-3xl mx-auto">
            File for Combat-Related Special Compensation with Confidence
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Our AI-powered assistant guides you through the CRSC filing process,
            helping you maximize your benefits with a complete, error-free application package.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="gap-2" onClick={handleGetStarted}>
              Start Your Application <ArrowRight className="h-4 w-4" />
            </Button>
            <Link to="#how-it-works">
              <Button size="lg" variant="outline">
                Learn More
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            HIPAA-compliant. Your data is encrypted and secure.
          </p>
        </div>
      </section>

      {/* What is CRSC Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">What is CRSC?</h2>
            <p className="text-lg text-muted-foreground">
              Combat-Related Special Compensation (CRSC) is a tax-free monthly payment
              for retired veterans with combat-related disabilities. It restores military
              retirement pay that was reduced due to VA disability compensation.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <DollarSign className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Tax-Free Benefits</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  CRSC payments are completely tax-free, maximizing your monthly compensation.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Clock className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Full Retroactive Pay</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Following the 2025 Supreme Court ruling, eligible veterans may now receive full retroactive payments to their initial eligibility date.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Award className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Combat Recognition</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Acknowledges disabilities incurred during combat or hazardous military service.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Users className="h-10 w-10 text-primary mb-2" />
                <CardTitle>All Branches</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Available to retired veterans from Army, Navy, Air Force, Marines, Coast Guard, and Space Force.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Eligibility Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Are You Eligible?</h2>
            <div className="space-y-4">
              {[
                'You are currently receiving military retired pay',
                'You have a VA disability rating of at least 10%',
                'Your retirement pay is reduced by VA disability payments',
                'You retired under one of these: 20+ years, Chapter 61, TERA, TDRL, or PDRL',
                'Your disability is combat-related (Purple Heart, Armed Conflict, Hazardous Service, etc.)',
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-3 p-4 bg-white rounded-lg shadow-sm">
                  <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-lg">{item}</span>
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Button size="lg" onClick={handleGetStarted}>Check Your Eligibility</Button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: CheckCircle,
                title: '1. Verify Eligibility',
                description: 'Answer a few questions to confirm you qualify for CRSC benefits.',
              },
              {
                icon: MessageSquare,
                title: '2. Guided Interview',
                description: 'Our AI assistant collects your information through a conversational process.',
              },
              {
                icon: FileText,
                title: '3. Document Review',
                description: 'Upload supporting documents and review your complete application.',
              },
              {
                icon: Download,
                title: '4. Download Package',
                description: 'Receive your complete CRSC filing package ready for submission.',
              },
            ].map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <step.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Our Service</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  HIPAA Compliant
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Your personal and medical information is protected with enterprise-grade
                  encryption and security measures.
                </CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  AI-Powered Guidance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Our intelligent assistant understands military terminology and guides you
                  through complex requirements.
                </CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Complete Package
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Receive a professionally compiled package with DD Form 2860, cover letter,
                  and all supporting documents.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Claim Your Combat-Related Compensation?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands of veterans who have successfully filed for CRSC using our service.
          </p>
          <Button size="lg" variant="secondary" className="gap-2" onClick={handleGetStarted}>
            Start Your Application <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-6 w-6" />
                <span className="font-bold">CRSC Filing Assistant</span>
              </div>
              <p className="text-sm text-gray-400">
                Helping veterans navigate the CRSC filing process with confidence.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href="https://www.va.gov/resources/combat-related-special-compensation-crsc/#:~:text=Combat%2DRelated%20Special%20Compensation%20provides%20tax%2Dfree%20payments%20to,apply%20for%20CRSC%20through%20your%20uniformed%20service."
                     target="_blank"
                     rel="noopener noreferrer"
                     className="hover:text-white">
                    VA CRSC Information
                  </a>
                </li>
                <li>
                  <a href="https://www.esd.whs.mil/Portals/54/Documents/DD/forms/dd/dd2860.pdf"
                     target="_blank"
                     rel="noopener noreferrer"
                     className="hover:text-white">
                    DD Form 2860
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="#" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link to="#" className="hover:text-white">Terms of Service</Link></li>
                <li><Link to="#" className="hover:text-white">HIPAA Notice</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/dashboard" className="hover:text-white">FAQ</Link></li>
                <li><a href="mailto:support@crscfiling.com" className="hover:text-white">Contact Us</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} CRSC Filing Assistant. All rights reserved.</p>
            <p className="mt-2">
              This service is not affiliated with the Department of Defense or Department of Veterans Affairs.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
