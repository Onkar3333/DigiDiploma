import { useParams } from "react-router-dom";
import BranchSpecificSubjects from "@/components/BranchSpecificSubjects";

const BranchSubjectsPage = () => {
  const { branchName } = useParams<{ branchName: string }>();
  const decodedBranch = decodeURIComponent(branchName || "Computer Engineering");
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Subjects for {decodedBranch}</h1>
      <BranchSpecificSubjects studentBranch={decodedBranch} studentSemester={"1"} />
    </div>
  );
};

export default BranchSubjectsPage; 