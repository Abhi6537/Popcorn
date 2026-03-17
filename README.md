# Popcorn 🍿

Watch together, no matter where you are. 

**Popcorn** is a real-time web application that allows friends to watch videos in sync, chat live, and connect via video/audio calls. Designed to be a seamless and fun watch party experience!

## ✨ Features

- **Real-time Video Sync**: Watch YouTube videos, direct mp4/webm URLs, or even local video files perfectly synced across all participants.
- **Live Chat & Reactions**: Chat with your friends and send emoji reactions during the movie.
- **Video & Audio Calls**: Built-in WebRTC support for live video and voice calls inside the room.
- **Host Controls**: The room creator has full control. Play, pause, and seek the video for everyone. Hosts can also mute or remove disruptive participants.
- **Responsive Design**: Enjoy the watch party on both desktop and mobile devices.

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS, Framer Motion, shadcn/ui, Lucide Icons
- **Real-time Engine**: Supabase (Realtime Channels & Presence)
- **Peer-to-Peer Calls**: WebRTC

## 🚀 Getting Started Locally

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   git clone <repository-url>
   cd popcorn
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables:
   - Create a `.env` file in the root of the project.
   - You will need a Supabase project for the real-time functionality. Add your Supabase credentials:
     ```env
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:8080` (or the port specified in your terminal).

## 🎮 How to Use

1. **Create a Room**: On the home page, enter your display name and click "Create Watch Party" to host a new room.
2. **Invite Friends**: Copy the room link or the room code and share it with your friends. Up to 5 participants can join a single room.
3. **Choose a Video**: As a host, paste a YouTube link, a direct video URL, or choose a local video file.
4. **Watch & Chat**: Play the video, and it will sync for everyone in the room! Use the chat panel on the right (or under the chat tab on mobile) to talk and react.
5. **Join a Call**: Click the "Join Call" button in the header to start a video or audio chat with the room.

## 📝 License

This project is open-source and available under the MIT License.
