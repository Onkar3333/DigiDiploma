import express from "express";
const router = express.Router();
import { authenticateToken, requireAdmin } from "../middleware/auth.js";
import notificationService from "../websocket.js";
import Subject from "../models/Subject.js";
// MongoDB only - no Firebase

// Get all subjects
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { branch, semester } = req.query;
    let filter = {};
    
    if (branch) {
      // Use case-insensitive regex for branch matching
      const branchEscaped = branch.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.branch = { $regex: new RegExp(`^${branchEscaped}$`, 'i') };
    }
    if (semester) filter.semester = parseInt(semester);
    
    // Don't filter by isActive - return all subjects
    // Use find without ordering to avoid index requirement (we'll sort in memory if needed)
    const subjects = await Subject.find(filter, { orderBy: false });
    
    console.log(`📚 GET /api/subjects - Branch: ${branch || 'all'}, Semester: ${semester || 'all'}, Found: ${subjects.length} subjects`);
    if (branch && subjects.length > 0) {
      const branches = [...new Set(subjects.map(s => s.branch))];
      console.log(`   Actual branch names in results: ${branches.join(', ')}`);
    }
    
    // Sort in memory by semester and name
    subjects.sort((a, b) => {
      if (a.semester !== b.semester) return a.semester - b.semester;
      return a.name.localeCompare(b.name);
    });
    // Convert to format expected by frontend (with _id)
    const formattedSubjects = subjects.map(subject => ({
      _id: subject.id || subject._id,
      id: subject.id || subject._id,
      name: subject.name,
      code: subject.code,
      branch: subject.branch,
      semester: subject.semester,
      credits: subject.credits,
      hours: subject.hours,
      type: subject.type,
      description: subject.description || '',
      isActive: subject.isActive !== undefined ? subject.isActive : true,
      isCommon: subject.isCommon !== undefined ? subject.isCommon : false
    }));
    res.status(200).json(formattedSubjects);
  } catch (err) {
    console.error("Error fetching subjects:", err);
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
});

// Get subjects by branch and semester (grouped by semester)
router.get("/branch/:branch", authenticateToken, async (req, res) => {
  try {
    const { branch } = req.params;
    const { semester } = req.query;
    
    console.log(`📚 Fetching subjects for branch: ${branch}${semester ? `, semester: ${semester}` : ''}`);
    
    // Fetch subjects from MongoDB - use case-insensitive branch matching
    const branchEscaped = branch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const filter = { branch: { $regex: new RegExp(`^${branchEscaped}$`, 'i') } };
    if (semester) {
      filter.semester = parseInt(semester);
    }
    
    // Use find without ordering to avoid index requirement
    const subjects = await Subject.find(filter, { orderBy: false });
    
    console.log(`📚 Found ${subjects.length} subjects for branch "${branch}"`);
    if (subjects.length > 0) {
      const semesters = [...new Set(subjects.map(s => s.semester))].sort();
      console.log(`📚 Semesters found: ${semesters.join(', ')}`);
      semesters.forEach(sem => {
        const count = subjects.filter(s => s.semester === sem).length;
        console.log(`   Semester ${sem}: ${count} subjects`);
      });
    }
    
    // Sort subjects in memory
    subjects.sort((a, b) => {
      if (a.semester !== b.semester) return a.semester - b.semester;
      return a.name.localeCompare(b.name);
    });
    
    // Group subjects by semester
    const groupedBySemester = {};
    subjects.forEach(subject => {
      const sem = String(subject.semester);
      if (!groupedBySemester[sem]) {
        groupedBySemester[sem] = [];
      }
      // Convert to format expected by frontend
      groupedBySemester[sem].push({
        _id: subject.id || subject._id,
        id: subject.id || subject._id,
        name: subject.name,
        code: subject.code,
        branch: subject.branch,
        semester: subject.semester,
        credits: subject.credits,
        hours: subject.hours,
        type: subject.type,
        description: subject.description || '',
        isActive: subject.isActive !== undefined ? subject.isActive : true,
        isCommon: subject.isCommon !== undefined ? subject.isCommon : false
      });
    });
    
    // Sort subjects within each semester by name
    Object.keys(groupedBySemester).forEach(sem => {
      groupedBySemester[sem].sort((a, b) => a.name.localeCompare(b.name));
    });
    
    console.log(`📚 Returning ${Object.keys(groupedBySemester).length} semesters with subjects`);
    
    if (semester) {
      // Return only the requested semester
      const semSubjects = groupedBySemester[semester] || [];
      res.status(200).json({ [semester]: semSubjects });
    } else {
      // Return all semesters
      res.status(200).json(groupedBySemester);
    }
  } catch (err) {
    console.error("❌ Error fetching subjects by branch:", err);
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
});

// Add new subject
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, code, branch, semester, credits, hours, type, description } = req.body;
    
    if (!name || !code || !branch || !semester) {
      return res.status(400).json({ error: "Name, code, branch, and semester are required" });
    }
    
    // Check if subject code already exists for this specific branch
    const existing = await Subject.find({ code, branch });
    if (existing && existing.length > 0) {
      return res.status(409).json({ error: `Subject with code ${code} already exists for branch ${branch}` });
    }

    const newSubject = await Subject.create({
      name,
      code,
      branch,
      semester: parseInt(semester),
      credits: credits || 4,
      hours: hours || 60,
      type: type || 'Theory',
      description,
      isActive: true // New subjects are active by default
    });

    try { await notificationService.notifySubjectCreated(newSubject); } catch {}
    res.status(201).json({ message: "Subject added successfully", subject: newSubject });
  } catch (err) {
    console.error("Error adding subject:", err);
    res.status(500).json({ error: "Failed to add subject" });
  }
});

// Update subject
router.put("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Remove _id from updates if present
    delete updates._id;
    const subject = await Subject.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() }
    );
    
    if (!subject) {
      return res.status(404).json({ error: "Subject not found" });
    }
    
    try { await notificationService.notifySubjectUpdated(subject); } catch {}
    res.status(200).json({ message: "Subject updated successfully", subject });
  } catch (err) {
    console.error("Error updating subject:", err);
    res.status(500).json({ error: "Failed to update subject" });
  }
});

// Delete all subjects
router.delete("/all", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const deletedCount = await Subject.deleteAll();
    
    try { 
      // Notify about bulk deletion
      await notificationService.notifySubjectDeleted('all'); 
    } catch {}
    
    res.status(200).json({ 
      message: `All subjects deleted successfully`,
      deletedCount 
    });
  } catch (err) {
    console.error("Error deleting all subjects:", err);
    res.status(500).json({ 
      error: "Failed to delete all subjects",
      details: err.message 
    });
  }
});

// Delete all subjects by branch
router.delete("/branch/:branch", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { branch } = req.params;
    const deletedCount = await Subject.deleteAllByBranch(branch);
    
    try { 
      // Notify about branch deletion
      await notificationService.notifySubjectDeleted(`branch:${branch}`); 
    } catch {}
    
    res.status(200).json({ 
      message: `All subjects for branch "${branch}" deleted successfully`,
      deletedCount 
    });
  } catch (err) {
    console.error("Error deleting subjects by branch:", err);
    res.status(500).json({ 
      error: "Failed to delete subjects by branch",
      details: err.message 
    });
  }
});

// Delete subject (must come after / route)
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const subject = await Subject.findByIdAndDelete(id);
    
    if (!subject) {
      return res.status(404).json({ error: "Subject not found" });
    }
    
    try { await notificationService.notifySubjectDeleted(id); } catch {}
    res.status(200).json({ message: "Subject deleted successfully" });
  } catch (err) {
    console.error("Error deleting subject:", err);
    res.status(500).json({ error: "Failed to delete subject" });
  }
});

// Bulk import subjects (for MSBTE K-Scheme)
router.post("/bulk-import", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { subjects } = req.body;
    
    // MongoDB is required - no Firebase check needed
    
    if (!Array.isArray(subjects)) {
      return res.status(400).json({ error: "Subjects must be an array" });
    }
    
    if (subjects.length === 0) {
      return res.status(400).json({ error: "Subjects array cannot be empty" });
    }
    
    console.log(`📥 Starting bulk import of ${subjects.length} subjects...`);
    
    const results = [];
    const errors = [];
    
    for (const subjectData of subjects) {
      try {
        const { name, code, branch, semester, credits, hours, type, description } = subjectData;
        
        // Validate required fields
        if (!name || !code || !branch || semester === undefined || semester === null) {
          errors.push({ 
            code: code || 'N/A', 
            name: name || 'N/A',
            error: "Missing required fields: name, code, branch, and semester are required" 
          });
          continue;
        }
        
        // Validate semester is a number between 1-6
        const semesterNum = parseInt(semester);
        if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 6) {
          errors.push({ 
            code, 
            name,
            error: `Invalid semester: ${semester}. Must be a number between 1 and 6` 
          });
          continue;
        }
        
        // Check if subject already exists for this specific branch (code + branch combination)
        const existingSubject = await Subject.find({ code: code.trim().toUpperCase(), branch: branch.trim() });
        if (existingSubject && existingSubject.length > 0) {
          errors.push({ 
            code, 
            name,
            error: `Subject code ${code} already exists for branch ${branch}` 
          });
          continue;
        }
        
        // Create the subject
        try {
          const normalizedCode = code.trim().toUpperCase();
          const normalizedBranch = branch.trim();
          console.log(`  Creating subject: ${normalizedCode} - ${name} (${normalizedBranch})`);
          const created = await Subject.create({
            name: name.trim(),
            code: normalizedCode,
            branch: normalizedBranch,
            semester: semesterNum,
            credits: credits ? parseInt(credits) : 4,
            hours: hours ? parseInt(hours) : 60,
            type: type || 'Theory',
            description: description ? description.trim() : ''
          });
          
          console.log(`  ✅ Created: ${created.code || created.id}`);
          results.push({
            code: created.code || created.id,
            name: created.name
          });
        } catch (createError) {
          console.error(`  ❌ Failed to create ${code}:`, createError.message);
          // Handle duplicate key error gracefully
          if (createError.code === 11000 || createError.message?.includes('already exists')) {
            errors.push({ 
              code, 
              name,
              error: createError.message || `Subject code ${code} already exists for branch ${branch}` 
            });
          } else {
            // Re-throw other errors to be caught by outer catch
            throw createError;
          }
        }
      } catch (error) {
        console.error(`Error importing subject ${subjectData.code}:`, error);
        // Only add to errors if not already added (from duplicate check above)
        const alreadyInErrors = errors.some(e => e.code === (subjectData.code || 'N/A') && e.name === (subjectData.name || 'N/A'));
        if (!alreadyInErrors) {
          errors.push({ 
            code: subjectData.code || 'N/A', 
            name: subjectData.name || 'N/A',
            error: error.message || "Failed to create subject" 
          });
        }
      }
    }
    
    console.log(`✅ Bulk import completed: ${results.length} succeeded, ${errors.length} failed`);
    
    res.status(200).json({
      message: `Imported ${results.length} subject(s) successfully${errors.length > 0 ? `. ${errors.length} subject(s) failed.` : ''}`,
      imported: results.length,
      errors: errors.length,
      errorDetails: errors,
      results: results,
      total: subjects.length
    });
  } catch (err) {
    console.error("❌ Error bulk importing subjects:", err);
    res.status(500).json({ 
      error: "Failed to import subjects: " + err.message,
      details: err.stack
    });
  }
});

// Get available branches 
router.get("/branches", authenticateToken, async (req, res) => {
  try {
    const branches = await Subject.distinct("branch");
    // Fallback to hardcoded branches if MongoDB returns empty
    if (!branches || branches.length === 0) {
      const defaultBranches = [
        'Computer Engineering',
        'Information Technology',
        'Electronics & Telecommunication',
        'Mechanical Engineering',
        'Electrical Engineering',
        'Civil Engineering',
        'Automobile Engineering',
        'Instrumentation Engineering',
        'Artificial Intelligence & Machine Learning (AIML)',
        'Mechatronics Engineering'
      ];
      console.log('Using fallback branches:', defaultBranches);
      return res.status(200).json(defaultBranches);
    }
    res.status(200).json(branches);
  } catch (err) {
    console.error("Error fetching branches:", err);
    // Return fallback branches on error
    const defaultBranches = [
      'Computer Engineering',
      'Information Technology',
      'Electronics & Telecommunication',
      'Mechanical Engineering',
      'Electrical Engineering',
      'Civil Engineering',
      'Automobile Engineering',
      'Instrumentation Engineering',
      'Artificial Intelligence & Machine Learning (AIML)',
      'Mechatronics Engineering'
    ];
    res.status(200).json(defaultBranches);
  }
});

// Get semesters for a branch
router.get("/branches/:branch/semesters", authenticateToken, async (req, res) => {
  try {
    const { branch } = req.params;
    const subjects = await Subject.find({ branch });
    const semesters = Array.from(new Set(subjects.map(s => s.semester))).sort();
    // Fallback to default semesters if MongoDB returns empty
    if (!semesters || semesters.length === 0) {
      const defaultSemesters = [1, 2, 3, 4, 5, 6];
      console.log(`Using fallback semesters for branch ${branch}:`, defaultSemesters);
      return res.status(200).json(defaultSemesters);
    }
    res.status(200).json(semesters);
  } catch (err) {
    console.error("Error fetching semesters:", err);
    // Return fallback semesters on error
    const defaultSemesters = [1, 2, 3, 4, 5, 6];
    res.status(200).json(defaultSemesters);
  }
});

// Get common subjects (isCommon = true)
router.get("/common", authenticateToken, async (req, res) => {
  try {
    const { semester } = req.query;
    
    let filter = { isCommon: true };
    if (semester) {
      filter.semester = parseInt(semester);
    }
    
    const commonSubjects = await Subject.find(filter, { orderBy: false });
    
    // Sort by semester and name
    commonSubjects.sort((a, b) => {
      if (a.semester !== b.semester) return a.semester - b.semester;
      return a.name.localeCompare(b.name);
    });
    
    // Format response with subjectId, subjectName, and subjectCode
    const formattedSubjects = commonSubjects.map(subject => ({
      subjectId: subject.id || subject._id,
      subjectName: subject.name,
      subjectCode: subject.code,
      semester: subject.semester,
      branch: subject.branch || null, // Optional for common subjects
      isCommon: true
    }));
    
    console.log(`📚 GET /api/subjects/common - Semester: ${semester || 'all'}, Found: ${formattedSubjects.length} common subjects`);
    
    res.status(200).json(formattedSubjects);
  } catch (err) {
    console.error("Error fetching common subjects:", err);
    res.status(500).json({ error: "Failed to fetch common subjects" });
  }
});

export default router;
