import { useParams, useLocation } from "react-router-dom";
import BranchSpecificSubjects from "@/components/BranchSpecificSubjects";

const SemesterPageWrapper = () => {
  const { semester } = useParams();
  const location = useLocation();
  const selectedBranch = location.state?.selectedBranch || "Computer Engineering";

  const semesterNumber = parseInt(semester || "1");

  return (
    <div className="container mx-auto px-4 py-6">
      <BranchSpecificSubjects 
        studentBranch={selectedBranch}
        studentSemester={semesterNumber.toString()}
      />
    </div>
  );
};

export default SemesterPageWrapper; 