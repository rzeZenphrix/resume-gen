// Use a build tool (like webpack, Vite, etc.) to inject environment variables
// For example, with webpack DefinePlugin, you could set process.env.GEMINI_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "YOUR_API_KEY_HERE"; 
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_URL = `https://generativeai.googleapis.com/v1beta2/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// --- Basic Tab Switching ---
function showTab(tab) {
    document.querySelectorAll('.tab-content').forEach(div => div.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    document.getElementById(tab).classList.add('active');
    document.querySelector(`[onclick="showTab('${tab}')"]`).classList.add('active');
}

document.addEventListener('DOMContentLoaded', function () {
    // Replace with your deployed backend URL for free generation limits if needed; for now, we use the Gemini API directly.
    // Functions to call Gemini API directly from the frontend:

    async function callGeminiApi(prompt) {
        try {
            const response = await fetch(GEMINI_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ prompt: prompt })
            });
            const data = await response.json();
            if (data && data.candidates && data.candidates.length > 0) {
                return data.candidates[0].text || "No response generated.";
            }
            return "No response generated.";
        } catch (error) {
            console.error("Error calling Gemini API:", error);
            return "Error calling Gemini API.";
        }
    }

    // Function to simulate live typing with a blinking cursor
    async function simulateTyping(text, element) {
        return new Promise((resolve) => {
            element.innerHTML = "";
            let index = 0;
            const cursor = document.createElement("span");
            cursor.classList.add("cursor");
            cursor.textContent = "●";
            element.appendChild(cursor);
            
            const interval = setInterval(() => {
                if (index < text.length) {
                    element.innerText = text.substring(0, index);
                    element.appendChild(cursor);
                    index++;
                } else {
                    clearInterval(interval);
                    // Convert markdown to HTML so formatting renders properly
                    element.innerHTML = marked.parse(text);
                    resolve();
                }
            }, 1); // Adjust typing speed (ms per character)
        });
    }    

    // Function for button click animation effect
    function buttonClicked(btn) {
        btn.classList.add("clicked");
        setTimeout(() => {
            btn.classList.remove("clicked");
        }, 300);
    }

    // Daily Free Generation Limit Functions
    function getToday() {
        return new Date().toISOString().split("T")[0];
    }
    function checkAndIncrementCounter(type) {
        const key = `freeGen_${type}`;
        let data = JSON.parse(localStorage.getItem(key)) || { date: getToday(), count: 0 };
        if (data.date !== getToday()) {
            data = { date: getToday(), count: 0 };
        }
        if (data.count >= 10) {
            return false;
        }
        data.count++;
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    }

    // --- Auto-Expand Textareas ---
    document.querySelectorAll('textarea').forEach(textarea => {
        textarea.style.overflow = 'hidden';
        textarea.style.resize = 'none';

        const autoExpand = (field) => {
            field.style.height = 'inherit';
            const computed = window.getComputedStyle(field);
            const height = parseInt(computed.getPropertyValue('border-top-width'), 10)
                + parseInt(computed.getPropertyValue('padding-top'), 10)
                + field.scrollHeight
                + parseInt(computed.getPropertyValue('padding-bottom'), 10)
                + parseInt(computed.getPropertyValue('border-bottom-width'), 10);
            field.style.height = height + 'px';
        };

        textarea.addEventListener('input', function () {
            autoExpand(textarea);
        });
        autoExpand(textarea);
    });

    // --- Initialize Drag-and-Drop for Resume Sections ---
    const resumeSections = document.getElementById("resumeSections");
    if (resumeSections) {
        new Sortable(resumeSections, {
            animation: 150,
            ghostClass: "dragging",
            onEnd: function (evt) {
                console.log("Moved:", evt.item.id, "to index", evt.newIndex);
            }
        });
    }

    // --- Sidebar Toggle and Premium Restriction ---
    const sidebar = document.getElementById("sidebar");
    const toggleSidebarBtn = document.getElementById("toggleSidebar");
    const closeSidebarBtn = document.getElementById("closeSidebar");
    
    // Simulate a paid user flag (set to "true" for paid users)
    const isPaidUser = localStorage.getItem("isPaidUser") === "true";

    if (!isPaidUser) {
        toggleSidebarBtn.style.display = "none";
    } else {
        toggleSidebarBtn.style.display = "block";
        const badge = document.createElement("div");
        badge.textContent = "Premium";
        badge.style.background = "#ffd700";
        badge.style.color = "#000";
        badge.style.padding = "4px 8px";
        badge.style.borderRadius = "4px";
        badge.style.fontSize = "12px";
        badge.style.display = "inline-block";
        badge.style.marginBottom = "10px";
        document.getElementById("sidebar").insertAdjacentElement("afterbegin", badge);
    }

    toggleSidebarBtn.addEventListener("click", function () {
        if (!isPaidUser) {
            alert("Customization is a premium feature. Please upgrade to access this feature.");
            return;
        }
        if (!sidebar.classList.contains("open")) {
            sidebar.classList.add("open", "opening");
            toggleSidebarBtn.style.display = "none";
            setTimeout(() => {
                sidebar.classList.remove("opening");
            }, 400);
        }
    });

    closeSidebarBtn.addEventListener("click", function () {
        sidebar.classList.remove("open");
        setTimeout(() => {
            toggleSidebarBtn.style.display = "block";
        }, 400);
    });

    // --- API Calls ---
    // Analyze Job Description
    document.getElementById("analyzeJob").addEventListener("click", async () => {
        const analyzeBtn = document.getElementById("analyzeJob");
        buttonClicked(analyzeBtn);
        const jobDescription = document.getElementById("jobDesc").value;
        const previewElem = document.getElementById("jobAnalysisPreview");
        previewElem.innerText = "●";
        try {
            const prompt = "Summarize the following job description in 3 concise bullet points covering the key skills, responsibilities, and requirements.\n\nJob Description:\n" + jobDescription;
            const analysis = await callGeminiApi(prompt);
            simulateTyping(analysis, previewElem);
        } catch (error) {
            console.error("Error analyzing job description:", error);
            previewElem.innerText = "Error analyzing job description.";
        }
    });

    // Generate Resume
    document.getElementById("generateResume").addEventListener("click", async () => {
        if (!checkAndIncrementCounter("resume")) {
            alert("You have reached the free limit for resume generations today. Please upgrade for unlimited access.");
            return;
        }
        const generateBtn = document.getElementById("generateResume");
        buttonClicked(generateBtn);
        const jobDescription = document.getElementById("jobDesc").value;
        const userDetails = document.getElementById("resumeDetails").value;
        const resumePreviewElem = document.getElementById("resumePreview");
        resumePreviewElem.innerText = "●";
        try {
            const prompt = "Generate a professional resume for the following job description and candidate details in first person. " +
                "Job Description:\n" + jobDescription + "\n\nCandidate Details:\n" + userDetails +
                "\n\nIf there is no job description and candidate details tell the user their details are needed. " +
                "Format the resume in clearly separated sections labeled as follows:\n" +
                "Personal Information\nSummary\nSkills\nExperience\nProjects\nEducation\n\n" +
                "Ensure that each section is comprehensive so that minimal editing is needed. " +
                "Do not output any extra commentary; output only the resume text in markdown format. " +
                "Use 'I' statements throughout.\n\nResume:";
            const resumeText = await callGeminiApi(prompt);
            simulateTyping(resumeText, resumePreviewElem);
        } catch (error) {
            console.error("Error generating resume:", error);
            resumePreviewElem.innerText = "Error generating resume.";
        }
    });

    // Generate Cover Letter
    document.getElementById("generateCoverLetter").addEventListener("click", async () => {
        if (!checkAndIncrementCounter("cover")) {
            alert("You have reached the free limit for cover letter generations today. Please upgrade for unlimited access.");
            return;
        }
        const generateCoverBtn = document.getElementById("generateCoverLetter");
        buttonClicked(generateCoverBtn);
        const companyDetails = document.getElementById("companyDetails").value;
        const coverDetails = document.getElementById("coverLetterDetails").value;
        const coverPreviewElem = document.getElementById("coverPreview");
        coverPreviewElem.innerText = "●";
        try {
            const prompt = "Write a tailored cover letter in first person for the candidate using the details provided. " +
                "Ensure the cover letter is professional and personal, using 'I' statements. \n\nCompany Details:\n" +
                companyDetails + "\n\nCandidate Details:\n" + coverDetails +
                "\n\nDo not output any extra commentary; output only the cover letter text in markdown format. " +
                "Use 'I' statements throughout.\n\nCover Letter:";
            const coverLetterText = await callGeminiApi(prompt);
            simulateTyping(coverLetterText, coverPreviewElem);
        } catch (error) {
            console.error("Error generating cover letter:", error);
            coverPreviewElem.innerText = "Error generating cover letter.";
        }
    });

    // --- Copy Functions ---
    function copyResume() {
        let resumeText = document.getElementById("resumePreview").innerText;
        navigator.clipboard.writeText(resumeText).then(() => {
            alert("Resume copied to clipboard!");
        }).catch(err => {
            console.error("Failed to copy: ", err);
        });
    }

    function copyCover() {
        let coverText = document.getElementById("coverPreview").innerText;
        navigator.clipboard.writeText(coverText).then(() => {
            alert("Cover Letter copied to clipboard!");
        }).catch(err => {
            console.error("Failed to copy: ", err);
        });
    }

    // Keyboard Shortcuts for Copy
    document.addEventListener("keydown", function(event) {
        if (event.ctrlKey && event.shiftKey && event.key === "C") {
            copyResume();
        }
        if (event.ctrlKey && event.shiftKey && event.key === "X") {
            copyCover();
        }
    });
});