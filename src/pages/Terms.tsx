import { Link } from 'react-router-dom'
import { Shield, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold text-primary">CRSC Filing Assistant</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 13, 2025</p>

        <div className="prose prose-slate max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using the CRSC Filing Assistant service ("Service") operated by
              Vets4Claims ("we," "our," or "us"), you agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground">
              The CRSC Filing Assistant is a tool designed to help military veterans prepare
              and organize their Combat-Related Special Compensation (CRSC) applications.
              Our Service provides guidance, form generation, and document organization to
              simplify the CRSC filing process.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Important Disclaimers</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <p className="text-amber-800 font-medium">Please read these disclaimers carefully:</p>
            </div>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>
                <strong>Not Legal Advice:</strong> Our Service does not provide legal advice.
                We are not attorneys and cannot guarantee any outcome for your CRSC application.
              </li>
              <li>
                <strong>Not Government Affiliated:</strong> Vets4Claims is not affiliated with,
                endorsed by, or connected to the Department of Defense, Department of Veterans
                Affairs, or any government agency.
              </li>
              <li>
                <strong>No Guarantee of Approval:</strong> Using our Service does not guarantee
                approval of your CRSC claim. Approval decisions are made solely by your
                military branch's CRSC board.
              </li>
              <li>
                <strong>User Responsibility:</strong> You are responsible for verifying the
                accuracy of all information in your application before submission.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Eligibility</h2>
            <p className="text-muted-foreground">
              To use our Service, you must be at least 18 years old and either a U.S. military
              veteran or an authorized representative acting on behalf of a veteran.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Account Registration</h2>
            <p className="text-muted-foreground">
              You must create an account to use our Service. You agree to provide accurate,
              current, and complete information during registration and to update such
              information to keep it accurate. You are responsible for safeguarding your
              account credentials and for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Fees and Payment</h2>
            <p className="text-muted-foreground">
              Our Service charges a one-time fee for generating your complete CRSC filing
              packet. All fees are clearly displayed before payment and are non-refundable
              once the packet has been generated and delivered, except as required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. User Content</h2>
            <p className="text-muted-foreground">
              You retain ownership of all content you submit to our Service, including
              personal information, documents, and descriptions. By submitting content,
              you grant us a limited license to use, process, and store such content
              solely for the purpose of providing our Service to you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Prohibited Uses</h2>
            <p className="text-muted-foreground mb-3">You agree not to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Use the Service for any unlawful purpose</li>
              <li>Submit false or misleading information</li>
              <li>Impersonate another person or entity</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Use the Service to file fraudulent claims</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Intellectual Property</h2>
            <p className="text-muted-foreground">
              The Service, including its design, features, and content (excluding user content),
              is owned by Vets4Claims and protected by intellectual property laws. You may not
              copy, modify, distribute, or create derivative works without our written permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              To the maximum extent permitted by law, Vets4Claims shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages, including loss
              of benefits, arising from your use of the Service. Our total liability shall not
              exceed the amount you paid for the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Indemnification</h2>
            <p className="text-muted-foreground">
              You agree to indemnify and hold harmless Vets4Claims and its officers, directors,
              employees, and agents from any claims, damages, or expenses arising from your use
              of the Service or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Termination</h2>
            <p className="text-muted-foreground">
              We may terminate or suspend your access to the Service at any time, with or without
              cause, with or without notice. Upon termination, your right to use the Service will
              immediately cease. You may also delete your account at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">14. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these Terms at any time. We will notify you of
              material changes by posting the updated Terms on our website. Your continued use
              of the Service after such changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">15. Governing Law</h2>
            <p className="text-muted-foreground">
              These Terms shall be governed by and construed in accordance with the laws of
              the State of [Your State], without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">16. Contact Information</h2>
            <p className="text-muted-foreground">
              If you have questions about these Terms, please contact us at:
            </p>
            <p className="text-muted-foreground mt-2">
              <strong>Email:</strong> support@vets4claims.com<br />
              <strong>Website:</strong> https://vets4claims.com
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/50 mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Vets4Claims. All rights reserved.</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link to="/privacy" className="hover:text-primary">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-primary">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
