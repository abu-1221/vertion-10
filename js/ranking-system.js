/**
 * Ranking System for JMC-Test
 * Handles per-test and overall student rankings.
 */

window.RankingSystem = {
    /**
     * Load and display ranking for a specific test
     */
    async loadTestRanking(testId) {
        const container = document.getElementById('stmai-tab-ranking');
        if (!container) return;

        container.innerHTML = `<div style="text-align:center; padding:3rem;"><span class="spinner"></span> <span style="margin-left: 10px; color: var(--gray-400);">Calibrating Rankings...</span></div>`;

        try {
            const participation = await window.DB.getTestParticipation(testId);
            const attended = participation.filter(p => p.status === 'attended' || p.score !== null);

            if (attended.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 4rem 2rem; color: #64748b; background: rgba(26, 27, 46, 0.4); border-radius: 20px; border: 1px dashed rgba(255,255,255,0.05);">
                        <p style="font-size: 1rem; font-weight: 600; color: #fff;">No participation data detected.</p>
                        <p style="font-size: 0.85rem; margin-top: 0.5rem; opacity: 0.6;">Waiting for candidate responses.</p>
                    </div>`;
                return;
            }

            const sorted = attended.sort((a, b) => (b.score || 0) - (a.score || 0));

            let html = `
                <style>
                    @keyframes minimalFadeIn {
                        from { opacity: 0; transform: translateY(5px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                </style>
                <div style="background: #0d0e1c; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.08); overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.4); animation: minimalFadeIn 0.3s ease-out;">
                    <div style="padding: 1rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: space-between; background: rgba(99, 102, 241, 0.05);">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <div style="width: 32px; height: 32px; background: rgba(99, 102, 241, 0.2); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #818cf8;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
                            </div>
                            <div>
                                <h3 style="margin: 0; font-size: 1rem; font-weight: 700; color: #fff;">Test Performance</h3>
                                <p style="margin: 0; font-size: 0.65rem; color: #64748b; font-weight: 600; text-transform: uppercase;">Ranked Participants</p>
                            </div>
                        </div>
                        <div style="background: rgba(16, 185, 129, 0.1); padding: 0.3rem 0.75rem; border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.2); color: #34d399; font-size: 0.65rem; font-weight: 700;">
                            ${attended.length} CANDIDATES
                        </div>
                    </div>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left; min-width: 600px;">
                            <thead>
                                <tr style="background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.06);">
                                    <th style="padding: 0.75rem 1.5rem; text-align: center; width: 60px; color: #64748b; font-size: 0.65rem; font-weight: 700; text-transform: uppercase;">Rank</th>
                                    <th style="padding: 0.75rem 1.5rem; color: #64748b; font-size: 0.65rem; font-weight: 700; text-transform: uppercase;">Register No</th>
                                    <th style="padding: 0.75rem 1.5rem; color: #64748b; font-size: 0.65rem; font-weight: 700; text-transform: uppercase;">Student Full Name</th>
                                    <th style="padding: 0.75rem 1.5rem; text-align: right; color: #64748b; font-size: 0.65rem; font-weight: 700; text-transform: uppercase;">Test Score</th>
                                </tr>
                            </thead>
                            <tbody>
            `;

            sorted.forEach((item, index) => {
                const rank = index + 1;
                let rankColor = "#94a3b8";
                if (rank === 1) rankColor = "#6366f1";
                else if (rank === 2) rankColor = "#10b981";
                else if (rank === 3) rankColor = "#f59e0b";

                html += `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.03); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
                        <td style="padding: 0.6rem 1.5rem; text-align: center;">
                            <div style="width: 28px; height: 28px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.85rem; background: rgba(255,255,255,0.05); color: ${rankColor};">
                                ${rank}
                            </div>
                        </td>
                        <td style="padding: 0.6rem 1.5rem;">
                            <span style="font-size: 0.9rem; color: #fff; font-family: monospace; font-weight: 800; letter-spacing: 0.02em;">${item.username}</span>
                        </td>
                        <td style="padding: 0.6rem 1.5rem;">
                            <span style="font-weight: 600; font-size: 0.9rem; color: #fff;">${item.studentName || item.username}</span>
                        </td>
                        <td style="padding: 0.6rem 1.5rem; text-align: right;">
                            <div style="background: rgba(99, 102, 241, 0.1); padding: 0.25rem 0.6rem; border-radius: 4px; border: 1px solid rgba(99, 102, 241, 0.2); color: #818cf8; font-weight: 700; font-size: 0.85rem; display: inline-block;">
                                ${item.score} / ${item.totalQuestions || '-'}
                            </div>
                        </td>
                    </tr>
                `;
            });

            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            container.innerHTML = html;
        } catch (error) {
            console.error("Ranking Load Error:", error);
            container.innerHTML = `<div style="text-align:center; padding: 4rem; color: #ef4444; background: rgba(239, 68, 68, 0.05); border-radius: 20px; border: 1px dashed rgba(239, 68, 68, 0.2);">Could not retrieve leaderboard data. Please try again.</div>`;
        }
    },

    /**
     * Load and display overall ranking across all tests
     */
    async loadOverallRanking() {
        const container = document.getElementById('overall-ranking-list');
        if (!container) return;

        container.innerHTML = `<div style="text-align:center; padding:3rem;"><span class="spinner"></span></div>`;

        try {
            const allResults = await window.DB.getAllResults();
            const performanceMap = {};

            allResults.forEach(res => {
                if (!performanceMap[res.username]) {
                    performanceMap[res.username] = {
                        name: res.studentName || res.username,
                        totalPoints: 0,
                        testCount: 0
                    };
                }
                const score = res.score || 0;
                const total = res.totalQuestions || 1;
                const percent = (score / total) * 100;

                performanceMap[res.username].totalPoints += percent;
                performanceMap[res.username].testCount += 1;
            });

            const rankingData = Object.keys(performanceMap).map(username => {
                const data = performanceMap[username];
                return {
                    username,
                    name: data.name,
                    avgScore: Math.round(data.totalPoints / data.testCount)
                };
            });

            const sorted = rankingData.sort((a, b) => b.avgScore - a.avgScore);
            
                window.renderOverallRanking = (filter = "") => {
                    const filtered = filter 
                        ? sorted.filter(s => s.username.toLowerCase().includes(filter.toLowerCase()))
                        : sorted;

                    let html = `
                        <div style="background: #0d0e1c; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.4); display: flex; flex-direction: column; animation: minimalFadeIn 0.3s ease-out; margin-top: -0.5rem; transform: scale(1.02); transform-origin: top center;">
                            <div style="padding: 0.75rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: space-between; background: rgba(99, 102, 241, 0.05);">
                                <div style="display: flex; align-items: center; gap: 0.75rem;">
                                    <div style="width: 28px; height: 28px; background: #6366f1; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #fff;">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 14px; height: 14px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                    </div>
                                    <div>
                                        <h3 style="margin: 0; font-size: 1rem; font-weight: 700; color: #fff;">Global Leaderboard</h3>
                                        <p style="margin: 0; font-size: 0.6rem; color: #64748b; font-weight: 600; text-transform: uppercase;">Overall Ranking</p>
                                    </div>
                                </div>
                                <div style="text-align: right; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); padding: 0.75rem 1.5rem; border-radius: 16px; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 8px 25px rgba(99,102,241,0.3);">
                                    <span style="font-size: 1.5rem; font-weight: 1000; color: #fff; display: block; line-height: 1; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">${filtered.length}</span>
                                    <p style="margin: 0.3rem 0 0; font-size: 0.6rem; color: rgba(255,255,255,0.9); font-weight: 800; text-transform: uppercase; letter-spacing: 1.2px;">Total Candidates</p>
                                </div>
                            </div>

                            <!-- Simplified Search Row -->
                            <div style="padding: 0.75rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(0,0,0,0.2); display: flex; gap: 0.75rem; align-items: center;">
                                <div style="position: relative; height: 34px; flex: 1; max-width: 450px; display: flex; align-items: center; background: rgba(13, 14, 28, 0.95); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px;">
                                    <input type="text" id="rankingSearchInput" 
                                        placeholder="Enter the Register No" 
                                        value="${filter}"
                                        autocomplete="off" 
                                        style="width: 100%; height: 100%; padding-left: 1rem; padding-right: 2.5rem; border: none; background: transparent; color: #fff; font-size: 0.8rem;" 
                                        oninput="window.renderOverallRanking(this.value)" />
                                    <button class="search-clear-btn ${filter ? 'visible' : ''}" onclick="window.renderOverallRanking('')" style="right: 0.5rem; width: 22px; height: 22px; position: absolute;">
                                        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="3">
                                            <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                </div>
                                <button class="btn btn-primary" style="height: 34px; padding: 0 1.25rem; font-size: 0.8rem; border-radius: 6px;">Find Rank</button>
                            </div>
                            
                            <!-- Unified Ranking Container -->
                            <div style="background: rgba(0,0,0,0.2); ${filtered.length > 12 ? 'max-height: 580px; overflow-y: auto;' : ''} scrollbar-width: thin; padding: 0;">
                                <table style="width: 100%; border-collapse: collapse; text-align: center; table-layout: fixed;">
                                    <thead>
                                        <tr style="background: rgba(255,255,255,0.02); border-bottom: 2px solid rgba(255,255,255,0.1); position: sticky; top: 0; z-index: 20;">
                                            <th style="padding: 1.2rem 0; width: 80px; background: #0d0e1c; color: #fff; font-size: 0.75rem; font-weight: 900; text-transform: uppercase; text-align: center;">Rank</th>
                                            <th style="padding: 1.2rem; width: 200px; background: #0d0e1c; color: #fff; font-size: 0.75rem; font-weight: 900; text-transform: uppercase; text-align: center;">Register Number</th>
                                            <th style="padding: 1.2rem; background: #0d0e1c; color: #fff; font-size: 0.75rem; font-weight: 900; text-transform: uppercase; text-align: center;">Name</th>
                                            <th style="padding: 1.2rem 0; width: 150px; background: #0d0e1c; color: #fff; font-size: 0.75rem; font-weight: 900; text-transform: uppercase; text-align: center;">Average Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                    `;

                    if (filtered.length === 0) {
                        html += `
                            <tr>
                                <td colspan="4">
                                    <div style="text-align: center; padding: 4rem 2rem; color: #64748b;">
                                        <p style="font-size: 0.9rem; font-weight: 600; color: #fff;">No records found for "${filter}"</p>
                                    </div>
                                </td>
                            </tr>`;
                    } else {
                        filtered.forEach((item, index) => {
                            const rank = sorted.indexOf(item) + 1;
                            let rankColor = "#94a3b8";
                            let rowBg = "transparent";
                            let scoreColor = "#818cf8";
                            let scoreBg = "rgba(99, 102, 241, 0.1)";
                            let nameSize = "0.95rem";
                            let nameWeight = "600";

                            if (rank === 1) {
                                rankColor = "#6366f1";
                                rowBg = "rgba(99, 102, 241, 0.08)";
                                scoreColor = "#60a5fa";
                                scoreBg = "rgba(59, 130, 246, 0.2)";
                                nameSize = "1.2rem";
                                nameWeight = "900";
                            } else if (rank === 2) {
                                rankColor = "#10b981";
                                rowBg = "rgba(16, 185, 129, 0.05)";
                                scoreColor = "#34d399";
                                scoreBg = "rgba(52, 211, 153, 0.15)";
                                nameSize = "1.1rem";
                                nameWeight = "850";
                            } else if (rank === 3) {
                                rankColor = "#f59e0b";
                            }

                             html += `
                                <tr onclick="if(window.lookupStudent) window.lookupStudent('${item.username}')" 
                                    style="border-bottom: 1px solid rgba(255,255,255,0.03); cursor: pointer; transition: background 0.2s ease; background: ${rowBg};"
                                    onmouseover="this.style.background='rgba(99, 102, 241, 0.08)'"
                                    onmouseout="this.style.background='${rowBg}'">
                                    <td style="padding: 1.2rem 0; width: 80px; text-align: center;">
                                        <div style="width: 36px; height: 36px; margin: 0 auto; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1rem; background: rgba(255,255,255,0.06); color: ${rankColor}; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                                            ${rank}
                                        </div>
                                    </td>
                                    <td style="padding: 1.2rem; width: 200px; text-align: center;">
                                        <span style="font-size: 0.95rem; color: #fff; font-family: 'JetBrains Mono', monospace; font-weight: 800; letter-spacing: 0.08em;">${item.username}</span>
                                    </td>
                                    <td style="padding: 1.2rem; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                        <span style="font-weight: ${nameWeight}; font-size: ${nameSize}; color: #fff; letter-spacing: -0.01em;">${item.name}</span>
                                    </td>
                                    <td style="padding: 1.2rem 0; width: 150px; text-align: center;">
                                        <div style="background: ${scoreBg}; width: 90px; height: 38px; margin: 0 auto; display: flex; align-items: center; justify-content: center; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                                            <span style="font-weight: 900; font-size: 1rem; color: ${scoreColor}; text-align: center;">${item.avgScore}%</span>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        });
                    }

                    html += `
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `; 
                    
                    container.innerHTML = html;

                    // Maintain focus if typing
                    if (filter) {
                        const input = document.getElementById('rankingSearchInput');
                        if (input) {
                            input.focus();
                            input.setSelectionRange(filter.length, filter.length);
                        }
                    }
                };

            // Initial render
            window.renderOverallRanking("");
        } catch (error) {
            console.error("Overall Ranking Error:", error);
            container.innerHTML = `
                <div style="text-align:center; padding: 3rem 2rem; background: rgba(20, 10, 10, 0.8); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 20px;">
                    <h3 style="color: #fff; font-size: 1.2rem; font-weight: 800; margin-bottom: 0.5rem;">Ranking Engine Failure</h3>
                    <p style="color: #94a3b8; font-size: 0.9rem; line-height: 1.5; max-width: 400px; margin: 0 auto;">
                        A global ranking engine failure occurred. System metrics are being evaluated.
                    </p>
                </div>
            `;
        }
    }
};
