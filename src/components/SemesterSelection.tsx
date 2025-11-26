import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Calendar, GraduationCap, Users, Clock, Star } from "lucide-react";

interface SemesterSelectionProps {
  selectedBranch: string;
  onSemesterSelect: (semester: number) => void;
  onBack: () => void;
}

// ENTC subject data for semesters 2-6
const ENTC_SUBJECTS: Record<number, { name: string; code: string }[]> = {
  2: [
    { name: 'Applied Mathematics', code: '312301' },
    { name: 'Basic Electronics', code: '312314' },
    { name: 'Elements of Electrical Engineering', code: '312315' },
    { name: 'Electronic Materials & Components', code: '312316' },
    { name: 'Professional Communication', code: '312002' },
    { name: 'Social and Life Skills', code: '312003' },
    { name: 'Electronics Workshop Practice', code: '312008' },
    { name: "Programming in 'C' Language", code: '312009' }
  ],
  3: [
    { name: 'Essence of Indian Constitution', code: '313304' },
    { name: 'Basic Python Programming', code: '313306' },
    { name: 'Analog Electronics', code: '313320' },
    { name: 'Digital Techniques', code: '313322' },
    { name: 'Electrical Circuits & Networks', code: '313326' },
    { name: 'Principles of Electronic Communication', code: '313327' },
    { name: 'Electronics Measurements & Instrumentation', code: '313007' }
  ],
  4: [
    { name: 'Environmental Education and Sustainability', code: '314322' },
    { name: 'Microcontroller & Applications', code: '314323' },
    { name: 'Consumer Electronics', code: '314333' },
    { name: 'Digital Communication', code: '314334' },
    { name: 'Basic Power Electronics', code: '324304' },
    { name: 'Electronic Equipment Maintenance & Simulation', code: '314011' },
    { name: 'Open Elective', code: '314328' }
  ],
  5: [
    { name: 'Entrepreneurship Development and Startups', code: '315302' },
    { name: 'Embedded System', code: '315340' },
    { name: 'Mobile & Wireless Communication', code: '315344' },
    { name: 'Seminar and Project Initiation Course', code: '315002' },
    { name: 'Internship (12 Weeks)', code: '315001' },
    { name: 'IoT Applications', code: '315338' },
    { name: 'Microwave Engineering & Radar System', code: '315346' }
  ],
  6: [
    { name: 'Management', code: '316302' },
    { name: 'Emerging Trends in Electronics', code: '316326' },
    { name: 'Computer Network & Data Communication', code: '316330' },
    { name: 'Optical Networking and Satellite Communication', code: '316331' },
    { name: 'Capstone Project', code: '316001' },
    { name: 'Drone Technology', code: '316328' },
    { name: 'Control System & PLC', code: '316332' },
    { name: 'VLSI Applications', code: '316333' }
  ]
};

const SemesterSelection = ({ selectedBranch, onSemesterSelect, onBack }: SemesterSelectionProps) => {
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  const semesters = [
    {
      number: 1,
      title: "Semester 1",
      description: "Foundation subjects and basic engineering concepts",
      subjects: ["Engineering Mathematics", "Engineering Physics", "Engineering Chemistry", "Basic Electronics"],
      duration: "6 months",
      students: "120 students"
    },
    {
      number: 2,
      title: "Semester 2",
      description: "Core engineering fundamentals and practical skills",
      subjects: ["Engineering Drawing", "Programming Fundamentals", "Digital Electronics", "Workshop Practice"],
      duration: "6 months",
      students: "115 students"
    },
    {
      number: 3,
      title: "Semester 3",
      description: "Advanced concepts and specialized subjects",
      subjects: ["Data Structures", "Object Oriented Programming", "Computer Architecture", "Database Systems"],
      duration: "6 months",
      students: "110 students"
    },
    {
      number: 4,
      title: "Semester 4",
      description: "Professional development and industry exposure",
      subjects: ["Web Development", "Software Engineering", "Computer Networks", "Operating Systems"],
      duration: "6 months",
      students: "105 students"
    },
    {
      number: 5,
      title: "Semester 5",
      description: "Specialized tracks and advanced technologies",
      subjects: ["Machine Learning", "Cloud Computing", "Mobile Development", "Cybersecurity"],
      duration: "6 months",
      students: "100 students"
    },
    {
      number: 6,
      title: "Semester 6",
      description: "Final year project and industry internship",
      subjects: ["Project Work", "Internship", "Professional Ethics", "Entrepreneurship"],
      duration: "6 months",
      students: "95 students"
    }
  ];

  const handleSemesterSelect = (semester: number) => {
    setSelectedSemester(semester);
    onSemesterSelect(semester);
  };

  // After semester selection, if ENTC and semester 2-6, show subject selection
  const showSubjectSelection = selectedBranch === 'Electronics & Telecommunication' && selectedSemester && ENTC_SUBJECTS[selectedSemester];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gradient-primary mb-2">
              Choose Your Semester
            </h1>
            <p className="text-muted-foreground">
              Welcome to <span className="font-semibold text-primary">{selectedBranch}</span>
            </p>
          </div>
        </div>

        {/* Branch Info Card */}
        <Card className="mb-8 p-6 glass-card">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-r from-primary to-primary-glow rounded-2xl flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">{selectedBranch}</h2>
              <p className="text-muted-foreground">
                Select your current semester to access relevant subjects and resources
              </p>
            </div>
          </div>
        </Card>

        {/* Semester Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {semesters.map((semester) => (
            <Card
              key={semester.number}
              className={`p-6 cursor-pointer transition-all duration-300 hover-lift ${
                selectedSemester === semester.number
                  ? 'ring-2 ring-primary bg-primary/5'
                  : 'hover:bg-muted/30'
              }`}
              onClick={() => handleSemesterSelect(semester.number)}
            >
              {/* Semester Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-accent to-accent/80 rounded-xl flex items-center justify-center">
                  <span className="text-lg font-bold text-accent-foreground">
                    {semester.number}
                  </span>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {semester.duration}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="w-3 h-3" />
                    {semester.students}
                  </div>
                </div>
              </div>

              {/* Semester Title */}
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {semester.title}
              </h3>

              {/* Description */}
              <p className="text-muted-foreground text-sm mb-4">
                {semester.description}
              </p>

              {/* Subjects Preview */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Key Subjects
                </h4>
                <div className="space-y-1">
                  {semester.subjects.slice(0, 3).map((subject, index) => (
                    <div key={index} className="text-xs text-muted-foreground flex items-center gap-2">
                      <div className="w-1 h-1 bg-primary rounded-full"></div>
                      {subject}
                    </div>
                  ))}
                  {semester.subjects.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{semester.subjects.length - 3} more subjects
                    </div>
                  )}
                </div>
              </div>

              {/* Selection Indicator */}
              {selectedSemester === semester.number && (
                <div className="mt-4 flex items-center gap-2 text-primary">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-sm font-medium">Selected</span>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Continue Button */}
        {selectedSemester && !showSubjectSelection && (
          <div className="mt-8 text-center">
            <Button
              onClick={() => onSemesterSelect(selectedSemester)}
              className="btn-hero px-8 py-3 text-lg"
            >
              <Calendar className="w-5 h-5 mr-2" />
              Continue to Semester {selectedSemester}
              <ArrowLeft className="w-5 h-5 ml-2 rotate-180" />
            </Button>
          </div>
        )}
        {/* ENTC Subject Selection */}
        {showSubjectSelection && (
          <div className="mt-8 max-w-2xl mx-auto">
            <Card className="p-6 mb-6">
              <h3 className="text-xl font-bold mb-4 text-primary">Select Subjects for Semester {selectedSemester}</h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ENTC_SUBJECTS[selectedSemester!].map((subj) => (
                  <li key={subj.code} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id={subj.code}
                      checked={selectedSubjects.includes(subj.code)}
                      onChange={e => {
                        setSelectedSubjects(prev =>
                          e.target.checked
                            ? [...prev, subj.code]
                            : prev.filter(code => code !== subj.code)
                        );
                      }}
                      className="accent-primary w-5 h-5"
                    />
                    <label htmlFor={subj.code} className="text-foreground cursor-pointer">
                      {subj.name} <span className="text-xs text-muted-foreground">({subj.code})</span>
                    </label>
                  </li>
                ))}
              </ul>
            </Card>
            <div className="text-center">
              <Button
                onClick={() => onSemesterSelect(selectedSemester!)}
                className="btn-hero px-8 py-3 text-lg"
                disabled={selectedSubjects.length === 0}
              >
                <Calendar className="w-5 h-5 mr-2" />
                Continue with Selected Subjects
                <ArrowLeft className="w-5 h-5 ml-2 rotate-180" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SemesterSelection; 