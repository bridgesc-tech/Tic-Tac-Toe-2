# TicTacToe Advanced

A strategic TicTacToe card game with local and online multiplayer powered by Firebase.

## Features

- **Local Multiplayer**: Play with a friend on the same device
- **Online Multiplayer**: Real-time multiplayer with Firebase (no URL sharing needed!)
- **Card-Based Strategy**: Use numbered cards to capture spaces, with higher cards overwriting lower ones
- **Progressive Web App**: Install on your phone and play offline (local mode)

## How to Play

### Setup

Since Firebase requires HTTP/HTTPS, you need to run a local server:

**Option 1: Using the Batch File (Windows)**
1. Double-click `run-local-server.bat`
2. Wait for "Starting local server..." message
3. Open your browser to `http://localhost:8001`

**Option 2: Using Python Manually**
```bash
python -m http.server 8001
```
Then open `http://localhost:8001` in your browser.

**Option 3: Deploy to GitHub Pages**
1. Push your code to a GitHub repository
2. Enable GitHub Pages in repository settings
3. Access via `https://yourusername.github.io/repository-name`

### Game Modes

#### Local Multiplayer
- Pass the device back and forth between players
- Perfect for in-person gameplay

#### Online Multiplayer
1. Click "Online Multiplayer"
2. **Create Game**: Click "Create New Game" to get a Game ID
3. **Share**: Copy the Game ID and send it to your friend
4. **Join**: Your friend enters the Game ID and clicks "Join Game"
5. **Play**: Moves sync automatically in real-time!

### Rules

- Each player has 10 cards (two of each number 1-5)
- Place cards on a 4x4 grid
- Higher cards can overwrite lower opponent cards
- Once a card is placed, it cannot be moved (locked)
- Win by getting 4 in a row (horizontal, vertical, or diagonal)
- Draw if the board fills up or both players run out of playable cards

## Technical Details

- **Firebase Firestore**: Real-time game state synchronization
- **Service Worker**: Offline capabilities for PWA
- **Mobile-First Design**: Optimized for touch devices
- **No Server Required**: Runs entirely client-side (except Firebase)

## Firebase Setup

The app uses the same Firebase project as TV Time Manager. Game rooms are stored in the `gameRooms` collection, completely separate from family data.

## Troubleshooting

**Firebase not connecting?**
- Make sure you're accessing via HTTP/HTTPS (not `file://`)
- Check browser console for errors
- Verify Firebase credentials in `firebase-config.js`

**Can't create/join game rooms?**
- Ensure you have an internet connection
- Check that Firestore is enabled in your Firebase project
- Verify Firestore rules allow read/write access

---

Enjoy playing! 🎮
