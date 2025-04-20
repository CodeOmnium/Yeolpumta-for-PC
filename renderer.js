// DOM Elements
const dateDisplay = document.getElementById('date-display');
const mainTimerDisplay = document.getElementById('main-timer-display');
const subjectList = document.getElementById('subject-list');
const addSubjectBtn = document.getElementById('add-subject-btn');
const addTodoBtn = document.getElementById('add-todo-btn');
const subjectModal = document.getElementById('subject-modal');
const todoModal = document.getElementById('todo-modal');
const confirmModal = document.getElementById('confirm-modal');
const sessionModal = document.getElementById('session-modal');
const subjectNameInput = document.getElementById('subject-name');
const todoSubjectSelect = document.getElementById('todo-subject');
const todoTextInput = document.getElementById('todo-text');
const saveSubjectBtn = document.getElementById('save-subject');
const cancelSubjectBtn = document.getElementById('cancel-subject');
const saveTodoBtn = document.getElementById('save-todo');
const cancelTodoBtn = document.getElementById('cancel-todo');
const confirmYesBtn = document.getElementById('confirm-yes');
const confirmNoBtn = document.getElementById('confirm-no');
const confirmMessageEl = document.getElementById('confirm-message');
const sessionSubjectSelect = document.getElementById('session-subject');
const sessionStartInput = document.getElementById('session-start');
const sessionEndInput = document.getElementById('session-end');
const saveSessionBtn = document.getElementById('save-session');
const cancelSessionBtn = document.getElementById('cancel-session');
const sessionModalTitle = document.getElementById('session-modal-title');
const colorOptions = document.querySelectorAll('.color-option');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

// Insights Tab Elements
const periodOptions = document.querySelectorAll('.period-option');
const insightsView = document.getElementById('insights-view');
const calendarDays = document.getElementById('calendar-days');
const timelineContainer = document.getElementById('timeline-container');
const dailyTodosContainer = document.getElementById('daily-todos-container');
const currentMonthEl = document.getElementById('current-month');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const prevDayBtn = document.getElementById('prev-day');
const nextDayBtn = document.getElementById('next-day');
const monthlyTotalTimeEl = document.getElementById('monthly-total-time');
const summaryDateEl = document.getElementById('summary-date');
const dailyTotalEl = document.getElementById('daily-total');
const dailyAppsEl = document.getElementById('daily-apps');
const dailyMaxFocusEl = document.getElementById('daily-max-focus');
const dailyStartedEl = document.getElementById('daily-started');
const dailyFinishedEl = document.getElementById('daily-finished');

// App State
let appData = {
    mainTimer: {
        startTime: null,
        elapsedTime: 0,
        isRunning: false
    },
    subjects: [],
    todos: [],
    activeSubject: null,
    selectedColor: '#FF9800',
    insights: {
        dailyStats: {},
        activeView: 'calendar', // 'calendar' or 'timeline'
        selectedDate: null // Currently selected date in YYYY-MM-DD format
    },
    backgroundTracking: {
        timestamp: null, // When the app was closed
        activeSubjectId: null, // Which subject was active when app closed
        isRunning: false // Whether a timer was running when app closed
    },
    lastSessionEnd: {
        time: null, // The time when the last session ended (HH:MM format)
        timeWithSeconds: null, // The time with seconds (HH:MM:SS format)
        timestamp: null, // The timestamp when the last session ended
        dateKey: null // The date key for the last session
    }
};

// Load data from localStorage
function loadData() {
    const savedData = localStorage.getItem('yeolpumtaData');
    if (savedData) {
        appData = JSON.parse(savedData);

        // Process background tracking if needed
        processBackgroundTracking();

        // Ensure all timers are stopped when app loads
        if (appData.mainTimer.isRunning) {
            appData.mainTimer.isRunning = false;
        }

        // Ensure main timer has a non-negative value
        if (appData.mainTimer.elapsedTime < 0) {
            appData.mainTimer.elapsedTime = 0;
        }

        appData.subjects.forEach(subject => {
            if (subject.isRunning) {
                subject.isRunning = false;
            }

            // Ensure subject timers have non-negative values
            if (subject.elapsedTime < 0) {
                subject.elapsedTime = 0;
            }
        });

        const today = new Date();
        const dateKey = today.toISOString().split('T')[0];

        // Make sure insights data exists
        if (!appData.insights) {
            appData.insights = {
                dailyStats: {}
            };
        }

        // Make sure today's stats exist, but DON'T reset existing sessions
        if (!appData.insights.dailyStats[dateKey]) {
            // Initialize today's stats if they don't exist
            appData.insights.dailyStats[dateKey] = {
                totalTime: appData.mainTimer.elapsedTime,
                appsTime: Math.floor(appData.mainTimer.elapsedTime * 0.6),
                maxFocus: 0,
                started: '--:--',
                finished: '--:--',
                subjectTimes: {}
            };
        }

        // Fix any incorrect session durations (like the 47s issue)
        fixIncorrectSessionDurations();

        // Recalculate stats based on sessions to ensure consistency
        updateInsightsData();

        // Check if it's a new day (12am IST) and reset timers and tasks if needed
        checkAndResetForNewDay();

        // Save the updated state
        saveData();

        renderSubjects();
        updateTimerDisplay(mainTimerDisplay, appData.mainTimer.elapsedTime);
    }
}

// Save background tracking state when app is closing
function saveBackgroundTrackingState() {
    // Find any running subject timer
    let activeSubjectId = null;
    let isRunning = false;

    appData.subjects.forEach(subject => {
        if (subject.isRunning) {
            activeSubjectId = subject.id;
            isRunning = true;

            // Don't stop the timer - we want to track the time while app is closed
            // Just record the current state
        }
    });

    // Save the current timestamp and active subject
    appData.backgroundTracking = {
        timestamp: Date.now(),
        activeSubjectId: activeSubjectId,
        isRunning: isRunning || appData.mainTimer.isRunning
    };

    console.log('Background tracking state saved:', appData.backgroundTracking);
}

// Process background tracking when app is opened
function processBackgroundTracking() {
    // Check if we have background tracking data
    if (!appData.backgroundTracking || !appData.backgroundTracking.timestamp) {
        return;
    }

    console.log('Processing background tracking:', appData.backgroundTracking);

    // Calculate elapsed time since app was closed
    const now = Date.now();
    const elapsedMs = now - appData.backgroundTracking.timestamp;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);

    // Only process if at least 5 seconds have passed
    if (elapsedSeconds < 5) {
        console.log('Less than 5 seconds elapsed, skipping background tracking');
        return;
    }

    // Get current date for session recording
    const today = new Date();
    const dateKey = today.toISOString().split('T')[0];

    // Format current time for session end
    const hours = today.getHours().toString().padStart(2, '0');
    const minutes = today.getMinutes().toString().padStart(2, '0');
    const seconds = today.getSeconds().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;
    const timeWithSeconds = `${hours}:${minutes}:${seconds}`;

    // Format app close time for session start
    const closeTime = new Date(appData.backgroundTracking.timestamp);
    const closeHours = closeTime.getHours().toString().padStart(2, '0');
    const closeMinutes = closeTime.getMinutes().toString().padStart(2, '0');
    const closeSeconds = closeTime.getSeconds().toString().padStart(2, '0');
    const closeTimeStr = `${closeHours}:${closeMinutes}`;
    const closeTimeWithSeconds = `${closeHours}:${closeMinutes}:${closeSeconds}`;

    if (appData.backgroundTracking.isRunning) {
        // A timer was running when the app was closed
        console.log(`Timer was running, adding ${elapsedSeconds}s to timers`);

        // Add elapsed time to main timer
        appData.mainTimer.elapsedTime += elapsedSeconds;

        // If a subject was active, add time to that subject
        if (appData.backgroundTracking.activeSubjectId) {
            const subject = appData.subjects.find(s => s.id === appData.backgroundTracking.activeSubjectId);

            if (subject) {
                // Add elapsed time to subject
                subject.elapsedTime += elapsedSeconds;

                // Create a session record for this background time
                createBackgroundSession(subject.id, closeTimeStr, timeStr, elapsedSeconds, dateKey, closeTimeWithSeconds, timeWithSeconds);
            }
        } else {
            // No specific subject was active, create a "Background" subject if it doesn't exist
            let backgroundSubject = appData.subjects.find(s => s.name === 'Background');

            if (!backgroundSubject) {
                backgroundSubject = {
                    id: 'background-' + Date.now(),
                    name: 'Background',
                    color: '#888888',
                    elapsedTime: 0,
                    isRunning: false,
                    startTime: null
                };
                appData.subjects.push(backgroundSubject);
            }

            // Add elapsed time to background subject
            backgroundSubject.elapsedTime += elapsedSeconds;

            // Create a session record for this background time
            createBackgroundSession(backgroundSubject.id, closeTimeStr, timeStr, elapsedSeconds, dateKey, closeTimeWithSeconds, timeWithSeconds);
        }
    } else {
        // No timer was running, create a break session
        console.log(`No timer was running, creating break session of ${elapsedSeconds}s`);

        // Create a "Break" subject if it doesn't exist
        let breakSubject = appData.subjects.find(s => s.name === 'Break');

        if (!breakSubject) {
            breakSubject = {
                id: 'break-' + Date.now(),
                name: 'Break',
                color: '#CCCCCC',
                elapsedTime: 0,
                isRunning: false,
                startTime: null
            };
            appData.subjects.push(breakSubject);
        }

        // Create a session record for this break time
        createBackgroundSession(breakSubject.id, closeTimeStr, timeStr, elapsedSeconds, dateKey, closeTimeWithSeconds, timeWithSeconds);
    }

    // Clear background tracking data
    appData.backgroundTracking = {
        timestamp: null,
        activeSubjectId: null,
        isRunning: false
    };

    // Show notification about background time
    let subjectName = 'Background';
    if (appData.backgroundTracking.isRunning) {
        if (appData.backgroundTracking.activeSubjectId) {
            const subject = appData.subjects.find(s => s.id === appData.backgroundTracking.activeSubjectId);
            if (subject) {
                subjectName = subject.name;
            }
        }
    } else {
        subjectName = 'Break';
    }

    const formattedTime = formatDuration(elapsedSeconds);
    showNotification(`Added ${formattedTime} of ${subjectName} time while app was closed`);
}

// Create a session record for background time
function createBackgroundSession(subjectId, startTime, endTime, duration, dateKey, startTimeWithSeconds, endTimeWithSeconds) {
    const subject = appData.subjects.find(s => s.id === subjectId);
    if (!subject) return;

    // Make sure insights data exists
    if (!appData.insights) {
        appData.insights = {
            dailyStats: {}
        };
    }

    // Make sure daily stats exist for this date
    if (!appData.insights.dailyStats[dateKey]) {
        appData.insights.dailyStats[dateKey] = {
            totalTime: 0,
            appsTime: 0,
            maxFocus: 0,
            started: startTime,
            finished: endTime,
            subjectTimes: {}
        };
    }

    // Make sure subject times exist for this subject
    if (!appData.insights.dailyStats[dateKey].subjectTimes[subjectId]) {
        appData.insights.dailyStats[dateKey].subjectTimes[subjectId] = {
            name: subject.name,
            color: subject.color,
            time: 0,
            sessions: []
        };
    }

    // Add the session with exact times including seconds
    // Use provided times with seconds if available, otherwise default to :00
    const exactStartTime = startTimeWithSeconds || `${startTime}:00`;
    const exactEndTime = endTimeWithSeconds || `${endTime}:00`;

    appData.insights.dailyStats[dateKey].subjectTimes[subjectId].sessions.push({
        start: startTime,
        end: endTime,
        duration: duration,
        exactStartTime: exactStartTime,
        exactEndTime: exactEndTime
    });

    // Update subject time
    appData.insights.dailyStats[dateKey].subjectTimes[subjectId].time += duration;

    // Update total time
    appData.insights.dailyStats[dateKey].totalTime += duration;
    appData.insights.dailyStats[dateKey].appsTime = Math.floor(appData.insights.dailyStats[dateKey].totalTime * 0.6);

    // Update max focus if this session is longer
    if (duration > appData.insights.dailyStats[dateKey].maxFocus) {
        appData.insights.dailyStats[dateKey].maxFocus = duration;
    }

    // Update started time if this is earlier than current start
    if (startTime < appData.insights.dailyStats[dateKey].started ||
        appData.insights.dailyStats[dateKey].started === '--:--') {
        appData.insights.dailyStats[dateKey].started = startTime;
    }

    // Update finished time if this is later than current finish
    if (endTime > appData.insights.dailyStats[dateKey].finished ||
        appData.insights.dailyStats[dateKey].finished === '--:--') {
        appData.insights.dailyStats[dateKey].finished = endTime;
    }

    console.log(`Created background session for ${subject.name}: ${startTime}-${endTime} (${duration}s)`);
}

// Fix incorrect session durations (like the 47s issue)
function fixIncorrectSessionDurations() {
    // Check if we have insights data
    if (!appData.insights || !appData.insights.dailyStats) {
        return;
    }

    // Process all dates in the insights data
    Object.keys(appData.insights.dailyStats).forEach(dateKey => {
        const dailyStats = appData.insights.dailyStats[dateKey];

        // Skip if there are no subject times
        if (!dailyStats.subjectTimes) return;

        // Process all subjects
        Object.keys(dailyStats.subjectTimes).forEach(subjectId => {
            const subjectTime = dailyStats.subjectTimes[subjectId];

            // Skip if there are no sessions
            if (!subjectTime.sessions || subjectTime.sessions.length === 0) return;

            // Process all sessions
            subjectTime.sessions.forEach(session => {
                // Check if this is a short session with an incorrect duration
                // The specific issue was sessions showing 47s when they should be much shorter
                if (session.duration >= 40 && session.duration <= 50) {
                    // Calculate a more reasonable duration based on the start and end times
                    const startParts = session.start.split(':').map(Number);
                    const endParts = session.end.split(':').map(Number);

                    // If start and end times are the same minute, it's likely a very short session
                    if (startParts[0] === endParts[0] && startParts[1] === endParts[1]) {
                        // Set to a more reasonable short duration (6 seconds)
                        session.duration = 6;
                    }
                }
            });
        });
    });
}

// Check if it's a new day and reset timers and tasks
function checkAndResetForNewDay() {
    // Get the last saved date (or set today if not available)
    const lastSavedDate = localStorage.getItem('lastSavedDate') || new Date().toISOString().split('T')[0];

    // Get current date in IST (Indian Standard Time, UTC+5:30)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours and 30 minutes in milliseconds
    const istDate = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);
    const currentDate = istDate.toISOString().split('T')[0];

    // If it's a new day, reset timers and tasks
    if (currentDate !== lastSavedDate) {
        console.log('New day detected. Resetting timers and tasks...');

        // Reset main timer
        if (appData.mainTimer.isRunning) {
            clearInterval(appData.mainTimer.interval);
        }
        appData.mainTimer.elapsedTime = 0;
        appData.mainTimer.isRunning = false;
        appData.mainTimer.startTime = null;
        appData.mainTimer.interval = null;

        // Reset subject timers (but keep the subjects)
        appData.subjects.forEach(subject => {
            if (subject.isRunning) {
                clearInterval(subject.interval);
            }
            subject.elapsedTime = 0;
            subject.isRunning = false;
            subject.startTime = null;
            subject.interval = null;
        });

        // Clear all todos
        appData.todos = [];

        // Reset insights data for the new day
        if (appData.insights && appData.insights.dailyStats) {
            // Initialize empty stats for the new day with default values
            appData.insights.dailyStats[currentDate] = {
                totalTime: 0,
                appsTime: 0,
                maxFocus: 0,
                started: '--:--',
                finished: '--:--',
                subjectTimes: {}
            };
        }

        // Reset last session end data for the new day
        appData.lastSessionEnd = {
            time: null,
            timeWithSeconds: null,
            timestamp: null,
            dateKey: null
        };

        // Save the updated data
        saveData();

        // Update the last saved date
        localStorage.setItem('lastSavedDate', currentDate);

        // Show notification to user
        showNewDayNotification();
    } else {
        // Just update the last saved date
        localStorage.setItem('lastSavedDate', currentDate);
    }
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('yeolpumtaData', JSON.stringify(appData));
}

// Clear all data and reset to defaults
function clearAllData() {
    // Clear localStorage
    localStorage.removeItem('yeolpumtaData');
    localStorage.removeItem('lastSavedDate');

    // Reset app data to defaults
    appData = {
        mainTimer: {
            elapsedTime: 0,
            isRunning: false,
            startTime: null,
            interval: null
        },
        subjects: [],
        todos: [],
        insights: {
            dailyStats: {}
        },
        settings: {
            activeView: 'calendar'
        },
        backgroundTracking: {
            timestamp: null,
            activeSubjectId: null,
            isRunning: false
        },
        lastSessionEnd: {
            time: null,
            timeWithSeconds: null,
            timestamp: null,
            dateKey: null
        }
    };

    // Update UI
    renderSubjects();
    updateTimerDisplay(mainTimerDisplay, 0);

    console.log('All data has been cleared and reset to defaults.');
}

// Format time (seconds) to HH:MM:SS
function formatTime(seconds) {
    // Ensure seconds is a non-negative number
    seconds = Math.max(0, seconds);

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0'),
        secs.toString().padStart(2, '0')
    ].join(':');
}

// Update timer display
function updateTimerDisplay(element, seconds) {
    element.textContent = formatTime(seconds);
}

// Start/Stop main timer
function toggleMainTimer() {
    if (appData.mainTimer.isRunning) {
        // Stop timer
        appData.mainTimer.isRunning = false;
        clearInterval(appData.mainTimer.interval);
    } else {
        // Start timer
        appData.mainTimer.isRunning = true;
        appData.mainTimer.startTime = Date.now() - (appData.mainTimer.elapsedTime * 1000);

        appData.mainTimer.interval = setInterval(() => {
            appData.mainTimer.elapsedTime = Math.floor((Date.now() - appData.mainTimer.startTime) / 1000);
            updateTimerDisplay(mainTimerDisplay, appData.mainTimer.elapsedTime);

            // Update insights data to keep it in sync with the main timer
            updateInsightsData();
        }, 1000);
    }
}

// Start/Stop subject timer
function toggleSubjectTimer(subjectId) {
    const subject = appData.subjects.find(s => s.id === subjectId);
    if (!subject) return;

    // Stop any currently running subject timer
    appData.subjects.forEach(s => {
        if (s.isRunning && s.id !== subjectId) {
            s.isRunning = false;
            clearInterval(s.interval);

            // Record the session end in insights
            recordSessionEnd(s.id);
        }
    });

    if (subject.isRunning) {
        // Stop timer
        subject.isRunning = false;
        clearInterval(subject.interval);

        // Store the current elapsed time before recording session end
        const sessionDuration = subject.elapsedTime - (subject.sessionStartElapsedTime || 0);
        subject.currentSessionDuration = sessionDuration > 0 ? sessionDuration : 1;

        // Record the session end in insights
        recordSessionEnd(subjectId);

        // Check if any other subject timers are running
        const anySubjectRunning = appData.subjects.some(s => s.isRunning);

        // Also stop main timer if it's running and no other subject timers are running
        if (appData.mainTimer.isRunning && !anySubjectRunning) {
            toggleMainTimer();
        }
    } else {
        // Start timer
        subject.isRunning = true;
        subject.startTime = Date.now() - (subject.elapsedTime * 1000);

        // Store the current elapsed time at session start
        subject.sessionStartElapsedTime = subject.elapsedTime;

        // Record the session start in insights
        recordSessionStart(subjectId);

        subject.interval = setInterval(() => {
            subject.elapsedTime = Math.floor((Date.now() - subject.startTime) / 1000);
            const timerElement = document.querySelector(`.subject-timer[data-id="${subjectId}"]`);
            if (timerElement) {
                updateTimerDisplay(timerElement, subject.elapsedTime);
            }

            // Update insights data
            updateInsightsData();

            saveData();
        }, 1000);

        // Also start main timer if it's not running
        if (!appData.mainTimer.isRunning) {
            toggleMainTimer();
        }
    }

    renderSubjects();
}

// Record session start in insights
function recordSessionStart(subjectId) {
    const subject = appData.subjects.find(s => s.id === subjectId);
    if (!subject) return;

    // Get current date and time
    const now = new Date();
    const dateKey = now.toISOString().split('T')[0];

    // Include seconds for more accurate duration calculation
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const timeWithSeconds = `${timeStr}:${now.getSeconds().toString().padStart(2, '0')}`;

    // Check if there was a previous session and create a break session if needed
    if (appData.lastSessionEnd && appData.lastSessionEnd.timestamp) {
        // Only create a break if the last session wasn't too long ago (within 24 hours)
        const breakThreshold = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        const timeSinceLastSession = Date.now() - appData.lastSessionEnd.timestamp;

        // Only create a break if there's an actual time gap (more than 1 second)
        if (timeSinceLastSession > 1000 && timeSinceLastSession <= breakThreshold) {
            // Create a "Break" subject if it doesn't exist
            let breakSubject = appData.subjects.find(s => s.name === 'Break');

            if (!breakSubject) {
                breakSubject = {
                    id: 'break-' + Date.now(),
                    name: 'Break',
                    color: '#CCCCCC',
                    elapsedTime: 0,
                    isRunning: false,
                    startTime: null
                };
                appData.subjects.push(breakSubject);
            }

            // Calculate break duration in seconds
            const breakDurationMs = timeSinceLastSession;
            const breakDurationSeconds = Math.floor(breakDurationMs / 1000);

            // Create a session record for this break time
            // Use the date key from the last session if it's from today, otherwise use today's date
            const breakDateKey = (appData.lastSessionEnd.dateKey === dateKey) ? dateKey : appData.lastSessionEnd.dateKey;

            createBackgroundSession(
                breakSubject.id,
                appData.lastSessionEnd.time,
                timeStr,
                breakDurationSeconds,
                breakDateKey,
                appData.lastSessionEnd.timeWithSeconds,
                timeWithSeconds
            );
        }
    }

    // Initialize insights data if needed
    if (!appData.insights) {
        initializeInsightsData();
    }

    // Initialize daily stats if needed
    if (!appData.insights.dailyStats[dateKey]) {
        appData.insights.dailyStats[dateKey] = {
            totalTime: appData.mainTimer.elapsedTime,
            appsTime: Math.floor(appData.mainTimer.elapsedTime * 0.6),
            maxFocus: 0,
            started: timeStr,
            finished: timeStr,
            subjectTimes: {}
        };
    }

    // Initialize subject times if needed
    if (!appData.insights.dailyStats[dateKey].subjectTimes[subjectId]) {
        appData.insights.dailyStats[dateKey].subjectTimes[subjectId] = {
            name: subject.name,
            color: subject.color,
            time: subject.elapsedTime,
            sessions: []
        };
    }

    // Store the exact start time with seconds for accurate duration calculation
    subject.exactStartTime = timeWithSeconds;

    // Add new session
    appData.insights.dailyStats[dateKey].subjectTimes[subjectId].sessions.push({
        start: timeStr,
        end: timeStr,
        duration: 0,
        exactStartTime: timeWithSeconds,
        exactEndTime: null
    });

    // Update started time if this is the first session of the day or earlier than current start
    if (!appData.insights.dailyStats[dateKey].started ||
        appData.insights.dailyStats[dateKey].started === '--:--' ||
        timeStr < appData.insights.dailyStats[dateKey].started) {
        appData.insights.dailyStats[dateKey].started = timeStr;
    }

    // Also update finished time if it's still the default value
    if (appData.insights.dailyStats[dateKey].finished === '--:--') {
        appData.insights.dailyStats[dateKey].finished = timeStr;
    }

    saveData();

    // Update the timeline view if the insights tab is active
    if (document.getElementById('insight-content').classList.contains('active')) {
        renderTimelineView();
    }
}

// Record session end in insights
function recordSessionEnd(subjectId) {
    const subject = appData.subjects.find(s => s.id === subjectId);
    if (!subject) return;

    // Get current date and time
    const now = new Date();
    const dateKey = now.toISOString().split('T')[0];
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const timeWithSeconds = `${timeStr}:${now.getSeconds().toString().padStart(2, '0')}`;

    // Check if we have insights data
    if (!appData.insights || !appData.insights.dailyStats[dateKey] ||
        !appData.insights.dailyStats[dateKey].subjectTimes[subjectId]) {
        return;
    }

    // Get the last session
    const sessions = appData.insights.dailyStats[dateKey].subjectTimes[subjectId].sessions;
    if (sessions.length === 0) return;

    const lastSession = sessions[sessions.length - 1];

    // Update the session end time
    lastSession.end = timeStr;
    lastSession.exactEndTime = timeWithSeconds;

    // Use the exact session duration that we calculated in toggleSubjectTimer
    // This is the most accurate measure as it's based on the actual timer
    if (subject.currentSessionDuration !== undefined) {
        lastSession.duration = subject.currentSessionDuration;
        // Clear the current session duration
        subject.currentSessionDuration = undefined;
    } else {
        // Fallback calculation if currentSessionDuration is not available
        // This should rarely happen with our new approach

        // Calculate duration in seconds using the exact start time if available
        let calculatedDuration;

        if (subject.exactStartTime) {
            // Use the exact start time with seconds for accurate calculation
            const startParts = subject.exactStartTime.split(':').map(Number);

            // Calculate total seconds
            const startSeconds = startParts[0] * 3600 + startParts[1] * 60 + startParts[2];
            const endSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

            // Handle sessions that cross midnight
            calculatedDuration = endSeconds >= startSeconds ?
                endSeconds - startSeconds :
                (24 * 3600 - startSeconds) + endSeconds;

            // Clear the exact start time
            subject.exactStartTime = null;
        } else {
            // Last resort fallback
            const startParts = lastSession.start.split(':').map(Number);
            const endParts = lastSession.end.split(':').map(Number);

            // Get current seconds for more accurate duration
            const seconds = now.getSeconds();

            // Calculate total seconds including seconds component
            const startSeconds = startParts[0] * 3600 + startParts[1] * 60;
            const endSeconds = endParts[0] * 3600 + endParts[1] * 60 + seconds;

            // Handle sessions that cross midnight
            calculatedDuration = endSeconds >= startSeconds ?
                endSeconds - startSeconds :
                (24 * 3600 - startSeconds) + endSeconds;
        }

        // Ensure duration is at least 1 second for visibility
        if (calculatedDuration < 1) {
            calculatedDuration = 1;
        }

        lastSession.duration = calculatedDuration;
    }

    // Update subject total time
    appData.insights.dailyStats[dateKey].subjectTimes[subjectId].time = subject.elapsedTime;

    // Update finished time if this is later than current finish
    if (!appData.insights.dailyStats[dateKey].finished || timeStr > appData.insights.dailyStats[dateKey].finished) {
        appData.insights.dailyStats[dateKey].finished = timeStr;
    }

    // Update max focus time if this session is longer
    if (lastSession.duration > 0 && lastSession.duration > appData.insights.dailyStats[dateKey].maxFocus) {
        appData.insights.dailyStats[dateKey].maxFocus = lastSession.duration;
    }

    // Store the session end time for break tracking
    appData.lastSessionEnd = {
        time: timeStr,
        timeWithSeconds: timeWithSeconds,
        timestamp: Date.now(),
        dateKey: dateKey
    };

    saveData();

    // Update the timeline view if the insights tab is active
    if (document.getElementById('insight-content').classList.contains('active')) {
        renderTimelineView();
        showDayDetails(dateKey);
    }
}

// Update insights data with current timer values
function updateInsightsData() {
    // Get current date
    const now = new Date();
    const dateKey = now.toISOString().split('T')[0];

    // Check if we have insights data for today
    if (!appData.insights || !appData.insights.dailyStats[dateKey]) {
        return;
    }

    // Update total time
    appData.insights.dailyStats[dateKey].totalTime = appData.mainTimer.elapsedTime;
    appData.insights.dailyStats[dateKey].appsTime = Math.floor(appData.mainTimer.elapsedTime * 0.6);

    // Update subject times
    appData.subjects.forEach(subject => {
        if (appData.insights.dailyStats[dateKey].subjectTimes[subject.id]) {
            appData.insights.dailyStats[dateKey].subjectTimes[subject.id].time = subject.elapsedTime;
        }
    });

    // Recalculate max focus based on actual sessions
    let maxFocus = 0;
    let hasAnySessions = false;

    // For recalculating started and finished times
    let earliestStart = '23:59';
    let latestEnd = '00:00';

    Object.values(appData.insights.dailyStats[dateKey].subjectTimes).forEach(subjectTime => {
        if (subjectTime.sessions && subjectTime.sessions.length > 0) {
            hasAnySessions = true;
            subjectTime.sessions.forEach(session => {
                // Update max focus
                if (session.duration > maxFocus) {
                    maxFocus = session.duration;
                }

                // Update earliest start time (first session start)
                if (session.start < earliestStart) {
                    earliestStart = session.start;
                }

                // Update latest end time (last session end)
                if (session.end > latestEnd) {
                    latestEnd = session.end;
                }
            });
        }
    });

    // Only update max focus if there are actual sessions
    // Otherwise, max focus should never be greater than total time
    if (hasAnySessions) {
        appData.insights.dailyStats[dateKey].maxFocus = maxFocus;

        // Update started time (first session start time)
        appData.insights.dailyStats[dateKey].started = earliestStart;

        // Update finished time (last session end time)
        appData.insights.dailyStats[dateKey].finished = latestEnd;
    } else {
        // If no sessions, max focus should be at most the total time
        appData.insights.dailyStats[dateKey].maxFocus = Math.min(
            appData.insights.dailyStats[dateKey].maxFocus,
            appData.mainTimer.elapsedTime
        );

        // If no sessions, reset started and finished times
        if (appData.insights.dailyStats[dateKey].started !== '--:--' &&
            appData.insights.dailyStats[dateKey].finished !== '--:--') {
            appData.insights.dailyStats[dateKey].started = '--:--';
            appData.insights.dailyStats[dateKey].finished = '--:--';
        }
    }

    // Update the insights view if it's active
    if (document.getElementById('insight-content').classList.contains('active')) {
        showDayDetails(dateKey);
    }
}

// Render subjects and their todos
function renderSubjects() {
    subjectList.innerHTML = '';

    // Filter out the Break subject from the subjects tab
    const displaySubjects = appData.subjects.filter(subject => subject.name !== 'Break');

    displaySubjects.forEach(subject => {
        // Create subject item
        const subjectItem = document.createElement('div');
        subjectItem.className = 'subject-item';

        const subjectColor = document.createElement('div');
        subjectColor.className = 'subject-color';
        subjectColor.style.backgroundColor = subject.color;

        const playIcon = document.createElement('span');
        playIcon.className = 'material-icons play-icon';
        playIcon.textContent = subject.isRunning ? 'pause' : 'play_arrow';
        subjectColor.appendChild(playIcon);

        const subjectInfo = document.createElement('div');
        subjectInfo.className = 'subject-info';

        const subjectName = document.createElement('div');
        subjectName.className = 'subject-name';
        subjectName.textContent = subject.name;

        const subjectTimer = document.createElement('div');
        subjectTimer.className = 'subject-timer';
        subjectTimer.dataset.id = subject.id;
        updateTimerDisplay(subjectTimer, subject.elapsedTime);

        subjectInfo.appendChild(subjectName);
        subjectInfo.appendChild(subjectTimer);

        const subjectMenu = document.createElement('div');
        subjectMenu.className = 'subject-menu';

        const menuIcon = document.createElement('span');
        menuIcon.className = 'material-icons';
        menuIcon.textContent = 'more_vert';
        subjectMenu.appendChild(menuIcon);

        // Create dropdown menu for subject
        const dropdownMenu = document.createElement('div');
        dropdownMenu.className = 'dropdown-menu';
        dropdownMenu.style.display = 'none';

        const resetOption = document.createElement('div');
        resetOption.className = 'dropdown-item';
        resetOption.textContent = 'Reset Timer';
        resetOption.addEventListener('click', (e) => {
            e.stopPropagation();
            resetSubjectTimer(subject.id);
            dropdownMenu.style.display = 'none';
        });

        const deleteOption = document.createElement('div');
        deleteOption.className = 'dropdown-item';
        deleteOption.textContent = 'Delete Subject';
        deleteOption.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteSubject(subject.id);
            dropdownMenu.style.display = 'none';
        });

        dropdownMenu.appendChild(resetOption);
        dropdownMenu.appendChild(deleteOption);

        subjectMenu.appendChild(dropdownMenu);

        // Toggle dropdown menu
        menuIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
        });

        // Close dropdown when clicking elsewhere
        document.addEventListener('click', () => {
            dropdownMenu.style.display = 'none';
        });

        subjectItem.appendChild(subjectColor);
        subjectItem.appendChild(subjectInfo);
        subjectItem.appendChild(subjectMenu);

        // Add event listener to toggle timer
        subjectColor.addEventListener('click', () => {
            toggleSubjectTimer(subject.id);
        });

        subjectList.appendChild(subjectItem);

        // Render todos for this subject
        const subjectTodos = appData.todos.filter(todo => todo.subjectId === subject.id);
        if (subjectTodos.length > 0) {
            const todoList = document.createElement('div');
            todoList.className = 'todo-list';

            subjectTodos.forEach(todo => {
                const todoItem = document.createElement('div');
                todoItem.className = 'todo-item';

                const todoCheckbox = document.createElement('div');
                todoCheckbox.className = `todo-checkbox ${todo.completed ? 'checked' : ''}`;

                const todoText = document.createElement('div');
                todoText.className = `todo-text ${todo.completed ? 'completed' : ''}`;
                todoText.textContent = todo.text;

                const todoDelete = document.createElement('span');
                todoDelete.className = 'material-icons todo-delete';
                todoDelete.textContent = 'close';
                todoDelete.style.fontSize = '16px';
                todoDelete.style.cursor = 'pointer';
                todoDelete.style.color = '#888888';

                todoDelete.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteTodo(todo.id);
                });

                todoItem.appendChild(todoCheckbox);
                todoItem.appendChild(todoText);
                todoItem.appendChild(todoDelete);

                // Add event listener to toggle completion
                todoCheckbox.addEventListener('click', () => {
                    todo.completed = !todo.completed;
                    renderSubjects();
                    saveData();
                });

                todoList.appendChild(todoItem);
            });

            subjectList.appendChild(todoList);
        }
    });

    // Update todo subject select options
    todoSubjectSelect.innerHTML = '';
    // Filter out the Break subject from the todo subject dropdown
    appData.subjects.filter(subject => subject.name !== 'Break').forEach(subject => {
        const option = document.createElement('option');
        option.value = subject.id;
        option.textContent = subject.name;
        todoSubjectSelect.appendChild(option);
    });
}

// Add new subject
function addSubject() {
    const name = subjectNameInput.value.trim();
    if (!name) return;

    const newSubject = {
        id: Date.now().toString(),
        name,
        color: appData.selectedColor,
        elapsedTime: 0,
        isRunning: false,
        startTime: null
    };

    appData.subjects.push(newSubject);
    saveData();
    renderSubjects();
    closeSubjectModal();
}

// Add new todo
function addTodo() {
    const text = todoTextInput.value.trim();
    const subjectId = todoSubjectSelect.value;

    if (!text || !subjectId) return;

    const newTodo = {
        id: Date.now().toString(),
        subjectId,
        text,
        completed: false
    };

    appData.todos.push(newTodo);
    saveData();
    renderSubjects();
    closeTodoModal();
}

// Open subject modal
function openSubjectModal() {
    subjectModal.classList.add('show');
    subjectNameInput.value = '';
    appData.selectedColor = '#FF9800'; // Default color

    // Reset color selection
    colorOptions.forEach(option => {
        option.classList.remove('selected');
        if (option.dataset.color === appData.selectedColor) {
            option.classList.add('selected');
        }
    });
}

// Close subject modal
function closeSubjectModal() {
    subjectModal.classList.remove('show');
}

// Open todo modal
function openTodoModal() {
    if (appData.subjects.length === 0) {
        alert('Please add a subject first');
        return;
    }

    todoModal.classList.add('show');
    todoTextInput.value = '';

    // Set first subject as default
    if (todoSubjectSelect.options.length > 0) {
        todoSubjectSelect.value = todoSubjectSelect.options[0].value;
    }
}

// Close todo modal
function closeTodoModal() {
    todoModal.classList.remove('show');
}

// Update date display
function updateDateDisplay() {
    const now = new Date();
    const dateKey = now.toISOString().split('T')[0];
    const formattedDate = formatDateForDisplay(dateKey, 'full');

    // Convert from "Thu, Apr 19" format to "Thu, 19/04" format
    const parts = formattedDate.split(', ');
    const dayOfWeek = parts[0];
    const dateParts = parts[1].split(' ');
    const day = dateParts[1].padStart(2, '0');

    // Get month number (1-12)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = months.indexOf(dateParts[0]);
    const month = (monthIndex + 1).toString().padStart(2, '0');

    dateDisplay.textContent = `${dayOfWeek}, ${day}/${month}`;
}

// Session variables
let currentSessionData = null;

// Open edit session modal
function openEditSessionModal(sessionData) {
    currentSessionData = sessionData;
    sessionModalTitle.textContent = 'Edit Session';

    // Populate subject select
    populateSessionSubjects(sessionData.subjectId);

    // Set time inputs
    sessionStartInput.value = sessionData.start;
    sessionEndInput.value = sessionData.end;

    // Show modal
    sessionModal.classList.add('show');
}

// Open add session modal
function openAddSessionModal(dateKey) {
    currentSessionData = { dateKey, isNew: true };
    sessionModalTitle.textContent = 'Add Session';

    // Populate subject select with first subject selected
    populateSessionSubjects();

    // Set default times (current time)
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${hours}:${minutes}`;

    sessionStartInput.value = currentTime;

    // Set end time 30 minutes later
    const endDate = new Date(now.getTime() + 30 * 60000);
    const endHours = endDate.getHours().toString().padStart(2, '0');
    const endMinutes = endDate.getMinutes().toString().padStart(2, '0');
    sessionEndInput.value = `${endHours}:${endMinutes}`;

    // Show modal
    sessionModal.classList.add('show');
}

// Populate session subjects dropdown
function populateSessionSubjects(selectedSubjectId = null) {
    sessionSubjectSelect.innerHTML = '';

    // Check if there are any subjects
    if (appData.subjects.length === 0) {
        // Add a message option
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No subjects available - add a subject first';
        option.disabled = true;
        sessionSubjectSelect.appendChild(option);
        return;
    }

    // Filter out the Break subject from the session subject dropdown
    appData.subjects.filter(subject => subject.name !== 'Break').forEach(subject => {
        const option = document.createElement('option');
        option.value = subject.id;
        option.textContent = subject.name;
        sessionSubjectSelect.appendChild(option);

        if (selectedSubjectId && subject.id === selectedSubjectId) {
            option.selected = true;
        }
    });

    // Select first subject if none selected and there are subjects
    if (!selectedSubjectId && sessionSubjectSelect.options.length > 0) {
        sessionSubjectSelect.value = sessionSubjectSelect.options[0].value;
    }
}

// Save session
function saveSession() {
    if (!currentSessionData) return;

    const subjectId = sessionSubjectSelect.value;
    const startTime = sessionStartInput.value;
    const endTime = sessionEndInput.value;

    if (!subjectId || !startTime || !endTime) {
        alert('Please fill in all fields');
        return;
    }

    // Check if there are any subjects
    if (appData.subjects.length === 0) {
        alert('Please add a subject before creating a session');
        closeSessionModal();
        return;
    }

    // Calculate duration in seconds
    const startParts = startTime.split(':').map(Number);
    const endParts = endTime.split(':').map(Number);

    // For manually added sessions, ensure at least 1 second duration
    const startSeconds = startParts[0] * 3600 + startParts[1] * 60;
    const endSeconds = endParts[0] * 3600 + endParts[1] * 60;

    // If start and end times are the same, add 1 second to ensure visibility
    const sameTime = startTime === endTime;

    // Handle sessions that cross midnight
    let duration = endSeconds >= startSeconds ?
        endSeconds - startSeconds :
        (24 * 3600 - startSeconds) + endSeconds;

    // Ensure duration is at least 1 second for visibility
    if (duration < 1 || sameTime) {
        duration = 1;
    }

    const dateKey = currentSessionData.dateKey;

    // Initialize daily stats if needed
    if (!appData.insights.dailyStats[dateKey]) {
        appData.insights.dailyStats[dateKey] = {
            totalTime: 0,
            appsTime: 0,
            maxFocus: 0,
            started: startTime,
            finished: endTime,
            subjectTimes: {}
        };
    }

    // Get the subject
    const subject = appData.subjects.find(s => s.id === subjectId);
    if (!subject) return;

    // Initialize subject times if needed
    if (!appData.insights.dailyStats[dateKey].subjectTimes[subjectId]) {
        appData.insights.dailyStats[dateKey].subjectTimes[subjectId] = {
            name: subject.name,
            color: subject.color,
            time: 0,
            sessions: []
        };
    }

    const subjectTimes = appData.insights.dailyStats[dateKey].subjectTimes[subjectId];

    if (currentSessionData.isNew) {
        // Add new session with exact times including seconds
        const now = new Date();
        const seconds = now.getSeconds().toString().padStart(2, '0');
        const exactStartTime = `${startTime}:${seconds}`;
        const exactEndTime = `${endTime}:${seconds}`;

        subjectTimes.sessions.push({
            start: startTime,
            end: endTime,
            duration: duration,
            exactStartTime: exactStartTime,
            exactEndTime: exactEndTime
        });

        // Add duration to subject time
        subjectTimes.time += duration;

        // Add duration to main timer
        appData.mainTimer.elapsedTime += duration;
        updateTimerDisplay(mainTimerDisplay, appData.mainTimer.elapsedTime);

        // Add duration to subject timer
        subject.elapsedTime += duration;

        // Update daily total time
        appData.insights.dailyStats[dateKey].totalTime += duration;
        appData.insights.dailyStats[dateKey].appsTime = Math.floor(appData.insights.dailyStats[dateKey].totalTime * 0.6);

        // Update max focus if needed
        if (duration > appData.insights.dailyStats[dateKey].maxFocus) {
            appData.insights.dailyStats[dateKey].maxFocus = duration;
        }

        // Update started/finished times if needed
        if (startTime < appData.insights.dailyStats[dateKey].started) {
            appData.insights.dailyStats[dateKey].started = startTime;
        }
        if (endTime > appData.insights.dailyStats[dateKey].finished) {
            appData.insights.dailyStats[dateKey].finished = endTime;
        }
    } else if (currentSessionData.isBreak) {
        // Converting a break session to a subject session
        // First, add the new subject session with exact times including seconds
        const now = new Date();
        const seconds = now.getSeconds().toString().padStart(2, '0');
        const exactStartTime = `${startTime}:${seconds}`;
        const exactEndTime = `${endTime}:${seconds}`;

        subjectTimes.sessions.push({
            start: startTime,
            end: endTime,
            duration: duration,
            exactStartTime: exactStartTime,
            exactEndTime: exactEndTime
        });

        // Add duration to subject time
        subjectTimes.time += duration;

        // Add duration to main timer
        appData.mainTimer.elapsedTime += duration;
        updateTimerDisplay(mainTimerDisplay, appData.mainTimer.elapsedTime);

        // Add duration to subject timer
        subject.elapsedTime += duration;

        // Update daily total time
        appData.insights.dailyStats[dateKey].totalTime += duration;
        appData.insights.dailyStats[dateKey].appsTime = Math.floor(appData.insights.dailyStats[dateKey].totalTime * 0.6);

        // Update max focus if needed
        if (duration > appData.insights.dailyStats[dateKey].maxFocus) {
            appData.insights.dailyStats[dateKey].maxFocus = duration;
        }

        // Check if we need to create break sessions for any remaining time
        const originalStartTime = currentSessionData.start;
        const originalEndTime = currentSessionData.end;

        // Create a "Break" subject if it doesn't exist
        let breakSubject = appData.subjects.find(s => s.name === 'Break');
        if (!breakSubject) {
            breakSubject = {
                id: 'break-' + Date.now(),
                name: 'Break',
                color: '#CCCCCC',
                elapsedTime: 0,
                isRunning: false,
                startTime: null
            };
            appData.subjects.push(breakSubject);
        }

        // Initialize break subject times if needed
        if (!appData.insights.dailyStats[dateKey].subjectTimes[breakSubject.id]) {
            appData.insights.dailyStats[dateKey].subjectTimes[breakSubject.id] = {
                name: breakSubject.name,
                color: breakSubject.color,
                time: 0,
                sessions: []
            };
        }

        // Check if there's a gap before the new session
        if (originalStartTime < startTime) {
            // Calculate duration in seconds
            const breakStartParts = originalStartTime.split(':').map(Number);
            const breakEndParts = startTime.split(':').map(Number);

            const breakStartSeconds = breakStartParts[0] * 3600 + breakStartParts[1] * 60;
            const breakEndSeconds = breakEndParts[0] * 3600 + breakEndParts[1] * 60;

            // Handle sessions that cross midnight
            let breakDuration = breakEndSeconds >= breakStartSeconds ?
                breakEndSeconds - breakStartSeconds :
                (24 * 3600 - breakStartSeconds) + breakEndSeconds;

            // Create a break session for the time before the new session
            if (breakDuration > 0) {
                const breakSessionBefore = {
                    start: originalStartTime,
                    end: startTime,
                    duration: breakDuration,
                    exactStartTime: `${originalStartTime}:00`,
                    exactEndTime: `${startTime}:00`
                };

                // Add the break session
                appData.insights.dailyStats[dateKey].subjectTimes[breakSubject.id].sessions.push(breakSessionBefore);

                // Update break subject time
                appData.insights.dailyStats[dateKey].subjectTimes[breakSubject.id].time += breakDuration;

                // Update break subject elapsed time
                breakSubject.elapsedTime += breakDuration;
            }
        }

        // Check if there's a gap after the new session
        if (endTime < originalEndTime) {
            // Calculate duration in seconds
            const breakStartParts = endTime.split(':').map(Number);
            const breakEndParts = originalEndTime.split(':').map(Number);

            const breakStartSeconds = breakStartParts[0] * 3600 + breakStartParts[1] * 60;
            const breakEndSeconds = breakEndParts[0] * 3600 + breakEndParts[1] * 60;

            // Handle sessions that cross midnight
            let breakDuration = breakEndSeconds >= breakStartSeconds ?
                breakEndSeconds - breakStartSeconds :
                (24 * 3600 - breakStartSeconds) + breakEndSeconds;

            // Create a break session for the time after the new session
            if (breakDuration > 0) {
                const breakSessionAfter = {
                    start: endTime,
                    end: originalEndTime,
                    duration: breakDuration,
                    exactStartTime: `${endTime}:00`,
                    exactEndTime: `${originalEndTime}:00`
                };

                // Add the break session
                appData.insights.dailyStats[dateKey].subjectTimes[breakSubject.id].sessions.push(breakSessionAfter);

                // Update break subject time
                appData.insights.dailyStats[dateKey].subjectTimes[breakSubject.id].time += breakDuration;

                // Update break subject elapsed time
                breakSubject.elapsedTime += breakDuration;
            }
        }

        // Update started/finished times if needed
        if (startTime < appData.insights.dailyStats[dateKey].started) {
            appData.insights.dailyStats[dateKey].started = startTime;
        }
        if (endTime > appData.insights.dailyStats[dateKey].finished) {
            appData.insights.dailyStats[dateKey].finished = endTime;
        }
    } else {
        // Edit existing session
        const sessionIndex = currentSessionData.sessionIndex;
        const oldSession = subjectTimes.sessions[sessionIndex];

        // Calculate time difference
        const timeDiff = duration - oldSession.duration;

        // Update session
        oldSession.start = startTime;
        oldSession.end = endTime;
        oldSession.duration = duration;

        // Update subject time
        subjectTimes.time += timeDiff;

        // Update main timer
        appData.mainTimer.elapsedTime += timeDiff;
        updateTimerDisplay(mainTimerDisplay, appData.mainTimer.elapsedTime);

        // Update subject timer
        subject.elapsedTime += timeDiff;

        // Update daily total time
        appData.insights.dailyStats[dateKey].totalTime += timeDiff;
        appData.insights.dailyStats[dateKey].appsTime = Math.floor(appData.insights.dailyStats[dateKey].totalTime * 0.6);

        // Update max focus if needed
        if (duration > appData.insights.dailyStats[dateKey].maxFocus) {
            appData.insights.dailyStats[dateKey].maxFocus = duration;
        }

        // Recalculate started/finished times
        let earliestStart = '23:59';
        let latestEnd = '00:00';
        let hasAnySessions = false;

        Object.values(appData.insights.dailyStats[dateKey].subjectTimes).forEach(subjectTime => {
            if (subjectTime.sessions && subjectTime.sessions.length > 0) {
                hasAnySessions = true;
                subjectTime.sessions.forEach(session => {
                    if (session.start < earliestStart) earliestStart = session.start;
                    if (session.end > latestEnd) latestEnd = session.end;
                });
            }
        });

        // If there are no sessions left, reset to default values
        if (!hasAnySessions) {
            appData.insights.dailyStats[dateKey].started = '--:--';
            appData.insights.dailyStats[dateKey].finished = '--:--';
        } else {
            appData.insights.dailyStats[dateKey].started = earliestStart;
            appData.insights.dailyStats[dateKey].finished = latestEnd;
        }
    }

    // Save data and refresh views
    saveData();
    renderSubjects();
    showDayDetails(dateKey);

    // Close modal
    closeSessionModal();
}

// Delete session
function deleteSession(sessionData) {
    if (!sessionData) return;

    showConfirmDialog('Delete this session?', () => {
        const dateKey = sessionData.dateKey;
        const subjectId = sessionData.subjectId;
        const sessionIndex = sessionData.sessionIndex;

        // Get the subject times
        const subjectTimes = appData.insights.dailyStats[dateKey].subjectTimes[subjectId];
        if (!subjectTimes) return;

        // Get the session
        const session = subjectTimes.sessions[sessionIndex];
        if (!session) return;

        // Get the subject
        const subject = appData.subjects.find(s => s.id === subjectId);
        if (!subject) return;

        // Subtract duration from subject time
        subjectTimes.time -= session.duration;

        // Subtract duration from main timer
        appData.mainTimer.elapsedTime -= session.duration;
        updateTimerDisplay(mainTimerDisplay, appData.mainTimer.elapsedTime);

        // Subtract duration from subject timer
        subject.elapsedTime -= session.duration;

        // Update daily total time
        appData.insights.dailyStats[dateKey].totalTime -= session.duration;
        appData.insights.dailyStats[dateKey].appsTime = Math.floor(appData.insights.dailyStats[dateKey].totalTime * 0.6);

        // Remove the session
        subjectTimes.sessions.splice(sessionIndex, 1);

        // If no sessions left for this subject, remove the subject times
        if (subjectTimes.sessions.length === 0) {
            delete appData.insights.dailyStats[dateKey].subjectTimes[subjectId];
        }

        // Recalculate max focus
        let maxFocus = 0;
        Object.values(appData.insights.dailyStats[dateKey].subjectTimes).forEach(subjectTime => {
            subjectTime.sessions.forEach(s => {
                if (s.duration > maxFocus) maxFocus = s.duration;
            });
        });
        appData.insights.dailyStats[dateKey].maxFocus = maxFocus;

        // Recalculate started/finished times
        let earliestStart = '23:59';
        let latestEnd = '00:00';
        let hasAnySessions = false;

        Object.values(appData.insights.dailyStats[dateKey].subjectTimes).forEach(subjectTime => {
            if (subjectTime.sessions && subjectTime.sessions.length > 0) {
                hasAnySessions = true;
                subjectTime.sessions.forEach(s => {
                    if (s.start < earliestStart) earliestStart = s.start;
                    if (s.end > latestEnd) latestEnd = s.end;
                });
            }
        });

        // If there are no sessions left, reset to default values
        if (!hasAnySessions) {
            appData.insights.dailyStats[dateKey].started = '--:--';
            appData.insights.dailyStats[dateKey].finished = '--:--';
        } else {
            appData.insights.dailyStats[dateKey].started = earliestStart;
            appData.insights.dailyStats[dateKey].finished = latestEnd;
        }

        // Save data and refresh views
        saveData();
        renderSubjects();
        showDayDetails(dateKey);
    });
}

// Open edit break session modal
function openEditBreakSessionModal(breakSessionData) {
    currentSessionData = {
        ...breakSessionData,
        isBreak: true
    };
    sessionModalTitle.textContent = 'Convert Break to Subject';

    // Populate subject select with first subject selected
    populateSessionSubjects();

    // Set time inputs from the break session
    sessionStartInput.value = breakSessionData.start;
    sessionEndInput.value = breakSessionData.end;

    // Show modal
    sessionModal.classList.add('show');
}

// Close session modal
function closeSessionModal() {
    sessionModal.classList.remove('show');
    currentSessionData = null;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    updateDateDisplay();

    // Set up periodic check for new day (every minute)
    setInterval(checkAndResetForNewDay, 60000);

    // Listen for app closing event from main process
    if (window.electron && window.electron.ipcRenderer) {
        window.electron.ipcRenderer.on('app-closing', () => {
            console.log('App is closing, saving data...');

            // Save background tracking information
            saveBackgroundTrackingState();

            // Save the data one final time
            saveData();
        });
    } else {
        // For non-electron environments (e.g., when opened directly in browser)
        window.addEventListener('beforeunload', () => {
            // Save background tracking information
            saveBackgroundTrackingState();

            // Save the data one final time
            saveData();
        });
    }

    // Settings button in More tab
    const moreNavItem = document.querySelector('.nav-item:nth-child(2)');
    moreNavItem.addEventListener('click', () => {
        document.getElementById('settings-modal').classList.add('show');
    });

    // Close settings button
    document.getElementById('close-settings').addEventListener('click', () => {
        document.getElementById('settings-modal').classList.remove('show');
    });

    // Clear data button
    document.getElementById('clear-data-btn').addEventListener('click', () => {
        // Show confirmation dialog
        const confirmModal = document.getElementById('confirm-modal');
        const confirmMessage = document.getElementById('confirm-message');
        confirmMessage.textContent = 'Are you sure you want to clear all data? This cannot be undone.';
        confirmModal.classList.add('show');

        // Set up confirmation buttons
        document.getElementById('confirm-yes').onclick = () => {
            clearAllData();
            confirmModal.classList.remove('show');
            document.getElementById('settings-modal').classList.remove('show');
            showNotification('All data has been cleared');
        };

        document.getElementById('confirm-no').onclick = () => {
            confirmModal.classList.remove('show');
        };
    });

    // Main timer is no longer clickable to start/stop

    // Add subject button
    addSubjectBtn.addEventListener('click', openSubjectModal);

    // Add todo button
    addTodoBtn.addEventListener('click', openTodoModal);

    // Save subject button
    saveSubjectBtn.addEventListener('click', addSubject);

    // Cancel subject button
    cancelSubjectBtn.addEventListener('click', closeSubjectModal);

    // Save todo button
    saveTodoBtn.addEventListener('click', addTodo);

    // Cancel todo button
    cancelTodoBtn.addEventListener('click', closeTodoModal);

    // Save session button
    saveSessionBtn.addEventListener('click', saveSession);

    // Cancel session button
    cancelSessionBtn.addEventListener('click', closeSessionModal);

    // Color options
    colorOptions.forEach(option => {
        option.style.backgroundColor = option.dataset.color;

        option.addEventListener('click', () => {
            colorOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            appData.selectedColor = option.dataset.color;
        });
    });

    // Tab navigation
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;

            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update active content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tabId}-content`) {
                    content.classList.add('active');
                }
            });

            // If switching to insights tab, initialize it and update data
            if (tabId === 'insight') {
                // Update insights data first to ensure it's in sync with the main timer
                updateInsightsData();
                initializeInsightsTab();
            }
        });
    });

    // Period selector in Insights tab
    periodOptions.forEach(option => {
        option.addEventListener('click', () => {
            periodOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');

            // Handle period change (day/week/month)
            // For now, we'll just implement the day view
        });
    });

    // Month navigation
    prevMonthBtn.addEventListener('click', () => navigateMonth(-1));
    nextMonthBtn.addEventListener('click', () => navigateMonth(1));

    // Initialize insights data
    initializeInsightsData();
});

// Reset main timer
function resetMainTimer() {
    showConfirmDialog('Reset main timer?', () => {
        // Stop main timer if it's running
        if (appData.mainTimer.isRunning) {
            toggleMainTimer(); // Stop the timer first
        }

        // Reset main timer
        appData.mainTimer.elapsedTime = 0;
        updateTimerDisplay(mainTimerDisplay, 0);

        // Reset all subject timers
        appData.subjects.forEach(subject => {
            // Stop the subject timer if it's running
            if (subject.isRunning) {
                clearInterval(subject.interval);
                subject.isRunning = false;
            }

            // Reset the subject timer
            subject.elapsedTime = 0;
            subject.startTime = null;
        });

        // Save and render
        saveData();
        renderSubjects();
    });
}

// Reset subject timer
function resetSubjectTimer(subjectId) {
    const subject = appData.subjects.find(s => s.id === subjectId);
    if (!subject) return;

    showConfirmDialog(`Reset timer for ${subject.name}?`, () => {
        // Get the current elapsed time before resetting
        const elapsedTimeToSubtract = subject.elapsedTime;

        // Stop the subject timer if it's running
        if (subject.isRunning) {
            toggleSubjectTimer(subjectId); // Stop the timer first
        }

        // Reset the subject timer
        subject.elapsedTime = 0;
        subject.startTime = null;

        // Update the timer display
        const timerElement = document.querySelector(`.subject-timer[data-id="${subjectId}"]`);
        if (timerElement) {
            updateTimerDisplay(timerElement, 0);
        }

        // Subtract the subject's elapsed time from the main timer
        if (appData.mainTimer.elapsedTime >= elapsedTimeToSubtract) {
            appData.mainTimer.elapsedTime -= elapsedTimeToSubtract;
        } else {
            appData.mainTimer.elapsedTime = 0;
        }

        // Update the main timer display
        updateTimerDisplay(mainTimerDisplay, appData.mainTimer.elapsedTime);

        // Save and render
        saveData();
        renderSubjects();
    });
}

// Delete subject
function deleteSubject(subjectId) {
    const subject = appData.subjects.find(s => s.id === subjectId);
    if (!subject) return;

    showConfirmDialog(`Delete subject "${subject.name}"?`, () => {
        // Remove all todos for this subject
        appData.todos = appData.todos.filter(todo => todo.subjectId !== subjectId);

        // Remove the subject
        appData.subjects = appData.subjects.filter(s => s.id !== subjectId);

        saveData();
        renderSubjects();
    });
}

// Delete todo
function deleteTodo(todoId) {
    const todo = appData.todos.find(t => t.id === todoId);
    if (!todo) return;

    showConfirmDialog('Delete this todo?', () => {
        appData.todos = appData.todos.filter(t => t.id !== todoId);
        saveData();
        renderSubjects();
    });
}

// Show confirmation dialog
function showConfirmDialog(message, onConfirm) {
    confirmMessageEl.textContent = message;
    confirmModal.classList.add('show');

    // Store the callback for later use
    confirmYesBtn.onclick = () => {
        onConfirm();
        closeConfirmDialog();
    };

    confirmNoBtn.onclick = closeConfirmDialog;
}

// Close confirmation dialog
function closeConfirmDialog() {
    confirmModal.classList.remove('show');
}

// Show notification with custom message
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;

    // Add to body
    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    // Hide and remove after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 5000);
}

// Show notification for new day reset
function showNewDayNotification() {
    showNotification('New day started! Timers and tasks have been reset.');
}

// Initialize insights data
function initializeInsightsData() {
    // If we don't have insights data yet, create it
    if (!appData.insights) {
        appData.insights = {
            dailyStats: {}
        };
    }

    // Get current date
    const today = new Date();
    const dateKey = today.toISOString().split('T')[0];

    // Only create today's stats if they don't exist yet
    // This preserves existing sessions
    if (!appData.insights.dailyStats[dateKey]) {
        appData.insights.dailyStats[dateKey] = {
            totalTime: appData.mainTimer ? appData.mainTimer.elapsedTime : 0,
            appsTime: appData.mainTimer ? Math.floor(appData.mainTimer.elapsedTime * 0.6) : 0,
            maxFocus: 0, // Start with 0 max focus, will be updated based on sessions
            started: '--:--', // Will be set to first session start time
            finished: '--:--', // Will be set to last session end time
            subjectTimes: {}
        };
    }

    // Ensure all existing stats have consistent values
    Object.keys(appData.insights.dailyStats).forEach(date => {
        const stats = appData.insights.dailyStats[date];

        // Ensure max focus is never greater than total time
        if (stats.maxFocus > stats.totalTime) {
            stats.maxFocus = stats.totalTime;
        }

        // Recalculate started and finished times based on sessions
        let earliestStart = '23:59';
        let latestEnd = '00:00';
        let hasAnySessions = false;

        if (stats.subjectTimes) {
            Object.values(stats.subjectTimes).forEach(subjectTime => {
                if (subjectTime.sessions && subjectTime.sessions.length > 0) {
                    hasAnySessions = true;
                    subjectTime.sessions.forEach(session => {
                        if (session.start < earliestStart) {
                            earliestStart = session.start;
                        }
                        if (session.end > latestEnd) {
                            latestEnd = session.end;
                        }
                    });
                }
            });

            // Update started and finished times if there are sessions
            if (hasAnySessions) {
                stats.started = earliestStart;
                stats.finished = latestEnd;
            } else {
                stats.started = '--:--';
                stats.finished = '--:--';
            }
        }
    });

    saveData();
}

// Initialize insights tab
function initializeInsightsTab() {
    // Render insights view
    renderCalendarView();

    // Set up event listeners for day navigation
    prevDayBtn.addEventListener('click', () => navigateDay(-1));
    nextDayBtn.addEventListener('click', () => navigateDay(1));

    // Get current date for timeline view
    // Create the date at noon to avoid timezone issues
    const today = new Date();
    const todayDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0));
    const dateKey = todayDate.toISOString().split('T')[0];
    console.log(`Initializing insights tab with date: ${todayDate}, dateKey: ${dateKey}`);
    renderTimelineView(dateKey);
}

// Render calendar view
function renderCalendarView() {
    // Get current month and year
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Update month display
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    currentMonthEl.textContent = months[currentMonth];

    // Clear calendar days
    calendarDays.innerHTML = '';

    // Get first day of month and number of days in month
    const firstDay = new Date(currentYear, currentMonth, 1).getDay() || 7; // Convert Sunday (0) to 7
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Get last days of previous month if needed
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = 1; i < firstDay; i++) {
        const dayEl = createCalendarDay(daysInPrevMonth - firstDay + i + 1, false, 0);
        dayEl.style.opacity = '0.3';
        calendarDays.appendChild(dayEl);
    }

    // Add days of current month
    let monthlyTotal = 0;
    let studyDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
        // Create date with the correct day
        // Note: JavaScript months are 0-indexed (0-11), but days are 1-indexed (1-31)
        // Create the date at noon to avoid timezone issues
        const date = new Date(Date.UTC(currentYear, currentMonth, day, 12, 0, 0));

        // Get the ISO date string and split to get just the date part (YYYY-MM-DD)
        const dateKey = date.toISOString().split('T')[0];

        // Debug the date creation
        console.log(`Creating calendar day: ${day}, date: ${date}, dateKey: ${dateKey}`);

        const dayStats = appData.insights.dailyStats[dateKey];

        let studyTime = 0;
        if (dayStats) {
            studyTime = dayStats.totalTime;
            monthlyTotal += studyTime;
            if (studyTime > 0) studyDays++;
        }

        const isToday = day === now.getDate() && currentMonth === now.getMonth() && currentYear === now.getFullYear();
        const dayEl = createCalendarDay(day, isToday, studyTime);

        // Add click event to show day details and scroll to timeline
        dayEl.addEventListener('click', () => {
            showDayDetails(dateKey);
            scrollToTimeline();
        });

        calendarDays.appendChild(dayEl);
    }

    // Fill remaining slots with next month's days
    const totalCells = 42; // 6 rows of 7 days
    const remainingCells = totalCells - (firstDay - 1) - daysInMonth;
    for (let i = 1; i <= remainingCells; i++) {
        const dayEl = createCalendarDay(i, false, 0);
        dayEl.style.opacity = '0.3';
        calendarDays.appendChild(dayEl);
    }

    // Update monthly total
    const hours = Math.floor(monthlyTotal / 3600);
    const minutes = Math.floor((monthlyTotal % 3600) / 60);
    monthlyTotalTimeEl.textContent = `${months[currentMonth]}: ${hours}H ${minutes}M`;

    // Update active day indicator
    const dayIndicators = document.querySelectorAll('.day-indicator');
    dayIndicators.forEach(indicator => indicator.classList.remove('active'));

    if (studyDays <= 3) {
        dayIndicators[0].classList.add('active');
    } else if (studyDays <= 6) {
        dayIndicators[1].classList.add('active');
    } else if (studyDays <= 9) {
        dayIndicators[2].classList.add('active');
    } else {
        dayIndicators[3].classList.add('active');
    }

    // Show today's details by default
    // Create the date at noon to avoid timezone issues
    const todayDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0));
    const todayKey = todayDate.toISOString().split('T')[0];
    console.log(`Showing today's details: ${todayDate}, todayKey: ${todayKey}`);
    showDayDetails(todayKey);
}

// Create a calendar day element
function createCalendarDay(day, isActive, studyTime) {
    const dayEl = document.createElement('div');
    dayEl.className = `calendar-day${isActive ? ' active' : ''}`;

    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;

    const dayTime = document.createElement('div');
    dayTime.className = 'day-time';

    if (studyTime > 0) {
        const hours = Math.floor(studyTime / 3600);
        const minutes = Math.floor((studyTime % 3600) / 60);
        dayTime.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    dayEl.appendChild(dayNumber);
    dayEl.appendChild(dayTime);

    return dayEl;
}

// Show day details
function showDayDetails(dateKey) {
    // Store the selected date
    appData.insights.selectedDate = dateKey;

    const dayStats = appData.insights.dailyStats[dateKey] || {
        totalTime: 0,
        appsTime: 0,
        maxFocus: 0,
        started: '--:--',
        finished: '--:--'
    };

    // Format date
    summaryDateEl.textContent = formatDateForDisplay(dateKey, 'full');

    // Ensure max focus is never greater than total time
    // This fixes the inconsistency in the display
    if (dayStats.maxFocus > dayStats.totalTime) {
        dayStats.maxFocus = dayStats.totalTime;
    }

    // Update stats
    dailyTotalEl.textContent = formatTime(dayStats.totalTime);
    dailyAppsEl.textContent = `(Apps ${formatTime(dayStats.appsTime)})`;
    dailyMaxFocusEl.textContent = formatTime(dayStats.maxFocus);

    // Format start/end times with AM/PM
    dailyStartedEl.textContent = formatTimeWithAMPM(dayStats.started);
    dailyFinishedEl.textContent = formatTimeWithAMPM(dayStats.finished);

    // Update timeline view for the selected date
    renderTimelineView(dateKey);

    // Update todos for the selected date
    renderDailyTodos(dateKey);
}

// Render timeline view
function renderTimelineView(selectedDateKey) {
    // Clean up any existing event listeners before clearing the container
    cleanupTimelineEventListeners();

    // Clear timeline container
    timelineContainer.innerHTML = '';

    // Use selected date or default to today
    let dateKey;
    if (selectedDateKey) {
        dateKey = selectedDateKey;
    } else {
        // Create the date at noon to avoid timezone issues
        const today = new Date();
        const todayDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0));
        dateKey = todayDate.toISOString().split('T')[0];
    }

    console.log(`Rendering timeline view for date: ${dateKey}`);
    const dayStats = appData.insights.dailyStats[dateKey];

    // Check if there are any sessions
    let hasAnySessions = false;
    if (dayStats && dayStats.subjectTimes) {
        hasAnySessions = Object.values(dayStats.subjectTimes).some(subject =>
            subject.sessions && subject.sessions.length > 0
        );
    }

    if (!dayStats || !dayStats.subjectTimes || !hasAnySessions) {
        // No data or no sessions for the selected date
        const emptyMessage = document.createElement('div');

        // Format the date for display
        const formattedDate = formatDateForDisplay(dateKey, 'full');

        emptyMessage.textContent = `No study sessions recorded for ${formattedDate}.`;
        emptyMessage.style.textAlign = 'center';
        emptyMessage.style.padding = '20px';
        emptyMessage.style.color = '#888888';
        timelineContainer.appendChild(emptyMessage);

        // Still add the button to add new session
        const addSessionBtn = document.createElement('button');
        addSessionBtn.className = 'add-session-btn';

        // Format the date for the button if it's not today
        const today = new Date().toISOString().split('T')[0];
        let buttonText = '<span class="material-icons">add</span> Add Session';

        if (dateKey !== today) {
            const formattedDate = formatDateForDisplay(dateKey);
            buttonText = `<span class="material-icons">add</span> Add Session for ${formattedDate}`;
        }

        addSessionBtn.innerHTML = buttonText;
        addSessionBtn.addEventListener('click', () => openAddSessionModal(dateKey));
        timelineContainer.appendChild(addSessionBtn);
        return;
    }

    // Collect all sessions from all subjects, including breaks
    let allSessions = [];
    Object.entries(dayStats.subjectTimes).forEach(([subjectId, subject]) => {
        if (!subject.sessions || subject.sessions.length === 0) return;

        subject.sessions.forEach((session, index) => {
            // Extract seconds component if available, otherwise default to 0
            let startSeconds = 0;
            let endSeconds = 0;

            // Check if we have exact start/end times with seconds
            if (session.exactStartTime) {
                startSeconds = convertTimeToSeconds(session.exactStartTime);
            } else {
                startSeconds = convertTimeToSeconds(session.start);
            }

            if (session.exactEndTime) {
                endSeconds = convertTimeToSeconds(session.exactEndTime);
            } else {
                endSeconds = convertTimeToSeconds(session.end);
            }

            allSessions.push({
                dateKey,
                subjectId,
                sessionIndex: index,
                start: session.start,
                end: session.end,
                duration: session.duration,
                subjectName: subject.name,
                subjectColor: subject.color,
                startMinutes: convertTimeToMinutes(session.start),
                endMinutes: convertTimeToMinutes(session.end),
                startSeconds: startSeconds,
                endSeconds: endSeconds,
                isBreak: subject.name === 'Break'
            });
        });
    });

    // Sort all sessions chronologically by start time with second precision
    allSessions.sort((a, b) => {
        // First compare by start seconds
        if (a.startSeconds !== b.startSeconds) {
            return a.startSeconds - b.startSeconds;
        }

        // If start times are the same, compare by end seconds
        return a.endSeconds - b.endSeconds;
    });

    // Add sessions to timeline
    allSessions.forEach((session) => {
        // Format time for display
        const startTimeDisplay = formatTimeForDisplay(session.start);

        // Format time period
        const timePeriod = formatTimePeriod(session.start, session.end);

        const timelineItem = createTimelineItem(
            startTimeDisplay,
            session.subjectName,
            session.subjectColor,
            formatDuration(session.duration),
            timePeriod,
            session.isBreak ? null : session // Pass null for break sessions to match previous behavior
        );
        timelineContainer.appendChild(timelineItem);
    });

    // Check for gaps between sessions and add breaks if needed
    for (let i = 0; i < allSessions.length - 1; i++) {
        const currentSession = allSessions[i];
        const nextSession = allSessions[i + 1];

        // Calculate gap between current session end and next session start
        const gapMinutes = nextSession.startMinutes - currentSession.endMinutes;

        // Only add a break if there's a gap and neither the current nor next session is already a break
        if (gapMinutes > 0 && !currentSession.isBreak && !nextSession.isBreak) {
            const gapSeconds = gapMinutes * 60;

            // Format end time for display
            const endTimeDisplay = formatTimeForDisplay(currentSession.end);

            // Format time period
            const breakPeriod = formatTimePeriod(currentSession.end, nextSession.start);

            // Create break session data for the gap
            const breakSessionData = {
                start: currentSession.end,
                end: nextSession.start,
                dateKey: findDateKeyForBreakSession(breakPeriod),
                isBreak: true
            };

            const breakItem = createTimelineItem(
                endTimeDisplay,
                'Break',
                '#CCCCCC', // Use the same color as defined for Break subject
                formatDuration(gapSeconds),
                breakPeriod,
                null
            );

            // Simply append the break item to the timeline container
            // It will appear after the current session since we're processing in order
            timelineContainer.appendChild(breakItem);
        }
    }

    // Add button to add new session
    const addSessionBtn = document.createElement('button');
    addSessionBtn.className = 'add-session-btn';

    // Format the date for the button if it's not today
    const today = new Date().toISOString().split('T')[0];
    let buttonText = '<span class="material-icons">add</span> Add Session';

    if (dateKey !== today) {
        const formattedDate = formatDateForDisplay(dateKey);
        buttonText = `<span class="material-icons">add</span> Add Session for ${formattedDate}`;
    }

    addSessionBtn.innerHTML = buttonText;
    addSessionBtn.addEventListener('click', () => openAddSessionModal(dateKey));
    timelineContainer.appendChild(addSessionBtn);
}

// Create a timeline item
function createTimelineItem(time, subject, color, duration, period, sessionData) {
    const item = document.createElement('div');
    item.className = 'timeline-item';

    const timeEl = document.createElement('div');
    timeEl.className = 'timeline-time';
    timeEl.textContent = time;

    const content = document.createElement('div');
    content.className = 'timeline-content';
    content.style.borderColor = color;

    const headerRow = document.createElement('div');
    headerRow.className = 'timeline-header-row';

    const subjectEl = document.createElement('div');
    subjectEl.className = 'timeline-subject';
    subjectEl.textContent = subject;

    const menuEl = document.createElement('div');
    menuEl.className = 'timeline-menu';

    // Add menu for subject sessions and break sessions
    if (sessionData || subject === 'Break') {
        const menuIcon = document.createElement('span');
        menuIcon.className = 'material-icons';
        menuIcon.textContent = 'more_vert';
        menuEl.appendChild(menuIcon);

        // Create dropdown menu
        const dropdownMenu = document.createElement('div');
        dropdownMenu.className = 'dropdown-menu';
        dropdownMenu.style.display = 'none';

        if (subject === 'Break') {
            // For break sessions, add option to convert to a subject session
            const convertOption = document.createElement('div');
            convertOption.className = 'dropdown-item';
            convertOption.textContent = 'Convert to Subject';
            convertOption.addEventListener('click', (e) => {
                e.stopPropagation();
                // Create a break session data object with the necessary information
                const breakSessionData = {
                    start: period.split(' ~ ')[0].split(' ')[1] + ':' + period.split(' ~ ')[0].split(' ')[0],
                    end: period.split(' ~ ')[1].split(' ')[1] + ':' + period.split(' ~ ')[1].split(' ')[0],
                    dateKey: findDateKeyForBreakSession(period),
                    isBreak: true
                };
                openEditBreakSessionModal(breakSessionData);
                dropdownMenu.style.display = 'none';
            });
            dropdownMenu.appendChild(convertOption);
        } else {
            // For regular subject sessions
            const editOption = document.createElement('div');
            editOption.className = 'dropdown-item';
            editOption.textContent = 'Edit Session';
            editOption.addEventListener('click', (e) => {
                e.stopPropagation();
                openEditSessionModal(sessionData);
                dropdownMenu.style.display = 'none';
            });

            const deleteOption = document.createElement('div');
            deleteOption.className = 'dropdown-item';
            deleteOption.textContent = 'Delete Session';
            deleteOption.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteSession(sessionData);
                dropdownMenu.style.display = 'none';
            });

            dropdownMenu.appendChild(editOption);
            dropdownMenu.appendChild(deleteOption);
        }

        menuEl.appendChild(dropdownMenu);

        // Toggle dropdown menu
        menuIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
        });

        // Close dropdown when clicking elsewhere
        // Use a named function to avoid adding multiple listeners
        const closeDropdown = () => {
            dropdownMenu.style.display = 'none';
        };

        // Store the function reference on the element to remove it later
        menuEl.closeDropdownListener = closeDropdown;
        document.addEventListener('click', closeDropdown);
    }

    headerRow.appendChild(subjectEl);
    headerRow.appendChild(menuEl);

    const durationEl = document.createElement('div');
    durationEl.className = 'timeline-duration';
    durationEl.textContent = duration;

    const periodEl = document.createElement('div');
    periodEl.className = 'timeline-period';
    periodEl.textContent = period;

    content.appendChild(headerRow);
    content.appendChild(durationEl);
    content.appendChild(periodEl);

    item.appendChild(timeEl);
    item.appendChild(content);

    return item;
}

// Format duration in seconds to human-readable format
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

// Format date for display
function formatDateForDisplay(dateKey, format = 'short') {
    const date = new Date(dateKey);

    if (format === 'full') {
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}

// Format time with AM/PM
function formatTimeWithAMPM(timeStr) {
    if (timeStr === '--:--') {
        return '--:--';
    }

    const timeParts = timeStr.split(':');
    const hour = parseInt(timeParts[0]);
    const hour12 = hour % 12 || 12; // Convert 0 to 12
    const amPm = hour >= 12 ? 'PM' : 'AM';

    return `${hour12}:${timeParts[1]} ${amPm}`;
}

// Format time period (start ~ end)
function formatTimePeriod(startTime, endTime) {
    const startFormatted = formatTimeWithAMPM(startTime);
    const endFormatted = formatTimeWithAMPM(endTime);

    if (startFormatted === '--:--' || endFormatted === '--:--') {
        return '--:--';
    }

    // Extract AM/PM and time parts
    const startParts = startFormatted.split(' ');
    const endParts = endFormatted.split(' ');

    return `${startParts[1]} ${startParts[0]} ~ ${endParts[1]} ${endParts[0]}`;
}

// Format time for display in timeline
function formatTimeForDisplay(timeStr) {
    const formatted = formatTimeWithAMPM(timeStr);
    if (formatted === '--:--') {
        return formatted;
    }

    const parts = formatted.split(' ');
    return `${parts[1]} ${parts[0]}`; // e.g., "PM 2:30"
}

// Convert time string (HH:MM) to minutes since midnight
function convertTimeToMinutes(timeStr) {
    if (timeStr === '--:--') {
        return 0;
    }

    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

// Convert time string (HH:MM:SS or HH:MM) to seconds since midnight
function convertTimeToSeconds(timeStr) {
    if (timeStr === '--:--') {
        return 0;
    }

    const parts = timeStr.split(':').map(Number);

    if (parts.length === 3) {
        // HH:MM:SS format
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        // HH:MM format
        return parts[0] * 3600 + parts[1] * 60;
    }

    return 0;
}

// Navigate month in calendar view
function navigateMonth(direction) {
    // This would update the calendar to show previous/next month
    // For demo purposes, we'll just refresh the current view
    renderCalendarView();
}

// Navigate day in insights view
function navigateDay(direction) {
    // Get the currently selected date
    const currentDateKey = appData.insights.selectedDate;
    if (!currentDateKey) return;

    // Parse the date
    const currentDate = new Date(currentDateKey + 'T12:00:00Z');

    // Add or subtract a day
    currentDate.setDate(currentDate.getDate() + direction);

    // Format the new date as YYYY-MM-DD
    const newDateKey = currentDate.toISOString().split('T')[0];

    // Show the details for the new date
    showDayDetails(newDateKey);

    // Highlight the day in the calendar if it's visible
    highlightCalendarDay(newDateKey);
}

// Highlight the selected day in the calendar
function highlightCalendarDay(dateKey) {
    // Remove highlight from all days
    const allDays = document.querySelectorAll('.calendar-day');
    allDays.forEach(day => day.classList.remove('selected'));

    // Find the day element for the given date
    const dayElements = document.querySelectorAll('.calendar-day');
    const date = new Date(dateKey + 'T12:00:00Z');
    const day = date.getDate();

    // Find the element with the matching day number
    // This is a simplified approach and might not work perfectly for all cases
    for (let i = 0; i < dayElements.length; i++) {
        const dayNumber = dayElements[i].querySelector('.day-number');
        if (dayNumber && parseInt(dayNumber.textContent) === day) {
            // Check if this is not a day from previous/next month (opacity < 1)
            if (dayElements[i].style.opacity !== '0.3') {
                dayElements[i].classList.add('selected');
                break;
            }
        }
    }
}

// Scroll to timeline view
function scrollToTimeline() {
    const timelineSection = document.querySelector('.timeline-section');
    if (timelineSection) {
        timelineSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Clean up timeline event listeners to prevent memory leaks
function cleanupTimelineEventListeners() {
    // Find all timeline menu elements that have event listeners
    const menuElements = document.querySelectorAll('.timeline-menu');
    menuElements.forEach(menuEl => {
        // Remove the click event listener if it exists
        if (menuEl.closeDropdownListener) {
            document.removeEventListener('click', menuEl.closeDropdownListener);
            menuEl.closeDropdownListener = null;
        }
    });
}

// Find the date key for a break session based on the period string
function findDateKeyForBreakSession(period) {
    // Get the currently displayed date key from the summary date element
    const summaryDateText = summaryDateEl.textContent;
    const date = new Date();

    // Parse the date from the summary date text (format: "Thu, Apr 25")
    const dateParts = summaryDateText.split(', ')[1].split(' ');
    const monthStr = dateParts[0];
    const day = parseInt(dateParts[1]);

    // Convert month name to month number (0-11)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months.indexOf(monthStr);

    // Set the date object to the parsed date
    date.setMonth(month);
    date.setDate(day);

    // Keep the current year unless the month/day combination is in the future
    const currentDate = new Date();
    if (date > currentDate && date.getMonth() < currentDate.getMonth() + 2) {
        // If the date is in the future but within a reasonable range, it's likely from last year
        date.setFullYear(currentDate.getFullYear() - 1);
    } else {
        date.setFullYear(currentDate.getFullYear());
    }

    // Return the date key in ISO format (YYYY-MM-DD)
    return date.toISOString().split('T')[0];
}

// Render todos for the selected date
function renderDailyTodos(dateKey) {
    // Clear the container
    dailyTodosContainer.innerHTML = '';

    // Filter todos for the selected date
    // We'll consider a todo to be for a specific date if it was created on that date
    // This is a simplified approach - in a real app, you might want to store the date with each todo
    const todosForDate = appData.todos.filter(todo => {
        // For this implementation, we'll use the ID as a timestamp
        // This assumes that the ID is created using Date.now().toString()
        const todoDate = new Date(parseInt(todo.id));
        const todoDateKey = todoDate.toISOString().split('T')[0];
        return todoDateKey === dateKey;
    });

    // If there are no todos for this date, show a message
    if (todosForDate.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-todos-message';
        emptyMessage.textContent = 'No to-dos for this day';
        dailyTodosContainer.appendChild(emptyMessage);
        return;
    }

    // Group todos by subject
    const todosBySubject = {};
    todosForDate.forEach(todo => {
        if (!todosBySubject[todo.subjectId]) {
            todosBySubject[todo.subjectId] = [];
        }
        todosBySubject[todo.subjectId].push(todo);
    });

    // Create todo items for each subject
    Object.entries(todosBySubject).forEach(([subjectId, todos]) => {
        // Get the subject
        const subject = appData.subjects.find(s => s.id === subjectId);
        if (!subject) return;

        // Create a subject header
        const subjectHeader = document.createElement('div');
        subjectHeader.className = 'daily-todo-subject';
        subjectHeader.textContent = subject.name;
        subjectHeader.style.color = subject.color;
        dailyTodosContainer.appendChild(subjectHeader);

        // Create todo items
        todos.forEach(todo => {
            const todoItem = document.createElement('div');
            todoItem.className = 'daily-todo-item';

            const todoCheckbox = document.createElement('div');
            todoCheckbox.className = `daily-todo-checkbox ${todo.completed ? 'checked' : ''}`;

            const todoText = document.createElement('div');
            todoText.className = `daily-todo-text ${todo.completed ? 'completed' : ''}`;
            todoText.textContent = todo.text;

            // Add event listener to toggle completion
            todoCheckbox.addEventListener('click', () => {
                todo.completed = !todo.completed;
                todoCheckbox.classList.toggle('checked');
                todoText.classList.toggle('completed');
                saveData();
            });

            todoItem.appendChild(todoCheckbox);
            todoItem.appendChild(todoText);
            dailyTodosContainer.appendChild(todoItem);
        });
    });
}