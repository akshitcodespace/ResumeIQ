import { useState, useMemo } from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import jsPDF from "jspdf";
import * as pdfjsLib from "pdfjs-dist";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

// Target skill tracking
const skillDatabase = [
  "C++", "Java", "Python", "JavaScript", "HTML", "CSS", "React", "React.js", "Next.js",
  "Tailwind", "Tailwind CSS", "Git", "GitHub", "VS Code", "MongoDB", "SQL", "MySQL", "Firebase",
  "Node.js", "Express", "Bootstrap", "DSA", "Data Structures", "Algorithms", "OOP", "OOPs", "Solidity"
];

const recommendedSkills = [
  "React", "JavaScript", "Git", "GitHub", "HTML", "CSS", "SQL", "MongoDB", "DSA", "Node.js"
];

const educationKeywords = ["bachelor", "bachelors", "b.e", "b.tech", "intermediate", "matriculation", "university", "college", "school", "cgpa", "education"];
const projectKeywords = ["alcohol detection", "sound magnifier", "parking assist", "resume analyzer", "portfolio", "weather app", "blockchain", "face recognition", "ngo website", "game studio"];

function App() {
  const [resume, setResume] = useState(null);
  const [score, setScore] = useState(null);
  const [skills, setSkills] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [education, setEducation] = useState([]);
  const [projects, setProjects] = useState([]);
  
  const [breakdown, setBreakdown] = useState({ skills: 0, projects: 0, education: 0, experience: 0 });
  const [jdAnalysis, setJdAnalysis] = useState({ matched: [], missing: [], percentage: null });
  const [showDetails, setShowDetails] = useState(false);

  // Theme Settings
  const [headingColor, setHeadingColor] = useState("#22d3ee"); 
  const [accentTheme, setAccentTheme] = useState("#06b6d4"); 

  const PIE_COLORS = ["#a855f7", "#3b82f6", "#eab308", "#22c55e"];

  const missingSkills = useMemo(() => {
    return recommendedSkills.filter((skill) => !skills.includes(skill));
  }, [skills]);

  const pieChartData = useMemo(() => {
    return [
      { name: "Skills", value: breakdown.skills },
      { name: "Projects", value: breakdown.projects },
      { name: "Education", value: breakdown.education },
      { name: "Experience", value: breakdown.experience }
    ];
  }, [breakdown]);

  // PDF Text Extraction Logic
  const extractTextFromPDF = async (file, currentJd = jobDescription) => {
    const reader = new FileReader();
    reader.onload = async function () {
      const typedarray = new Uint8Array(reader.result);
      const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
      
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item) => item.str).join(" ") + "\n";
      }

      setResumeText(text);
      const cleanText = text.toLowerCase();

      // Check Education Section
      const foundEducation = [];
      educationKeywords.forEach((keyword) => {
        if (cleanText.includes(keyword)) {
          const formatted = keyword.charAt(0).toUpperCase() + keyword.slice(1);
          if (!foundEducation.includes(formatted)) foundEducation.push(formatted);
        }
      });
      if (foundEducation.length === 0 && (cleanText.includes("cgpa") || cleanText.includes("session:"))) {
        foundEducation.push("Education History");
      }
      setEducation(foundEducation);

      // Check Projects Section
      const foundProjects = [];
      projectKeywords.forEach((proj) => {
        if (cleanText.includes(proj)) {
          const formattedProj = proj.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          foundProjects.push(formattedProj);
        }
      });
      setProjects(foundProjects);

      // Filter Matching Skills
      const foundSkills = skillDatabase.filter((skill) => {
        let regexString = skill === "C++" ? "c\\+\\+" : (skill.includes(".") ? skill.toLowerCase().replace(".", "\\.") : `\\b${skill.toLowerCase()}\\b`);
        return new RegExp(regexString, "i").test(cleanText);
      });

      const uniqueSkills = [...new Set(foundSkills)];
      if (uniqueSkills.includes("React.js") && !uniqueSkills.includes("React")) uniqueSkills.push("React");
      if (uniqueSkills.includes("Tailwind CSS") && !uniqueSkills.includes("Tailwind")) uniqueSkills.push("Tailwind");
      setSkills(uniqueSkills);

      // Analyze Job Description Match
      let matchedJd = [];
      let missingJd = [];
      let jdPct = null;
      
      if (currentJd.trim().length > 10) {
        const lowerJD = currentJd.toLowerCase();
        const requiredJdSkills = skillDatabase.filter((skill) => {
          let regexStr = skill === "C++" ? "c\\+\\+" : (skill.includes(".") ? skill.toLowerCase().replace(".", "\\.") : `\\b${skill.toLowerCase()}\\b`);
          return new RegExp(regexStr, "i").test(lowerJD);
        });

        if (requiredJdSkills.length > 0) {
          matchedJd = requiredJdSkills.filter(skill => uniqueSkills.includes(skill));
          missingJd = requiredJdSkills.filter(skill => !uniqueSkills.includes(skill));
          jdPct = Math.round((matchedJd.length / requiredJdSkills.length) * 100);
        } else {
          jdPct = 0;
        }
      }
      setJdAnalysis({ matched: matchedJd, missing: missingJd, percentage: jdPct });

      // Generate Optimization Suggestions
      const suggestionsList = [];
      if (uniqueSkills.length < 5) suggestionsList.push("Add more technical keywords to clear ATS filters.");
      if (foundProjects.length === 0 && !cleanText.includes("project")) suggestionsList.push("Include a dedicated projects section with tech stacks.");
      if (!cleanText.includes("intern") && !cleanText.includes("experience") && !cleanText.includes("founder")) suggestionsList.push("Add internships or freelance experience to showcase work history.");
      if (!cleanText.includes("github") && !cleanText.includes("linkedin")) suggestionsList.push("Add GitHub and LinkedIn URLs for verification.");
      if (missingJd.length > 0) suggestionsList.push(`Add missing skills required for this job: ${missingJd.slice(0, 3).join(", ")}`);
      setSuggestions(suggestionsList.length > 0 ? suggestionsList : ["Resume formatting and structure meet professional industry standards."]);

      // --- SMART JOB ROLE INFERENCE (FIXED LOGIC) ---
      let role = "Software Engineer"; 
      
      const hasFrontend = uniqueSkills.some(s => ["React", "React.js", "Next.js", "HTML", "CSS", "Tailwind", "Bootstrap", "JavaScript"].includes(s));
      const hasBackend = uniqueSkills.some(s => ["Node.js", "Express", "MongoDB", "SQL", "MySQL", "Firebase"].includes(s));
      const hasJava = uniqueSkills.some(s => ["Java"].includes(s));
      const hasPython = uniqueSkills.some(s => ["Python"].includes(s));
      const hasCppDSA = uniqueSkills.some(s => ["C++", "DSA", "Data Structures", "Algorithms"].includes(s));

      if (hasFrontend && hasBackend) {
        role = "Full Stack Engineer";
      } else if (hasFrontend) {
        role = "Frontend Developer";
      } else if (hasJava) {
        role = "Java Backend Developer";
      } else if (hasPython) {
        role = "Python Developer";
      } else if (hasCppDSA) {
        role = "Software Developer (DSA & C++)";
      } else if (uniqueSkills.length > 0) {
        role = `${uniqueSkills[0]} Developer`; 
      }
      setJobRole(role);

      // Calculate Total Score Metrics
      const skillsScore = Math.min(Math.round((uniqueSkills.length / 8) * 30), 30);
      const projectsScore = foundProjects.length > 0 ? 20 : (cleanText.includes("project") ? 10 : 0);
      const educationScore = foundEducation.length > 0 ? 20 : 0;
      const experienceScore = cleanText.includes("intern") || cleanText.includes("experience") || cleanText.includes("work") || cleanText.includes("founder") || cleanText.includes("studio") ? 30 : 0;
      
      setBreakdown({ skills: skillsScore, projects: projectsScore, education: educationScore, experience: experienceScore });
      setScore(skillsScore + projectsScore + educationScore + experienceScore);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setResume(file);
    extractTextFromPDF(file, jobDescription);
  };

  const downloadReport = () => {
    const doc = new jsPDF();
    doc.text("Resume Analysis Summary Report", 20, 20);
    doc.text(`ATS Score: ${score}%`, 20, 40);
    if (jdAnalysis.percentage !== null) doc.text(`Job Description Fit: ${jdAnalysis.percentage}%`, 20, 50);
    doc.text(`Inferred Role: ${jobRole}`, 20, 60);
    doc.text(`Skills Identified: ${skills.join(", ")}`, 20, 80);
    doc.save("resume-assessment.pdf");
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased selection:bg-zinc-800">
      
      {/* Live Style Customizer Dashboard */}
      <div className="bg-zinc-950 border-b border-zinc-800 text-xs py-2.5 px-6 flex flex-wrap gap-6 items-center justify-center font-mono">
        <span className="text-zinc-500 font-bold">🎨 SYSTEM DESIGN PANEL:</span>
        <div className="flex items-center gap-2">
          <label className="text-zinc-400">Heading Color:</label>
          <input 
            type="color" 
            value={headingColor} 
            onChange={(e) => setHeadingColor(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer bg-transparent border border-zinc-700"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-zinc-400">Accent Color:</label>
          <input 
            type="color" 
            value={accentTheme} 
            onChange={(e) => setAccentTheme(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer bg-transparent border border-zinc-700"
          />
        </div>
      </div>

      <nav className="border-b border-gray-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          {/* Header Branding */}
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: accentTheme }}>
            AI Resume Analyzer <span className="text-xs py-1 px-2 rounded bg-zinc-900 text-zinc-400 font-mono border border-zinc-800">v1.5</span>
          </h1>

          {/* Developer Identity Node */}
          <div className="text-right font-mono tracking-tight">
            <span className="text-zinc-500 text-xs block lowercase">made with ❤️ by</span>
            <span className="text-base font-extrabold transition-colors duration-150" style={{ color: accentTheme }}>
              Akshit Singh
            </span>
          </div>
        </div>
      </nav>

      <section className="flex flex-col items-center text-center px-6 py-12 max-w-7xl mx-auto">
        <h1 
          className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight block drop-shadow-md"
          style={{ color: headingColor }}
        >
          Multi-Layout Resume Parser 🚀
        </h1>
        <p className="max-w-2xl text-gray-400 text-base mb-10 leading-relaxed">
          Robust scanning logic engineered to parse structural keywords from single-column and multi-column visual layouts.
        </p>

        {/* Input Workspaces */}
        <div className="w-full max-w-5xl bg-zinc-900/40 border border-gray-800/80 backdrop-blur rounded-2xl p-6 mb-12 text-left grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-2 font-mono">Step 1: Target Job Description (Optional)</h3>
            <textarea
              className="w-full h-36 bg-black border border-gray-800 rounded-xl p-3 text-sm text-gray-300 focus:outline-none focus:border-zinc-700 resize-none font-mono"
              placeholder="Paste job description requirements here to test keyword matching..."
              value={jobDescription}
              onChange={(e) => {
                setJobDescription(e.target.value);
                if (resume) extractTextFromPDF(resume, e.target.value);
              }}
            />
          </div>
          <div className="flex flex-col justify-center items-center border-t md:border-t-0 md:border-l border-gray-800/80 pt-6 md:pt-0 md:pl-6">
            <h3 className="text-sm font-semibold text-gray-300 mb-4 text-center font-mono">Step 2: Upload Resume File</h3>
            <label 
              className="px-6 py-3.5 text-black rounded-xl text-sm font-bold hover:opacity-90 transition cursor-pointer shadow-lg block text-center w-full max-w-xs"
              style={{ backgroundColor: accentTheme }}
            >
              CHOOSE PDF DOCUMENT
              <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
            </label>
            {resume && <p className="mt-3 text-xs text-green-400 font-mono tracking-tight bg-green-950/20 border border-green-900/40 px-3 py-1 rounded-md">📁 {resume.name}</p>}
          </div>
        </div>

        {/* Evaluation Output Dashboard */}
        {resume && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl w-full text-left">
            
            {/* ATS Metric Box */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between items-center text-center min-h-[280px]">
              <h2 className="text-xs font-bold tracking-widest uppercase font-mono" style={{ color: accentTheme }}>ATS Base Score</h2>
              <div className="w-28 h-28 my-3">
                <CircularProgressbar
                  value={score || 0}
                  text={`${score}%`}
                  styles={buildStyles({
                    textColor: "#22c55e",
                    pathColor: "#22c55e",
                    trailColor: "#212124",
                  })}
                />
              </div>
              <p className="text-gray-400 text-[11px] font-mono">Overall Structural Match Rating</p>
              <button onClick={downloadReport} className="mt-3 w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-gray-200 border border-gray-700 rounded-xl text-xs font-semibold transition font-mono">
                EXPORT ASSESSMENT REPORT
              </button>
            </div>

            {/* Keyword Comparison Panel */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between min-h-[280px]">
              <div className="flex justify-between items-center w-full border-b border-zinc-800 pb-2">
                <h2 className="text-xs font-bold text-amber-400 tracking-widest uppercase font-mono">JD Comparison Matrix</h2>
                {jdAnalysis.percentage !== null && <span className="text-sm font-bold text-cyan-400 font-mono">{jdAnalysis.percentage}%</span>}
              </div>
              {jdAnalysis.percentage !== null ? (
                <div className="grid grid-cols-2 gap-3 my-2 text-xs font-mono w-full h-32 overflow-y-auto pr-1">
                  <div>
                    <span className="text-[10px] text-emerald-400 block mb-1 font-semibold">Matched Skills:</span>
                    {jdAnalysis.matched.length > 0 ? jdAnalysis.matched.map(t => <div key={t} className="text-zinc-300 text-[11px] truncate">✓ {t}</div>) : <div className="text-zinc-600 italic">None</div>}
                  </div>
                  <div>
                    <span className="text-[10px] text-red-400 block mb-1 font-semibold">Missing Skills:</span>
                    {jdAnalysis.missing.length > 0 ? jdAnalysis.missing.map(t => <div key={t} className="text-zinc-400 text-[11px] truncate">✗ {t}</div>) : <div className="text-zinc-600 italic">None</div>}
                  </div>
                </div>
              ) : (
                <p className="text-xs italic text-gray-500 text-center my-auto px-2">Provide a target job description in Step 1 to trigger relative keyword comparison analytics.</p>
              )}
              <span className="text-[10px] text-zinc-500 font-mono text-center block w-full border-t border-zinc-800 pt-2">Relative JD Fit Assessment</span>
            </div>

            {/* Weight Breakdown Visualization */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between min-h-[280px]">
              <h2 className="text-xs font-bold text-purple-400 tracking-widest uppercase font-mono text-center mb-1">Score Allocation Weights</h2>
              <div className="w-full h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={28} outerRadius={42} paddingAngle={4} dataKey="value">
                      {pieChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", fontSize: "10px", borderRadius: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-mono text-zinc-400 border-t border-zinc-800/60 pt-2">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-purple-500 rounded-full" /> Skills: {breakdown.skills}%</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-blue-500 rounded-full" /> Projects: {breakdown.projects}%</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-yellow-500 rounded-full" /> Education: {breakdown.education}%</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-green-500 rounded-full" /> Experience: {breakdown.experience}%</span>
              </div>

              {/* Toggle Scoring Logic Details */}
              <div className="mt-3 pt-2 border-t border-zinc-800/60">
                <button 
                  onClick={() => setShowDetails(!showDetails)} 
                  className="w-full py-1.5 bg-zinc-950 hover:bg-zinc-900 text-purple-400 border border-purple-950 rounded-lg text-[10px] font-bold font-mono tracking-wider transition uppercase"
                >
                  {showDetails ? "Hide Metrics ▲" : "Review Score Logic ▼"}
                </button>
                
                {showDetails && (
                  <div className="mt-2 p-2 bg-black/60 border border-zinc-800 rounded-lg text-[10px] font-mono text-zinc-400 max-h-40 overflow-y-auto space-y-2 leading-snug">
                    <p className="text-zinc-400 font-bold border-b border-zinc-900 pb-0.5 uppercase text-[9px] tracking-wider">Score Distribution Rules:</p>
                    <div>
                      <span className="text-purple-400 font-bold">● Core Skills ({breakdown.skills}/30%):</span> 
                      <span className="text-zinc-400"> Points allocated based on verified matching technical keywords indexed from the source array.</span>
                    </div>
                    <div>
                      <span className="text-blue-400 font-bold">● Project Context ({breakdown.projects}/20%):</span> 
                      <span className="text-zinc-400"> Evaluated based on the detection of benchmark portfolio project titles and keyword references.</span>
                    </div>
                    <div>
                      <span className="text-yellow-400 font-bold">● Education Validation ({breakdown.education}/20%):</span> 
                      <span className="text-zinc-400"> Confirmed via keyword structural verification tags like Degree, CGPA, or University mappings.</span>
                    </div>
                    <div>
                      <span className="text-green-400 font-bold">● Work History Footprint ({breakdown.experience}/30%):</span> 
                      <span className="text-zinc-400"> Awarded when professional pointers (Internships, Positions of Responsibility) are parsed.</span>
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-zinc-500 font-mono text-center block mt-2">Interactive Performance Breakdown</span>
            </div>

            {/* Document Profile Card */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between min-h-[200px]">
              <h2 className="text-xs font-bold text-purple-400 tracking-widest uppercase font-mono mb-2">File Meta Summary</h2>
              <div className="space-y-3 text-zinc-300 text-xs font-mono">
                <p><span className="font-semibold text-zinc-500 block text-[10px] uppercase">Document Name:</span> {resume.name}</p>
                <p><span className="font-semibold text-zinc-500 block text-[10px] uppercase">Data Payload:</span> {(resume.size / 1024).toFixed(2)} KB</p>
                <p><span className="font-semibold text-zinc-500 block text-[10px] uppercase">Mime Extension:</span> {resume.type || "application/pdf"}</p>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono text-center block border-t border-zinc-800 pt-2 mt-2">File Properties Verified</span>
            </div>

            {/* Profile Classification Mapping */}
            {jobRole && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between min-h-[200px]">
                <div>
                  <h2 className="text-xs font-bold text-indigo-400 tracking-widest uppercase font-mono mb-2">Inferred Profile Role</h2>
                  <p className="text-emerald-400 text-xl font-black tracking-tight">{jobRole}</p>
                </div>
                <p className="text-gray-400 text-xs mt-2 leading-relaxed font-sans">Role distribution profile inferred directly from the concentration of identified skills.</p>
              </div>
                )}

            {/* Parsed Keywords Tag list */}
            {skills.length > 0 && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 min-h-[200px]">
                <h2 className="text-xs font-bold text-emerald-400 tracking-widest uppercase font-mono mb-3">Detected Keywords</h2>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {skills.map((skill) => (
                    <span key={skill} className="px-2 py-0.5 bg-emerald-950/20 text-emerald-400 text-[11px] rounded border border-emerald-900/40 font-mono">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Core Targets */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 min-h-[200px]">
              <h2 className="text-xs font-bold text-red-400 tracking-widest uppercase font-mono mb-3">Recommended Skill Additions</h2>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                {missingSkills.slice(0, 8).map((skill) => (
                  <span key={skill} className="px-2 py-0.5 bg-red-950/20 text-red-400 text-[11px] rounded border border-red-900/40 font-mono">
                    ✦ {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Education Trackers */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 min-h-[200px]">
              <h2 className="text-xs font-bold text-blue-400 tracking-widest uppercase font-mono mb-2">Education Markers Checked</h2>
              {education.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {education.map((item) => (
                    <span key={item} className="px-2 py-0.5 bg-blue-950/20 text-blue-400 text-[11px] rounded border border-zinc-800 font-mono">
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-xs italic">No matching verification headers located.</p>
              )}
            </div>

            {/* Target Project Benchmarks */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 min-h-[200px]">
              <h2 className="text-xs font-bold text-orange-400 tracking-widest uppercase font-mono mb-2">Project Presets Identified</h2>
              {projects.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {projects.map((item) => (
                    <span key={item} className="px-2 py-0.5 bg-orange-950/20 text-orange-400 text-[11px] rounded border border-zinc-800 font-mono">
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-xs italic">No structural project presets identified.</p>
              )}
            </div>

            {/* Core Action Strategy Bullet points */}
            {suggestions.length > 0 && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 min-h-[200px]">
                <h2 className="text-xs font-bold text-yellow-400 tracking-widest uppercase font-mono mb-2">Optimization Strategy</h2>
                <ul className="space-y-1.5 text-xs text-gray-300 list-disc pl-4 leading-relaxed font-sans">
                  {suggestions.map((item) => <li key={item} className="marker:text-yellow-500">{item}</li>)}
                </ul>
              </div>
            )}

          </div>
        )}

        {/* Plain Text Parsed Stream Buffer Preview */}
        {resumeText && (
          <div className="mt-8 bg-zinc-950 border border-gray-800 rounded-2xl p-6 max-w-5xl w-full text-left">
            <h2 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider font-mono">Parsed Raw Text Snippet</h2>
            <p className="text-gray-500 text-xs whitespace-pre-wrap font-mono bg-black/40 p-4 rounded-xl border border-gray-900 max-h-40 overflow-y-auto leading-relaxed">
              {resumeText.substring(0, 1000)}...
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default App;