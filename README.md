# ImmutableOps
This repo is created for the Innovex Hackathon 2026.

## 🏆 Problem Statement No. 7: AI-Powered Smart Pre-Order & Kitchen Optimisation.

**Live Demo**: [https://immutable-ops-dzzg.vercel.app/](https://immutable-ops-dzzg.vercel.app/)

Welcome to **CaféSync**, our solution for modernizing college and corporate canteen ecosystems! This repository houses our complete submission for streamlining canteen management using AI scheduling, real-time sync, and efficient order tracking.

---

### 🌟 Project Abstract

Traditional canteens face severe bottlenecks during rush hours (breakfast, lunch) due to chaotic queueing, unoptimized kitchen preparation times, and lack of visual transparency for students. 

**CaféSync** solves this by:
1. **AI-Assisted Scheduling**: Using Anthropic's Claude API to assess cart volume and current kitchen load to determine an exact preparation start time and priority level.
2. **Real-time Kitchen Kanban**: Providing chefs with a live dashboard to visualize workload and process items chronologically or by AI-determined urgent priority.
3. **Transparent Tracking**: Giving students a live tracking interface indicating exactly when their food transitions from *Queued* → *Preparing* → *Ready*.

---

### 🚀 Key Features Built

- **Smart Time-Based Menu**: Automatically highlights breakfast picks, lunch items, or afternoon snacks based on the exact local time.
- **Dynamic Pre-Ordering**: Students can define a custom pickup time (e.g., "I will arrive in 45 minutes"), and the system uses our scheduling algorithm to delay kitchen action until necessary, keeping food fresh.
- **Role-Based Portals**:
  - `Student Portal`: Ordering, Cart, Live Tracker.
  - `Chef Portal`: Queue Management, Workload load-balancing charts.
  - `Admin Portal`: Master CRUD for Menu Items and Dashboard analytics metrics.
- **Micro-Animations & Premium UI**: Built cleanly with Vanilla CSS logic and highly polished UX without reliance on massive external CSS frameworks.

---

### 💻 Technologies Used
- **Frontend Core**: Vite + React 19
- **Backend & Database**: Firebase Auth + Cloud Firestore (NoSQL)
- **AI/LLM**: Anthropic API (Claude 3.5 Sonnet) for scheduling logic and chef tips
- **Deployment**: Vercel
- **Data Visualization**: Chart.js (`react-chartjs-2`)

---

### 📂 Repository Structure

The core React frontend application is located inside the `canteen-app/` directory. For setup, running locally, and specific technical documentation regarding the UI, backend integration, and the AI algorithm, please view the main [Application README](./canteen-app/README.md).

### 🛠️ Team ImmutableOps
*Building the future of optimized dining semantics.*
