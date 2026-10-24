document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("fileInput");
    const analyzeButton = document.getElementById("analyzeButton");
    const dropZone = document.getElementById("dropZone");
    const dropPrompt = document.getElementById("dropPrompt");
    const fileInfo = document.getElementById("fileInfo");
    const fileName = document.getElementById("fileName");
    const fileSize = document.getElementById("fileSize");
    const clearFileBtn = document.getElementById("clearFile");

    // Results panel elements
    const resultsPanel = document.getElementById("resultsPanel");
    const codeContainer = document.getElementById("codeContainer");
    const issuesContainer = document.getElementById("issuesContainer");
    const verdictBadge = document.getElementById("verdictBadge");
    const severityBadge = document.getElementById("severityBadge");
    const issueCount = document.getElementById("issueCount");

    // Format a byte count into a human-readable string
    function formatFileSize(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GiB`;
    }

    // Update the UI to reflect the currently selected/dropped file
    function showSelectedFile(file) {
        if (!file) {
            dropPrompt.classList.remove("hidden");
            fileInfo.classList.add("hidden");
            fileName.textContent = "";
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    // Update the UI to reflect the currently selected/dropped file
    function showSelectedFile(file) {
        if (!file) {
            dropPrompt.classList.remove("hidden");
            fileInfo.classList.add("hidden");
            fileName.textContent = "";
            fileSize.textContent = "";
            return;
        }
        dropPrompt.classList.add("hidden");
        fileInfo.classList.remove("hidden");
        fileName.textContent = file.name; // .name is the base name, not the full path
        fileSize.textContent = formatFileSize(file.size);
    }

    // Store a dropped file into the hidden input so the Analyze flow works unchanged
    function setInputFile(file) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        showSelectedFile(file);
    }

    fileInput.addEventListener("change", () => {
        showSelectedFile(fileInput.files[0] || null);
    });

    clearFileBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        fileInput.value = "";
        showSelectedFile(null);
        hideResults();
    });

    // --- Drag and drop support ---
    // Prevent the browser from navigating to / opening a file dropped outside the zone
    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
        document.addEventListener(eventName, (e) => e.preventDefault());
    });

    ["dragenter", "dragover"].forEach((eventName) => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add("border-[#77de3d]", "bg-gray-800/60");
        });
    });

    ["dragleave", "dragend"].forEach((eventName) => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove("border-[#77de3d]", "bg-gray-800/60");
        });
    });

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove("border-[#77de3d]", "bg-gray-800/60");

        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            setInputFile(files[0]);
        }
    });

    analyzeButton.addEventListener("click", () => {
        if (fileInput.files.length > 0) {
            handleFileUpload({ target: fileInput });
        } else {
            alert("Please select a file to analyze.");
        }
    });

    // ---- Results rendering helpers ----

    function hideResults() {
        resultsPanel.classList.add("hidden");
        issuesContainer.replaceChildren();
        codeContainer.replaceChildren();
    }

    const severityPalette = {
        Critical: "bg-red-600 text-white",
        High: "bg-orange-500 text-gray-900",
        Medium: "bg-yellow-400 text-gray-900",
        Low: "bg-sky-500 text-gray-900",
        None: "bg-gray-600 text-white",
    };

    const verdictPalette = {
        Malicious: "bg-red-600 text-white",
        Unsafe: "bg-orange-500 text-gray-900",
        Benign: "bg-emerald-500 text-gray-900",
    };

    function setBadge(el, text, palette) {
        if (!text) {
            el.textContent = "";
            el.classList.add("hidden");
            return;
        }
        el.textContent = text;
        el.className =
            "px-2.5 py-0.5 rounded-full text-xs font-semibold " +
            (palette[text] || "bg-gray-600 text-white");
    }

    // Render the source code (left column) with line numbers and highlighted flagged lines
    function renderCode(text, issues) {
        const flagged = new Set(issues.map((i) => i.line_number));
        const lines = text.replace(/\r\n/g, "\n").split("\n");

        const frag = document.createDocumentFragment();

        lines.forEach((line, idx) => {
            const lineNo = idx + 1;
            const isFlagged = flagged.has(lineNo);

            const row = document.createElement("div");
            row.dataset.line = String(lineNo);
            row.className =
                "flex font-mono text-[13px] leading-5 " +
                (isFlagged
                    ? "bg-red-950/60 border-l-2 border-red-500"
                    : "border-l-2 border-transparent");

            const num = document.createElement("span");
            num.className =
                "select-none text-right text-gray-600 pr-3 pl-3 w-12 shrink-0 tabular-nums";
            num.textContent = String(lineNo);

            const code = document.createElement("span");
            code.className = "whitespace-pre text-gray-200 pr-4";
            // Use textContent to avoid injecting raw HTML from the file
            code.textContent = line.length ? line : " ";

            row.appendChild(num);
            row.appendChild(code);
            frag.appendChild(row);
        });

        codeContainer.replaceChildren(frag);
        // Scroll the first flagged line (if any) into view
        if (issues.length > 0) {
            scrollToLine(issues[0].line_number, "auto");
        }
    }

    // Render the security issues list (right column)
    function renderIssues(issues) {
        if (!issues || issues.length === 0) {
            const empty = document.createElement("p");
            empty.className = "text-sm text-gray-400 text-center py-8";
            empty.textContent = "No security issues found.";
            issuesContainer.replaceChildren(empty);
            return;
        }

        const frag = document.createDocumentFragment();

        issues.forEach((issue) => {
            const card = document.createElement("button");
            card.type = "button";
            card.dataset.line = String(issue.line_number);
            card.className =
                "w-full text-left rounded-lg bg-gray-900 border border-gray-800 hover:border-[#77de3d] hover:bg-gray-800/80 transition-colors px-3 py-2";

            const header = document.createElement("div");
            header.className = "flex items-center justify-between gap-2";

            const type = document.createElement("span");
            type.className = "text-sm font-semibold text-[#77de3d] break-words";
            type.textContent = issue.issue_type || "Issue";

            const lineTag = document.createElement("span");
            lineTag.className =
                "shrink-0 text-xs font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-300";
            lineTag.textContent = `L${issue.line_number}`;

            header.appendChild(type);
            header.appendChild(lineTag);

            const desc = document.createElement("p");
            desc.className = "text-xs text-gray-400 mt-1";
            desc.textContent = issue.description || "";

            card.appendChild(header);
            card.appendChild(desc);

            // Clicking an issue scrolls the code panel to that line
            card.addEventListener("click", () => scrollToLine(issue.line_number));
            // Hovering highlights the corresponding code line
            card.addEventListener("mouseenter", () => highlightLine(issue.line_number, true));
            card.addEventListener("mouseleave", () => highlightLine(issue.line_number, false));

            frag.appendChild(card);
        });

        issuesContainer.replaceChildren(frag);
    }

    function scrollToLine(lineNo, behavior = "smooth") {
        const row = codeContainer.querySelector(`[data-line="${lineNo}"]`);
        if (row) {
            row.scrollIntoView({ behavior, block: "center" });
        }
    }

    function highlightLine(lineNo, on) {
        const row = codeContainer.querySelector(`[data-line="${lineNo}"]`);
        if (!row) return;
        row.classList.toggle("ring-2", on);
        row.classList.toggle("ring-[#77de3d]", on);
        row.classList.toggle("ring-inset", on);
    }

    function renderResults(text, data) {
        const issues = Array.isArray(data.security_issues)
            ? data.security_issues.filter((i) => Number.isInteger(i.line_number))
            : [];

        resultsPanel.classList.remove("hidden");

        setBadge(verdictBadge, data.verdict, verdictPalette);
        setBadge(severityBadge, `Severity: ${data.severity}`, severityPalette);

        issueCount.textContent =
            issues.length === 1 ? "1 issue" : `${issues.length} issues`;

        renderCode(text, issues);
        renderIssues(issues);

        resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Read the file locally so we can display its source in the left panel
        const reader = new FileReader();
        reader.onload = () => {
            const text = String(reader.result || "");
            uploadForAnalysis(file, text);
        };
        reader.onerror = () => {
            console.error("Failed to read file locally.");
            alert("Failed to read the selected file.");
        };
        reader.readAsText(file);
    }

    function uploadForAnalysis(file, text) {
        const formData = new FormData();
        formData.append("file", file);

        // Show the code panel immediately while analysis is running
        resultsPanel.classList.remove("hidden");
        setBadge(verdictBadge, null);
        setBadge(severityBadge, null);
        issueCount.textContent = "Analyzing…";
        renderCode(text, []);
        const loading = document.createElement("p");
        loading.className = "text-sm text-gray-400 text-center py-8";
        loading.textContent = "Analyzing…";
        issuesContainer.replaceChildren(loading);

        fetch(`/analyze`, {
            method: "POST",
            body: formData,
        })
            .then(async (response) => {
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(data.error || `Request failed (${response.status})`);
                }
                return data;
            })
            .then((data) => {
                renderResults(text, data);
            })
            .catch((error) => {
                console.error("Error:", error);
                const err = document.createElement("p");
                err.className = "text-sm text-red-400 text-center py-8";
                err.textContent = error.message || "Analysis failed.";
                issuesContainer.replaceChildren(err);
                issueCount.textContent = "Error";
            });
    }
});
