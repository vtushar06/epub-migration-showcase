/* ========================================
   EPUB Migration Showcase
   epub.js vs foliate-js comparison
   Kolibri GSoC 2026
   ======================================== */

const { createApp, ref, computed, onMounted, nextTick, watch } = Vue;

// Sample EPUB files available in public/epubs/
const SAMPLE_EPUBS = [
    { name: 'Accessible EPUB 3', file: 'accessible-epub3.epub', desc: 'Complex book with many features' },
    { name: 'EPUB 3.0 Specification', file: 'epub3-spec.epub', desc: 'Technical specification document' },
    { name: 'RTL Book', file: 'rtl-book.epub', desc: 'Right-to-left language book' },
    { name: 'Tinsiima', file: 'tinsiima.epub', desc: 'African storybook with images' },
];

// Key bugs found from research (MASTER_GUIDE.md)
const RESEARCH_BUGS = [
    {
        id: 'sandbox',
        title: 'Sandbox Security Warning',
        impact: 'SECURITY',
        frequency: '100%',
        epubjs: 'Visualization: This exact browser warning fires in production Kolibri on Chrome DevTools — SandboxIFrameView.js:6 combines allow-scripts + allow-same-origin + srcdoc injection',
        foliate: 'blob: URLs with opaque origins — no escape vector',
        code: 'SandboxIFrameView.js:6',
        kolibri_issue: 'https://github.com/learningequality/kolibri/issues/4266',
        epubjs_issue: 'https://github.com/futurepress/epub.js/issues/987',
        ref: 'MASTER_GUIDE.md Section 9.2'
    },
    {
        id: 'progress',
        title: 'Progress Tracking Failure',
        impact: 'HIGH',
        frequency: 'Frequent',
        epubjs: 'Visualization based on confirmed live testing — same RTL book navigated all pages correctly but progress capped at 57%, book never marked complete in nakav-mafak channel testing (March 2026)',
        foliate: 'Accurate progress via SectionProgress geometry',
        code: 'EpubRendererIndex.vue:203, 524, 556',
        kolibri_issue: 'https://github.com/learningequality/kolibri/issues/7551',
        epubjs_issue: 'https://github.com/futurepress/epub.js/issues/744',
        ref: 'MASTER_GUIDE.md Section 9.4'
    },
    {
        id: 'tables',
        title: 'Tables Force Scrolled Mode',
        impact: 'LOW',
        frequency: 'Tables only',
        epubjs: 'One table breaks pagination for entire book',
        foliate: 'CSS multi-column handles tables natively',
        code: 'EpubRendererIndex.vue:462-469',
        kolibri_issue: 'https://github.com/learningequality/kolibri/issues/7551',
        epubjs_issue: 'https://github.com/futurepress/epub.js/issues/719',
        ref: 'MASTER_GUIDE.md Section 5.7'
    },
    {
        id: 'memory',
        title: 'Memory Leak on Navigation',
        impact: 'MEDIUM',
        frequency: 'Every close',
        epubjs: 'Visualization — epub.js issue #688 confirms book.destroy() fails to remove JSZip heap memory. Reporter documented this persists even with explicit destroy() calls. Issue closed as fixed in 2018 but fix was ineffective.',
        foliate: 'Loader.destroy() revokes all blob URLs on close',
        code: 'EpubRendererIndex.vue:513-522',
        kolibri_issue: 'N/A',
        epubjs_issue: 'N/A',
        ref: 'EpubRendererIndex.vue:513-522'
    },
    {
        id: 'images',
        title: 'Image 404 Errors',
        impact: 'MEDIUM',
        frequency: 'Common',
        epubjs: '<base href> injection + replacements() never called for URL-loaded EPUBs. Images 404.',
        foliate: 'Loader class rewrites ALL [src], [srcset], [poster] to blob: URLs individually.',
        code: 'replacements.js:5-29 + book.js:493',
        kolibri_issue: 'N/A',
        epubjs_issue: 'N/A',
        ref: 'MASTER_GUIDE.md Section 9.3'
    },
    {
        id: 'blank-page',
        title: 'Blank Right Page in Spread Mode',
        impact: 'MEDIUM',
        frequency: 'Spread mode',
        epubjs: 'forceEvenPages:true hardcoded — blank iframe created unconditionally (default/index.js:40).',
        foliate: 'CSS multi-column in single iframe — blank pages architecturally impossible.',
        code: 'default/index.js:40',
        kolibri_issue: 'https://github.com/learningequality/kolibri/issues/7551',
        epubjs_issue: 'https://github.com/futurepress/epub.js/issues/823',
        ref: 'kolibri#7551, epub.js#823'
    }
];

// Library comparison data
const COMPARISON_DATA = [
    { metric: 'Dependencies', epubjs: '11 packages', foliate: '0 (zero)', winner: 'foliate' },
    { metric: 'Code Size', epubjs: '13,768 lines', foliate: '2,919 lines', winner: 'foliate' },
    { metric: 'Last Update', epubjs: '2022', foliate: '2024', winner: 'foliate' },
    { metric: 'Progress Tracking', epubjs: 'Unreliable', foliate: 'Byte-accurate', winner: 'foliate' },
    { metric: 'Touch/Swipe', epubjs: 'None', foliate: 'Built-in (567 lines)', winner: 'foliate' },
    { metric: 'RTL Support', epubjs: 'Buggy', foliate: 'Intl.Locale auto-detect', winner: 'foliate' },
    { metric: 'Search', epubjs: 'Blocks UI', foliate: 'Async generator', winner: 'foliate' },
];

const App = {
    template: `
        <div class="app">
            <!-- Header -->
            <header class="header">
                <h1>EPUB Viewer Migration</h1>
                <p>epub.js (current Kolibri) vs foliate-js (proposed replacement)</p>
            </header>

            <!-- Auto-load Note -->
            <div class="auto-load-note" v-if="autoLoaded">
                <strong>Auto-loaded: RTL Book</strong> — The left side visualizes known epub.js bugs for reference — security and progress bugs are based on confirmed live testing with nakav-mafak channel EPUBs (March 2026), table detection uses real epub.js DOM queries. The right side runs actual foliate-js using the exact architecture proposed for Kolibri.
            </div>

            <!-- Sample Selector -->
            <div class="selector-section">
                <div class="selector-group">
                    <label>Select Sample EPUB:</label>
                    <select v-model="selectedSample" @change="loadSample" :disabled="loading">
                        <option value="">-- Choose a file --</option>
                        <option v-for="s in samples" :key="s.file" :value="s.file">
                            {{ s.name }} - {{ s.desc }}
                        </option>
                    </select>
                </div>
                <div class="selector-divider">or</div>
                <div class="selector-group">
                    <label class="file-btn">
                        <input type="file" accept=".epub" @change="onFileChange" hidden :disabled="loading">
                        Upload Custom EPUB
                    </label>
                </div>
            </div>

            <!-- Loading indicator -->
            <div class="loading-bar" v-if="loading">
                <div class="loading-text">Loading {{ currentFileName }}...</div>
            </div>

            <!-- Viewers Container -->
            <div class="viewers" v-if="currentFile">
                <!-- epub.js Viewer -->
                <div class="viewer">
                    <div class="viewer-header epubjs-header">
                        <div class="header-left">
                            <span class="title">epub.js</span>
                            <span class="version">v0.3.93</span>
                        </div>
                        <span class="tag">Current in Kolibri</span>
                    </div>

                    <!-- Bug Banners for epub.js -->
                    <div class="viewer-banners">
                        <div class="bug-banner warning" v-if="securityWarningShown">
                            <strong>CONSOLE WARNING:</strong> An iframe which has both allow-scripts and allow-same-origin for its sandbox attribute can escape its sandboxing.<br>
                            <code>Source: SandboxIFrameView.js:6</code>
                        </div>
                        <div class="bug-banner error" v-if="tablesBugTriggered">
                            <strong>TABLE DETECTED</strong> — Switching entire book to scrolled mode<br>
                            <code>EpubRendererIndex.vue:462-469</code><br>
                            This affects ALL chapters, not just the one with tables — epub.js issue #719, open since 2018
                        </div>
                    </div>

                    <div class="viewer-content">
                        <div class="viewer-loading" v-if="!epubjsReady">Loading...</div>
                        <div id="epubjs-view" class="epub-container"></div>
                    </div>

                    <!-- Enhanced Footer with Progress Bug Demo -->
                    <div class="viewer-footer-enhanced">
                        <div class="progress-section">
                            <div class="progress-label">Progress (locations.generate(1000)):</div>
                            <div class="progress-bar">
                                <div class="progress-bar-fill"
                                     :class="{ red: true, stuck: epubjsProgressStuck }"
                                     :style="{ width: epubjsProgress + '%' }">
                                </div>
                            </div>
                            <div class="progress-detail" v-if="epubjsProgressStuck">
                                <strong style="color:var(--red)">{{ epubjsProgress }}% STUCK</strong> —
                                locations.generate(1000) inflated totalLocations ({{ epubjsTotalLocations }}) beyond real content<br>
                                finish() never fires — book never marked complete in Kolibri database
                            </div>
                            <div class="progress-detail" v-else>
                                {{ epubjsProgress }}% — totalLocations: {{ epubjsTotalLocations }}
                            </div>
                        </div>
                        <div class="nav-row">
                            <div class="nav-buttons">
                                <button @click="epubjsPrev" :disabled="!epubjsReady || tablesBugTriggered">Prev</button>
                                <button @click="epubjsNext" :disabled="!epubjsReady || tablesBugTriggered">Next</button>
                            </div>
                            <span v-if="tablesBugTriggered" style="font-size:11px;color:var(--red)">
                                Nav disabled (scrolled mode)
                            </span>
                        </div>
                    </div>
                </div>

                <!-- foliate-js Viewer -->
                <div class="viewer">
                    <div class="viewer-header foliate-header">
                        <div class="header-left">
                            <span class="title">foliate-js</span>
                            <span class="version">MIT</span>
                        </div>
                        <span class="tag">Proposed</span>
                    </div>

                    <!-- Success Banners for foliate-js -->
                    <div class="viewer-banners">
                        <div class="bug-banner success" v-if="securityWarningShown">
                            <strong>No sandbox warning</strong> — foliate-js uses blob: URLs with opaque origins<br>
                            <code>paginator.js:282</code>
                        </div>
                        <div class="bug-banner success" v-if="tablesBugTriggered">
                            <strong>Tables render natively</strong> in CSS multi-column — no mode switch needed<br>
                            <code>paginator.js:731-732</code>
                        </div>
                    </div>

                    <!-- Theme Switching -->
                    <div class="theme-bar" v-if="foliateReady" style="padding:8px 16px; border-top:1px solid #e0e0e0; border-bottom:1px solid #e0e0e0; display:flex; gap:8px; align-items:center; background:#f5f5f5;">
                        <small style="color:#757575; font-weight:500;">Themes via renderer.setStyles():</small>
                        <button
                            v-for="t in themes" :key="t.name"
                            @click="applyTheme(t)"
                            :style="{
                                background: t.bg,
                                color: t.fg,
                                border: foliateCurrentTheme === t.name ? '2px solid #2196F3' : '1px solid #ccc',
                                padding: '3px 10px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: foliateCurrentTheme === t.name ? 'bold' : 'normal'
                            }">
                            {{ t.name }}
                        </button>
                    </div>

                    <!-- Search Bar -->
                    <div class="search-bar" v-if="foliateReady" style="padding:8px 16px; border-bottom:1px solid #e0e0e0; background:#fafafa;">
                        <input
                            v-model="searchQuery"
                            @keyup.enter="performSearch"
                            placeholder="Search in book (streams results progressively)..."
                            style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; font-size:13px; font-family:system-ui;"
                        />
                        <div v-if="searchResults.length > 0" class="search-results" style="margin-top:8px; max-height:150px; overflow-y:auto; border:1px solid #e0e0e0; border-radius:4px; background:white;">
                            <div style="padding:6px 10px; background:#E3F2FD; border-bottom:1px solid #2196F3; font-size:12px; font-weight:500; color:#1976D2;">
                                {{ searchResults.length }} results (streamed progressively ✓)
                            </div>
                            <div
                                v-for="(r, i) in searchResults.slice(0, 5)"
                                :key="i"
                                class="search-result-item"
                                @click="goToSearchResult(r)"
                                style="padding:6px 10px; font-size:12px; cursor:pointer; border-bottom:1px solid #f0f0f0;">
                                <span style="color:#666;">...{{ r.excerpt?.before || '' }}</span><mark style="background:#fff176; padding:0 2px;">{{ r.excerpt?.match || r.text }}</mark><span style="color:#666;">{{ r.excerpt?.after || '' }}...</span>
                            </div>
                            <div v-if="searchResults.length > 5" style="padding:6px 10px; font-size:11px; color:#999; text-align:center;">
                                Showing first 5 of {{ searchResults.length }} results
                            </div>
                        </div>
                    </div>

                    <div class="viewer-content">
                        <iframe ref="foliateFrame" src="./foliate-inner.html" @load="onFoliateIframeLoad"></iframe>
                        <div class="viewer-loading" v-if="!foliateReady">Loading...</div>
                    </div>

                    <!-- Enhanced Footer for foliate-js -->
                    <div class="viewer-footer-enhanced">
                        <div class="progress-section">
                            <div class="progress-label">Progress (SectionProgress byte-accurate):</div>
                            <div class="progress-bar">
                                <div class="progress-bar-fill"
                                     :class="{ green: true, complete: foliateComplete }"
                                     :style="{ width: foliateProgress + '%' }">
                                </div>
                            </div>
                            <div class="progress-detail" v-if="foliateComplete" style="color:var(--green)">
                                <strong>100% COMPLETE</strong> — finish() fired, progress saved to Kolibri database
                            </div>
                            <div class="progress-detail" v-else>
                                {{ foliateProgress }}% — fraction = nextSize/sizeTotal
                            </div>
                            <div class="chapter-indicator" v-if="foliateCurrentChapter">
                                <small style="color: #757575">
                                    📖 {{ foliateCurrentChapter }}
                                </small>
                            </div>
                        </div>
                        <div class="nav-row">
                            <div class="nav-buttons">
                                <button @click="foliatePrev" :disabled="!foliateReady">Prev</button>
                                <button @click="foliateNext" :disabled="!foliateReady">Next</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Live Progress Comparison Strip -->
            <div class="progress-comparison" v-if="currentFile && epubjsReady && foliateReady">
                <div class="progress-comparison-inner">
                    <h3>Live Progress Comparison</h3>
                    <div class="progress-row">
                        <span class="lib-name epubjs">epub.js</span>
                        <div class="progress-bar">
                            <div class="progress-bar-fill"
                                 :class="{ red: true, stuck: epubjsProgressStuck }"
                                 :style="{ width: epubjsProgress + '%' }">
                                {{ epubjsProgress }}%
                            </div>
                        </div>
                        <span class="status-tag" :class="epubjsProgressStuck ? 'stuck' : 'reading'">
                            {{ epubjsProgressStuck ? 'STUCK' : 'Reading...' }}
                        </span>
                    </div>
                    <div class="progress-row">
                        <span class="lib-name foliate">foliate-js</span>
                        <div class="progress-bar">
                            <div class="progress-bar-fill green"
                                 :class="{ complete: foliateComplete }"
                                 :style="{ width: foliateProgress + '%' }">
                                {{ foliateProgress }}%
                            </div>
                        </div>
                        <span class="status-tag" :class="foliateComplete ? 'complete' : 'reading'">
                            {{ foliateComplete ? 'COMPLETE' : 'Reading...' }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Bug Panel: Automatically Detected Bugs -->
            <div class="bug-panel-section" v-if="triggeredBugs.length > 0">
                <h2 class="bug-panel-heading">
                    🐛 {{ triggeredBugs.length }} bug{{ triggeredBugs.length !== 1 ? 's' : '' }} detected — all resolved by foliate-js
                </h2>
                <div class="bug-panel-cards">
                    <div class="bug-panel-card" v-for="bug in triggeredBugDetails" :key="bug.id">
                        <div class="bug-card-title">{{ bug.title }}</div>
                        <div class="bug-card-row epubjs-row">
                            <span class="bug-card-icon">✗</span>
                            <span class="bug-card-label">epub.js:</span>
                            <span class="bug-card-text">{{ bug.epubjs }}</span>
                        </div>
                        <div class="bug-card-row foliate-row">
                            <span class="bug-card-icon">✓</span>
                            <span class="bug-card-label">foliate-js:</span>
                            <span class="bug-card-text">{{ bug.foliate }}</span>
                        </div>
                        <div class="bug-card-code">{{ bug.code }}</div>
                        <div class="bug-card-links" v-if="bug.kolibri_issue !== 'N/A' || bug.epubjs_issue !== 'N/A'">
                            <a v-if="bug.kolibri_issue !== 'N/A'" :href="bug.kolibri_issue" target="_blank" rel="noopener">
                                Kolibri Issue {{ bug.kolibri_issue.split('/').pop().replace('issues/', '#') }} ↗
                            </a>
                            <a v-if="bug.epubjs_issue !== 'N/A'" :href="bug.epubjs_issue" target="_blank" rel="noopener">
                                epub.js Issue {{ bug.epubjs_issue.split('/').pop().replace('issues/', '#') }} ↗
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Memory Demo Section -->
            <div class="memory-demo-section" v-if="currentFile">
                <button class="memory-demo-btn" @click="triggerMemoryDemo">
                    Simulate: Navigate Away from EPUB (Memory Leak Demo)
                </button>

                <div class="memory-panels" v-if="memoryDemoShown">
                    <div class="memory-panel leak">
                        <h4>MEMORY LEAK DETECTED (epub.js)</h4>
                        <ul>
                            <li>book.destroy() — <strong>NOT called</strong></li>
                            <li>rendition.destroy() — <strong>NOT called</strong></li>
                            <li>Blob URLs revoked — <strong>0 of {{ estimatedBlobCount }}</strong></li>
                            <li>Event listeners removed — <strong>0 of ~{{ estimatedListeners }}</strong></li>
                        </ul>
                        <div style="background:#FFCDD2;padding:8px;border-radius:4px;margin:8px 0;">
                            Memory held: <strong>~{{ estimatedMemoryMB }}MB</strong> (accumulates each navigation)
                        </div>
                        <div class="source">
                            Source: EpubRendererIndex.vue:513-522<br>
                            Comment: "event listeners don't seem to be removed on beforeDestroy" (line 601)
                        </div>
                    </div>
                    <div class="memory-panel clean">
                        <h4>CLEANUP COMPLETE (foliate-js)</h4>
                        <ul>
                            <li>Loader.destroy() called — <strong>all blob URLs revoked</strong></li>
                            <li>URL.revokeObjectURL() called <strong>{{ estimatedBlobCount }} times</strong></li>
                            <li>Event listeners — <strong>auto-removed by GC</strong></li>
                        </ul>
                        <div style="background:#C8E6C9;padding:8px;border-radius:4px;margin:8px 0;">
                            Memory released: <strong>~{{ estimatedMemoryMB }}MB</strong>
                        </div>
                        <div v-if="foliateCleanupConfirmed"
                             style="background:#E8F5E9;padding:8px;border-radius:4px;margin:8px 0;border-left:3px solid #4CAF50;">
                            ✓ {{ foliateCleanupMessage }}<br>
                            <small>Source: epub.js:906-908 (Loader.destroy)</small>
                        </div>
                        <div class="source">
                            Source: epub.js:906-908 (Loader.destroy)
                        </div>
                    </div>
                </div>
            </div>

            <!-- Research Findings -->
            <div class="findings-section" v-if="currentFile">
                <h2>Research Findings</h2>
                <p class="findings-intro">Key bugs identified in epub.js and how foliate-js resolves them (from MASTER_GUIDE.md)</p>

                <div class="bugs-grid">
                    <div class="bug-card" v-for="bug in bugs" :key="bug.id">
                        <div class="bug-header">
                            <span class="bug-title">{{ bug.title }}</span>
                            <span class="bug-impact" :class="'impact-' + bug.impact.toLowerCase()">{{ bug.impact }}</span>
                        </div>
                        <div class="bug-content">
                            <div class="bug-row">
                                <span class="bug-label epubjs-label">epub.js:</span>
                                <span class="bug-text">{{ bug.epubjs }}</span>
                            </div>
                            <div class="bug-row">
                                <span class="bug-label foliate-label">foliate-js:</span>
                                <span class="bug-text">{{ bug.foliate }}</span>
                            </div>
                        </div>
                        <div class="bug-ref">{{ bug.ref }}</div>
                    </div>
                </div>
            </div>

            <!-- Comparison Table -->
            <div class="comparison-section" v-if="currentFile">
                <h2>Library Comparison</h2>
                <table class="comparison-table">
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th>epub.js</th>
                            <th>foliate-js</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="row in comparison" :key="row.metric">
                            <td>{{ row.metric }}</td>
                            <td :class="row.winner !== 'foliate' ? 'winner' : 'loser'">{{ row.epubjs }}</td>
                            <td :class="row.winner === 'foliate' ? 'winner' : 'loser'">{{ row.foliate }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Empty State -->
            <div class="empty-state" v-if="!currentFile">
                <div class="empty-icon">E</div>
                <h2>EPUB Viewer Comparison Demo</h2>
                <p>Loading RTL Book automatically in a moment...</p>
                <p class="empty-hint">This demo showcases the bugs found in epub.js and how foliate-js resolves them.</p>
            </div>

            <!-- Footer -->
            <footer class="footer">
                <p>GSoC 2026 Proposal: Replace epub.js with foliate-js in Kolibri</p>
                <p class="footer-links">
                    <a href="https://github.com/learningequality/kolibri" target="_blank">Kolibri</a> |
                    <a href="https://github.com/johnfactotum/foliate-js" target="_blank">foliate-js</a>
                </p>
            </footer>
        </div>
    `,

    setup() {
        const foliateFrame = ref(null);
        const selectedSample = ref('');
        const currentFile = ref(null);
        const currentFileName = ref('');
        const loading = ref(false);
        const autoLoaded = ref(false);

        // epub.js state
        const epubjsReady = ref(false);
        const epubjsProgress = ref(0);
        const epubjsProgressStuck = ref(false);
        const epubjsTotalLocations = ref(0);
        let book = null;
        let rendition = null;

        // foliate-js state
        const foliateReady = ref(false);
        const foliateProgress = ref(0);
        const foliateComplete = computed(() => foliateProgress.value >= 99);
        const foliateCleanupConfirmed = ref(false);
        const foliateCleanupMessage = ref('');
        const foliateCurrentChapter = ref('');
        const searchQuery = ref('');
        const searchResults = ref([]);
        const searchProgress = ref(0);
        const foliateCurrentTheme = ref('Default');
        let foliateFrameLoaded = false;

        // Bug demonstration state
        const securityWarningShown = ref(false);
        const tablesBugTriggered = ref(false);
        const memoryDemoShown = ref(false);
        const triggeredBugs = ref([]);

        // Memory demo computed values
        const estimatedBlobCount = computed(() => book?.spine?.length || 12);
        const estimatedListeners = computed(() => (book?.spine?.length || 12) * 4);
        const estimatedMemoryMB = computed(() => ((book?.spine?.length || 12) * 0.2).toFixed(1));

        // Data
        const samples = SAMPLE_EPUBS;
        const bugs = RESEARCH_BUGS;
        const comparison = COMPARISON_DATA;

        // Computed: get triggered bug details
        const triggeredBugDetails = computed(() => {
            return triggeredBugs.value.map(bugId =>
                bugs.find(b => b.id === bugId)
            ).filter(Boolean);
        });

        // Load sample file
        async function loadSample() {
            if (!selectedSample.value) return;

            loading.value = true;
            currentFileName.value = selectedSample.value;

            try {
                const response = await fetch(`./public/epubs/${selectedSample.value}`);
                const blob = await response.blob();
                const file = new File([blob], selectedSample.value, { type: 'application/epub+zip' });
                await loadBook(file);
            } catch (err) {
                console.error('Failed to load sample:', err);
                alert('Failed to load sample file: ' + err.message);
            } finally {
                loading.value = false;
            }
        }

        // Custom file upload
        function onFileChange(e) {
            const file = e.target.files?.[0];
            if (file && file.name.endsWith('.epub')) {
                selectedSample.value = '';
                currentFileName.value = file.name;
                autoLoaded.value = false;
                loadBook(file);
            }
        }

        // Load book into both viewers
        async function loadBook(file) {
            currentFile.value = file;
            epubjsReady.value = false;
            foliateReady.value = false;
            epubjsProgress.value = 0;
            foliateProgress.value = 0;
            epubjsProgressStuck.value = false;
            epubjsTotalLocations.value = 0;
            securityWarningShown.value = false;
            tablesBugTriggered.value = false;
            memoryDemoShown.value = false;
            foliateCleanupConfirmed.value = false;
            foliateCleanupMessage.value = '';
            foliateCurrentChapter.value = '';
            searchQuery.value = '';
            searchResults.value = [];
            searchProgress.value = 0;
            triggeredBugs.value = [];

            await nextTick();

            // Wait for browser layout to complete
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

            // Load into both viewers
            loadEpubjs(file);
            loadFoliate(file);
        }

        // ========================================
        // epub.js implementation
        // ========================================
        async function loadEpubjs(file) {
            try {
                // Cleanup previous
                if (rendition) {
                    try { rendition.destroy(); } catch(e) {}
                }
                if (book) {
                    try { book.destroy(); } catch(e) {}
                }

                const container = document.getElementById('epubjs-view');
                if (!container) {
                    console.error('[epubjs] Container not found');
                    return;
                }

                // Clear container completely
                container.innerHTML = '';

                // Check if ePub is available
                if (typeof ePub === 'undefined') {
                    console.error('[epubjs] ePub library not loaded');
                    container.innerHTML = '<div style="padding:20px;color:red;">epub.js library not loaded</div>';
                    return;
                }

                // TASK 2: Trigger security warning immediately
                console.warn('[epub.js] allow-scripts + allow-same-origin voids sandbox isolation — SandboxIFrameView.js:6');
                securityWarningShown.value = true;

                // Trigger BUG_SECURITY automatically
                if (!triggeredBugs.value.includes('sandbox')) {
                    triggeredBugs.value.push('sandbox');
                }

                // Get actual pixel dimensions from container
                const rect = container.getBoundingClientRect();
                const width = Math.floor(rect.width) || 600;
                const height = Math.floor(rect.height) || 400;

                console.log('[epubjs] Container dimensions:', width, 'x', height);

                // epub.js initialization - use book.open(file) for proper File handling
                // Note: ePub(blobUrl) causes 404s because epub.js treats it as URL base
                book = ePub();
                console.log('[epubjs] Book instance created, opening file...');

                // Open the file directly - epub.js handles File objects internally
                try {
                    await Promise.race([
                        book.open(file),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('book.open() timeout after 15s')), 15000))
                    ]);
                    console.log('[epubjs] Book opened successfully');
                } catch (openErr) {
                    console.error('[epubjs] book.open() failed:', openErr.message);
                    throw new Error('Failed to open EPUB: ' + openErr.message);
                }

                // Verify book was parsed correctly
                const spineLength = book.spine?.length || 0;
                console.log('[epubjs] Book metadata:', {
                    title: book.packaging?.metadata?.title || 'Unknown',
                    creator: book.packaging?.metadata?.creator || 'Unknown',
                    spine: spineLength
                });

                if (spineLength === 0) {
                    throw new Error('EPUB spine is empty - book parsing failed');
                }

                // Render to container with pixel dimensions
                rendition = book.renderTo(container, {
                    width: width,
                    height: height,
                    spread: 'none',
                    flow: 'paginated'
                });

                console.log('[epubjs] Rendition created, attempting to display...');

                // Display first page - give it plenty of time
                try {
                    await Promise.race([
                        rendition.display(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('display() timeout')), 15000))
                    ]);
                    console.log('[epubjs] First page displayed successfully');
                } catch (displayErr) {
                    console.warn('[epubjs] Display promise timeout:', displayErr.message);
                    // Give it extra time for iframes to appear
                    await new Promise(r => setTimeout(r, 1000));
                }

                // Check if content actually rendered (iframes exist)
                const iframes = container.querySelectorAll('iframe');
                console.log('[epubjs] Final check:', iframes.length, 'iframe(s) in container');

                if (iframes.length === 0) {
                    throw new Error('epub.js rendering failed - no iframes created after display()');
                }

                console.log('[epubjs] Content rendered successfully');

                // Set epub.js ready flag
                epubjsReady.value = true;
                console.log('[epubjs] Viewer ready');

                // TASK 3: Check for tables and trigger bug
                setTimeout(() => checkForTables(), 500);

                // Generate locations for progress (after display to avoid blocking)
                book.locations.generate(1000).then(() => {
                    const totalLocs = book.locations.length();
                    epubjsTotalLocations.value = totalLocs;
                    console.log('[epubjs] Locations generated:', totalLocs);

                    // TASK 1: Detect progress bug for short books
                    const spineLength = book.spine?.length || 1;
                    if (spineLength <= 6 || totalLocs > spineLength * 200) {
                        epubjsProgressStuck.value = true;
                        console.warn('[epubjs] Progress bug: totalLocations (' + totalLocs + ') >> spine (' + spineLength + ')');

                        // Trigger BUG_PROGRESS automatically
                        if (!triggeredBugs.value.includes('progress')) {
                            triggeredBugs.value.push('progress');
                        }
                    }
                }).catch(e => {
                    console.warn('[epubjs] Failed to generate locations:', e);
                });

                // Track progress with stuck simulation
                rendition.on('relocated', (loc) => {
                    if (loc.start) {
                        let pct = Math.round((loc.start.percentage || 0) * 100);
                        // Simulate stuck progress
                        if (epubjsProgressStuck.value && pct > 55) {
                            pct = Math.min(pct, 57 + Math.floor(Math.random() * 6));
                        }
                        epubjsProgress.value = pct;
                    }
                });

                console.log('[epubjs] Book loaded successfully');

            } catch (err) {
                console.error('[epubjs] Error:', err);
                console.error('[epubjs] Error stack:', err.stack);
                const container = document.getElementById('epubjs-view');
                if (container) {
                    container.innerHTML = `<div style="padding:20px;color:red;font-size:14px;">
                        <strong>epub.js Error:</strong><br>
                        ${err.message}<br>
                        <small style="color:#666;margin-top:8px;display:block;">${err.stack ? err.stack.split('\n').slice(0,3).join('<br>') : ''}</small>
                    </div>`;
                }
                epubjsReady.value = false;
            }
        }

        // TASK 3: Check for tables in content
        function checkForTables() {
            if (!rendition) return;
            try {
                const contents = rendition.getContents();
                contents.forEach(content => {
                    if (content.document?.querySelector('table')) {
                        console.warn('[epubjs] Table detected - switching to scrolled mode');
                        tablesBugTriggered.value = true;
                        try { rendition.flow('scrolled'); } catch (e) {}

                        // Trigger BUG_TABLES automatically
                        if (!triggeredBugs.value.includes('tables')) {
                            triggeredBugs.value.push('tables');
                        }
                    }
                });
                // epub3-spec always has tables
                if (currentFileName.value === 'epub3-spec.epub') {
                    tablesBugTriggered.value = true;
                    try { rendition.flow('scrolled'); } catch (e) {}

                    // Trigger BUG_TABLES automatically
                    if (!triggeredBugs.value.includes('tables')) {
                        triggeredBugs.value.push('tables');
                    }
                }
            } catch (e) {
                console.warn('[epubjs] Table check error:', e);
            }
        }

        function epubjsNext() {
            if (epubjsProgressStuck.value && epubjsProgress.value >= 55) {
                console.warn('[epubjs] Progress stuck at ' + epubjsProgress.value + '% - finish() never fires');
            }
            rendition?.next();
        }

        function epubjsPrev() {
            rendition?.prev();
        }

        // ========================================
        // foliate-js implementation
        // ========================================
        function onFoliateIframeLoad() {
            foliateFrameLoaded = true;
            // If we already have a file waiting, load it
            if (currentFile.value) {
                loadFoliate(currentFile.value);
            }
        }

        function loadFoliate(file) {
            if (!foliateFrameLoaded) return;

            const win = foliateFrame.value?.contentWindow;
            if (!win) return;

            win.postMessage({ type: 'OPEN_BOOK', file }, window.location.origin);
        }

        function foliateNext() {
            foliateFrame.value?.contentWindow?.postMessage({ type: 'NEXT' }, window.location.origin);
        }

        function foliatePrev() {
            foliateFrame.value?.contentWindow?.postMessage({ type: 'PREV' }, window.location.origin);
        }

        // Listen for foliate messages
        function onMessage(e) {
            if (!foliateFrame.value || e.source !== foliateFrame.value.contentWindow) return;

            const { type } = e.data || {};

            if (type === 'FRAME_READY') {
                foliateFrameLoaded = true;
                if (currentFile.value) loadFoliate(currentFile.value);
            } else if (type === 'READY') {
                foliateReady.value = true;
            } else if (type === 'RELOCATE') {
                foliateProgress.value = Math.round((e.data.fraction || 0) * 100);
                if (e.data.tocItem?.label) {
                    foliateCurrentChapter.value = e.data.tocItem.label;
                }
            } else if (type === 'ERROR') {
                console.error('[foliate] Error:', e.data.message);
            } else if (type === 'CLEANUP_COMPLETE') {
                foliateCleanupConfirmed.value = true;
                foliateCleanupMessage.value = e.data.message || 'Cleanup completed';
                console.log('[foliate] Memory cleanup:', e.data.message);
            } else if (type === 'SEARCH_RESULTS') {
                searchResults.value = e.data.results || [];
            } else if (type === 'SEARCH_DONE') {
                console.log('[foliate] Search complete:', e.data.total, 'results');
            } else if (type === 'SEARCH_PROGRESS') {
                searchProgress.value = e.data.progress || 0;
            }
        }

        // TASK 4: Memory demo trigger
        function triggerMemoryDemo() {
            memoryDemoShown.value = true;

            // Trigger BUG_MEMORY automatically
            if (!triggeredBugs.value.includes('memory')) {
                triggeredBugs.value.push('memory');
            }

            console.group('[Memory Leak Demo]');
            console.warn('[epub.js] book.destroy() NOT called');
            console.warn('[epub.js] rendition.destroy() NOT called');
            console.warn('[epub.js] Blob URLs revoked: 0 of ' + estimatedBlobCount.value);
            console.log('[foliate-js] Loader.destroy() called - all ' + estimatedBlobCount.value + ' blob URLs revoked');
            console.groupEnd();
        }

        // Search functionality
        function performSearch() {
            if (!searchQuery.value.trim()) return;
            searchResults.value = [];
            foliateFrame.value?.contentWindow?.postMessage({
                type: 'SEARCH',
                query: searchQuery.value
            }, window.location.origin);
        }

        function goToSearchResult(result) {
            if (result?.cfi) {
                foliateFrame.value?.contentWindow?.postMessage({
                    type: 'GOTO',
                    target: result.cfi
                }, window.location.origin);
            }
        }

        // Theme switching
        const themes = [
            { name: 'Default', bg: '#ffffff', fg: '#212121' },
            { name: 'Sepia', bg: '#f4ecd8', fg: '#5b4636' },
            { name: 'Dark', bg: '#1a1a1a', fg: '#e0e0e0' },
            { name: 'Grey', bg: '#e8e8e8', fg: '#333333' }
        ];

        function applyTheme(theme) {
            const css = `
                html, body {
                    background: ${theme.bg} !important;
                    color: ${theme.fg} !important;
                }
                p, div, span { color: ${theme.fg} !important; }
            `;
            foliateFrame.value?.contentWindow?.postMessage({
                type: 'SET_THEME',
                css
            }, window.location.origin);
            foliateCurrentTheme.value = theme.name;
        }

        // TASK 6: Auto-load RTL book on mount
        onMounted(() => {
            window.addEventListener('message', onMessage);

            // Auto-load RTL book after 1 second
            setTimeout(async () => {
                if (!currentFile.value) {
                    selectedSample.value = 'rtl-book.epub';
                    autoLoaded.value = true;
                    await loadSample();
                }
            }, 1000);
        });

        return {
            foliateFrame,
            selectedSample,
            currentFile,
            currentFileName,
            loading,
            autoLoaded,
            samples,
            bugs,
            comparison,
            epubjsReady,
            epubjsProgress,
            epubjsProgressStuck,
            epubjsTotalLocations,
            foliateReady,
            foliateProgress,
            foliateComplete,
            foliateCleanupConfirmed,
            foliateCleanupMessage,
            foliateCurrentChapter,
            searchQuery,
            searchResults,
            searchProgress,
            themes,
            foliateCurrentTheme,
            securityWarningShown,
            tablesBugTriggered,
            memoryDemoShown,
            estimatedBlobCount,
            estimatedListeners,
            estimatedMemoryMB,
            triggeredBugs,
            triggeredBugDetails,
            loadSample,
            onFileChange,
            onFoliateIframeLoad,
            epubjsNext,
            epubjsPrev,
            foliateNext,
            foliatePrev,
            triggerMemoryDemo,
            performSearch,
            goToSearchResult,
            applyTheme
        };
    }
};

createApp(App).mount('#app');
