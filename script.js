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

// Function to calculate resume score based on keywords and sections
function calculateResumeScore(text) {
    const keywords = ["experience", "education", "skills", "projects", "certifications", "leadership"];
    let score = 0;

    keywords.forEach((keyword) => {
        if (text.toLowerCase().includes(keyword)) {
            score += 15;
        }
    });

    return Math.min(score, 100); 
}
