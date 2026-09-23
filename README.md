# 🐘 Zora - The Interactive AI Companion

**Zora** is a fun, voice-powered 3D elephant friend designed for kids! She can talk to you, play learning games, eat snacks, and even dance to music. 

## 🚀 What is this project?

Think of Zora like a smart, virtual pet right in your browser. You can talk to her through your computer or phone microphone, and an AI helps her understand you and reply. She has a 3D animated body that reacts when you click her, feed her, or play music!

### 🌟 Cool Features:
* **Talk to Zora:** Ask her questions and she speaks back with a cute childlike voice.
* **Play Games:** She hosts fun mini-games like "Apple Counting", "Truths", and "Shape Sorting". You even win badges!
* **3D Animation:** Zora is a real 3D model that breathes, dances, bobs, and giggles when you click her.
* **Feed Her:** You can drag and drop snacks (like tacos or strawberries) to watch her eat.
* **Dance Mode:** Tap the drum icon to hear a happy 12-second song and watch her dance.

---

## 🛠️ Tech Stack (What we used to build it)

If you're learning to code, here are the awesome tools powering Zora:
* **Next.js & React:** The main framework building the website.
* **React Three Fiber (Three.js):** This is how we put the 3D models (`zora.glb` & `dance_zora.glb`) on the screen and animate them.
* **Zustand:** Helps the app remember things (like keeping track of your badges and whether Zora is talking or dancing).
* **Framer Motion:** Makes the buttons and menus slide in smoothly.
* **Web Audio API:** Synthesizes the music and sound effects (like pops, dings, and the dance melody) completely in code—no MP3 files needed!
* **Google Gemini AI:** This is Zora's "brain" that figures out how to reply to your voice.

---

## 💻 How to run it on your computer

Want to run Zora on your own computer? Follow these easy steps:

1. **Install Node.js:** Make sure you have [Node.js](https://nodejs.org/) installed on your computer.
2. **Open the terminal:** Open your Command Prompt (Windows) or Terminal (Mac) and go to the `zora` folder.
3. **Install the packages:** Tell Node to download all the coding tools we need by typing:
   ```bash
   npm install
   ```
4. **Set up the AI Brain (Gemini API Key):**
   * Because Zora uses Google's AI, the project needs a Gemini API key to work. The app expects this to be set up in your computer's environment variables.
5. **Start the App!**
   Type this command to start the server:
   ```bash
   npm run dev
   ```
6. **Play:** Open your web browser and go to [http://localhost:3000](http://localhost:3000). 
   * *Important:* Make sure to give the browser permission to use your microphone when it asks!

---

## 🐛 Troubleshooting

* **No Sound?** Web browsers block audio until you interact with the page. Just click anywhere on the screen once to let the audio play!
* **Microphone not working?** Check if there's a little camera/mic icon in your browser's address bar (at the top) and make sure "Allow" is selected.
* **Is the 3D model laggy?** The 3D graphics have been highly optimized to run fast, but if it lags, try closing some other heavy browser tabs.
