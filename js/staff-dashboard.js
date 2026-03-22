// Staff Dashboard JavaScript - Additional functionality
window.lookupStudent = lookupStudent;

function toggleQuestionType(select) {
    const item = select.closest('.question-item');
    const type = select.value;

    // Hide all
    item.querySelector('.mcq-options').style.display = 'none';
    const codingOpts = item.querySelector('.coding-options');
    if (codingOpts) codingOpts.style.display = 'none';

    // Show selected
    if (type === 'mcq') {
        item.querySelector('.mcq-options').style.display = 'block';
    } else if (type === 'coding') {
        if (codingOpts) codingOpts.style.display = 'block';
    }
}
window.toggleQuestionType = toggleQuestionType;

function updateQuestionNumbers() {
    document.querySelectorAll('.question-item').forEach((item, index) => {
        const count = index + 1;
        item.dataset.question = count;
        const numberSpan = item.querySelector('.question-number');
        if (numberSpan) numberSpan.textContent = `Question ${count}`;
    });
}

function updateQuestionNav() {
    const navGrid = document.getElementById('questionNavGrid');
    if (!navGrid) return;

    const questions = document.querySelectorAll('.question-item');
    navGrid.innerHTML = Array.from(questions).map((q, i) => `
        <button type="button" class="nav-btn ${i === 0 ? 'active' : ''}" 
                onclick="document.getElementById('question-${i + 1}').scrollIntoView({behavior: 'smooth', block: 'center'})">
            ${i + 1}
        </button>
    `).join('');
}
window.updateQuestionNav = updateQuestionNav;
window.updateQuestionNumbers = updateQuestionNumbers;

document.addEventListener('DOMContentLoaded', () => {
    initCreateTestForm();
    initAddQuestion();
    initTestsTable();
    initStudentsManagement();
    initStudentLookup();
    initAiGenerator();
    generateTargetBatches();
    initStaffRealtimeUpdates(); // Start listening for participation updates
});

/**
 * Real-time synchronization for staff dashboard.
 * Listens for student participation events and refreshes the current view if relevant.
 */
function initStaffRealtimeUpdates() {
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    if (user.type !== 'staff') return;

    console.log("[Staff Realtime] Subscribing to participation updates...");

    const apiBase = window.DB?.API_URL || "/api";
    // Reuse the same SSE endpoint
    const eventSource = new EventSource(`${apiBase}/realtime/updates`);

    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log("[Staff Realtime] Received event:", data);

            // Handle participation updates (when a student starts or submits a test)
            if (data.type === 'participation_update') {
               const activeTestId = window.currentSTMAITestId;
               
               // Always refresh the main list if we are in it
               if (document.getElementById('testsTableBody')) {
                   loadTests();
               }

               // If the staff is currently looking at THIS specific test in the analytics view
               if (activeTestId && String(activeTestId) === String(data.testId)) {
                   console.log("[Staff Realtime] Student activity detected for active test. Refreshing...");
                   
                   // Reload the participation list
                   if (typeof loadSTMAIParticipation === 'function') {
                       loadSTMAIParticipation(data.testId);
                   }

                   // Show a helpful notification for the staff
                   if (typeof showNotification === 'function') {
                       const actionText = data.action === 'started' ? 'started' : 'submitted';
                       const statusMsg = data.action === 'submitted' ? `with score ${data.score}%` : '';
                       showNotification(`Student ${data.studentUsername} just ${actionText} the test ${statusMsg}.`, 'info');
                   }
               }
            }
            
            // Handle new test publications (if staff wants to see their own new tests or others')
            if (data.type === 'test_published') {
                if (typeof loadTests === 'function') {
                    loadTests();
                }
            }
        } catch (err) {
            console.error("[Staff Realtime] Error processing event:", err);
        }
    };

    eventSource.onerror = (err) => {
        console.warn("[Staff Realtime] SSE connection lost. Reconnecting...");
    };
}

function generateTargetBatches() {
    const grid = document.getElementById('targetBatchesGrid');
    if (!grid) return;

    const currentYear = new Date().getFullYear() - 1;
    const batches = [];
    for (let i = 0; i < 10; i++) { // More batches to show scroll
        const startYear = currentYear + i;
        const endYear = startYear + 3;
        const label = `${startYear}-${endYear}`;
        batches.push({ label: label, value: label });
    }

    grid.innerHTML = batches.map(b => `
        <label class="option-item"><input type="checkbox" value="${b.value}"><span class="option-text">${b.label}</span></label>
    `).join('');
}



// Create Test Form with Confirmation Workflow
function initCreateTestForm() {
    const form = document.getElementById('createTestForm');
    if (!form) {
        console.warn('[CreateTest] Form #createTestForm not found in DOM');
        return;
    }
    console.log('[CreateTest] Form initialized successfully');

    let pendingTest = null;

    // Remove browser-native 'required' validation from ALL form elements
    // so that our custom JS validation handles everything with clear error messages
    form.setAttribute('novalidate', 'true');
    let selectedRegNumbers = [];

    // ========== NEW TARGETING DROPDOWN SYSTEM ==========
    function initTargetingDropdowns() {
        console.log('[Targeting] Initializing dropdowns...');
        const dropdowns = document.querySelectorAll('.custom-multi-select');

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.custom-multi-select')) {
                dropdowns.forEach(d => d.classList.remove('open'));
            }
        });

        dropdowns.forEach(dropdown => {
            const trigger = dropdown.querySelector('.select-trigger');
            const searchInput = dropdown.querySelector('.dropdown-search');
            const selectAllBtn = dropdown.querySelector('.select-all-btn');
            const optionsList = dropdown.querySelector('.options-list');
            const type = dropdown.dataset.type;

            // Toggle Dropdown
            trigger.addEventListener('click', () => {
                const isOpen = dropdown.classList.contains('open');
                dropdowns.forEach(d => d.classList.remove('open'));
                if (!isOpen) {
                    dropdown.classList.add('open');
                    if (searchInput) searchInput.focus();
                }
            });

            // Search Filter
            if (searchInput) {
                const clearBtn = dropdown.querySelector('.search-clear-btn');
                searchInput.addEventListener('input', (e) => {
                    const term = e.target.value.toLowerCase();
                    if (clearBtn) clearBtn.classList.toggle('visible', term.length > 0);
                    const options = optionsList.querySelectorAll('.option-item');
                    options.forEach(opt => {
                        const text = opt.textContent.toLowerCase();
                        opt.style.display = text.includes(term) ? 'flex' : 'none';
                    });
                });

                if (clearBtn) {
                    clearBtn.addEventListener('click', () => {
                        searchInput.value = '';
                        clearBtn.classList.remove('visible');
                        searchInput.dispatchEvent(new Event('input'));
                        searchInput.focus();
                    });
                }
            }

            // Select All
            if (selectAllBtn) {
                selectAllBtn.addEventListener('click', () => {
                    const checkboxes = optionsList.querySelectorAll('input[type="checkbox"]');
                    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
                    checkboxes.forEach(cb => {
                        if (cb.closest('.option-item').style.display !== 'none') {
                            cb.checked = !allChecked;
                        }
                    });
                    updateDropdownTrigger(dropdown);
                });
            }

            // Update UI on checkbox change
            optionsList.addEventListener('change', () => {
                updateDropdownTrigger(dropdown);
            });
        });

        // Specific Register Numbers UI
        const regInput = document.getElementById('targetRegInput');
        const addRegBtn = document.getElementById('addTargetRegBtn');
        const regList = document.getElementById('targetRegList');
        const regCount = document.getElementById('targetRegCount');

        function updateRegTags() {
            if (!regList) return;
            regList.innerHTML = '';
            selectedRegNumbers.forEach(reg => {
                const tag = document.createElement('div');
                tag.className = 'reg-tag';
                tag.innerHTML = `
                    ${reg}
                    <span class="remove-tag" data-reg="${reg}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </span>
                `;
                regList.appendChild(tag);
            });
            if (regCount) regCount.textContent = `(${selectedRegNumbers.length})`;
        }

        if (addRegBtn && regInput) {
            addRegBtn.addEventListener('click', () => {
                const val = regInput.value.trim().toUpperCase();
                if (val && !selectedRegNumbers.includes(val)) {
                    selectedRegNumbers.push(val);
                    regInput.value = '';
                    updateRegTags();
                }
            });
            regInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addRegBtn.click();
                }
            });
        }

        if (regList) {
            regList.addEventListener('click', (e) => {
                const removeBtn = e.target.closest('.remove-tag');
                if (removeBtn) {
                    const reg = removeBtn.dataset.reg;
                    selectedRegNumbers = selectedRegNumbers.filter(r => r !== reg);
                    updateRegTags();
                }
            });
        }
    }

    function updateDropdownTrigger(dropdown) {
        const checkboxes = dropdown.querySelectorAll('.options-list input[type="checkbox"]:checked');
        const triggerText = dropdown.querySelector('.trigger-text');
        const badge = dropdown.querySelector('.trigger-badge');
        const defaultText = dropdown.id === 'deptMultiSelect' ? 'Select Departments' :
            dropdown.id === 'yearMultiSelect' ? 'Select Years' :
                dropdown.id === 'batchMultiSelect' ? 'Select Batches' :
                    dropdown.id === 'sectionMultiSelect' ? 'Select Sections' : 'Select Classes';

        if (checkboxes.length === 0) {
            triggerText.textContent = defaultText;
            badge.style.display = 'none';
        } else if (checkboxes.length === 1) {
            triggerText.textContent = checkboxes[0].closest('.option-item').querySelector('.option-text').textContent;
            badge.style.display = 'none';
        } else {
            triggerText.textContent = `${checkboxes.length} Selected`;
            badge.style.display = 'inline-block';
            badge.textContent = checkboxes.length;
        }
    }

    initTargetingDropdowns();

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('[CreateTest] Submit event fired');

        try {
            const testName = (document.getElementById('testName')?.value || '').trim();
            const company = (document.getElementById('testCompany')?.value || '').trim();
            const date = (document.getElementById('testDate')?.value || '').trim();
            const duration = (document.getElementById('testDuration')?.value || '').trim();
            const difficulty = (document.getElementById('testDifficulty')?.value || '').trim();
            const passingPercentage = (document.getElementById('testPassPercentage')?.value || '').trim();
            const description = (document.getElementById('testDescription')?.value || '').trim();
            const syllabusFile = document.getElementById('testSyllabus')?.files[0];

            // Basic field validation
            if (!testName) { showNotification('Validation Error', 'Please enter a Test Name.', 'error'); return; }
            if (!company) { showNotification('Validation Error', 'Please enter a Company name.', 'error'); return; }
            if (!date) { showNotification('Validation Error', 'Please select a Schedule Date.', 'error'); return; }
            if (!duration) { showNotification('Validation Error', 'Please enter a Duration.', 'error'); return; }
            if (!difficulty) { showNotification('Validation Error', 'Please select a Difficulty Level.', 'error'); return; }
            if (!passingPercentage) { showNotification('Validation Error', 'Please enter a Pass Percentage.', 'error'); return; }

            const targetDepartments = Array.from(document.querySelectorAll('#deptMultiSelect input:checked')).map(cb => cb.value);
            const targetYears = Array.from(document.querySelectorAll('#yearMultiSelect input:checked')).map(cb => cb.value);
            const targetBatches = Array.from(document.querySelectorAll('#batchMultiSelect input:checked')).map(cb => cb.value);
            const targetSections = Array.from(document.querySelectorAll('#sectionMultiSelect input:checked')).map(cb => cb.value);
            const targetClasses = Array.from(document.querySelectorAll('#classMultiSelect input:checked')).map(cb => cb.value);
            const targetRegisterNumbers = [...selectedRegNumbers];

            console.log('[CreateTest] Audience:', { targetDepartments, targetYears, targetBatches, targetSections, targetClasses, targetRegisterNumbers });

            // Collect questions
            const questions = [];
            const questionItems = document.querySelectorAll('.question-item');
            console.log('[CreateTest] Found', questionItems.length, 'question items');

            questionItems.forEach((item, idx) => {
                const typeSelect = item.querySelector('.type-selector');
                const type = typeSelect?.value || 'mcq';

                // Get question text from the textarea specifically
                const questionTextarea = item.querySelector('.question-body textarea.form-input');
                const questionText = (questionTextarea?.value || '').trim();

                const questionObj = {
                    type: type,
                    question: questionText
                };

                if (type === 'mcq') {
                    const options = [];
                    item.querySelectorAll('.mcq-options .options-grid input').forEach(opt => options.push(opt.value.trim()));
                    const answerSelect = item.querySelector('.mcq-answer');
                    questionObj.options = options;
                    questionObj.answer = answerSelect?.value || 'A';
                } else if (type === 'coding') {
                    const outputArea = item.querySelector('.expected-output');
                    const selectedLangRadio = item.querySelector('.languages-checkbox-group input[type="radio"]:checked');
                    const languages = selectedLangRadio ? [selectedLangRadio.value] : ['c'];
                    questionObj.expectedOutput = (outputArea?.value || '').trim();
                    questionObj.allowed_languages = languages;
                }

                questions.push(questionObj);
            });

            if (questions.length === 0) {
                showNotification('Validation Error', 'Please add at least one question.', 'error');
                return;
            }

            // Validate questions
            let isValid = true;
            for (let idx = 0; idx < questions.length; idx++) {
                const q = questions[idx];
                if (!q.question) {
                    showNotification('Validation Error', `Question ${idx + 1} is missing text.`, 'error');
                    isValid = false;
                    break;
                }

                if (q.type === 'mcq') {
                    // Check that at least 2 options are filled
                    const filledOptions = (q.options || []).filter(opt => opt.trim() !== '');
                    if (filledOptions.length < 2) {
                        showNotification('Validation Error', `Question ${idx + 1}: Please fill at least 2 MCQ options.`, 'error');
                        isValid = false;
                        break;
                    }
                    // Fill empty options with placeholder text so they stay consistent
                    q.options = q.options.map((opt, i) => opt.trim() || `Option ${String.fromCharCode(65 + i)}`);
                } else if (q.type === 'coding') {
                    if (!q.expectedOutput) {
                        showNotification('Validation Error', `Question ${idx + 1} (Coding) is missing expected output.`, 'error');
                        isValid = false;
                        break;
                    }
                    if (!q.allowed_languages || q.allowed_languages.length === 0) {
                        showNotification('Validation Error', `Question ${idx + 1} (Coding): Please select at least one allowed language.`, 'error');
                        isValid = false;
                        break;
                    }
                }
            }

            if (!isValid) return;

            console.log('[CreateTest] Validation passed, questions:', questions.length);

            // Get current staff user
            const userData = sessionStorage.getItem('user') || localStorage.getItem('user');
            const user = JSON.parse(userData || '{}');

            // Create test object — if no audience selected, backend assigns to ALL students
            pendingTest = {
                name: testName,
                company: company,
                date: date,
                duration: parseInt(duration),
                difficulty: difficulty,
                passingPercentage: parseInt(passingPercentage),
                description: description,
                questions: questions,
                status: 'published',
                createdBy: user.username || 'staff',
                targetAudience: {
                    departments: targetDepartments,
                    years: targetYears,
                    batches: targetBatches,
                    sections: targetSections,
                    classes: targetClasses,
                    registerNumbers: targetRegisterNumbers
                }
            };

            console.log('[CreateTest] Pending test ready:', pendingTest.name);

            // Handle Syllabus Upload if selected
            if (syllabusFile) {
                const formData = new FormData();
                formData.append('syllabus', syllabusFile);

                showNotification('Upload', 'Uploading supporting material...', 'info');

                fetch('/api/staff/upload-syllabus', {
                    method: 'POST',
                    body: formData
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data.fileUrl) {
                            pendingTest.syllabusUrl = data.fileUrl;
                            showTestConfirmation(pendingTest);
                        }
                    })
                    .catch(err => {
                        console.error('Syllabus upload failed:', err);
                        showNotification('Upload Error', 'Failed to upload syllabus. You can try again or publish without it.', 'error');
                    });
            } else {
                // Show full-page publish review
                showTestConfirmation(pendingTest);
            }

        } catch (err) {
            console.error('[CreateTest] Error during form submission:', err);
            showNotification('Error', 'An unexpected error occurred: ' + err.message, 'error');
        }
    });

    // Handle final confirmation (delegated)
    document.addEventListener('click', async (e) => {
        const confirmBtn = e.target.closest('#confirmPublishBtn');
        if (!confirmBtn || !pendingTest) return;

        console.log('[CreateTest] Confirm & Publish clicked');

        try {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<span class="spinner-sm"></span> Publishing...';

            const res = await window.DB.createTest(pendingTest);
            console.log('[CreateTest] API response:', res);

            if (res.error) {
                showNotification('Assignment Error', res.error, 'error');
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = 'Confirm & Publish';
                return;
            }

            const assignedCount = res.assignedCount || 0;
            showNotification('Test Published Successfully', `Test published successfully! The test is now live.`, 'success');

            // Show Demo Workflow Modal
            showPublishSuccess(pendingTest.name, assignedCount);

            form.reset();

            // Reset all audience checkboxes
            document.querySelectorAll('.targeting-dropdown-bar input[type="checkbox"]').forEach(cb => cb.checked = false);
            document.querySelectorAll('.custom-multi-select').forEach(d => {
                const triggerText = d.querySelector('.trigger-text');
                const badge = d.querySelector('.trigger-badge');
                if (triggerText) {
                    const defaultText = d.id === 'deptMultiSelect' ? 'Select Departments' :
                        d.id === 'yearMultiSelect' ? 'Select Years' :
                            d.id === 'batchMultiSelect' ? 'Select Batches' :
                                d.id === 'sectionMultiSelect' ? 'Select Sections' : 'Select Classes';
                    triggerText.textContent = defaultText;
                }
                if (badge) badge.style.display = 'none';
            });
            // Removed sidebar navigator reset
            selectedRegNumbers = [];
            // Update the reg tags UI - using the function defined in initTargetingDropdowns scope isn't possible directly if it's not global, but I can re-implement the clear.
            const targetRegList = document.getElementById('targetRegList');
            const targetRegCount = document.getElementById('targetRegCount');
            if (targetRegList) targetRegList.innerHTML = '';
            if (targetRegCount) targetRegCount.textContent = '(0)';

            // Reset questions container to single clean question
            const qContainer = document.getElementById('questionsContainer');
            if (qContainer) {
                qContainer.innerHTML = `
                    <div class="question-item bounce-in" data-question="1">
                      <div class="question-header">
                        <span class="question-number">Question 1</span>
                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                          <select class="form-input type-selector" onchange="toggleQuestionType(this)">
                            <option value="mcq">MCQ Mode</option>
                            <option value="coding">Coding Mode</option>
                          </select>
                          <button type="button" class="remove-question-btn" title="Remove Question">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                          </button>
                        </div>
                      </div>
                      <div class="question-body">
                        <div class="form-group">
                          <label class="form-label">Question Text *</label>
                          <textarea class="form-input" rows="2" placeholder="Enter your question or problem statement..."></textarea>
                        </div>

                        <!-- MCQ Options -->
                        <div class="mcq-options">
                          <div class="options-grid">
                            <div class="option-group"><input type="text" class="form-input" placeholder="Option A"></div>
                            <div class="option-group"><input type="text" class="form-input" placeholder="Option B"></div>
                            <div class="option-group"><input type="text" class="form-input" placeholder="Option C"></div>
                            <div class="option-group"><input type="text" class="form-input" placeholder="Option D"></div>
                          </div>
                          <div class="form-group">
                            <label class="form-label">Correct Option</label>
                            <select class="form-input mcq-answer">
                              <option value="A">Option A</option>
                              <option value="B">Option B</option>
                              <option value="C">Option C</option>
                              <option value="D">Option D</option>
                            </select>
                          </div>
                        </div>

                        <!-- Coding Options -->
                        <div class="coding-options" style="display: none;">
                          <div class="form-group">
                            <label class="form-label">Programming Language *</label>
                            <div class="languages-checkbox-group" style="display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 0.5rem;">
                              <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--gray-300); cursor: pointer;">
                                <input type="radio" name="allowed_language_1" value="c" checked> C
                              </label>
                              <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--gray-300); cursor: pointer;">
                                <input type="radio" name="allowed_language_1" value="cpp"> C++
                              </label>
                              <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--gray-300); cursor: pointer;">
                                <input type="radio" name="allowed_language_1" value="python"> Python
                              </label>
                              <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--gray-300); cursor: pointer;">
                                <input type="radio" name="allowed_language_1" value="java"> Java
                              </label>
                              <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--gray-300); cursor: pointer;">
                                <input type="radio" name="allowed_language_1" value="javascript"> JavaScript
                              </label>
                            </div>
                          </div>
                          <div class="form-group">
                            <label class="form-label">Expected Output (Reference) *</label>
                            <textarea class="form-input expected-output" rows="3" placeholder="Enter output reference..."></textarea>
                          </div>
                        </div>
                      </div>
                    </div>
`;
            }

            // Navigate to Manage Tests section
            const manageLink = document.querySelector('[data-section="manage-tests"]');
            if (manageLink) manageLink.click();
            loadTests();

            pendingTest = null;
        } catch (err) {
            console.error('[CreateTest] Publish error:', err);
            showNotification('Error', 'Failed to publish test: ' + err.message, 'error');
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 18px; height: 18px; margin-right: 8px;">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Confirm & Publish`;
        }
    });

    // Back to editing handler
    document.addEventListener('click', (e) => {
        if (e.target.closest('#publishBackBtn')) {
            navigateBackToCreate();
        }
    });

    // Cleanup Success Modal and return to Manage Tests
    document.addEventListener('click', (e) => {
        if (e.target.matches('#closePublishDemoBtn')) {
            document.getElementById('publishDemoModal')?.remove();
            // Return to Manage Tests area
            const manageLink = document.querySelector('.nav-item[data-section="manage-tests"]');
            if (manageLink) manageLink.click();
        }
    });
}

function showPublishSuccess(testName, assignedCount) {
    const modal = document.createElement('div');
    modal.id = 'publishDemoModal';
    modal.className = 'logout-modal-overlay active';
    modal.innerHTML = `
        <div class="logout-modal bounce-in" style="max-width: 420px; text-align: center; border: 1px solid rgba(255,255,255,0.1); background: #1a1b2e;">
            <div style="display: flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 50%; background: rgba(16, 185, 129, 0.1); color: #10b981; margin: 0 auto 1.5rem;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 32px; height: 32px;"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <h3 class="logout-modal-title" style="color: #fff; margin-bottom: 0.5rem; font-size: 1.5rem;">Test published successfully!</h3>
            <p class="logout-modal-text" style="color: var(--gray-400); margin-bottom: 2rem;">
                The test <strong>${testName}</strong> is now live.
            </p>
            
            <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.1); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; display: flex; flex-direction: column; align-items: center;">
                <div style="font-size: 0.7rem; color: #10b981; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 0.5rem;">Total Students Assigned</div>
                <div style="font-size: 2.75rem; font-weight: 800; color: #fff; line-height: 1;">${assignedCount}</div>
            </div>
            
            <button type="button" class="logout-modal-btn cancel" id="closePublishDemoBtn" style="width: 100%; border: none; background: #10b981; color: #fff; font-weight: 700; padding: 1rem; border-radius: 8px; cursor: pointer; transition: all 0.2s ease;">Manage Tests</button>
        </div>
    `;
    document.body.appendChild(modal);
}

// Navigate to full-page publish review
function showTestConfirmation(test) {
    const body = document.getElementById('publishReviewBody');
    if (!body) {
        console.error('[CreateTest] #publishReviewBody not found');
        return;
    }

    const audience = test.targetAudience || {};
    const depts = audience.departments || [];
    const years = audience.years || [];
    const sections = audience.sections || [];
    const batches = audience.batches || [];
    const classes = audience.classes || [];
    const regNumbers = audience.registerNumbers || [];

    const deptText = depts.length > 0 ? depts.join(', ') : 'All Departments';
    const yearText = years.length > 0 ? years.map(y => y + (y == 1 ? 'st' : y == 2 ? 'nd' : y == 3 ? 'rd' : 'th') + ' Year').join(', ') : 'All Years';
    const sectionText = sections.length > 0 ? 'Sections ' + sections.join(', ') : 'All Sections';
    const batchText = batches.length > 0 ? batches.join(', ') : 'All Batches';
    const classText = classes.length > 0 ? classes.join(', ') : 'All Classes';
    const regText = regNumbers.length > 0 ? `${regNumbers.length} Specific Students (${regNumbers.slice(0, 3).join(', ')}${regNumbers.length > 3 ? '...' : ''})` : 'None';

    body.innerHTML = `
        <div class="publish-review-content">
            <!-- Test Overview Cards -->
            <div class="publish-info-grid">
                <div class="publish-info-card">
                    <div class="publish-info-label">Test Name</div>
                    <div class="publish-info-value">${test.name}</div>
                </div>
                <div class="publish-info-card">
                    <div class="publish-info-label">Company</div>
                    <div class="publish-info-value">${test.company}</div>
                </div>
                <div class="publish-info-card">
                    <div class="publish-info-label">Questions</div>
                    <div class="publish-info-value">${test.questions.length} Items</div>
                </div>
                <div class="publish-info-card">
                    <div class="publish-info-label">Duration</div>
                    <div class="publish-info-value">${test.duration} Minutes</div>
                </div>
                <div class="publish-info-card">
                    <div class="publish-info-label">Pass Percentage</div>
                    <div class="publish-info-value">${test.passingPercentage}%</div>
                </div>
            </div>

            ${test.description ? `
            <div class="publish-section-card">
                <h4 class="publish-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 00 2 2h12a2 2 0 00 2-2V8z"/><polyline points="14,2 14,8 20,8"/>
                    </svg>
                    Description
                </h4>
                <p style="color: var(--gray-400); line-height: 1.6; margin: 0;">${test.description}</p>
            </div>` : ''}

            ${test.syllabusUrl ? `
            <div class="publish-section-card" style="border-left: 4px solid var(--blue-500);">
                <h4 class="publish-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                    </svg>
                    Supporting Material
                </h4>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <span style="color: var(--gray-300); font-size: 0.9rem;">File uploaded successfully</span>
                    <a href="${test.syllabusUrl}" target="_blank" style="color: var(--blue-400); font-size: 0.85rem; text-decoration: none; border-bottom: 1px dashed currentColor;">Preview Material</a>
                </div>
            </div>` : ''}

            <!--Audience Section-->
            <div class="publish-section-card">
                <h4 class="publish-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                    </svg>
                    Target Audience
                </h4>
                <div class="publish-audience-grid">
                    <div class="publish-audience-item"><span class="publish-audience-label">Departments</span><span class="publish-audience-value">${deptText}</span></div>
                    <div class="publish-audience-item"><span class="publish-audience-label">Years</span><span class="publish-audience-value">${yearText}</span></div>
                    <div class="publish-audience-item"><span class="publish-audience-label">Sections</span><span class="publish-audience-value">${sectionText}</span></div>
                    <div class="publish-audience-item"><span class="publish-audience-label">Batches</span><span class="publish-audience-value">${batchText}</span></div>
                    <div class="publish-audience-item"><span class="publish-audience-label">Classes</span><span class="publish-audience-value">${classText}</span></div>
                    <div class="publish-audience-item" style="grid-column: span 2; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.5rem; margin-top: 0.5rem;"><span class="publish-audience-label">Specific Students</span><span class="publish-audience-value" style="color: var(--blue-400);">${regText}</span></div>
                </div>
            </div>

            <!--Questions Preview-->
            <div class="publish-section-card">
                <h4 class="publish-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                        <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    Questions Preview (${test.questions.length})
                </h4>
                <div class="publish-questions-list">
                    ${test.questions.map((q, i) => `
                        <div class="publish-question-item">
                            <span class="publish-q-number">Q${i + 1}</span>
                            <div class="publish-q-content">
                                <div class="publish-q-text">${q.question}</div>
                                <div class="publish-q-type" style="font-size: 0.7rem; color: var(--primary-400); text-transform: uppercase;">${q.type || 'MCQ'}</div>
                                ${q.type === 'mcq' ? `
                                    <div class="publish-q-options">${q.options.map((opt, j) => `<span class="publish-q-opt ${String.fromCharCode(65 + j) === q.answer ? 'correct' : ''}">${String.fromCharCode(65 + j)}. ${opt}</span>`).join('')}</div>
                                ` : q.type === 'coding' ? `
                                    <div class="publish-q-answer" style="margin-top: 0.5rem; color: var(--green-400);">Expected Output: ${q.expectedOutput}</div>
                                    <div class="publish-q-langs" style="margin-top: 0.25rem; font-size: 0.8rem; color: var(--blue-400);">Languages: ${(q.allowed_languages || []).join(', ')}</div>
                                ` : `
                                    <div class="publish-q-answer" style="margin-top: 0.5rem; color: var(--green-400);">Correct Answer: ${q.answer}</div>
                                `}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!--Warning Banner-->
    <div class="publish-warning">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px; flex-shrink: 0;">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div>
            <strong>Publication Notice:</strong> Once published, this test will be immediately available to all targeted students. They will see it upon login without any additional navigation.
            </div>
        </div>
    `;

    // Switch to publish review section
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById('publish-review-section').classList.add('active');

    // Update title
    const sectionTitle = document.getElementById('sectionTitle');
    if (sectionTitle) sectionTitle.textContent = 'Publish Test';

    // Deactivate all nav items
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    // Scroll to top of main content
    document.querySelector('.main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
}

function navigateBackToCreate() {
    const createLink = document.querySelector('[data-section="create-test"]');
    if (createLink) createLink.click();
}

// Legacy alias
function closeConfirmationModal() {
    navigateBackToCreate();
}
window.closeConfirmationModal = closeConfirmationModal;

// Add Question functionality
function initAddQuestion() {
    const addBtn = document.getElementById('addQuestionBtn');
    const container = document.getElementById('questionsContainer');

    if (!addBtn || !container) return;

    addBtn.addEventListener('click', () => {
        const questionCount = document.querySelectorAll('.question-item').length + 1;
        const globalMode = document.getElementById('globalQuestionMode') ? document.getElementById('globalQuestionMode').value : 'mcq';
        const isMcq = globalMode === 'mcq';

        const questionHTML = `
    <div class="question-item bounce-in" data-question="${questionCount}" style="background: linear-gradient(145deg, rgba(30,41,59,0.4) 0%, rgba(15,23,42,0.6) 100%); border: 1px solid rgba(255,255,255,0.06); border-left: 4px solid var(--secondary-400); border-radius: 16px; padding: 2.5rem; box-shadow: 0 8px 32px rgba(0,0,0,0.15); position: relative; overflow: hidden;">
      <!-- Decorative background glow -->
      <div style="position: absolute; top: 0; left: 0; right: 0; height: 100px; background: linear-gradient(180deg, rgba(102,126,234,0.03) 0%, rgba(255,255,255,0) 100%); pointer-events: none;"></div>

      <div class="question-header" style="margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; position: relative;">
        <span class="question-number" style="font-weight: 800; color: var(--secondary-400); font-size: 1.15rem; display: flex; align-items: center; gap: 10px;">
          <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(102,126,234,0.15); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(102,126,234,0.3);">
             <span style="color: var(--secondary-400); font-size: 0.95rem;">${questionCount}</span>
          </div>
          Question
        </span>
        <div style="display: flex; gap: 1rem; align-items: center;">
          <div style="background: rgba(0,0,0,0.2); padding: 4px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);">
            <select class="form-input type-selector" onchange="toggleQuestionType(this)" style="width: 150px; height: 34px; font-size: 0.85rem; padding: 0 0.75rem; border: none; background: transparent; color: var(--gray-300); font-weight: 600;">
              <option value="mcq" ${isMcq ? 'selected' : ''}>MCQ Formulation</option>
              <option value="coding" ${!isMcq ? 'selected' : ''}>Coding Challenge</option>
            </select>
          </div>
          <button type="button" class="remove-question-btn" style="width: 36px; height: 36px; min-width: 36px; flex-shrink: 0; border-radius: 10px; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.15); color: var(--error); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='var(--error)'; this.style.color='#fff';" onmouseout="this.style.background='rgba(239, 68, 68, 0.08)'; this.style.color='var(--error)';">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 18px; height: 18px;"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>
      
      <div class="question-body" style="position: relative;">
        <div class="form-group" style="margin-bottom: 2rem;">
          <label class="form-label" style="font-size: 0.85rem; color: var(--gray-400); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.75rem;">Problem Statement *</label>
          <textarea class="form-input" rows="3" placeholder="Define the problem clearly and concisely..." style="background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; font-size: 0.95rem; line-height: 1.6; padding: 1rem;"></textarea>
        </div>

        <div class="mcq-options" style="display: ${isMcq ? 'block' : 'none'};">
          <label class="form-label" style="font-size: 0.85rem; color: var(--gray-400); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.75rem;">Answer Choices</label>
          <div class="options-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 2rem;">
            <div style="position: relative; display: flex; align-items: center;">
              <span style="position: absolute; left: 1rem; color: var(--gray-500); font-weight: 700; font-size: 0.85rem;">A</span>
              <input type="text" class="form-input" placeholder="First option..." style="background: rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding-left: 2.5rem;">
            </div>
            <div style="position: relative; display: flex; align-items: center;">
              <span style="position: absolute; left: 1rem; color: var(--gray-500); font-weight: 700; font-size: 0.85rem;">B</span>
              <input type="text" class="form-input" placeholder="Second option..." style="background: rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding-left: 2.5rem;">
            </div>
            <div style="position: relative; display: flex; align-items: center;">
              <span style="position: absolute; left: 1rem; color: var(--gray-500); font-weight: 700; font-size: 0.85rem;">C</span>
              <input type="text" class="form-input" placeholder="Third option..." style="background: rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding-left: 2.5rem;">
            </div>
            <div style="position: relative; display: flex; align-items: center;">
              <span style="position: absolute; left: 1rem; color: var(--gray-500); font-weight: 700; font-size: 0.85rem;">D</span>
              <input type="text" class="form-input" placeholder="Fourth option..." style="background: rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding-left: 2.5rem;">
            </div>
          </div>
          <div style="display: flex; justify-content: flex-end; align-items: center; gap: 1.5rem; padding-top: 1.5rem; margin-top: 0.5rem; border-top: 1px dashed rgba(255,255,255,0.1);">
            <div style="display: flex; align-items: center;">
              <span style="color: var(--gray-400); font-size: 0.85rem; display: flex; align-items: center; gap: 8px; font-weight: 500;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px; color: var(--success);"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Definitive Correct Formulation:
              </span>
            </div>
            <div style="width: 260px;">
              <select class="form-input mcq-answer" style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); color: var(--success); border-radius: 10px; font-weight: 600; font-size: 0.9rem; cursor: pointer; padding: 0.6rem 1rem; width: 100%; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.08); transition: all 0.2s;" onmouseover="this.style.background='rgba(16, 185, 129, 0.12)'; this.style.borderColor='rgba(16, 185, 129, 0.5)';" onmouseout="this.style.background='rgba(16, 185, 129, 0.08)'; this.style.borderColor='rgba(16, 185, 129, 0.3)';">
                <option value="A" style="color: #fff; background: #0f172a;">Option A is Correct</option>
                <option value="B" style="color: #fff; background: #0f172a;">Option B is Correct</option>
                <option value="C" style="color: #fff; background: #0f172a;">Option C is Correct</option>
                <option value="D" style="color: #fff; background: #0f172a;">Option D is Correct</option>
              </select>
            </div>
          </div>
        </div>

        <div class="coding-options" style="display: ${isMcq ? 'none' : 'block'};">
          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" style="font-size: 0.85rem; color: var(--gray-400); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 1rem;">Primary Architecture Language</label>
            <div class="languages-checkbox-group" style="display: flex; gap: 1.5rem;">
              <label style="display: flex; align-items: center; gap: 8px; color: var(--gray-300); font-weight: 600; cursor: pointer; background: rgba(255,255,255,0.03); padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); transition: all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'"><input type="radio" name="allowed_language_${questionCount}" value="c" checked style="accent-color: var(--secondary-400);"> C</label>
              <label style="display: flex; align-items: center; gap: 8px; color: var(--gray-300); font-weight: 600; cursor: pointer; background: rgba(255,255,255,0.03); padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); transition: all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'"><input type="radio" name="allowed_language_${questionCount}" value="cpp" style="accent-color: var(--secondary-400);"> C++</label>
              <label style="display: flex; align-items: center; gap: 8px; color: var(--gray-300); font-weight: 600; cursor: pointer; background: rgba(255,255,255,0.03); padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); transition: all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'"><input type="radio" name="allowed_language_${questionCount}" value="python" style="accent-color: var(--secondary-400);"> Python</label>
              <label style="display: flex; align-items: center; gap: 8px; color: var(--gray-300); font-weight: 600; cursor: pointer; background: rgba(255,255,255,0.03); padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); transition: all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'"><input type="radio" name="allowed_language_${questionCount}" value="java" style="accent-color: var(--secondary-400);"> Java</label>
            </div>
          </div>
          <div class="form-group" style="background: rgba(30,41,59,0.5); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
            <label class="form-label" style="font-size: 0.85rem; color: var(--gray-400); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.75rem;">Expected Execution Output *</label>
            <textarea class="form-input expected-output" rows="3" placeholder="Provide exactly what the code should output to successfully pass..." style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; font-family: monospace;"></textarea>
          </div>
        </div>
      </div>
    </div>
            `;
        container.insertAdjacentHTML('beforeend', questionHTML);

        const newQuestion = container.lastElementChild;
        newQuestion.querySelector('.remove-question-btn').addEventListener('click', function () {
            if (document.querySelectorAll('.question-item').length > 1) {
                newQuestion.remove();
                updateQuestionNumbers();
            } else {
                showNotification('Warning', 'You need at least one question.', 'error');
            }
        });
    });

    // Initial remove button handlers
    document.querySelectorAll('.remove-question-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            if (document.querySelectorAll('.question-item').length > 1) {
                this.closest('.question-item').remove();
                updateQuestionNumbers();
            } else {
                showNotification('Warning', 'You need at least one question.', 'error');
            }
        });
    });
}

function updateQuestionNumbers() {
    document.querySelectorAll('.question-item').forEach((item, index) => {
        const num = index + 1;
        item.setAttribute('data-question', num);
        item.querySelector('.question-number').textContent = `Question ${num} `;
    });
}

// ========== MANAGE TESTS ==========
function initTestsTable() {
    loadTests();

    const searchInput = document.getElementById('stmai-test-search');
    const searchBtn = document.getElementById('stmai-test-search-btn');
    const clearBtn = document.getElementById('clearTestSearch');

    if (searchInput) {
        // Live search as user types
        searchInput.addEventListener('input', window.debounce((e) => {
            if (clearBtn) clearBtn.classList.toggle('visible', e.target.value.length > 0);
            filterTests(e.target.value);
        }));

        // Trigger on Enter key
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                filterTests(searchInput.value);
            }
        });
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            filterTests(searchInput.value);
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.classList.remove('visible');
            filterTests('');
            searchInput.focus();
        });
    }
}

function filterTests(query) {
    const q = query.toLowerCase().trim();
    const tbody = document.getElementById('testsTableBody');
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr:not(.no-results-row)');
    let visibleCount = 0;

    rows.forEach(row => {
        // We use innerText to capture all visible text in the row
        const rowText = row.innerText.toLowerCase();
        const testId = row.dataset.id ? String(row.dataset.id).toLowerCase() : '';

        // Search in Name, Company, Status (all in rowText) plus the hidden dataset ID
        if (rowText.includes(q) || testId.includes(q)) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    // Handle "No tests found" UI
    let noResultsRow = tbody.querySelector('.no-results-row');

    // Only show "No results" if there was actually a query and nothing matched
    if (visibleCount === 0 && q !== '') {
        if (!noResultsRow) {
            tbody.insertAdjacentHTML('beforeend', `
    <tr class="no-results-row">
        <td colspan="5">
            <div style="text-align: center; padding: 3rem; color: var(--gray-500);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 48px; height: 48px; margin-bottom: 1rem; opacity: 0.5;">
                    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
                <p style="font-size: 1.1rem; font-weight: 500;">No tests found for "${query}"</p>
                <p style="font-size: 0.9rem; opacity: 0.7;">Try a different keyword or check the test ID.</p>
            </div>
        </td>
    </tr>
    `);
        } else {
            noResultsRow.style.display = '';
            noResultsRow.querySelector('p:first-of-type').textContent = `No tests found for "${query}"`;
        }
    } else if (noResultsRow) {
        noResultsRow.style.display = 'none';
    }

    // Toggle clear button visibility
    const clearBtn = document.getElementById('clearTestSearch');
    if (clearBtn) {
        clearBtn.style.display = q === '' ? 'none' : 'block';
    }
}

async function loadTests() {
    const tbody = document.getElementById('testsTableBody');
    if (!tbody) return;

    const userData = sessionStorage.getItem('user') || localStorage.getItem('user');
    const user = JSON.parse(userData || '{}');

    // CRITICAL FIX: Use getAllTests() for staff — returns ALL tests, not just active
    const tests = window.DB ? await window.DB.getAllTests() : [];
    const allResults = window.DB ? await window.DB.getAllResults() : [];

    // Filter tests created by current user
    const userTests = tests.filter(t => t.createdBy === user.username);

    // Calculate global stats
    // Calculate global stats and enrich tests with real-time result data
    const totalTests = userTests.length;
    const activeTests = userTests.filter(t => t.status === 'active').length;
    
    let totalParticipants = 0;
    let totalAttended = 0;
    let totalAttempts = 0;
    let totalPassed = 0;

    userTests.forEach(test => {
        // Find results for this specific test
        const testResults = allResults.filter(r => String(r.testId) === String(test.id));
        
        // Calculate attended count (max of API enrichment or Results record count)
        // This ensures the "3 instead of 0" fix even if API enrichment is delayed
        test.realAttendedCount = Math.max(test.attendedCount || 0, testResults.length);
        test.realTotalAssigned = test.totalAssigned || 0;
        
        totalParticipants += test.realTotalAssigned;
        totalAttended += test.realAttendedCount;

        testResults.forEach(result => {
            totalAttempts++;
            if (result.status === 'passed' || result.score >= 50) totalPassed++;
        });
    });

    const passRate = totalAttempts > 0 ? Math.round((totalPassed / totalAttempts) * 100) : 0;

    const totalEl = document.getElementById('staffTotalTests');
    const activeEl = document.getElementById('staffActiveTests');
    const partEl = document.getElementById('staffParticipants');
    const passEl = document.getElementById('staffPassRate');

    if (totalEl) totalEl.textContent = totalTests;
    if (activeEl) activeEl.textContent = activeTests;
    if (partEl) partEl.textContent = totalAttended;
    if (passEl) passEl.textContent = passRate + '%';

    tbody.innerHTML = '';

    if (userTests.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div style="text-align: center; padding: 4rem 2rem; color: var(--gray-500);">
                        <div style="width: 64px; height: 64px; background: rgba(255, 255, 255, 0.03); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem; color: var(--gray-500); border: 1px solid rgba(255, 255, 255, 0.05);">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 32px; height: 32px; opacity: 0.6;">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                <polyline points="14,2 14,8 20,8" />
                            </svg>
                        </div>
                        <h3 style="font-size: 1.25rem; font-weight: 600; color: #fff; margin-bottom: 0.25rem;">No Tests Created Yet</h3>
                        <p style="font-size: 0.9rem; opacity: 0.6;">Your assessment dashboard will appear here once tests are published.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    userTests.forEach(test => {
        const formattedDate = test.date ? new Date(test.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
        const attendedCount = test.realAttendedCount || 0;
        const questions = typeof test.questions === 'string' ? JSON.parse(test.questions) : (test.questions || []);
        const diffLevel = test.difficulty || 'Medium';
        const diffClrMap = { 'Easy': '#10b981', 'Medium': '#f59e0b', 'Hard': '#ef4444' };
        const diffClr = diffClrMap[diffLevel] || '#f59e0b';
        const row = `
            <tr data-id="${test.id}">
                <td>
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                        <div style="font-weight: 700; color: #fff; font-size: 1rem; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            ${test.name}
                            <span style="font-size: 0.65rem; font-weight: 800; color: ${diffClr}; background: ${diffClr}15; border: 1px solid ${diffClr}30; padding: 2px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px;">${diffLevel}</span>
                        </div>
                        <div style="font-size: 0.75rem; color: var(--gray-500); font-weight: 500;">
                            ${questions.length} Questions <span style="margin: 0 6px; opacity: 0.3;">|</span> ${test.duration || '-'} Minutes
                        </div>
                    </div>
                </td>
                <td>
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                        <span style="font-weight: 600; color: var(--blue-400); font-size: 1rem;">${test.company}</span>
                    </div>
                </td>
                <td>
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                        <span style="color: var(--gray-300); font-weight: 500;">${formattedDate}</span>
                    </div>
                </td>
                <td>
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                        <span style="font-weight: 800; color: #fff; font-size: 1.1rem; background: rgba(255,255,255,0.03); padding: 4px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); color: var(--secondary-400);">
                            ${attendedCount}
                        </span>
                    </div>
                </td>
                <td>
                    <div style="display: flex; justify-content: center;">
                        <span class="status-badge ${test.status}" style="padding: 6px 16px; font-weight: 700; letter-spacing: 1px;">${test.status.toUpperCase()}</span>
                    </div>
                </td>
                <td class="actions-cell">
                    <div class="action-icons" style="display: flex; align-items: center; justify-content: center; gap: 8px; overflow: hidden; white-space: nowrap; width: 100%;">
                        <button class="action-btn" onclick="viewTestAnalytics(${test.id})" title="View Details" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 14px; height: 32px; border-radius: 8px; background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.2); color: var(--primary-400); font-size: 0.8rem; font-weight: 600; white-space: nowrap; transform: none !important; transition: none !important; cursor: pointer;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px;flex-shrink:0;">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                            </svg>
                            <span>View</span>
                        </button>
                        <button class="action-btn" onclick="openPrintReportModal(${test.id}, '${test.name.replace(/'/g, "\\\\'")}')" title="Print Report" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 14px; height: 32px; border-radius: 8px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); color: #10b981; font-size: 0.8rem; font-weight: 600; white-space: nowrap; transform: none !important; transition: none !important; cursor: pointer;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px;flex-shrink:0;">
                                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                <rect x="6" y="14" width="12" height="8"></rect>
                            </svg>
                            <span>Report</span>
                        </button>
                        <button class="action-btn delete" onclick="triggerSTMAIDelete(${test.id}, '${test.name.replace(/'/g, "\\\\'")}')" title="Delete Test" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 14px; height: 32px; border-radius: 8px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444; font-size: 0.8rem; font-weight: 600; white-space: nowrap; transform: none !important; transition: none !important; cursor: pointer;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;flex-shrink:0;">
                                <polyline points="3,6 5,6 21,6"/>
                                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                            </svg>
                            <span>Delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// ==================== PRINT REPORT SYSTEM ====================
function openPrintReportModal(testId, testName) {
    let modal = document.getElementById('print-report-modal');
    if (modal) modal.remove();

    const html = `
    <div id="print-report-modal" class="modal-overlay" style="display: flex; position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); z-index: 9999; align-items: center; justify-content: center; padding: 1rem;">
        <div class="modal-content" style="background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 20px; width: 100%; max-width: 550px; padding: 2rem; position: relative; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
            <button onclick="this.closest('.modal-overlay').remove()" style="position: absolute; top: 1.5rem; right: 1.5rem; background: none; border: none; color: var(--gray-400); cursor: pointer; transition: color 0.2s;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:24px;height:24px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <h2 style="font-size: 1.5rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem; display:flex; align-items:center; gap:10px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:24px;height:24px;color:var(--primary-400);"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                Print Report Configuration
            </h2>
            <p style="color: var(--gray-400); font-size: 0.9rem; margin-bottom: 1.5rem;">Configure the print report for: <strong style="color: #fff;">${testName}</strong></p>
            
            <div style="background: rgba(0,0,0,0.2); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border-light); margin-bottom: 1rem;">
                <label style="display: block; font-size: 0.85rem; color: var(--gray-400); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 1rem;">1. Filter Participants</label>
                <div style="display: flex; flex-direction: column; gap: 0.8rem;">
                    <label style="display: flex; align-items: center; gap: 10px; color: #fff; cursor: pointer;">
                        <input type="radio" name="report_filter" value="all" checked style="accent-color: var(--primary-500); width: 16px; height: 16px;">
                        <span>All Participants <span style="color:var(--gray-500);font-size:0.85rem;">(Assigned & Attempted)</span></span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 10px; color: #fff; cursor: pointer;">
                        <input type="radio" name="report_filter" value="attended" style="accent-color: var(--primary-500); width: 16px; height: 16px;">
                        <span>Attended Only <span style="color:var(--gray-500);font-size:0.85rem;">(In Progress & Submitted)</span></span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 10px; color: #fff; cursor: pointer;">
                        <input type="radio" name="report_filter" value="not_attended" style="accent-color: var(--primary-500); width: 16px; height: 16px;">
                        <span>Not Attended Only <span style="color:var(--gray-500);font-size:0.85rem;">(Assigned but no action)</span></span>
                    </label>
                </div>
            </div>

            <div style="background: rgba(0,0,0,0.2); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border-light); margin-bottom: 2rem;">
                <label style="display: block; font-size: 0.85rem; color: var(--gray-400); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 1rem;">2. Select Data Fields <span style="color:var(--primary-400);">* (Mandatory)</span></label>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem;" id="report-fields-group">
                    <label style="display: flex; align-items: center; gap: 8px; color: #fff; cursor: pointer;">
                        <input type="checkbox" name="report_fields" value="student_name" checked style="accent-color: var(--primary-500);"> Name
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px; color: #fff; cursor: pointer;">
                        <input type="checkbox" name="report_fields" value="register_number" checked style="accent-color: var(--primary-500);"> Register Number
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px; color: #fff; cursor: pointer;">
                        <input type="checkbox" name="report_fields" value="department" checked style="accent-color: var(--primary-500);"> Department
                    </label>

                    <!-- Removed stream -->
                    <label style="display: flex; align-items: center; gap: 8px; color: #fff; cursor: pointer;">
                        <input type="checkbox" name="report_fields" value="section" checked style="accent-color: var(--primary-500);"> Section
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px; color: #fff; cursor: pointer;">
                        <input type="checkbox" name="report_fields" value="marks" checked style="accent-color: var(--primary-500);"> Marks
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px; color: #fff; cursor: pointer;">
                        <input type="checkbox" name="report_fields" value="grade" checked style="accent-color: var(--primary-500);"> Grade
                    </label>
                </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 1rem;">
                <button onclick="this.closest('.modal-overlay').remove()" class="action-btn" style="padding: 0.75rem 1.5rem; border-radius: 10px; background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); font-weight: 600; cursor: pointer;">Cancel</button>
                <button onclick="generatePrintReport(${testId}, '${testName.replace(/'/g, "\\'")}')" class="action-btn" id="generate-report-btn" style="padding: 0.75rem 1.5rem; border-radius: 10px; background: linear-gradient(135deg, var(--primary-600), var(--primary-500)); color: #fff; border: none; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);">
                    Generate Report
                </button>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', html);
}

async function generatePrintReport(testId, testName) {
    const btn = document.getElementById('generate-report-btn');
    const checkedFields = Array.from(document.querySelectorAll('input[name="report_fields"]:checked')).map(cb => cb.value);
    
    if (checkedFields.length === 0) {
        if (typeof showNotification === 'function') {
            showNotification('Validation Error', 'Please select at least one data field to generate the report.', 'error');
        } else {
            alert('Please select at least one data field.');
        }
        return;
    }

    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-sm" style="margin-right:8px;"></span> Generating...';
    btn.disabled = true;

    try {
        // Enforce Authentication Token (fallback for development/no-jwt environments)
        let token = localStorage.getItem('token'); 
        
        if (!token || token === 'null' || token === 'undefined') {
            token = 'valid_session'; // Auto-fallback to prevent breaking the flow
        }

        const filter = document.querySelector('input[name="report_filter"]:checked').value;
        const fieldsParams = checkedFields.map(f => `selected_fields[]=${encodeURIComponent(f)}`).join('&');
        
        // Use the application's central DB resolver or fallback to relative /api
        const API_BASE = (window.DB && window.DB.API_URL) ? window.DB.API_URL : '/api';
        
        const response = await fetch(`${API_BASE}/test-report?test_id=${testId}&filter=${filter}&${fieldsParams}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                // Clear session cache and redirect on Auth mismatch
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                if(typeof showNotification === 'function') {
                    showNotification('Session Expired', data.error || 'Authenication failed. Please log in again.', 'error');
                } else {
                    alert('Session Expired: ' + (data.error || 'Please log in again.'));
                }
                // Immediate redirect as requested by user for speed
                window.location.href = 'index.html';

                return;
            }
            throw new Error(data.error || 'Failed to generate report');
        }

        renderPrintReport(data, testName, filter, checkedFields);
        document.getElementById('print-report-modal').remove();
    } catch (err) {
        if(typeof showNotification === 'function') {
            showNotification('System Error', err.message, 'error');
        } else {
            console.error('System Error:', err.message);
        }
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function renderPrintReport(data, testName, filter, checkedFields) {
    let filterText = "All Participants";
    if (filter === "attended") filterText = "Attended Only";
    if (filter === "not_attended") filterText = "Not Attended Only";

    const printWindow = window.open('', '_blank');
    
    const columnMap = {
        'student_name': { title: 'Student Name', width: '20%' },
        'register_number': { title: 'Register Number', width: '15%' },
        'department': { title: 'Department', width: '15%' },
        'section': { title: 'Section', width: '10%' },
        'marks': { title: 'Marks', width: '10%' },
        'grade': { title: 'Grade', width: '10%' }
    };

    let tableHeaders = '<thead><tr><th width="5%">S.No</th>';
    checkedFields.forEach(field => {
        tableHeaders += `<th width="${columnMap[field] ? columnMap[field].width : '10%'}">${columnMap[field] ? columnMap[field].title : field}</th>`;
    });
    tableHeaders += '</tr></thead>';

    let tableRows = '';
    if (data.length === 0) {
        tableRows = `<tr><td colspan="${checkedFields.length + 1}" style="text-align: center; padding: 20px;">No participants found for the selected filter.</td></tr>`;
    } else {
        data.forEach((row, i) => {
            tableRows += `<tr><td>${i + 1}</td>`;
            checkedFields.forEach(field => {
                let cellData = row[field];
                if (field === 'marks') {
                    cellData = (cellData !== 'N/A' && cellData !== null && cellData !== undefined) ? cellData + '%' : 'N/A';
                }
                tableRows += `<td>${cellData || 'N/A'}</td>`;
            });
            tableRows += `</tr>`;
        });
    }

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Assessment Report - ${testName}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    color: #333;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #333;
                    padding-bottom: 15px;
                }
                .header h1 {
                    margin: 0 0 10px 0;
                    font-size: 24px;
                }
                .header p {
                    margin: 0;
                    font-size: 14px;
                    color: #555;
                }
                .meta-summary {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 20px;
                    font-size: 14px;
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 6px;
                    border: 1px solid #ddd;
                }
                .meta-summary div {
                    flex: 1;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 10px 8px;
                    text-align: left;
                }
                th {
                    background-color: #f1f5f9;
                    font-weight: bold;
                    color: #1e293b;
                    text-transform: uppercase;
                }
                tr:nth-child(even) {
                    background-color: #f8fafc;
                }
                .print-controls {
                    margin-bottom: 20px;
                    text-align: right;
                }
                .btn {
                    padding: 8px 16px;
                    background: #4f46e5;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: bold;
                }
                .btn-secondary {
                    background: #64748b;
                    margin-right: 10px;
                }
                .signature-section {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    margin-top: 80px;
                    padding: 0 40px;
                }
                .signature-block {
                    text-align: center;
                    min-width: 200px;
                }
                .signature-line {
                    border-top: 1px solid #333;
                    margin-top: 60px;
                    padding-top: 8px;
                    font-size: 13px;
                    font-weight: bold;
                    color: #1e293b;
                }
                @media print {
                    .print-controls {
                        display: none !important;
                    }
                    body {
                        padding: 0;
                    }
                    .signature-section {
                        position: fixed;
                        bottom: 40px;
                        left: 40px;
                        right: 40px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="print-controls">
                <button class="btn btn-secondary" onclick="window.close()">Close</button>
                <button class="btn" onclick="window.print()">Print Document</button>
            </div>
            
            <div class="header">
                <h1>Assessment Report</h1>
                <h2>${testName}</h2>
            </div>
            
            <div class="meta-summary">
                <div><strong>Filter Applied:</strong> ${filterText}</div>
                <div><strong>Total Records:</strong> ${data.length}</div>
                <div style="text-align: right;"><strong>Date Generated:</strong> ${new Date().toLocaleDateString()}</div>
            </div>

            <table>
                ${tableHeaders}
                <tbody>
                    ${tableRows}
                </tbody>
            </table>

            <div class="signature-section">
                <div class="signature-block">
                    <div class="signature-line">Signature of Placement Cell Officer</div>
                </div>
                <div class="signature-block">
                    <div class="signature-line">Signature of HOD</div>
                </div>
            </div>
        </body>
        </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
}
// =============================================================

async function deleteTest(id, name) {
    const modalId = 'global-delete-modal';
    if (document.getElementById(modalId)) return;

    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'logout-modal-overlay active';
    modal.innerHTML = `
    <div class="logout-modal" style="border-top: 4px solid #ef4444;">
            <div class="logout-modal-icon" style="background: rgba(239, 68, 68, 0.1); color: #ef4444;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:28px;height:28px;">
                    <path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2m-6 0h6"/>
                </svg>
            </div>
            <h3 class="logout-modal-title">Delete Assessment?</h3>
            <p class="logout-modal-text">Are you sure you want to delete this test? This action will permanently remove all associated data and results.</p>
            <div class="logout-modal-actions">
                <button type="button" class="logout-modal-btn cancel" onclick="this.closest('.logout-modal-overlay').remove()">Cancel</button>
                <button type="button" class="logout-modal-btn confirm" style="background: #ef4444;" id="global-confirm-delete-btn">
                    Confirm Delete
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('global-confirm-delete-btn').onclick = async () => {
        const btn = document.getElementById('global-confirm-delete-btn');
        btn.disabled = true;
        btn.textContent = 'Deleting...';

        try {
            await window.DB.deleteTest(id);
            modal.remove();
            showNotification('Deleted', 'Achievement/Assessment purged successfully.', 'success');
            loadTests();
        } catch (err) {
            console.error(err);
            btn.disabled = false;
            btn.textContent = 'Confirm Delete';
            showNotification('Error', 'Deletion failed: ' + err.message, 'error');
        }
    };
}


// ========== STUDENTS MANAGEMENT ==========
function initStudentsManagement() {
    loadStudents();

    const searchInput = document.getElementById('studentSearch');
    const clearBtn = document.getElementById('clearStudentSearch');
    if (searchInput) {
        searchInput.addEventListener('input', window.debounce(() => {
            if (clearBtn) clearBtn.classList.toggle('visible', searchInput.value.length > 0);
            filterStudents();
        }));
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.classList.remove('visible');
            filterStudents();
            searchInput.focus();
        });
    }

    const departmentFilter = document.getElementById('departmentFilter');
    const classFilter = document.getElementById('classFilter');
    const yearFilter = document.getElementById('yearFilter');
    const batchFilter = document.getElementById('batchFilter');

    if (departmentFilter) departmentFilter.addEventListener('change', () => filterStudents());
    if (classFilter) classFilter.addEventListener('change', () => filterStudents());
    if (yearFilter) yearFilter.addEventListener('change', () => filterStudents());
    if (batchFilter) batchFilter.addEventListener('change', () => filterStudents());
}

async function loadStudents() {
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;

    const students = window.DB ? await window.DB.getStudents() : [];

    document.getElementById('totalStudents').textContent = students.length;
    const depts = new Set(students.map(s => {
        const details = typeof s.details === 'string' ? JSON.parse(s.details) : (s.details || {});
        return s.department || details.department;
    }).filter(Boolean));

    document.getElementById('totalDepartments').textContent = depts.size;
    document.getElementById('activeStudents').textContent = students.length;

    tbody.innerHTML = '';

    if (students.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9">
                    <div style="text-align: center; padding: 3rem; color: var(--gray-500);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 48px; height: 48px; margin-bottom: 1rem; opacity: 0.5;">
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 00-3-3.87" />
                            <path d="M16 3.13a4 4 0 010 7.75" />
                        </svg>
                        <p style="font-size: 1.1rem; font-weight: 500;">No Students Found</p>
                        <p style="font-size: 0.9rem; opacity: 0.8;">No students have registered yet.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    const allResults = window.DB ? await window.DB.getAllResults() : [];

    students.forEach(student => {
        const details = typeof student.details === 'string' ? JSON.parse(student.details) : (student.details || {});
        const studentResults = allResults.filter(r => r.username === student.username);

        const row = `
            <tr data-student-id="${student.username}" style="border-bottom: 1px solid rgba(255,255,255,0.03); transition: all 0.2s ease;">
                <td style="padding: 1rem 0.75rem; color: #94a3b8; font-size: 0.85rem; font-family: monospace;">${details.registerNumber || student.username}</td>
                <td style="padding: 1rem 0.75rem; font-weight: 600; color: #fff; font-size: 0.85rem; white-space: normal; word-break: break-word; min-width: 120px;">${student.name || '-'}</td>
                <td style="padding: 1rem 0.75rem; color: var(--gray-400); font-size: 0.85rem; white-space: normal; word-break: break-word; min-width: 100px;">${student.department || details.department || '-'}</td>
                <td style="padding: 1rem 0.75rem; color: #fff; text-align: center; font-size: 0.85rem;">${details.year || '-'}</td>
                <td style="padding: 1rem 0.75rem; color: #fff; text-align: center; font-size: 0.85rem;">${details.section || '-'}</td>
                <td style="padding: 1rem 0.75rem; color: #fff; text-align: center; font-size: 0.85rem;">${details.batch || '-'}</td>
                <td style="padding: 1rem 0.75rem; color: #fff; text-align: center; font-size: 0.85rem;">${details.streamType || '-'}</td>
                <td style="padding: 1rem 0.75rem; text-align: center; font-weight: 700; color: #818cf8; font-size: 0.9rem;">${studentResults.length}</td>
                <td style="padding: 1rem 0.75rem; text-align: center;">
                    <button class="action-btn" onclick="lookupStudent('${student.username}')" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 14px; height: 32px; border-radius: 8px; background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.2); color: var(--primary-400); cursor: pointer; border: none; font-size: 0.8rem; font-weight: 600;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 14px; height: 14px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        View
                    </button>
                </td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', row);
    });
}

function filterStudents() {
    const searchValue = document.getElementById('studentSearch')?.value.toLowerCase() || '';
    const departmentValue = document.getElementById('departmentFilter')?.value || '';
    const yearValue = document.getElementById('yearFilter')?.value || '';
    const batchValue = document.getElementById('batchFilter')?.value || '';

    const rows = document.querySelectorAll('#studentsTableBody tr');

    rows.forEach(row => {
        const registerNo = row.cells[0]?.textContent.toLowerCase() || '';
        const name = row.cells[1]?.textContent.toLowerCase() || '';
        const department = row.cells[2]?.textContent || '';
        const year = row.cells[3]?.textContent || '';
        const batch = row.cells[5]?.textContent || '';

        const matchesSearch = registerNo.includes(searchValue) || name.includes(searchValue);
        const matchesDepartment = !departmentValue || department === departmentValue;
        const matchesYear = !yearValue || year === yearValue;
        const matchesBatch = !batchValue || batch === batchValue;

        row.style.display = matchesSearch && matchesDepartment && matchesYear && matchesBatch ? '' : 'none';
    });
}

// ========== STUDENT LOOKUP (Point 8) ==========
function initStudentLookup() {
    const searchBtn = document.getElementById('studentLookupBtn');
    const searchInput = document.getElementById('studentLookupInput');
    const clearBtn = document.getElementById('clearLookupInput');
    if (!searchBtn || !searchInput) return;

    searchBtn.addEventListener('click', () => {
        const regNo = searchInput.value.trim();
        if (regNo) lookupStudent(regNo);
    });

    searchInput.addEventListener('input', () => {
        if (clearBtn) clearBtn.classList.toggle('visible', searchInput.value.length > 0);
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.classList.remove('visible');
            searchInput.focus();
        });
    }

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const regNo = searchInput.value.trim();
            if (regNo) lookupStudent(regNo);
        }
    });
}

async function lookupStudent(usernameOrRegNo) {
    window.lookupStudent = lookupStudent;
    // Navigate to Student Lookup section
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById('student-lookup-section')?.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const lookupNav = document.querySelector('[data-section="student-lookup"]');
    if (lookupNav) lookupNav.classList.add('active');

    const sectionTitle = document.getElementById('sectionTitle');
    if (sectionTitle) sectionTitle.textContent = 'Student Profile';

    // Populate search field
    const searchInput = document.getElementById('studentLookupInput');
    if (searchInput) searchInput.value = usernameOrRegNo;

    const container = document.getElementById('studentLookupResult');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--gray-400);"><div class="spinner" style="margin:0 auto 1rem;"></div>Looking up student...</div>';

    try {
        const students = window.DB ? await window.DB.getStudents() : [];
        const allResults = window.DB ? await window.DB.getAllResults() : [];
        const tests = window.DB ? await window.DB.getAllTests() : [];

        // Find matching student
        const student = students.find(s => {
            const d = typeof s.details === 'string' ? JSON.parse(s.details) : (s.details || {});
            return s.username === usernameOrRegNo || d.registerNumber === usernameOrRegNo || (s.name && s.name.toLowerCase() === usernameOrRegNo.toLowerCase());
        });

        if (!student) {
            container.innerHTML = `
                <div style="text-align:center;padding:4rem 2rem;background:rgba(26,27,46,0.3);border-radius:20px;border:2px dashed rgba(255,255,255,0.05);color:var(--gray-500);display:flex;flex-direction:column;align-items:center;">
                    <div style="width:80px;height:80px;background:rgba(239,68,68,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:1.5rem;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" style="width:40px;height:40px;"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    </div>
                    <p style="font-size:1.25rem;font-weight:600;color:#fff;margin-bottom:0.5rem;">No Student Found</p>
                    <p style="font-size:0.95rem;opacity:0.8;max-width:400px;margin:0 auto;color:var(--gray-400);">No student matches "${usernameOrRegNo}". Please verify the register number and try again.</p>
                </div>`;
            return;
        }

        const details = typeof student.details === 'string' ? JSON.parse(student.details) : (student.details || {});
        const studentResults = allResults.filter(r => r.username === student.username);

        // Calculate stats
        const totalTests = studentResults.length;
        const passedTests = studentResults.filter(r => r.status === 'passed' || r.score >= 50).length;
        const failedTests = totalTests - passedTests;
        const avgScore = totalTests > 0 ? Math.round(studentResults.reduce((sum, r) => sum + (r.score || 0), 0) / totalTests) : 0;
        const highestScore = totalTests > 0 ? Math.max(...studentResults.map(r => r.score || 0)) : 0;

        container.innerHTML = `
            <div class="lookup-profile-card" style="animation: fadeInUp 0.4s ease-out; display: flex; flex-direction: column; gap: 2rem;">
                
                <!-- Student Info Header Section -->
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
                    
                    <!-- Identity Card -->
                    <div style="padding: 1.25rem; background: rgba(26, 27, 46, 0.6); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 24px rgba(0,0,0,0.2); backdrop-filter: blur(12px); display: flex; align-items: center; gap: 1rem;">
                        <div style="width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #a855f7); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 800; color: white; flex-shrink: 0; box-shadow: 0 4px 12px rgba(99,102,241,0.3);">
                            ${(student.name || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 style="margin: 0 0 0.2rem; font-size: 1.25rem; font-weight: 800; color: #fff; letter-spacing: -0.01em;">${student.name || 'N/A'}</h3>
                            <div style="display: flex; align-items: center; gap: 0.4rem; background: rgba(255,255,255,0.05); padding: 0.25rem 0.65rem; border-radius: 6px; width: fit-content; border: 1px solid rgba(255,255,255,0.05);">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px; height:12px; color: var(--gray-400);"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
                                <span style="color: var(--gray-300); font-size: 0.85rem; font-weight: 600; font-family: monospace;">${details.registerNumber || student.username}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Academics Card -->
                    <div style="padding: 1.25rem; background: rgba(26, 27, 46, 0.6); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 24px rgba(0,0,0,0.2); backdrop-filter: blur(12px); display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; align-items: center;">
                        <div style="display: flex; flex-direction: column; gap: 0.15rem;">
                            <span style="color: var(--gray-500); font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Department</span>
                            <span style="color: #fff; font-weight: 600; font-size: 0.9rem;">${details.department || '-'}</span>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 0.15rem;">
                            <span style="color: var(--gray-500); font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Year</span>
                            <span style="color: #fff; font-weight: 600; font-size: 0.9rem;">${details.year || '-'}</span>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 0.15rem;">
                            <span style="color: var(--gray-500); font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Section</span>
                            <span style="color: #fff; font-weight: 600; font-size: 0.9rem;">${details.section || '-'}</span>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 0.15rem;">
                            <span style="color: var(--gray-500); font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Batch</span>
                            <span style="color: #fff; font-weight: 600; font-size: 0.9rem;">${details.batch || '-'}</span>
                        </div>
                    </div>
                </div>

                <!-- Stats Performance Grid -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem;">
                    <div style="background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.2); border-radius: 16px; padding: 1.25rem; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                        <span style="font-size: 1.75rem; font-weight: 800; color: #3b82f6; line-height: 1;">${totalTests}</span>
                        <span style="font-size: 0.7rem; font-weight: 700; color: var(--gray-400); margin-top: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Test Attended</span>
                    </div>
                    <div style="background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2); border-radius: 16px; padding: 1.25rem; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                        <span style="font-size: 1.75rem; font-weight: 800; color: #10b981; line-height: 1;">${passedTests}</span>
                        <span style="font-size: 0.7rem; font-weight: 700; color: var(--gray-400); margin-top: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Passed</span>
                    </div>
                    <div style="background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); border-radius: 16px; padding: 1.25rem; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                        <span style="font-size: 1.75rem; font-weight: 800; color: #ef4444; line-height: 1;">${failedTests}</span>
                        <span style="font-size: 0.7rem; font-weight: 700; color: var(--gray-400); margin-top: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Failed</span>
                    </div>
                    <div style="background: rgba(139,92,246,0.08); border: 1px solid rgba(139,92,246,0.2); border-radius: 16px; padding: 1.25rem; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                        <span style="font-size: 1.75rem; font-weight: 800; color: #8b5cf6; line-height: 1;">${avgScore}%</span>
                        <span style="font-size: 0.7rem; font-weight: 700; color: var(--gray-400); margin-top: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Avg Score</span>
                    </div>
                    <div style="background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); border-radius: 16px; padding: 1.25rem; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                        <span style="font-size: 1.75rem; font-weight: 800; color: #f59e0b; line-height: 1;">${highestScore}%</span>
                        <span style="font-size: 0.7rem; font-weight: 700; color: var(--gray-400); margin-top: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Highest Score</span>
                    </div>
                </div>

                <!-- Test Results Table Container -->
                <div style="background: rgba(26, 27, 46, 0.6); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.2); backdrop-filter: blur(12px);">
                    <div style="padding: 1rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; gap: 0.5rem; background: rgba(0,0,0,0.2);">
                        <div style="width: 28px; height: 28px; background: rgba(99,102,241,0.15); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #6366f1;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14,2 14,8 20,8" /></svg>
                        </div>
                        <h4 style="margin: 0; font-size: 1rem; font-weight: 700; color: #fff;">Detailed Test History</h4>
                    </div>
                    
                    ${totalTests === 0 ? `
                        <div style="text-align: center; padding: 4rem 2rem; color: var(--gray-500);">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 48px; height: 48px; margin-bottom: 1rem; opacity: 0.4;"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                            <p style="font-size: 1.1rem; font-weight: 500;">No test history found</p>
                            <p style="font-size: 0.9rem; margin-top: 0.25rem; opacity: 0.8;">This student hasn't completed any assessments yet.</p>
                        </div>
                    ` : `
                        <div class="table-scroll" style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                                <thead>
                                    <tr style="background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.08);">
                                        <th style="padding: 1.25rem 2rem; font-size: 0.85rem; font-weight: 700; color: var(--gray-400); text-transform: uppercase; letter-spacing: 0.05em;">Test Name</th>
                                        <th style="padding: 1.25rem 2rem; font-size: 0.85rem; font-weight: 700; color: var(--gray-400); text-transform: uppercase; letter-spacing: 0.05em;">Company</th>
                                        <th style="padding: 1.25rem 2rem; font-size: 0.85rem; font-weight: 700; color: var(--gray-400); text-transform: uppercase; letter-spacing: 0.05em; text-align: center;">Score</th>
                                        <th style="padding: 1.25rem 2rem; font-size: 0.85rem; font-weight: 700; color: var(--gray-400); text-transform: uppercase; letter-spacing: 0.05em; text-align: center;">Status</th>
                                        <th style="padding: 1.25rem 2rem; font-size: 0.85rem; font-weight: 700; color: var(--gray-400); text-transform: uppercase; letter-spacing: 0.05em; text-align: right;">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${studentResults.map((r, index) => {
                                        const testInfo = tests.find(t => String(t.id) === String(r.testId));
                                        const bgClass = index % 2 === 0 ? 'background: transparent;' : 'background: rgba(255,255,255,0.01);';
                                        return `
                                            <tr style="${bgClass} border-bottom: 1px solid rgba(255,255,255,0.03); transition: background 0.2s ease;">
                                                <td style="padding: 1.25rem 2rem; color: #fff; font-weight: 600; font-size: 0.95rem;">${r.testName || (testInfo ? testInfo.name : '-')}</td>
                                                <td style="padding: 1.25rem 2rem; color: var(--gray-300); font-size: 0.95rem;">${r.company || (testInfo ? testInfo.company : '-')}</td>
                                                <td style="padding: 1.25rem 2rem; text-align: center;">
                                                    <span style="font-weight: 800; font-size: 1.1rem; color: ${r.score >= 50 ? '#10b981' : '#ef4444'};">${r.score}%</span>
                                                </td>
                                                <td style="padding: 1.25rem 2rem; text-align: center;">
                                                    <span style="display: inline-flex; align-items: center; justify-content: center; padding: 0.4rem 1rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.05em; ${r.status === 'passed' ? 'background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3);' : 'background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3);'}">${r.status ? r.status.toUpperCase() : 'N/A'}</span>
                                                </td>
                                                <td style="padding: 1.25rem 2rem; text-align: right; color: var(--gray-400); font-size: 0.95rem; font-variant-numeric: tabular-nums;">
                                                    ${r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                                </td>
                                            </tr>`;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>
            </div>`;
    } catch (err) {
        console.error(err);
        container.innerHTML = `
            <div style="text-align:center;padding:4rem 2rem;background:rgba(239,68,68,0.05);border-radius:20px;border:1px solid rgba(239,68,68,0.2);color:#ef4444;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:40px;height:40px;margin-bottom:1rem;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <p style="font-size:1.1rem;font-weight:600;margin-bottom:0.5rem;">Error loading student data</p>
                <p style="font-size:0.9rem;opacity:0.8;">${err.message}</p>
            </div>`;
    }
}




// ========== STMAI ENGINE (SmartFlow Test Management & Analytics Interface) ==========

let currentSTMAITestId = null;

async function viewTestAnalytics(testId) {
    currentSTMAITestId = testId;
    window.currentSTMAITestId = testId;
    const listView = document.getElementById('stmai-list-view');
    const detailView = document.getElementById('stmai-detail-view');

    if (!listView || !detailView) return;

    // Transition: Hide list, show detail
    listView.style.display = 'none';
    detailView.style.display = 'block';
    detailView.classList.add('fade-in');

    // Reset Tabs
    switchSTMAITab('overview');

    try {
        const tests = await window.DB.getAllTests();
        const test = tests.find(t => String(t.id) === String(testId));
        if (!test) throw new Error('Test not found');

        // Populate Header
        document.getElementById('stmai-test-name').textContent = test.name;
        document.getElementById('stmai-test-company').textContent = test.company || 'Internal Assessment';

        const badge = document.getElementById('stmai-test-status-badge');
            badge.innerHTML = `<span class="status-badge ${test.status}">${test.status.toUpperCase()}</span>`;

        // Populate Overview Tab (Basic info)
        const questions = typeof test.questions === 'string' ? JSON.parse(test.questions) : (test.questions || []);
        document.getElementById('stmai-ov-questions').textContent = questions.length + ' Questions';
        document.getElementById('stmai-ov-duration').textContent = (test.duration || '0') + ' Minutes';
        document.getElementById('stmai-ov-date').textContent = new Date(test.date || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

        // Fetch Participation Data (Triggering Sync)
        loadSTMAIParticipation(testId);

        // Load Ranking Data directly on Overview
        if (window.RankingSystem && window.RankingSystem.loadTestRanking) {
            window.RankingSystem.loadTestRanking(testId);
        }

    } catch (err) {
        console.error('[STMAI] Participation Sync Error:', err);
        const tbody = document.getElementById('stmai-analytics-tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:3rem;color:#ef4444;">Unable to load student data. Please try again.</td></tr>';
    }
}


async function loadSTMAIParticipation(testId) {
    const tableBody = document.getElementById('stmai-analytics-tbody');
    const overviewStats = document.getElementById('stmai-overview-stats');
    const attBadge = document.getElementById('stmai-attendance-badge');

    if (tableBody) tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:3rem;"><div class="spinner-sm" style="margin: 0 auto 1rem;"></div> Synchronizing Results...</td></tr>';

    try {
        const report = await window.DB.getTestParticipation(testId);

        const total = report.length;
        const attendedReport = report.filter(s => s.attended);
        const attended = attendedReport.length;
        const notAttended = total - attended;

        // Render Stats & Action Buttons in Overview Tab
        if (overviewStats) {
            overviewStats.innerHTML = `
                <!-- Metrics Grid (Row 1) -->
                <div class="stmai-metrics-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 0.5rem; width: 100%;">
                    <div class="stat-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); text-align: center; padding: 1.5rem 0.5rem; border-radius: 12px; display: flex; flex-direction: column; justify-content: center; height: 100%;">
                        <div class="stat-value" style="color: #60a5fa; font-size: 1.75rem; font-weight: 700;">${total}</div>
                        <div class="stat-label" style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: var(--gray-500); margin-top: 8px;">Total Assigned</div>
                    </div>
                    <div class="stat-card" style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.1); text-align: center; padding: 1.5rem 0.5rem; border-radius: 12px; display: flex; flex-direction: column; justify-content: center; height: 100%;">
                        <div class="stat-value" style="color: #10b981; font-size: 1.75rem; font-weight: 700;">${attended}</div>
                        <div class="stat-label" style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: var(--gray-500); margin-top: 8px;">Attended</div>
                    </div>
                    <div class="stat-card" style="background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.1); text-align: center; padding: 1.5rem 0.5rem; border-radius: 12px; display: flex; flex-direction: column; justify-content: center; height: 100%;">
                        <div class="stat-value" style="color: #ef4444; font-size: 1.75rem; font-weight: 700;">${notAttended}</div>
                        <div class="stat-label" style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: var(--gray-500); margin-top: 8px;">Not Attended</div>
                    </div>
                </div>

                <!-- Navigation Action Buttons Grid (Row 2) -->
                <div class="stmai-actions-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; width: 100%; margin-top: 0.5rem;">
                    <!-- Participants -->
                    <button onclick="switchSTMAITab('analytics')" class="stmai-action-btn" 
                        style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0.05) 100%); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px; padding: 0.85rem 1rem; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 0.75rem; width: 100%; box-shadow: 0 4px 12px rgba(0,0,0,0.1); outline: none;"
                        onmouseover="this.style.background='linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(99, 102, 241, 0.1) 100%)'; this.style.borderColor='rgba(99, 102, 241, 0.5)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(99,102,241,0.2)';"
                        onmouseout="this.style.background='linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0.05) 100%)'; this.style.borderColor='rgba(99, 102, 241, 0.3)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';"
                    >
                        <div style="width: 28px; height: 28px; background: rgba(99, 102, 241, 0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #818cf8; flex-shrink: 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width: 15px; height: 15px;"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg></div>
                        <span style="font-size: 0.95rem; font-weight: 700; color: #fff; white-space: nowrap;">Participants</span>
                    </button>

                    <!-- Detailed Results -->
                    <button onclick="switchSTMAITab('results')" class="stmai-action-btn" 
                        style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 0.85rem 1rem; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 0.75rem; width: 100%; box-shadow: 0 4px 12px rgba(0,0,0,0.1); outline: none;"
                        onmouseover="this.style.background='linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0.1) 100%)'; this.style.borderColor='rgba(16, 185, 129, 0.5)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(16,185,129,0.2)';"
                        onmouseout="this.style.background='linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)'; this.style.borderColor='rgba(16, 185, 129, 0.3)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';"
                    >
                        <div style="width: 28px; height: 28px; background: rgba(16, 185, 129, 0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #10b981; flex-shrink: 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width: 15px; height: 15px;"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg></div>
                        <span style="font-size: 0.95rem; font-weight: 700; color: #fff; white-space: nowrap;">Detailed Result</span>
                    </button>

                    <!-- Ranking -->
                    <button onclick="switchSTMAITab('ranking')" class="stmai-action-btn" 
                        style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 0.85rem 1rem; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 0.75rem; width: 100%; box-shadow: 0 4px 12px rgba(0,0,0,0.1); outline: none;"
                        onmouseover="this.style.background='linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(245, 158, 11, 0.1) 100%)'; this.style.borderColor='rgba(245, 158, 11, 0.5)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(245,158,11,0.2)';"
                        onmouseout="this.style.background='linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)'; this.style.borderColor='rgba(245, 158, 11, 0.3)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';"
                    >
                        <div style="width: 28px; height: 28px; background: rgba(245, 158, 11, 0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #f59e0b; flex-shrink: 0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width: 15px; height: 15px;"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg></div>
                        <span style="font-size: 0.95rem; font-weight: 700; color: #fff; white-space: nowrap;">Ranking</span>
                    </button>
                </div>
            `;
        }

        // Update Targeted Audience count in Overview
        const targetedCountEl = document.getElementById('stmai-targeted-count');
        if (targetedCountEl) targetedCountEl.textContent = total;

        // Cache report data for Targeted Audience modal
        window._stmaiCachedParticipation = report;

        if (attBadge) attBadge.textContent = `${attended} / ${total} Completed`;

        // Render Participation Table
        if (report.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:3rem;color:var(--gray-500);"><div style="font-size: 2rem; margin-bottom: 1rem;">📭</div>No students assigned to this assessment pipeline.</td></tr>';
            return;
        }

        if (attended === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:4rem;color:var(--gray-500);"><div style="font-size: 2rem; margin-bottom: 1rem;">⏳</div>No students have actively participated in this test yet.<br><span style="font-size: 0.8rem; margin-top: 10px; display: block;">Registration data will appear here in real-time as soon as a student starts or completes the assessment.</span></td></tr>';
            return;
        }

        tableBody.innerHTML = report.map(s => {
            const isFinished = s.assignmentStatus === 'submitted' || s.status === 'PASSED' || s.status === 'FAILED' || s.status === 'QUALIFIED' || s.status === 'NOT QUALIFIED';

            return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                <td style="padding: 1.25rem 1.5rem;">
                    <div style="font-weight:700; color: #fff; font-size: 0.95rem;">${s.name}</div>
                    <div style="font-size:0.75rem; color:var(--blue-400); font-weight: 600; margin-top: 2px;">Reg No: ${s.registerNumber}</div>
                </td>
                <td style="padding: 1.25rem 1.5rem;">
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <span class="badge" style="background: ${s.attended ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; color: ${s.attended ? '#10b981' : '#ef4444'}; font-weight: 800; font-size: 0.7rem; border-radius: 6px; padding: 4px 10px; border: 1px solid ${s.attended ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; text-transform: uppercase;">
                            ${s.status}
                        </span>
                        <div style="font-size: 0.7rem; color: var(--gray-500); font-weight: 500;">${s.department} • Sec ${s.section}</div>
                    </div>
                </td>
                <td style="padding: 1.25rem 1.5rem; text-align: center;">
                    <div style="font-weight:800; font-size: 1.1rem; color: ${s.attended ? (s.score >= 50 ? '#10b981' : '#ef4444') : 'var(--gray-700)'};">
                        ${s.attended ? `${s.score !== null ? s.score + '%' : '--'}` : 'N/A'}
                    </div>
                </td>
                <td style="padding: 1.25rem 1.5rem; text-align: right;">
                    ${isFinished ? `
                        <button class="action-btn" onclick="inspectSTMAIStudent('${s.username}')" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 14px; height: 32px; border-radius: 8px; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); color: var(--primary-400); cursor: pointer; font-size: 0.8rem; font-weight: 600;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            Report
                        </button>
                    ` : (s.assignmentStatus === 'in_progress' ? 
                        '<span style="color:#60a5fa; font-size:0.75rem; font-weight:800; text-transform: uppercase; background: rgba(96, 165, 250, 0.1); padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(96, 165, 250, 0.2);">In Progress</span>' : 
                        '<span style="color:var(--gray-600); font-size:0.75rem; font-weight:700; text-transform: uppercase; background: rgba(255,255,255,0.03); padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">Pending</span>')}
                </td>
            </tr>
        `;
        }).join('');

    } catch (err) {
        console.error('[STMAI] Sync Failure:', err);
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align:center;padding:3.5rem;">
                        <div style="font-size: 2.5rem; margin-bottom: 1rem;">🛰️</div>
                        <div style="color:#ef4444; font-weight:700; font-size: 1.1rem; margin-bottom: 0.5rem;">Sync Engine Interrupted</div>
                        <div style="color:var(--gray-400); font-size: 0.85rem; max-width: 300px; margin: 0 auto;">Unable to synchronize real-time student participation data. Please check your network or server status.</div>
                        <button class="btn btn-sm btn-primary" style="margin-top: 1.5rem;" onclick="loadSTMAIParticipation('${testId}')">Retry Sync</button>
                    </td>
                </tr>
            `;
        }
    }
}

function switchSTMAITab(tabName) {
    // Buttons
    document.querySelectorAll('.stmai-tab').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-stmai-tab') === tabName);
    });

    // Content
    document.querySelectorAll('.stmai-tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `stmai-tab-${tabName}`);
    });
}

function closeSTMAIDetails() {
    currentSTMAITestId = null;
    window._stmaiCachedParticipation = null;
    document.getElementById('stmai-list-view').style.display = 'block';
    document.getElementById('stmai-detail-view').style.display = 'none';
    loadTests();
}

// ====== TARGETED AUDIENCE MODAL ======
function openTargetedAudienceModal() {
    const report = window._stmaiCachedParticipation || [];
    const total = report.length;

    // Remove existing modal if any
    const existingModal = document.getElementById('targeted-audience-modal');
    if (existingModal) existingModal.remove();

    // Build table rows
    let tableRows = '';
    if (total === 0) {
        tableRows = '<tr><td colspan="4" style="text-align: center; padding: 5rem 2rem; color: var(--gray-500); font-size: 1.1rem; background: rgba(0,0,0,0.1);">No participants have been assigned to this test yet.</td></tr>';
    } else {
        report.forEach((s, i) => {
            const rowStyle = `border-bottom: 1px solid rgba(255,255,255,0.03); transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);`;
            const bgClass = i % 2 !== 0 ? 'background: rgba(255,255,255,0.008);' : 'background: transparent;';
            
            tableRows += `
                <tr class="targeted-row" style="${rowStyle} ${bgClass}" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='${i % 2 !== 0 ? 'rgba(255,255,255,0.008)' : 'transparent'}'">
                    <td style="padding: 1.1rem 1.25rem; color: var(--gray-400); font-size: 0.9rem; text-align: center; font-variant-numeric: tabular-nums; font-weight: 500;">${i + 1}</td>
                    <td style="padding: 1.1rem 1.25rem; color: #fff; font-weight: 600; font-size: 0.95rem; letter-spacing: 0.01em;">${s.name || '-'}</td>
                    <td style="padding: 1.1rem 1.25rem; color: #818cf8; font-size: 0.9rem; text-align: center; font-weight: 700; font-family: 'JetBrains Mono', monospace;">${s.registerNumber || s.username || '-'}</td>
                    <td style="padding: 1.1rem 1.25rem; color: var(--gray-300); font-size: 0.9rem; text-align: center; font-weight: 500;">${s.department || '-'}</td>
                </tr>`;
        });
    }

    const modalHTML = `
        <div id="targeted-audience-modal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 9999; display: flex; align-items: center; justify-content: center; background: rgba(3, 4, 15, 0.85); backdrop-filter: blur(12px) saturate(180%); animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
            <div style="background: linear-gradient(165deg, #11121d 0%, #0a0b14 100%); border: 1px solid rgba(255,255,255,0.08); border-radius: 28px; width: 94%; max-width: 1100px; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05);">
                <!-- Modal Header -->
                <div style="padding: 2rem 3rem; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; background: rgba(255,255,255,0.02);">
                    <div style="display: flex; align-items: center; gap: 1.5rem;">
                        <div style="width: 56px; height: 56px; background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.05) 100%); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 18px; display: flex; align-items: center; justify-content: center; color: #f59e0b; box-shadow: 0 8px 16px rgba(245,158,11,0.1);">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 28px; height: 28px;">
                                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <div>
                            <h3 style="margin: 0; font-size: 1.6rem; font-weight: 900; color: #fff; letter-spacing: -0.02em; background: linear-gradient(to bottom, #fff, #a1a1aa); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Targeted Audience</h3>
                        </div>
                    </div>
                    <button onclick="document.getElementById('targeted-audience-modal').remove()" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--gray-400); transition: all 0.2s; outline: none;" onmouseover="this.style.background='rgba(239, 68, 68, 0.1)'; this.style.color='#ef4444'; this.style.borderColor='rgba(239, 68, 68, 0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'; this.style.color='var(--gray-400)'; this.style.borderColor='rgba(255,255,255,0.08)'">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 22px; height: 22px;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>

                <!-- Control Bar -->
                <div style="padding: 1.5rem 3rem; background: rgba(255,255,255,0.01); border-bottom: 1px solid rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; gap: 3rem;">
                    <div style="display: flex; align-items: center; gap: 1.25rem;">
                        <span style="font-size: 1.05rem; color: var(--gray-300); font-weight: 600;">Assignment Summary</span>
                        <div style="display: flex; align-items: center; background: rgba(245, 158, 11, 0.08); padding: 6px 16px; border-radius: 30px; border: 1px solid rgba(245, 158, 11, 0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                            <span style="font-size: 1.35rem; font-weight: 900; color: #f59e0b; margin-right: 8px;">${total}</span>
                            <span style="font-size: 0.8rem; font-weight: 700; color: var(--gray-400); text-transform: uppercase; letter-spacing: 0.05em;">Total Members</span>
                        </div>
                    </div>
                    
                    <div style="position: relative; flex: 1; max-width: 400px;">
                        <div style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--gray-500); display: flex; align-items: center; pointer-events: none;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 18px; height: 18px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        </div>
                        <input type="text" id="targetedAudienceSearch" placeholder="Search by name, reg. no or department..." oninput="filterTargetedAudienceTable()" style="background: rgba(13, 14, 28, 0.7); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 12px 18px 12px 48px; color: #fff; font-size: 0.95rem; width: 100%; outline: none; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);" />
                    </div>
                </div>

                <!-- Table Container -->
                <div style="overflow-y: auto; flex: 1; padding: 0; background: rgba(0,0,0,0.2);">
                    <table style="width: 100%; border-collapse: collapse;" id="targetedAudienceTable">
                        <thead style="position: sticky; top: 0; z-index: 100;">
                            <tr style="background: #151625; border-bottom: 2px solid rgba(255,255,255,0.08);">
                                <th style="padding: 1.25rem 1.25rem; font-size: 0.8rem; font-weight: 800; color: var(--gray-400); text-transform: uppercase; letter-spacing: 0.1em; text-align: center; width: 100px;">S.NO</th>
                                <th style="padding: 1.25rem 1.25rem; font-size: 0.8rem; font-weight: 800; color: var(--gray-400); text-transform: uppercase; letter-spacing: 0.1em; text-align: left;">Student Name</th>
                                <th style="padding: 1.25rem 1.25rem; font-size: 0.8rem; font-weight: 800; color: var(--gray-400); text-transform: uppercase; letter-spacing: 0.1em; text-align: center;">Register Number</th>
                                <th style="padding: 1.25rem 1.25rem; font-size: 0.8rem; font-weight: 800; color: var(--gray-400); text-transform: uppercase; letter-spacing: 0.1em; text-align: center;">Dept</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Close on backdrop click
    document.getElementById('targeted-audience-modal').addEventListener('click', (e) => {
        if (e.target.id === 'targeted-audience-modal') {
            e.target.remove();
        }
    });

    // Handle search input focus styling
    const searchInput = document.getElementById('targetedAudienceSearch');
    if (searchInput) {
        searchInput.addEventListener('focus', () => {
            searchInput.style.borderColor = '#f59e0b';
            searchInput.style.background = 'rgba(13, 14, 28, 0.9)';
            searchInput.style.boxShadow = '0 0 0 4px rgba(245, 158, 11, 0.12), inset 0 2px 4px rgba(0,0,0,0.4)';
            searchInput.style.maxWidth = '420px';
        });
        searchInput.addEventListener('blur', () => {
            searchInput.style.borderColor = 'rgba(255,255,255,0.1)';
            searchInput.style.background = 'rgba(13, 14, 28, 0.7)';
            searchInput.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.3)';
            searchInput.style.maxWidth = '400px';
        });
    }
}
window.openTargetedAudienceModal = openTargetedAudienceModal;

function filterTargetedAudienceTable() {
    const query = document.getElementById('targetedAudienceSearch')?.value.toLowerCase() || '';
    const table = document.getElementById('targetedAudienceTable');
    if (!table) return;
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
    });
}
window.filterTargetedAudienceTable = filterTargetedAudienceTable;

async function inspectSTMAIStudent(username) {
    // Switch to results tab
    switchSTMAITab('results');

    const placeholder = document.getElementById('stmai-results-placeholder');
    const reportView = document.getElementById('stmai-detailed-report-view');

    placeholder.style.display = 'none';
    reportView.style.display = 'block';
    reportView.innerHTML = '<div style="text-align:center;padding:3rem;"><div class="spinner-sm" style="margin: 0 auto;"></div> Loading Report...</div>';

    try {
        const results = await window.DB.getAllResults();
        const studentResult = results.find(r => r.username === username && String(r.testId) === String(currentSTMAITestId));

        if (!studentResult) throw new Error('Result details not found');

        const answers = typeof studentResult.answers === 'string' ? JSON.parse(studentResult.answers) : (studentResult.answers || {});
        const questions = typeof studentResult.questions === 'string' ? JSON.parse(studentResult.questions) : (studentResult.questions || []);
        const detailsArray = typeof studentResult.details === 'string' ? JSON.parse(studentResult.details) : (studentResult.details || []);

        reportView.innerHTML = `
        <div class="assessment-report-container" id="stmai-modal-inner-report" style="max-width: 900px; margin: 0 auto; background: var(--bg-card); border-radius: 20px; padding: 2.5rem; border: 1px solid rgba(255,255,255,0.05); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); position: relative;">
            <button onclick="document.getElementById('stmai-detailed-report-view').style.display = 'none'; document.getElementById('stmai-results-placeholder').style.display='block'; window.scrollTo(0,0);" 
                    style="position: absolute; top: 1.5rem; right: 1.5rem; background: rgba(255,255,255,0.05); color: #fff; border: none; width: 36px; height: 36px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; transition: all 0.2s; z-index: 10;">✕</button>

            <div class="assessment-report-header" style="display: flex; justify-content: center; align-items: center; margin-bottom: 2.5rem;">
                <div class="assessment-report-title" style="text-align: center;">
                    <h1 style="margin:0; font-size: 1.25rem; letter-spacing: 2px; font-weight: 800; color: #fff;">SUBMISSION ANALYSIS</h1>
                    <div style="height: 2px; width: 40px; background: var(--blue-500); margin: 8px auto 0;"></div>
                </div>
            </div>

            <div class="score-hero" style="background: rgba(255,255,255,0.02); border-radius: 16px; padding: 2rem; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 2rem;">
                <div class="score-hero-flex" style="display: flex; align-items: center; gap: 2rem; justify-content: center; flex-wrap: wrap;">
                  <div class="score-circle" style="margin: 0; flex-shrink: 0;">
                      <span class="score-value">${studentResult.score}</span>
                      <span class="score-total">%</span>
                  </div>
                  <div class="score-hero-text" style="text-align: left; min-width: 250px;">
                      <h2 style="font-size: 1.75rem; margin: 0 0 0.25rem 0; color: #fff;">${studentResult.name || username}</h2>
                      <p style="color: var(--gray-400); margin: 0 0 1rem 0; font-size: 0.95rem;">
                         Reg: ${studentResult.registerNumber || username} • ${studentResult.testName || 'Technical Assessment'}
                      </p>
                      <span class="badge" style="background: ${studentResult.score >= 50 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; color: ${studentResult.score >= 50 ? '#10b981' : '#ef4444'}; border: 1px solid currentColor; padding: 0.4rem 1rem; border-radius: 50px; font-weight: 700; font-size: 0.75rem; letter-spacing: 1px;">
                          ${studentResult.score >= 50 ? 'QUALIFIED' : 'NOT QUALIFIED'}
                      </span>
                  </div>
                </div>
            </div>

            <div class="attempt-analysis-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
               <div class="analysis-stat-card" style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.1); border-radius: 12px; padding: 1.25rem; text-align: center;">
                 <div style="font-size: 1.5rem; font-weight: 800; color: #10b981;">
                    ${questions.filter((q, i) => {
                        if (q.type === 'coding') {
                            const det = (detailsArray || [])[i];
                            return det && det.similarity === 100;
                        }
                        return answers[i] === q.answer;
                    }).length}
                 </div>
                 <div style="font-size: 0.65rem; color: #10b981; font-weight: 700; text-transform: uppercase; margin-top: 4px;">Correct</div>
               </div>
               <div class="analysis-stat-card" style="background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.1); border-radius: 12px; padding: 1.25rem; text-align: center;">
                 <div style="font-size: 1.5rem; font-weight: 800; color: #ef4444;">
                    ${questions.filter((q, i) => {
                        if (q.type === 'coding') {
                            const det = (detailsArray || [])[i];
                            return !det || det.similarity < 100;
                        }
                        return answers[i] !== q.answer;
                    }).length}
                 </div>
                 <div style="font-size: 0.65rem; color: #ef4444; font-weight: 700; text-transform: uppercase; margin-top: 4px;">Incorrect</div>
               </div>
               <div class="analysis-stat-card" style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 1.25rem; text-align: center;">
                 <div style="font-size: 1.5rem; font-weight: 800; color: #fff;">${questions.length}</div>
                 <div style="font-size: 0.65rem; color: rgba(255,255,255,0.4); font-weight: 700; text-transform: uppercase; margin-top: 4px;">Total Questions</div>
               </div>
            </div>

            <div class="question-analysis-header" style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
               <h3 style="font-size: 1rem; color: #fff; margin: 0;">Detailed Performance Review</h3>
               <span style="font-size: 0.85rem; color: var(--gray-500);">Individual Analysis</span>
            </div>

            <div class="review-grid" style="display: flex; flex-direction: column; gap: 1.5rem;">
                ${questions.map((q, idx) => {
                    const details = (detailsArray || [])[idx] || {};
                    const userAns = answers[idx] !== undefined ? answers[idx] : (details.code || "");
                    const isCoding = q.type === 'coding';
                    let isCorrect = false;
                    let similarityScore = null;

                    if (isCoding) {
                        const actual = details.actualOutput || (studentResult.actualOutputs && studentResult.actualOutputs[idx]) ? (details.actualOutput || studentResult.actualOutputs[idx]).trim() : "";
                        const expected = (q.expectedOutput || details.expectedOutput || "").trim();
                        isCorrect = actual === expected && actual !== "";
                        if (!isCorrect && actual !== "" && expected !== "") {
                            similarityScore = (details.similarity !== undefined) ? details.similarity : 0; 
                        }
                    } else {
                        isCorrect = userAns === q.answer;
                    }

                    const timeSpent = studentResult.questionTimes && studentResult.questionTimes[idx] ? Math.round(studentResult.questionTimes[idx].total / 1000) : 0;
                    
                    let containerBg = 'rgba(255,255,255,0.02)';
                    let containerBorder = 'rgba(255,255,255,0.05)';
                    if (userAns !== "") {
                      if (isCorrect) {
                        containerBg = 'rgba(16, 185, 129, 0.05)';
                        containerBorder = 'rgba(16, 185, 129, 0.2)';
                      } else {
                        containerBg = 'rgba(239, 68, 68, 0.05)';
                        containerBorder = 'rgba(239, 68, 68, 0.2)';
                      }
                    }

                    return `
                        <div class="review-item" style="background: ${containerBg}; border: 1px solid ${containerBorder}; border-radius: 16px; padding: 2rem; animation: fadeIn 0.4s ease-out;">
                            <div class="review-item-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 1rem;">
                                <span style="font-size: 0.8rem; font-weight: 800; color: var(--blue-400); text-transform: uppercase; letter-spacing: 1px;">
                                    Question ${idx + 1} • ${isCoding ? 'CODING_LAB' : 'MCQ'}
                                </span>
                                <div class="review-status-wrap" style="display: flex; gap: 1rem; align-items: center;">
                                  <span style="font-size: 0.75rem; color: var(--gray-500); background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 6px; white-space: nowrap; font-weight: 600;">⏱️ ${timeSpent}s</span>
                                  <div class="review-status ${isCorrect ? 'status-correct' : 'status-incorrect'}" style="margin: 0; padding: 6px 14px; font-size: 0.75rem; font-weight: 800; border-radius: 8px; white-space: nowrap; background: ${isCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; color: ${isCorrect ? '#10b981' : '#ef4444'};">
                                      ${isCorrect ? 'PASS' : (isCoding ? 'FAIL / PARTIAL' : 'INCORRECT')}
                                  </div>
                                </div>
                            </div>
                            
                            <div class="review-question" style="font-size: 1.15rem; margin-bottom: 2rem; line-height: 1.7; color: #fff; font-weight: 700;">${q.question}</div>
                            
                            ${isCoding ? `
                                <div class="coding-analysis" style="display: flex; flex-direction: column; gap: 1.5rem;">
                                    <div style="background: #020617; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); overflow: hidden;">
                                        <div style="background: rgba(255,255,255,0.03); padding: 0.75rem 1.25rem; font-size: 0.8rem; color: var(--gray-400); font-weight: 800; border-bottom: 1px solid rgba(255,255,255,0.08); text-transform: uppercase;">Student Response</div>
                                        <pre class="coding-pre" style="margin:0; padding: 1.5rem; color: #e2e8f0; font-family: 'Fira Code', monospace; font-size: 0.9rem; line-height: 1.6; overflow-x: auto;">${userAns || '// No code submitted'}</pre>
                                    </div>
                                    <div class="coding-output-block" style="display: grid; grid-template-columns: 1fr; gap: 1rem;">
                                        <div style="background: rgba(16, 185, 129, 0.05); border-radius: 10px; border: 1px solid rgba(16, 185, 129, 0.15); padding: 1rem;">
                                            <div style="font-size: 0.7rem; color: #10b981; font-weight: 800; margin-bottom: 0.5rem; text-transform: uppercase;">Expected Final State</div>
                                            <pre style="margin:0; font-family: monospace; font-size: 0.85rem; color: #10b981; white-space: pre-wrap;">${q.expectedOutput || details.expectedOutput || ''}</pre>
                                        </div>
                                    </div>
                                </div>
                            ` : `
                                <div class="review-options" style="display: flex; flex-direction: column; gap: 0.75rem;">
                                    ${(q.options || []).map((opt, optIdx) => {
                                        const letter = String.fromCharCode(65 + optIdx);
                                        let border = 'rgba(255,255,255,0.05)';
                                        let bg = 'rgba(255,255,255,0.02)';
                                        let color = 'inherit';
                                        
                                        if (letter === q.answer) {
                                            border = '#10b981';
                                            bg = 'rgba(16, 185, 129, 0.1)';
                                            color = '#10b981';
                                        } else if (letter === userAns && !isCorrect) {
                                            border = '#ef4444';
                                            bg = 'rgba(239, 68, 68, 0.1)';
                                            color = '#ef4444';
                                        }

                                        return `
                                        <div class="review-option" style="padding: 1rem 1.25rem; font-size: 1rem; border-radius: 12px; display: flex; align-items: center; gap: 1rem; border: 1px solid ${border}; background: ${bg}; color: ${color}; position: relative;">
                                            <div style="width: 32px; height: 32px; border-radius: 10px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 0.85rem; flex-shrink: 0; color: #fff;">${letter}</div>
                                            <span style="flex: 1; font-weight: 600;">${opt}</span>
                                            ${letter === userAns ? `<span style="font-size: 0.7rem; padding: 4px 10px; border-radius: 8px; background: ${isCorrect ? '#10b981' : '#ef4444'}; color: #fff; font-weight: 800; text-transform: uppercase; margin-left: auto;">Student Selected</span>` : ''}
                                        </div>
                                        `;
                                    }).join('')}
                                </div>
                            `}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    } catch (err) {
        reportView.innerHTML = `<div style="padding:2rem; color:#ef4444; text-align:center;">Failed to load report: ${err.message}</div>`;
    }
}

// ========== SECURE DELETE SYSTEM (SASTME) ==========
async function triggerSTMAIDelete(testId, testName) {
    if (!testId) return;

    // Use the professional logout-style modal pattern for consistency
    const modalId = 'stmai-delete-modal';
    if (document.getElementById(modalId)) return;

    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'logout-modal-overlay active';
    modal.innerHTML = `
        <div class="logout-modal" style="border-top: 4px solid #ef4444;">
            <div class="logout-modal-icon" style="background: rgba(239, 68, 68, 0.1); color: #ef4444;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:28px;height:28px;">
                    <path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2m-6 0h6"/>
                </svg>
            </div>
            <h3 class="logout-modal-title">Confirm Deletion</h3>
            <p class="logout-modal-text">Are you sure you want to delete this test? All student participation data for "${testName}" will be permanently removed.</p>
            <div class="logout-modal-actions">
                <button type="button" class="logout-modal-btn cancel" onclick="this.closest('.logout-modal-overlay').remove()">Cancel</button>
                <button type="button" class="logout-modal-btn confirm" style="background: #ef4444;" id="stmai-confirm-delete-btn">
                    Confirm Deletion
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('stmai-confirm-delete-btn').onclick = async () => {
        const btn = document.getElementById('stmai-confirm-delete-btn');
        btn.disabled = true;
        btn.textContent = 'Purging...';

        try {
            await window.DB.deleteTest(testId);
            modal.remove();
            showNotification('Test Purged', 'Assessment removed from SmartFlow systems.', 'success');
            closeSTMAIDetails(); // Return to list view
        } catch (err) {
            console.error('Delete failed:', err);
            btn.disabled = false;
            btn.textContent = 'Confirm Deletion';
            showNotification('Error', 'Purge failed: ' + err.message, 'error');
        }
    };
}

// Initialized via onclick in HTML
document.addEventListener('click', async (e) => {
    const trigger = e.target.closest('#stmai-delete-test-trigger');
    if (!trigger) return;

    const testName = document.getElementById('stmai-test-name').textContent;
    triggerSTMAIDelete(currentSTMAITestId, testName);
});

window.inspectSTMAIStudent = inspectSTMAIStudent;
window.switchSTMAITab = switchSTMAITab;
window.closeSTMAIDetails = closeSTMAIDetails;
window.viewTestAnalytics = viewTestAnalytics;
window.loadSTMAIParticipation = loadSTMAIParticipation;



// ========== NOTIFICATION SYSTEM ==========
function showNotification(title, message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'linear-gradient(135deg, #10b981, #059669)' :
            type === 'error' ? 'linear-gradient(135deg, #ef4444, #dc2626)' :
                'linear-gradient(135deg, #667eea, #764ba2)'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.75rem;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        max-width: 350px;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;

    notification.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 1rem;">
            <div style="font-size: 1.5rem;">
                ${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}
            </div>
            <div style="flex: 1;">
                <div style="font-weight: 600; margin-bottom: 0.25rem;">${title}</div>
                <div style="font-size: 0.875rem; opacity: 0.9;">${message}</div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; font-size: 1.25rem; padding: 0; opacity: 0.7;">×</button>
        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Add animation styles
if (!document.getElementById('notificationStyles')) {
    const style = document.createElement('style');
    style.id = 'notificationStyles';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(400px); opacity: 0; }
        }
        @keyframes fadeInUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}

async function deleteStudent(username) {
    if (!confirm('Are you sure you want to delete this student? This will also remove their test results.')) return;

    try {
        if (window.DB) {
            await window.DB.deleteStudent(username);
            document.querySelector(`tr[data-student-id="${username}"]`)?.remove();
            showNotification('Deleted', 'Student removed successfully.', 'success');
            loadStudents();
        }
    } catch (err) {
        console.error(err);
        showNotification('Error', 'Failed to delete student: ' + err.message, 'error');
    }
}

// ========== GLOBAL ACCESS ==========
window.deleteStudent = deleteStudent;
window.deleteTest = deleteTest;
window.viewTestAnalytics = viewTestAnalytics;
window.showNotification = showNotification;
window.lookupStudent = lookupStudent;
window.downloadSampleMCQ = downloadSampleMCQ;
window.downloadSampleCoding = downloadSampleCoding;

// ========== SAMPLE FILE DOWNLOADS (DOCX) ==========
function downloadSampleMCQ() {
    window.location.href = '/api/staff/download-mcq-template';
}

function downloadSampleCoding() {
    window.location.href = '/api/staff/download-coding-template';
}

function downloadTextFile(content, filename) {
    // Legacy function - no longer used but kept for backward compatibility if needed
}

// ========== AI QUESTION GENERATOR ==========
let currentUploadMode = 'mcq'; // 'mcq' or 'coding' — set by the upload card clicked

function triggerAiUpload(mode) {
    currentUploadMode = mode;
    const fileInput = document.getElementById('aiFileInput');
    if (!fileInput) return;
    
    // Immediate click trigger for mobile browser stack safety
    fileInput.click();
}

function initAiGenerator() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('aiFileInput');
    const extractionProgress = document.getElementById('extractionProgress');
    const processingState = document.getElementById('processingState');
    const processingTitle = document.getElementById('processingTitle');
    const processingSubtitle = document.getElementById('processingSubtitle');
    const extractionResults = document.getElementById('extractionResults');
    const resultsList = document.getElementById('extractedQuestionsList');
    const finalizeBtn = document.getElementById('finalizeExtractionBtn');
    const reUploadBtn = document.getElementById('reUploadBtn');
    const extractionSummary = document.getElementById('extractionSummary');

    if (!uploadZone || !fileInput) return;

    // Prevent the uploadZone click from triggering file input directly
    uploadZone.addEventListener('click', (e) => {
        // Only trigger if clicking directly on the zone background
        if (e.target === uploadZone) {
            // Do nothing — let users choose a specific card/button
        }
    });

    // Drag and Drop handlers (.docx only)
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length) {
            const file = e.dataTransfer.files[0];
            handleFileUpload(file);
        }
    });

    // DOCX file input change handler with mobile-specific safety
    fileInput.addEventListener('change', function(e) {
        if (this.files && this.files.length) {
            handleFileUpload(this.files[0]);
            // Reset to allow re-upload if needed
            this.value = '';
        }
    });

    // Mirroring trigger to the cards themselves for easier mobile tapping
    const cards = uploadZone.querySelectorAll('.ai-workflow-card');
    cards.forEach(card => {
        card.addEventListener('click', function(e) {
            // If the user didn't click the primary button, trigger it anyway for better mobile UX
            if (!e.target.closest('.ai-action-btn')) {
                const isMcq = this.classList.contains('mcq-path');
                triggerAiUpload(isMcq ? 'mcq' : 'coding');
            }
        });
    });

    // Re-upload button
    if (reUploadBtn) {
        reUploadBtn.addEventListener('click', () => {
            resetToUpload();
            fileInput.value = '';
        });
    }

    function resetToUpload() {
        uploadZone.style.display = 'grid';
        processingState.style.display = 'none';
        extractionResults.style.display = 'none';
        resultsList.innerHTML = '';
    }

    // ============================================================
    //  FILE UPLOAD HANDLER
    // ============================================================
    async function handleFileUpload(file) {
        // Validate file type
        if (!file.name.match(/\.docx$/i)) {
            showNotification('Invalid File', 'Please upload a Word document (.docx) file.', 'error');
            return;
        }

        // Validate file size (10 MB max)
        if (file.size > 10 * 1024 * 1024) {
            showNotification('File Too Large', 'Maximum file size is 10MB.', 'error');
            return;
        }

        // Switch to processing state
        uploadZone.style.display = 'none';
        processingState.style.display = 'block';
        extractionProgress.style.width = '0%';
        processingTitle.textContent = 'Reading Document...';
        processingSubtitle.textContent = 'Extracting text content from your Word file.';

        try {
            // Step 1: Read file as ArrayBuffer
            extractionProgress.style.width = '15%';
            const arrayBuffer = await readFileAsArrayBuffer(file);

            // Step 2: Convert DOCX to raw text via mammoth
            extractionProgress.style.width = '40%';
            processingTitle.textContent = 'Parsing Document...';
            processingSubtitle.textContent = 'Converting Word content to text.';

            const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
            const rawText = result.value;

            if (!rawText || rawText.trim().length === 0) {
                throw new Error('The document appears to be empty or could not be read.');
            }

            // STRICT MODE SEPARATION — MCQ and Coding never mix
            let questions = [];

            if (currentUploadMode === 'mcq') {
                extractionProgress.style.width = '70%';
                processingTitle.textContent = 'Extracting MCQ Questions...';
                processingSubtitle.textContent = 'Scanning for numbered questions with A–D options.';
                // Removed delay for instant response

                
                // MCQ ONLY — never falls back to coding (Web vs Mobile Strict Swappable)
                if (window.innerWidth <= 768) {
                    questions = parseMCQsFromTextStrictMobile(rawText);
                } else {
                    questions = parseMCQsFromText(rawText);
                }
            } else if (currentUploadMode === 'coding') {
                extractionProgress.style.width = '70%';
                processingTitle.textContent = 'Extracting Coding Questions...';
                processingSubtitle.textContent = 'Scanning for Question/Language/Output structures.';
                // Removed delay for instant response

                
                // CODING ONLY — never falls back to MCQ
                questions = parseCodingQuestionsFromText(rawText);
            }

            // Step 4: Show results
            extractionProgress.style.width = '100%';
            processingTitle.textContent = 'Extraction Complete!';

            // Removed delay for instant response

            if (questions.length === 0) {
                processingState.style.display = 'none';
                uploadZone.style.display = 'block';
                const errorMsg = currentUploadMode === 'mcq' 
                    ? (window.innerWidth <= 768 
                        ? 'Mobile strict extraction failed. Please ensure your document follows the A=, B=, Correct Answer= format exactly.' 
                        : 'Could not find MCQ questions. Ensure your document has numbered questions (1. / Q1.) with options labeled A–D.')
                    : 'Could not find Coding questions. Ensure your document uses the format:\nQuestion: [text]\nLanguage: [C/C++/Python/Java/JavaScript]\nOutput: [expected output]';
                showNotification('No Questions Found', errorMsg, 'error');
                return;
            }

            processingState.style.display = 'none';
            extractionResults.style.display = 'block';
            renderExtractedQuestions(questions);

            const summary = `Extracted from "${file.name}" • Review and edit below before creating quiz`;
            if (extractionSummary) extractionSummary.textContent = summary;

            showNotification('Extraction Complete',
                `Found exactly ${questions.length} question${questions.length > 1 ? 's' : ''} in ${file.name}`,
                'success');

        } catch (err) {
            console.error('[AI Generator] Extraction error:', err);
            showNotification('Extraction Failed', err.message || 'An error occurred while processing the file.', 'error');
            resetToUpload();
        }
    }

    function parseMCQsFromTextStrictMobile(text) {
        const questions = [];
        // Enhanced Normalization for reliable mobile extraction (handling different line endings/encodings)
        const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\u00A0/g, ' ').replace(/[\u200B\u200C\u200D\uFEFF]/g, '').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/\t/g, ' ').replace(/ {2,}/g, ' ');

        // 1. More aggressive Question Boundary Detection for mobile documents
        const qStartRegex = /(?:\n|^)\s*(?:Q\.?\s*|Question\s*|Part\s*|)?\d+[\.\)\-\:\s]\s*/gim;
        const startIndices = [];
        let m;
        while ((m = qStartRegex.exec(normalized)) !== null) startIndices.push(m.index);
        
        if (startIndices.length === 0) return [];

        const uniqueIndices = [...new Set(startIndices)].sort((a, b) => a - b);
        
        for (let i = 0; i < uniqueIndices.length; i++) {
            const start = uniqueIndices[i];
            const end = uniqueIndices[i + 1] || normalized.length;
            const block = normalized.substring(start, end).trim();
            if (!block) continue;

            // 2. Specialized Mobile Extraction Layer
            // Question detection prioritized before any option markers
            const qMatch = block.match(/^(?:(?:Q\.?\s*|Question\s*|Part\s*|)?\d+[\.\)\-\:\s]\s*)?([\s\S]*?)(?=\s*\b(?:\(?A[\.\)\-\/\:]+|\(?A\s*\=))\s*/im);
            const qText = qMatch ? qMatch[1].trim() : block.split('\n')[0].trim();

            const options = [];
            const letters = ['A', 'B', 'C', 'D'];
            
            letters.forEach((letter, idx) => {
                const nextMarker = letters[idx+1] || '(?:Correct\s*)?Answer';
                // Pattern for 'Option = Text' and 'Option. Text' formats commonly found in mobile versions
                const optRegex = new RegExp(`\\s*\\b\\(?${letter}\\)?\\s*(?:[=]|[\\.\\)\\-\\/\\:]+)\\s*([\\s\\S]*?)(?=\\s*\\b\\(?(?:${nextMarker})\\)?\\s*(?:[=]|[\\.\\)\\-\\/\\:]+)|$)`, 'im');
                const match = block.match(optRegex);
                
                if (match) {
                    options.push(match[1].trim().replace(/\n+/g, ' '));
                }
            });

            // 3. Robust Answer Mapping (Handling all variants found in mobile docs)
            const ansMatch = block.match(/(?:Correct\s*)?Answer\s*[=]\s*([A-E])/im) || 
                             block.match(/(?:Answer|Ans|Key)\s*[\= \.\:\-]+\s*([A-E])/im) ||
                             block.match(/(?:Answer|Ans)\s*is\s*([A-E])/im);
            
            const answer = ansMatch ? ansMatch[1].toUpperCase() : (options.length > 0 ? 'A' : '');

            // Ensure valid structure for mapping
            if (options.length === 0 && !qText) continue;
            
            while(options.length < 4) options.push(`Option ${String.fromCharCode(65 + options.length)}`);
            
            questions.push({
                type: 'mcq',
                question: (qText || 'System Generated Question').replace(/\n+/g, ' ').trim(),
                options: options.slice(0, 4),
                answer: answer || 'A'
            });
        }
        return questions;
    }

    // ============================================================
    //  STRICT MCQ PARSER — Only accepts MCQ format, rejects coding format
    // ============================================================
    function parseMCQsFromText(text) {
        const questions = [];
        const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\u00A0/g, ' ').replace(/[\u200B\u200C\u200D\uFEFF]/g, '').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, '-').replace(/\t/g, ' ').replace(/ {2,}/g, ' ');

        // 1. Anchor Question Boundaries (Instruction-Based Strictness)
        const qStartRegex = /(?:\n|^)\s*(?:Q\.?\s*|Question\s*|Part\s*|)?\d+[\.\)\-]\s*/gim;
        const startIndices = [];
        let m;
        while ((m = qStartRegex.exec(normalized)) !== null) startIndices.push(m.index);
        if (startIndices.length === 0) return []; // Require strict markers to start

        const uniqueIndices = [...new Set(startIndices)].sort((a, b) => a - b);

        for (let i = 0; i < uniqueIndices.length; i++) {
            const start = uniqueIndices[i];
            const end = uniqueIndices[i + 1] || normalized.length;
            const raw = normalized.substring(start, end).trim();
            if (!raw) continue;

            // 2. Strict Field Extraction Layer
            const qCoreMatch = raw.match(/^(?:(?:Q\.?\s*|Question\s*|Part\s*|)?\d+[\.\)\-]\s*)?([\s\S]*?)(?=\s*\b[A-E]\s*(?:=|[\.\)\-]\s*))/im);
            let qText = qCoreMatch ? qCoreMatch[1].trim() : raw.split('\n')[0].trim();

            const options = [];
            const letters = ['A', 'B', 'C', 'D'];
            
            letters.forEach((letter, idx) => {
                const nextMarker = letters[idx+1] || 'Correct Answer';
                // Priority Check for Instruction Format: 'A ='
                const strictOptRegex = new RegExp(`\\s*\\b\\(?${letter}\\)?[=]+\\s*([\\s\\S]*?)(?=\\s*\\b\\(?(?:${nextMarker})\\)?[= \\.\\)\\-\\:]+|$)`, 'im');
                let match = raw.match(strictOptRegex);
                
                // Fallback to general formatting if strict prefix not found
                if (!match) {
                    const fallbackOptRegex = new RegExp(`\\s*\\b\\(?${letter}\\)?[\\.\\)\\-]+\\s*([\\s\\S]*?)(?=\\s*\\b\\(?(?:${nextMarker})\\)?[= \\.\\)\\-\\:]+|$)`, 'im');
                    match = raw.match(fallbackOptRegex);
                }
                
                if (match) options.push(match[1].trim().replace(/\n/g, ' '));
            });

            // Correct Answer Mapping: Strictly prioritize instruction format
            const ansMatch = raw.match(/(?:Correct\s*)?Answer\s*=\s*([A-E])/im) || raw.match(/(?:Answer|Ans|Key)\s*[\= \.\:\-]+\s*([A-E])/im);
            const answer = ansMatch ? ansMatch[1].toUpperCase() : 'A';

            while(options.length < 4) options.push(`Option ${String.fromCharCode(65 + options.length)}`);

            questions.push({
                type: 'mcq',
                question: (qText || 'Empty Question').replace(/\n+/g, ' ').trim(),
                options: options.slice(0, 4),
                answer: answer
            });
        }
        return questions;
    }


    // ============================================================
    //  STRICT CODING PARSER — Only accepts Coding format, rejects MCQ format
    // ============================================================
    function parseCodingQuestionsFromText(text) {
        const questions = [];
        // Preserve structure: only normalize line endings, do NOT collapse spaces or remove newlines
        const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
                                .replace(/\u00A0/g, ' ')
                                .replace(/[\u200B\u200C\u200D\uFEFF]/g, '');

        // 1. Structural Analysis: Identify markers sequentially
        const markerDefs = [
            { type: 'question', regex: /(?:\n|^)\s*(?:Question|Q\.?|Prob\.?|Problem|Part\s*)?\s*\d+[\.\)\-\:\s]+\s*/gim },
            { type: 'question', regex: /(?:\n|^)\s*(?:Question|Q\.?|Prob\.?|Problem)\s*[\.\)\-\:\s]+\s*/gim },
            { type: 'language', regex: /(?:\n|^|\s)\b(?:Language|Lang|Program|Coding)\s*[\.\)\-\:\s]+\s*/gim },
            { type: 'output', regex: /(?:\n|^|\s)\b(?:Output|Out|Exec|Expected|Result)\s*[\.\)\-\:\s]+\s*/gim },
            { type: 'answer', regex: /(?:\n|^|\s)\b(?:Answer|Ans|Solution|Key)\s*[\.\)\-\:\s]+\s*/gim }
        ];

        let rawMarkers = [];
        markerDefs.forEach(mDef => {
            let match;
            while ((match = mDef.regex.exec(normalized)) !== null) {
                rawMarkers.push({ type: mDef.type, index: match.index, length: match[0].length });
            }
        });

        // 2. Strict De-duplication
        rawMarkers.sort((a, b) => a.index - b.index || b.length - a.length);
        const markers = [];
        let lastEnd = -1;
        rawMarkers.forEach(m => {
            if (m.index >= lastEnd) {
                markers.push(m);
                lastEnd = m.index + m.length;
            }
        });

        if (markers.length === 0) return [];

        // 3. Full Content Extraction (Zero Loss)
        let currentQ = null;
        for (let i = 0; i < markers.length; i++) {
            const current = markers[i];
            const next = markers[i + 1];
            const start = current.index + current.length;
            const end = next ? next.index : normalized.length;
            const rawContent = normalized.substring(start, end).trim();

            if (current.type === 'question') {
                if (currentQ && (currentQ.question || currentQ.expectedOutput)) questions.push(currentQ);
                currentQ = { type: 'coding', question: rawContent, language: 'python', expectedOutput: '', answer: '' };
            } else if (currentQ) {
                if (current.type === 'language') {
                    let langValue = rawContent.split(/[\s\n,]/)[0].toLowerCase();
                    if (langValue.includes('c++') || langValue === 'cpp') currentQ.language = 'cpp';
                    else if (langValue === 'c') currentQ.language = 'c';
                    else if (langValue.includes('python')) currentQ.language = 'python';
                    else if (langValue.includes('java')) currentQ.language = 'java';
                    else if (langValue.includes('js') || langValue.includes('script')) currentQ.language = 'javascript';
                    else currentQ.language = 'python';
                } else if (current.type === 'output') {
                    currentQ.expectedOutput = rawContent;
                } else if (current.type === 'answer') {
                    currentQ.answer = rawContent;
                }
            } else {
                currentQ = { type: 'coding', question: 'Recovered Problem', language: 'python', expectedOutput: '', answer: '' };
                if (current.type === 'output') currentQ.expectedOutput = rawContent;
            }
        }
        if (currentQ && (currentQ.question || currentQ.expectedOutput)) questions.push(currentQ);
        return questions;
    }

    function isQuestionLine(line) {
        return /^(?:Q\.?\s*)?(\d+)[.):\s]+\s*.+/i.test(line) ||
            /^Question\s+\d+/i.test(line);
    }

    function isOptionLine(line) {
        return /^\s*[A-Da-d][.):\s\-]/i.test(line) ||
            /^\s*\(?[A-Da-d]\)[\s\-]/i.test(line);
    }


    function parseOptionLine(line) {
        // Matches: "A. text" / "a) text" / "(A) text" / "A: text" / "A text"
        const m = line.match(/^\(?([A-Da-d])[.):\s]\)?\s*(.+)/i);
        if (m) {
            return { letter: m[1], text: m[2] };
        }
        return null;
    }

    function isAnswerLine(line) {
        return /^\s*(Answer|Ans|Correct\s*(Answer|Option)?|Key)\s*[.:)\-]\s*/i.test(line);
    }

    function parseAnswerLine(line, validLetters) {
        // Try to extract a letter: "Answer: B" / "Ans: (C)" / "Correct Answer: Option A"
        const m = line.match(/[.:)\-]\s*\(?([A-Da-d])\)?/i);
        if (m) {
            return m[1].toUpperCase();
        }
        // Try to match option text
        const textMatch = line.match(/[.:)\-]\s*(.+)/i);
        if (textMatch) {
            const ansText = textMatch[1].trim().toLowerCase();
            // Check if it mentions a letter
            for (const letter of ['a', 'b', 'c', 'd']) {
                if (ansText === letter || ansText === `option ${letter}`) {
                    return letter.toUpperCase();
                }
            }
        }
        return validLetters.length > 0 ? validLetters[0] : 'A';
    }

    function fillOptions(opts) {
        const full = [...opts];
        while (full.length < 4) {
            full.push(`Option ${String.fromCharCode(65 + full.length)}`);
        }
        return full;
    }


    // ============================================================
    //  RENDER EXTRACTED QUESTIONS (with delete per item)
    // ============================================================
    function renderExtractedQuestions(questions) {
        updateExtractedCount();
        resultsList.innerHTML = '';

        questions.forEach((q, i) => {
            const item = document.createElement('div');
            item.className = 'extracted-item bounce-in';
            const escQ = escapeHtml(q.question);

            if (currentUploadMode === 'mcq') {
                const escOpts = (q.options || []).map(o => escapeHtml(o));
                item.innerHTML = `
                    <div class="extracted-q-header">
                        <span class="q-number">${i + 1}</span>
                        <div style="flex: 1;">
                            <input type="text" class="q-input" value="${escQ}" placeholder="Question text">
                        </div>
                        <button class="btn-icon delete-extracted-btn" title="Remove this question" style="border: none; background: rgba(239, 68, 68, 0.1); color: #ef4444; padding: 10px; border-radius: 12px; cursor: pointer;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 18px; height: 18px;">
                                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                        </button>
                    </div>
                    <div class="options-grid">
                        ${['A', 'B', 'C', 'D'].map((letter, idx) => `
                            <div class="option-edit-group">
                                <span class="option-letter">${letter}</span>
                                <input type="text" class="q-input" value="${escOpts[idx] || ''}" placeholder="Option ${letter}" style="background: transparent; border: none; box-shadow: none;">
                            </div>
                        `).join('')}
                    </div>
                    <div class="answer-select-container">
                        <span style="color: var(--gray-400); font-size: 0.9rem; font-weight: 600;">Correct Answer:</span>
                        <select class="q-answer-select">
                            <option value="A" ${q.answer === 'A' ? 'selected' : ''}>Option A</option>
                            <option value="B" ${q.answer === 'B' ? 'selected' : ''}>Option B</option>
                            <option value="C" ${q.answer === 'C' ? 'selected' : ''}>Option C</option>
                            <option value="D" ${q.answer === 'D' ? 'selected' : ''}>Option D</option>
                        </select>
                    </div>
                `;
            } else {
                const escLang = escapeHtml(q.language || 'python');
                const escOut = escapeHtml(q.expectedOutput || '');
                item.innerHTML = `
                    <div class="extracted-q-header">
                        <span class="q-number">${i + 1}</span>
                        <div style="flex: 1;">
                            <textarea class="q-input" style="min-height: 100px; resize: vertical; line-height: 1.5; padding: 12px;" placeholder="Problem Statement">${escQ}</textarea>
                        </div>
                        <button class="btn-icon delete-extracted-btn" title="Remove this question" style="border: none; background: rgba(239, 68, 68, 0.1); color: #ef4444; padding: 10px; border-radius: 12px; cursor: pointer;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 18px; height: 18px;">
                                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                        </button>
                    </div>
                    <div class="coding-review-fields">
                        <div class="option-edit-group">
                            <span class="option-letter" style="color: #10b981;">LANG</span>
                            <select class="q-input q-coding-lang" style="background: transparent; border: none; box-shadow: none;">
                                <option value="c" ${escLang === 'c' ? 'selected' : ''}>C</option>
                                <option value="cpp" ${escLang === 'cpp' ? 'selected' : ''}>C++</option>
                                <option value="python" ${escLang === 'python' ? 'selected' : ''}>Python</option>
                                <option value="java" ${escLang === 'java' ? 'selected' : ''}>Java</option>
                                <option value="javascript" ${escLang === 'javascript' ? 'selected' : ''}>JavaScript</option>
                            </select>
                        </div>
                        <div class="option-edit-group">
                            <span class="option-letter" style="color: #f59e0b;">OUT</span>
                            <input type="text" class="q-input q-coding-output" value="${escOut}" placeholder="Expected Output" style="background: transparent; border: none; box-shadow: none;">
                        </div>
                    </div>
                `;
            }
            resultsList.appendChild(item);
        });

        // Bind delete buttons
        resultsList.querySelectorAll('.delete-extracted-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const item = this.closest('.extracted-item');
                item.style.transition = 'all 0.3s ease';
                item.style.opacity = '0';
                item.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    item.remove();
                    renumberExtracted();
                    updateExtractedCount();
                }, 300);
            });
        });

        updateExtractedCount();
    }

    function renumberExtracted() {
        resultsList.querySelectorAll('.extracted-item').forEach((item, idx) => {
            const numSpan = item.querySelector('.q-number');
            if (numSpan) numSpan.textContent = idx + 1;
        });
    }

    function updateExtractedCount() {
        const count = resultsList.querySelectorAll('.extracted-item').length;
        const countEl = document.getElementById('extractedCount');
        if (countEl) countEl.textContent = count;
        
        const finalizeBtn = document.getElementById('finalizeExtractionBtn');
        if (finalizeBtn) finalizeBtn.style.display = count > 0 ? 'inline-flex' : 'none';
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML.replace(/"/g, '&quot;');
    }

    // ============================================================
    //  FINALIZE → IMPORT INTO QUIZ BUILDER
    // ============================================================
    finalizeBtn.addEventListener('click', () => {
        const items = resultsList.querySelectorAll('.extracted-item');
        const finalQuestions = [];

        items.forEach(item => {
            const questionInput = item.querySelector('.q-input');
            const questionText = questionInput ? questionInput.value.trim() : "";
            if (!questionText) return;

            if (currentUploadMode === 'mcq') {
                const options = Array.from(item.querySelectorAll('.options-grid .q-input')).map(input => input.value.trim());
                const answer = item.querySelector('.q-answer-select').value;
                finalQuestions.push({
                    type: 'mcq',
                    question: questionText,
                    options: options,
                    answer: answer
                });
            } else {
                const language = item.querySelector('.q-coding-lang').value.trim();
                const expectedOutput = item.querySelector('.q-coding-output').value.trim();
                finalQuestions.push({
                    type: 'coding',
                    question: questionText,
                    language: language,
                    expectedOutput: expectedOutput
                });
            }
        });

        if (finalQuestions.length === 0) {
            showNotification('No Questions', 'There are no valid questions to import.', 'error');
            return;
        }

        switchToCreateTestWithQuestions(finalQuestions);
    });

    function switchToCreateTestWithQuestions(questions) {
        // 1. Activate Create Test UI
        const createLink = document.querySelector('[data-section="create-test"]');
        if (createLink) createLink.click();

        // 2. APPEND to existing Questions Container (do NOT clear)
        const container = document.getElementById('questionsContainer');
        if (container) {
            // If the container only has 1 default empty question, remove it first
            const existingItems = container.querySelectorAll('.question-item');
            if (existingItems.length === 1) {
                const firstQ = existingItems[0];
                const textarea = firstQ.querySelector('textarea');
                const optionInputs = firstQ.querySelectorAll('.options-grid input');
                const isBlank = (!textarea || textarea.value.trim() === '') &&
                    Array.from(optionInputs).every(inp => inp.value.trim() === '');
                if (isBlank) {
                    firstQ.remove();
                }
            }

            // Determine starting number from existing questions
            const existingCount = container.querySelectorAll('.question-item').length;
            questions.forEach((q, i) => {
                const count = existingCount + i + 1;
                const type = q.type || 'mcq';
                const html = `
                    <div class="question-item bounce-in" data-question="${count}">
                        <div class="question-header">
                            <span class="question-number">Question ${count}</span>
                            <div style="display: flex; gap: 0.5rem; align-items: center;">
                                <select class="form-input type-selector" onchange="toggleQuestionType(this)">
                                    <option value="mcq" ${type === 'mcq' ? 'selected' : ''}>MCQ Mode</option>
                                    <option value="coding" ${type === 'coding' ? 'selected' : ''}>Coding Mode</option>
                                </select>
                                <button type="button" class="remove-question-btn" title="Remove Question">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                            </div>
                        </div>
                        <div class="question-body">
                            <div class="form-group">
                                <label class="form-label">Question Text *</label>
                                <textarea class="form-input" rows="2" placeholder="Enter your question...">${escapeHtml(q.question)}</textarea>
                            </div>
                            
                            <!-- MCQ Section -->
                            <div class="mcq-options" style="display: ${type === 'mcq' ? 'block' : 'none'}">
                                <div class="options-grid">
                                    ${(q.options || ['', '', '', '']).map((opt, j) => `
                                        <div class="option-group">
                                            <input type="text" class="form-input" placeholder="Option ${String.fromCharCode(65 + j)}" value="${escapeHtml(opt)}">
                                        </div>
                                    `).join('')}
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Correct Option</label>
                                    <select class="form-input mcq-answer">
                                        <option value="A" ${q.answer === 'A' ? 'selected' : ''}>Option A</option>
                                        <option value="B" ${q.answer === 'B' ? 'selected' : ''}>Option B</option>
                                        <option value="C" ${q.answer === 'C' ? 'selected' : ''}>Option C</option>
                                        <option value="D" ${q.answer === 'D' ? 'selected' : ''}>Option D</option>
                                    </select>
                                </div>
                            </div>

                            <!-- Coding Section -->
                            <div class="coding-options" style="display: ${type === 'coding' ? 'block' : 'none'}">
                                <div class="form-group">
                                    <label class="form-label">Programming Language *</label>
                                    <div class="languages-checkbox-group" style="display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 0.5rem;">
                                      <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--gray-300); cursor: pointer;">
                                        <input type="radio" name="allowed_language_${count}" value="c" ${q.language === 'c' ? 'checked' : ''}> C
                                      </label>
                                      <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--gray-300); cursor: pointer;">
                                        <input type="radio" name="allowed_language_${count}" value="cpp" ${q.language === 'cpp' ? 'checked' : ''}> C++
                                      </label>
                                      <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--gray-300); cursor: pointer;">
                                        <input type="radio" name="allowed_language_${count}" value="python" ${q.language === 'python' ? 'checked' : ''}> Python
                                      </label>
                                      <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--gray-300); cursor: pointer;">
                                        <input type="radio" name="allowed_language_${count}" value="java" ${q.language === 'java' ? 'checked' : ''}> Java
                                      </label>
                                      <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--gray-300); cursor: pointer;">
                                        <input type="radio" name="allowed_language_${count}" value="javascript" ${q.language === 'javascript' || !q.language ? 'checked' : ''}> JavaScript
                                      </label>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Expected Output (Reference) *</label>
                                    <textarea class="form-input expected-output" rows="3" placeholder="Expected execution output...">${escapeHtml(q.expectedOutput || '')}</textarea>
                                </div>
                            </div>
                        </div>
                    </div>`;
                container.insertAdjacentHTML('beforeend', html);
            });

            // Re-bind remove buttons for newly added items
            container.querySelectorAll('.remove-question-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    if (container.children.length > 1) {
                        this.closest('.question-item').remove();
                        updateQuestionNumbers();
                    }
                });
            });

            // Re-number all questions sequentially after append
            updateQuestionNumbers();
        }

        const totalNow = document.querySelectorAll('#questionsContainer .question-item').length;
        showNotification('Questions Imported',
            `Successfully added ${questions.length} question${questions.length > 1 ? 's' : ''}. Total questions: ${totalNow}.`,
            'info');

        // Reset AI Gen Section for next time
        resetToUpload();
    }

    // ============================================================
    //  UTILITIES
    // ============================================================
    function readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file.'));
            reader.readAsArrayBuffer(file);
        });
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
