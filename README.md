# StudyEffortlessly

A productivity timer app inspired by Yeolpumta, designed to help you track your study sessions and stay focused. This Windows app features a main timer, subject-specific timers, todo lists, and detailed insights.

## Features

- **Main Timer**: Track your overall study/work time
- **Subject Management**: Create, edit, and delete subjects with color coding
- **Todo Management**: Add, complete, and delete todos for each subject
- **Timer Controls**: Start, pause, and reset timers for both main timer and individual subjects
- **Dark Theme**: Sleek dark theme similar to Yeolpumta
- **Insights Tab**: View detailed statistics about your study sessions
- **Calendar View**: See your daily study times at a glance
- **Timeline View**: Detailed breakdown of your study sessions
- **Break Tracking**: Automatically track breaks between study sessions
- **Day Navigation**: Navigate between days to see historical data
- **Date-specific Todos**: View todos created on specific days

## Installation

### Option 1: Install from Pre-built Executable

1. Download the latest installer from the `dist` folder
2. Run the installer (StudyEffortlessly-Setup-x.x.x.exe) and follow the on-screen instructions
3. Launch the app from your desktop or start menu

### Option 2: Build from Source

#### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later)
- npm (comes with Node.js)

#### Steps

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Run the app in development mode:
   ```
   npm start
   ```

## Building for Windows

To build the application as an installable executable:

1. Make sure all instances of the app are closed
2. Run the build script:
   ```
   npm run build
   ```
3. The installer will be created in the `dist` folder (StudyEffortlessly-Setup-x.x.x.exe)
4. Run the installer to install the app on your system

### Troubleshooting Build Issues

If you encounter issues during the build process:

1. Make sure all instances of the app are closed
2. Delete the `dist` folder if it exists
3. Try running the build script again with debug information:
   ```
   npm run build -- --debug
   ```

## Usage

### Timer Tab

- Add subjects using the "+ Subject" button
- Add todos using the "+ To-do" button
- Click on the colored circle next to a subject to start/pause its timer
- Click on the three dots menu to access more options for a subject
- Click on the checkbox to mark a todo as completed
- Click on the X icon to delete a todo

### Insights Tab

- View the calendar to see your daily study times
- Click on a day to see detailed information for that day
- Use the left/right arrows to navigate between days
- View the timeline to see your study sessions for the selected day
- View todos created on the selected day
- Add new sessions manually by clicking the "Add Session" button
- Edit or delete sessions by clicking the three dots menu next to a session
- Convert break sessions to subject sessions by clicking the three dots menu

## Technologies Used

- Electron
- HTML/CSS/JavaScript
- Local Storage for data persistence

## License

MIT
