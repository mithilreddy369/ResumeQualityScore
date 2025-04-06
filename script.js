// Event listener for file upload
document.getElementById('resumeInput').addEventListener('change', async function (event) {
    const file = event.target.files[0];

    if (file) {
        document.getElementById('fileName').textContent = `Uploaded: ${file.name}`;
        
        const text = await extractTextFromFile(file);
        if (text) {
            generateScore(text);
        } else {
            alert("Could not extract text from resume. Please upload a valid PDF or DOCX file.");
        }
    }
});

// Function to extract text from the uploaded resume
async function extractTextFromFile(file) {
    if (file.type === "application/pdf") {
        return await extractTextFromPDF(file);
    } else if (file.name.endsWith(".docx")) {
        return await extractTextFromDOCX(file);
    } else {
        return null;
    }
}

// Function to extract text from PDF using pdf.js
async function extractTextFromPDF(file) {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    
    return new Promise((resolve, reject) => {
        reader.onload = async function () {
            const pdfData = new Uint8Array(reader.result);
            const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
            let text = "";

            for (let i = 1; i <= pdf.numPages; i++) {
                let page = await pdf.getPage(i);
                let content = await page.getTextContent();
                text += content.items.map((item) => item.str).join(" ") + " ";
            }
            resolve(text);
        };
        reader.onerror = () => reject(null);
    });
}

// Function to extract text from DOCX using mammoth.js
async function extractTextFromDOCX(file) {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);

    return new Promise((resolve, reject) => {
        reader.onload = async function () {
            let result = await mammoth.extractRawText({ arrayBuffer: reader.result });
            resolve(result.value);
        };
        reader.onerror = () => reject(null);
    });
}

// Function to analyze the resume text and generate a score
function generateScore(text) {
    const scoreContainer = document.getElementById('scoreContainer');
    const scoreDisplay = document.getElementById('scoreNumber');
    const gradeText = document.getElementById('gradeText'); 

    let score = calculateResumeScore(text); 
    scoreContainer.classList.remove('hidden');

    let count = 0;
    let interval = setInterval(() => {
        if (count >= score) {
            clearInterval(interval);
        }
        scoreDisplay.textContent = count + "/100";
        count++;
    }, 20);

    if (score < 40) {
        gradeText.style.color = "red";
    } else if (score < 70) {
        gradeText.style.color = "orange";
    } else {
        gradeText.style.color = "green";
    }
}

// Very complex and rigorous resume scoring function
function calculateResumeScore(text) {
    const lowerText = text.toLowerCase();
    let score = 0;

    // 1. Section Presence & Weighting (reduced weights)
    const sections = [
        { key: "summary", weight: 5 },
        { key: "experience", weight: 10 },
        { key: "education", weight: 8 },
        { key: "skills", weight: 8 },
        { key: "projects", weight: 5 },
        { key: "certifications", weight: 3 },
        { key: "leadership", weight: 3 },
        { key: "volunteer", weight: 3 },
        { key: "achievements", weight: 3 },
        { key: "languages", weight: 3 },
    ];

    sections.forEach(section => {
        const regex = new RegExp("\\b" + section.key + "\\b", "i");
        if (regex.test(text)) {
            score += section.weight;
        }
    });

    // 2. Professional Keywords & Action Verbs (reduced bonus per occurrence)
    const keywords = [
        "proficient", "managed", "developed", "implemented", "collaborated",
        "results", "achieved", "designed", "initiated", "improved", "optimized",
        "led", "executed"
    ];
    keywords.forEach(keyword => {
        const matches = lowerText.match(new RegExp("\\b" + keyword + "\\b", "g"));
        if (matches) {
            // 1 point per occurrence, capped at 5 per keyword
            score += Math.min(matches.length, 5);

            // Additional penalty if overused: subtract 1 point for every occurrence beyond 10
            if (matches.length > 10) {
                score -= (matches.length - 10);
            }
        }
    });

    // 3. Bullet Point Analysis (reduced bonus)
    const bulletMatches = text.match(/^\s*[\u2022\-•]\s+/gm);
    if (bulletMatches) {
        // Award 1 point for each bullet point, capped at 5 points total
        score += Math.min(bulletMatches.length, 5);
    }

    // 4. Quantifiable Achievements: Look for numbers, percentages, or dollar signs
    const numberMatches = text.match(/(\d+[%$]?)/g);
    if (numberMatches) {
        // Award 1 point for each unique quantifiable achievement, capped at 5 points
        score += Math.min(new Set(numberMatches).size, 5);
    }

    // 5. Experience Duration: Look for phrases like "3 years" or "5 yrs"
    const experienceMatches = text.match(/\b\d+\+?\s*(years|yrs)\b/gi);
    if (experienceMatches) {
        // Award 3 points if any experience duration is found
        score += 3;
    }

    // 6. Readability & Sentence Structure: Analyze average sentence length
    // Split text into sentences using punctuation.
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceWordCounts = sentences.map(s => s.trim().split(/\s+/).length);
    const avgSentenceLength = sentenceWordCounts.reduce((a, b) => a + b, 0) / sentenceWordCounts.length;
    // Ideal average: 15-25 words per sentence. Reward if within range, but penalize if far off.
    if (avgSentenceLength >= 15 && avgSentenceLength <= 25) {
        score += 5; // bonus for clear and concise writing
    } else if (avgSentenceLength < 10 || avgSentenceLength > 35) {
        score -= 10; // stronger penalty for overly short or long sentences
    }

    // 7. Overall Resume Length: Penalize if too short or too verbose
    const words = text.trim().split(/\s+/);
    const wordCount = words.length;
    if (wordCount < 300) {
        // Scale down the score proportionally if under the 300-word threshold
        score = score * (wordCount / 300);
    } else if (wordCount > 1000) {
        // Penalize overly verbose resumes by subtracting a portion of the excess words
        score -= Math.floor((wordCount - 1000) / 100);
    }

    // 8. Redundancy & Filler: Check for overuse of common filler words (e.g., "responsible", "detail-oriented")
    // This is a simple approach to subtract points if a filler term appears too frequently.
    const fillerWords = ["responsible", "detail-oriented", "team player", "hardworking", "passionate"];
    fillerWords.forEach(filler => {
        const fillerMatches = lowerText.match(new RegExp("\\b" + filler + "\\b", "g"));
        if (fillerMatches && fillerMatches.length > 5) {
            // For each occurrence above 5, subtract 1 point
            score -= (fillerMatches.length - 5);
        }
    });

    // Ensure the score is capped between 0 and 100
    return Math.max(Math.min(Math.round(score), 100), 0);
}
