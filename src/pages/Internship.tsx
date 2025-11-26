import InternshipForm from "@/components/InternshipForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { GraduationCap, MapPin, Trophy, Users, ShieldCheck, CheckCircle2 } from "lucide-react";

const perks = [
  {
    title: "Live Industry Projects",
    description: "Work on curated hardware and software assignments that match your branch.",
    icon: <Trophy className="w-6 h-6 text-indigo-600" />,
  },
  {
    title: "Mentorship & Feedback",
    description: "Weekly mentor syncs, doubt clearing, and personalised portfolio feedback.",
    icon: <Users className="w-6 h-6 text-indigo-600" />,
  },
  {
    title: "Verified Certificates",
    description: "Completion certificate with DigiDiploma seal and unique verification code.",
    icon: <ShieldCheck className="w-6 h-6 text-indigo-600" />,
  },
];

const steps = [
  "Complete the quick application",
  "Upload your latest resume (PDF)",
  "Choose preferred mode & duration",
  "Wait for confirmation email",
  "Begin onboarding with mentor",
];

const Internship = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const variant = user ? "dashboard" : "public";

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-12 grid gap-8 lg:grid-cols-2 items-center">
          <div>
            <Badge className="mb-4 text-xs uppercase tracking-widest" variant="outline">
              DigiDiploma Internship Program
            </Badge>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight">
           Earn Real Internship Experience with <span className="text-gradient-primary">DigiDiploma</span> Internship Program
            </h1>
            <p className="mt-5 text-lg text-slate-600">
              Apply for hybrid, onsite, or online internships tailored for diploma students. Choose hardware or software tracks,
              learn directly from mentors, and get industry-ready in 4-24 weeks.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Button onClick={() => document.getElementById("internship-form")?.scrollIntoView({ behavior: "smooth" })}>
                Apply Now
              </Button>
              {!user && (
                <Button variant="outline" onClick={() => navigate("/student-dashboard?login=1")}>
                  Login for faster form
                </Button>
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-6 text-sm text-slate-600">
              <span className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-500" /> Open to diploma students
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-500" /> Hybrid • Onsite • Online
              </span>
            </div>
          </div>
          <div className="bg-white rounded-3xl shadow-2xl p-8 border border-slate-100">
            <div className="flex items-center gap-3 text-indigo-600 font-semibold mb-4">
              <CheckCircle2 className="w-5 h-5" />
              Included benefits
            </div>
            <ul className="space-y-4 text-slate-700">
              {steps.map((step) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-semibold shrink-0">
                    {steps.indexOf(step) + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 space-y-16">
        <section className="grid gap-6 md:grid-cols-3">
          {perks.map((perk) => (
            <Card key={perk.title} className="border-none shadow-lg bg-white">
              <CardContent className="p-6 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">{perk.icon}</div>
                <h3 className="text-lg font-semibold">{perk.title}</h3>
                <p className="text-sm text-muted-foreground">{perk.description}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section id="internship-form" className="grid gap-8 lg:grid-cols-2 items-start">
          <div className="space-y-4">
            <Badge variant="secondary" className="text-indigo-600">
              Step 1
            </Badge>
            <h2 className="text-3xl font-bold text-slate-900">Submit your application</h2>
            <p className="text-slate-600 leading-relaxed">
              The form takes less than 3 minutes. Share your preferred mode, duration, and upload your resume. Our team validates every
              application manually, so please double-check your email and phone number.
            </p>
            <div className="grid gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold">1</div>
                <span>Fill contact & academic details</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold">2</div>
                <span>Choose mode, track & duration</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold">3</div>
                <span>Upload resume (PDF only) & submit</span>
              </div>
            </div>
          </div>
          <InternshipForm variant={variant} />
        </section>

        <section className="bg-white rounded-3xl border shadow-inner p-8">
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div>
              <Badge variant="outline">Need help?</Badge>
              <h3 className="text-2xl mt-4 font-semibold">Talk to the DigiDiploma internship desk</h3>
              <p className="text-muted-foreground mt-2">
                Email support@digidiploma.in for custom corporate programs, group applications, or campus ambassador tie-ups.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate("/contact")}>
                Contact Team
              </Button>
              <Button onClick={() => document.getElementById("internship-form")?.scrollIntoView({ behavior: "smooth" })}>
                Apply Now
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Internship;

