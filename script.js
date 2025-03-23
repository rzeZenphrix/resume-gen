// --- Basic Tab Switching ---
function showTab(tab) {
    document.querySelectorAll('.tab-content').forEach(div => div.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    document.getElementById(tab).classList.add('active');
    document.querySelector(`[onclick="showTab('${tab}')"]`).classList.add('active');
}

document.addEventListener('DOMContentLoaded', function () {
    // Replace with your deployed backend URL. For local testing, you might use "http://localhost:5000"
    const API_URL = "http://127.0.0.1:5000";

    // Function to simulate live typing with a blinking cursor
    async function simulateTyping(text, element) {
        return new Promise((resolve) => {
            element.innerHTML = "";
            let index = 0;
            // Create a blinking cursor element using "●"
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
                    // Convert markdown to HTML once typing is complete
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
        }, 300); // 300ms click effect duration
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

    // Restrict access to customization for free users
    if (!isPaidUser) {
        toggleSidebarBtn.style.display = "none";
    } else {
        toggleSidebarBtn.style.display = "block";
        // Insert a premium badge into the sidebar
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
            const response = await fetch(`${API_URL}/analyze-job`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ job_description: jobDescription })
            });
            const data = await response.json();
            simulateTyping(data.analysis, previewElem);
        } catch (error) {
            console.error("Error analyzing job description:", error);
            previewElem.innerText = "Error analyzing job description.";
        }
    });

    // Generate Resume
    document.getElementById("generateResume").addEventListener("click", async () => {
        if (!checkAndIncrementCounter("resume")) {
            alert("You have reached the free limit for resume generations today.");
            return;
        }
        const generateBtn = document.getElementById("generateResume");
        buttonClicked(generateBtn);
        const jobDescription = document.getElementById("jobDesc").value;
        const userDetails = document.getElementById("resumeDetails").value;
        const resumePreviewElem = document.getElementById("resumePreview");
        resumePreviewElem.innerText = "●";
        try {
            const response = await fetch(`${API_URL}/generate-resume`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    job_description: jobDescription,
                    user_details: userDetails
                })
            });
            const data = await response.json();
            simulateTyping(data.resume, resumePreviewElem);
        } catch (error) {
            console.error("Error generating resume:", error);
            resumePreviewElem.innerText = "Error generating resume.";
        }
    });

    // Generate Cover Letter
    document.getElementById("generateCoverLetter").addEventListener("click", async () => {
        if (!checkAndIncrementCounter("cover")) {
            alert("You have reached the free limit for cover letter generations today.");
            return;
        }
        const generateCoverBtn = document.getElementById("generateCoverLetter");
        buttonClicked(generateCoverBtn);
        const companyDetails = document.getElementById("companyDetails").value;
        const coverDetails = document.getElementById("coverLetterDetails").value;
        const coverPreviewElem = document.getElementById("coverPreview");
        coverPreviewElem.innerText = "●";
        try {
            const response = await fetch(`${API_URL}/generate-cover-letter`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    company_details: companyDetails,
                    user_details: coverDetails
                })
            });
            const data = await response.json();
            simulateTyping(data.cover_letter, coverPreviewElem);
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