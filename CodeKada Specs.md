# Technical Specifications

# **Technical Specification Document: SyncForge** 

## **1\. Project Overview & Hackathon Strategy**

* **Project Name**: SyncForge  
* **Pitch**: An intelligent, collaborative, hybrid time-blocking platform. It leverages multimodal AI to ingest diverse inputs (text, images, documents, links), understand deep task nuances, and break down complex projects. A deterministic scheduling algorithm then mathematically maps those tasks into flexible, shared calendar environments with real-time tracking and analytics.  
* **Hackathon Objective**: Deliver a Next.js MVP that demonstrates the hybrid pipeline: AI-driven multimodal ingestion and qualitative weighting, followed by rapid, algorithmic calendar bin-packing. Expand this to showcase scheduling environments and basic team collaboration to stand out from existing competitors.

## **2\. System Architecture & Tech Stack**

* **Framework**: Next.js (React) for a unified full-stack environment.  
* **Database**: MongoDB to natively store the dynamic, nested JSON objects output by the AI, as well as the new analytical telemetry and team environment data.  
* **AI Parser**: Gemini 1.5 Flash/Pro. Upgrading to a multimodal LLM is strictly required to process the new input arrays (screenshots, video transcripts, raw documents) and output fast, strict JSON generation.  
* **Scheduling Engine**: Custom JavaScript deterministic algorithm (e.g., greedy bin-packing) running on Next.js API routes.  
* **Real-Time Subsystem (New)**: Next.js API polling or lightweight WebSockets to handle real-time task tracking and live updates across collaborative team environments.

## **3\. The Hybrid Scheduling Engine (Core Logic)**

This is the central differentiator of the MVP. The scheduling flow is split into two distinct phases to maximize the strengths of both AI and hard-coded logic.

### **Phase 1: Multimodal AI Qualitative Analysis (The "Brain")** 

Instead of asking the AI to pick specific times (e.g., "Schedule this at 2:00 PM"), the AI is strictly used to profile the work and the user.

* **Input**: The user's varied inputs (syllabus text, uploaded screenshots, pasted hyperlinks, documents) plus their stored personal preferences from MongoDB (e.g., "Prefers deep work in the morning," "Requires 15-minute buffers between hard tasks," or specific constraints).  
* **Processing**: The LLM evaluates the diverse prompt materials. It breaks down large tasks, estimates length based on nuance, and scores the task against the user's profile.  
* **Output**: A mathematically agnostic, structured JSON array of tasks enriched with "metadata tags."  
* JSON

```
[
  {
    "task_name": "Write Thesis Intro",
    "parent_environment": "Capstone Project Space",
    "estimated_minutes": 120,
    "cognitive_load": "High",
    "preferred_window": "Morning",
    "splittable": true,
    "assigned_to": "user_id_123" 
  }
]
```

### **Phase 2: Deterministic Bin-Packing Algorithm (The "Hands")** 

Once the AI provides the enriched JSON, the hard-coded JavaScript algorithm takes over completely.

* **Data Fetching**: The backend fetches the user's (or team's) exact "Busy" times from the integrated calendar APIs.  
* **Algorithmic Logic**: A greedy algorithm scans the available free-time "bins" in the calendar. It maps the AI's JSON output into these bins by matching the metadata (e.g., finding a 120-minute gap in the morning for a "High cognitive load" task).  
* **Recalculation & Real-Time Tracking**: Because this phase is hard-coded math rather than an AI prompt, when a user clicks "Snooze," marks a task complete, or life gets in the way, the JS algorithm can dynamically recalculate and shift the remaining schedule in milliseconds without making another costly, slow API call to the LLM.

## **4\. Expanded Feature Integrations**

* **Scheduling Environments (The "Docs" Approach)**: Tasks are grouped into isolated "Environments" (e.g., "Hackathon Team," "Personal Errand Space"). These act like shared documents where users can collaboratively dump multimodal inputs, view basic productivity stats (completion rates, deep work hours), and visualize the resulting schedules.  
* **Unlimited Third-Party Integration Architecture**: Moving beyond a single provider.  
  * **Authentication**: NextAuth.js configured with Google providers (as the primary OAuth).  
  * **Adapter Pattern**: By utilizing an interface/adapter pattern in the backend services layer, the app can theoretically support unlimited third-party tools (Outlook, Notion, Slack). The MVP will demonstrate this scalability by implementing Google Calendar alongside a mock secondary adapter.  
  * **Read/Write**: The algorithm reads existing events to build the availability matrix, then writes the final computed schedule blocks back to the respective third-party APIs.

## **5\. Version Control & Collaboration Policy**

To maintain development velocity and prevent complex merge conflicts in the unified Next.js environment:

* **Repository Flow**: The repository will utilize a singular second-level integration branch in GitHub.  
* **Execution**: All UI components, MongoDB connection utilities, and scheduling algorithms must be merged directly into this single integration branch. Separate frontend and backend branches will not be used.  
* **Deployment**: This integration branch will be connected directly to Vercel for continuous, live testing throughout the event.

## **6\. Execution Roadmap (3 Days Remaining)**

* **Day 1: Multimodal Scaffolding & Brains**. Initialize Next.js, MongoDB, and NextAuth (Google). Build the database schema for *Environments*. Spend heavy time engineering the Gemini multimodal prompt so it reliably digests images/text and outputs the tagged JSON without hallucinating exact dates.  
* **Day 2: The Algorithm & Environments**. Build the JavaScript bin-packing algorithm. Feed it dummy JSON from the AI and dummy calendar gaps to ensure it slots tasks correctly without overlapping. Implement the basic UI for the document-style Scheduling Environments and the stat/analytics dashboard.  
* **Day 3: Full Pipeline, Collaboration & Polish**. Connect the AI output directly to the algorithm's input. Build the React dashboard to visualize the mathematical output. Connect the final output to the integration adapters. Freeze all new features. Optimize the algorithm's speed, polish the Tailwind CSS UI, and refine the pitch narrative emphasizing the efficiency of the hybrid approach.

# Architecture

# **Architecture Document: SyncForge**

## **1\. Executive Summary**

SyncForge is designed as a highly modular, full-stack collaborative scheduling application. The architecture strictly separates the client-side presentation, the server-side orchestration pipeline, and the specialized backend services. To support team environments, the architecture now introduces a real-time synchronization layer to ensure all users in a shared space see immediate, deterministic schedule updates.

## **2\. Level 1: Frontend (Client-Side Interface)**

The frontend serves as the primary interface for user interaction, capturing diverse inputs and rendering the shared computed schedules.

* **Technology**: Next.js (React components) with Tailwind CSS.  
* **Responsibilities**:  
  * Capture multimodal user input (text, image uploads, document links).  
  * Transmit HTTP requests to the Backend Orchestrator.  
  * Render the generated schedule via a visual timeline.  
  * **\[NEW\]** Maintain active WebSocket/Polling connections to listen for remote changes made by teammates and dynamically re-render the UI.  
  * Capture real-time user interruptions (e.g., "Snooze" or "Missed Task") and push signals to the backend for immediate recalculation.

## **3\. Level 2: Backend (Orchestrator Pipeline & Real-Time Controller)**

Living within the Next.js API Routes, the backend acts as a "Traffic Controller." It coordinates the sequence of operations and now manages multi-user state.

* **Technology**: Next.js API Routes (Server-side JavaScript) \+ Pusher/Socket.io (for real-time events).  
* **Responsibilities**:  
  * **Pipeline Execution**: Invokes the AI Model \-\> passes structured data to the Scheduler \-\> persists data to the Database \-\> synchronizes with Third-Party Apps.  
  * **\[NEW\] Real-Time Syncing**: Broadcasts schedule recalculations or newly added tasks to all active client connections within a specific "Environment" room.  
  * **Security & Auth**: Manages OAuth sessions, validates user access levels to specific shared environments, and secures environment variables.

## **4\. Level 3: Backend Services**

This layer comprises the specialized engines and storage systems invoked by the Orchestrator.

### **4.1. Multimodal A.I. Model (External API)**

* **Technology**: Gemini 1.5 Pro / Flash.  
* **Function**: Receives mixed-media inputs (images, text) and user/team profiles. Performs qualitative analysis to output a mathematically agnostic, metadata-tagged JSON array of tasks (e.g., estimating duration, cognitive load, and optimal team member assignment).

### **4.2. Multi-User Scheduler (Internal JS Module)**

* **Technology**: Isolated JavaScript function/class.  
* **Function**: Acts as the deterministic core. Receives the AI's JSON array and the aggregated calendar gaps of *all assigned team members*. Executes a greedy bin-packing algorithm, resolving overlapping busy times, and returns exact timestamps. Maintained as a pure function for rapid testing.

### **4.3. Database (Storage Service)**

* **Technology**: MongoDB.  
* **Function**: Stores flexible BSON/JSON structures including user profiles, session data, and the final generated task arrays. **\[NEW\]** Acts as the source of truth for relational "Environment" mapping (tracking which users belong to which shared document spaces and their permission levels).

### **4.4. Integration Adapters (External APIs)**

* **Technology**: Isolated integration interfaces (Google Calendar API as the primary MVP implementation).  
* **Function**: Provides the "Busy" blocks to construct the availability matrix and receives the final "Study Blocks" to write back to the user's real-world calendar. Designed using an Adapter pattern to easily scale to Notion, Slack, or Outlook post-hackathon.

## **5\. Version Control Workflow**

* **Policy**: To maintain high development velocity during the hackathon and avoid complex merge conflicts, the repository will strictly use a singular second-level integration branch in GitHub. Separate frontend and backend branches will not be used; all feature work must merge directly into this integration branch, which serves as the source of truth for continuous deployment

# Code Organization

# **Code Organization & System Modularity**

*SyncForge: Object-Oriented Architecture Guidelines*

## **1\. Executive Summary**

This document details the internal code organization for the SyncForge project within the Next.js ecosystem. To accommodate strict hackathon time constraints, the architecture is designed for **graceful scaling**. The multi-user real-time feature is treated as a modular "bonus." The system utilizes Feature Flags and the Null Object Pattern to ensure the core single-user pipeline operates flawlessly, with pre-built injection points ready to accept the collaborative upgrades without structural refactoring.

## **2\. Repository Structure**

The directory tree physically enforces logical boundaries. The realtime service directory exists from Day 1, but it is populated with a "Dummy" adapter to satisfy the orchestrator's dependencies without requiring actual WebSocket setup until necessary.

```
/syncforge-app
└── /src
    ├── /app                        # Next.js App Router (API Routes & View Routing)
    │
    ├── /components                 # LEVEL 1: Frontend Interface (React)
    │   ├── /workspaces             # Agnostic UI: acts as personal or team view
    │   ├── /schedule-view          # Timeline visualizers
    │   └── /ui                     # Atomic UI components (Tailwind/shadcn)
    │
    ├── /orchestrator               # LEVEL 2: Backend Pipeline
    │   ├── PipelineFacade.js       # Frontend entry point for HTTP requests
    │   ├── ServiceManager.js       # Dependency Injection (Reads Feature Flags)
    │   └── FeatureFlags.js         # [NEW] Simple config: { MULTI_USER_ENABLED: false }
    │
    ├── /services                   # LEVEL 3: Backend Services
    │   ├── /ai                     
    │   │   ├── IAIService.js             
    │   │   ├── MultimodalGeminiAdapter.js# Handles images/text to JSON
    │   │   └── FallbackAIDecorator.js    
    │   │
    │   ├── /database
    │   │   ├── IDatabaseService.js
    │   │   └── MongoAdapter.js           # Stores Users, Tasks, and Workspaces
    │   │
    │   ├── /integrations           
    │   │   ├── IIntegrationAdapter.js    
    │   │   └── GoogleCalAdapter.js       # Primary MVP integration
    │   │
    │   ├── /scheduler
    │   │   ├── ISchedulerEngine.js
    │   │   └── NUserBinPacking.js        # [UPDATED] Array-based logic. Takes 1 to N calendars.
    │   │
    │   └── /realtime               # [NEW] Plug-and-Play Sync Service
    │       ├── ISyncService.js
    │       ├── DummySyncAdapter.js       # MVP Default: Returns success, does nothing
    │       └── PusherAdapter.js          # Bonus Feature: Actual WebSocket broadcasts
    │
    └── /models                     # Data Transfer Objects (DTOs)
        ├── Task.js
        ├── UserProfile.js
        └── Workspace.js            # Generalization of "Environment" (1 to N users)
```

## **3\. Level 3: Service Abstraction & The "Null Object" Pattern**

Every external module is encapsulated behind a common interface. To ensure the system works perfectly *without* the bonus features, we implement a "Dummy" adapter.

### **The Real-Time Sync Contract**

The orchestrator is hard-coded to *always* attempt to broadcast updates. However, what it actually broadcasts through depends on the active Feature Flag.

JavaScript

```javascript
// /services/realtime/ISyncService.js
class ISyncService {
  async broadcastUpdate(workspaceId, payload) {
    throw new Error("Method 'broadcastUpdate()' must be implemented.");
  }
}

// /services/realtime/DummySyncAdapter.js (Active during MVP Phase)
class DummySyncAdapter extends ISyncService {
  async broadcastUpdate(workspaceId, payload) {
    // Null Object Pattern: Do absolutely nothing, but don't crash.
    // The single user just relies on standard React state updates.
    console.log(`[MVP Mode] Suppressed broadcast for Workspace ${workspaceId}`);
    return true; 
  }
}
```

### 

### **The N-User Scheduler** 

Instead of building a "Single User Scheduler" and later writing a "Multi-User Scheduler," build NUserBinPacking.js on Day 2\.

* **MVP Mode**: The database passes it an array containing exactly **1** user's calendar data. It packs the bins perfectly.  
* **Bonus Mode**: The database passes it an array containing **3** users' calendar data. The logic iterates over the array to find shared overlapping free time before packing the bins. The scheduling math doesn't change; only the size of the input array changes.

## **4\. Level 2: Orchestration & Feature Flagging**

The Orchestrator layer uses the Dependency Injection container (ServiceManager.js) to read a simple configuration file.

* **Feature Flagging**: FeatureFlags.js dictates system behavior.

```javascript
export const FLAGS = {
   MULTI_USER_ENABLED: process.env.ENABLE_COLLAB === 'true' || false
};
```

* **Dependency Injection**: When the app boots, ServiceManager.js checks the flag. If MULTI\_USER\_ENABLED is false, it injects DummySyncAdapter. If true, it injects PusherAdapter.  
* **Zero-Friction Upgrade**: When your team has 12 hours left in the hackathon and the single-user MVP is flawlessly working, you simply flip the environment variable to true, build the PusherAdapter.js, and the entire app instantly becomes a real-time collaborative platform without touching a single line of code in the core PipelineFacade.js or NUserBinPacking.js.

# Frameworks and Libraries

# **Frameworks & Libraries Specification**

*SyncForge: Technology Stack & Dependency Map*

## **1\. Executive Summary**

This document outlines the official technology stack, frameworks, and supporting libraries for the SyncForge application. The selection prioritizes development velocity, strict Object-Oriented design encapsulation, and minimal overhead, utilizing Next.js as the unified full-stack environment. To support collaborative scheduling environments, a dedicated real-time synchronization layer has been added to manage concurrent user access and live state updates.

## 

## **2\. Core Ecosystem & Frameworks**

| Domain | Technology | Role & Justification |
| :---- | :---- | :---- |
| **Frontend/UI** | Next.js (React) | Serves as the presentation layer. Enables fast, component-based development and native routing. |
| **Backend Orchestrator** | Next.js API Routes | Acts as the server-side pipeline controller, safely executing service integrations without exposing secrets to the client. |
| **Database** | MongoDB | NoSQL document database perfectly suited for rapidly storing dynamic, nested JSON payloads generated by AI. |
| **AI Engines** | Gemini 1.5 Pro/Flash | External LLM APIs utilized purely for qualitative, multimodal syllabus analysis and task extraction mapping. |
| **Real-Time Sync \[NEW\]** | Pusher | A managed WebSocket service. Bypasses the limitations of serverless Next.js API routes to allow synchronous, multi-user calendar updates in milliseconds. |

## 

## **3\. Supporting Libraries by Architecture Level**

### **Level 1: Frontend Interface**

| Library | Implementation Scope |
| :---- | :---- |
| **Tailwind CSS \+ shadcn/ui** | Rapid, utility-first styling and pre-built accessible components (buttons, dialogs) to avoid writing raw CSS. |
| **FullCalendar** | The core visualizer for the generated schedule. Renders the time blocks in an interactive day/week view. |
| **Zustand** | Minimalist state management for sharing user inputs and calendar states across isolated React components. |
| **pusher-js \[NEW\]** | The client-side listener. Subscribes to the active "Workspace" channel and instantly updates the Zustand state when a teammate modifies the schedule. |

### **Level 2: Orchestrator Pipeline & Concurrency**

| Library | Implementation Scope |
| :---- | :---- |
| **Auth.js (NextAuth)** | Handles OAuth 2.0 flows, particularly the Google authentication required to access a user's calendar securely. |
| **Zod** | Schema validation utility. Ensures the JSON payload returned by the AI exactly matches the required DTO structure before processing. |
| **pusher (Node SDK) \[NEW\]** | The server-side broadcaster. Injected into the Orchestrator to emit schedule recalculations to all connected frontends simultaneously. |

### **Level 3: Backend Services**

| Library | Implementation Scope |
| :---- | :---- |
| **Mongoose** | ODM for MongoDB. Enforces schema rules and standardizes database interactions within the Database Adapter. |
| **googleapis (Node.js)** | The official SDK wrapped entirely within the Integration Adapter to read and write Google Calendar events. |
| **date-fns** | Provides pure functions for complex calendar math, timezone offsets, and duration overlap calculations within the Scheduler Engine. |
| **Native Next.js fetch** | Replaces heavy HTTP clients like Axios. Handles all API calls to external services directly, leveraging Next.js's built-in caching and request deduplication. |

# Environment Setup

# **Local Development Setup: SyncForge**

1. ## **Prerequisites & Required Accounts**

To run the SyncForge unified full-stack environment locally, developers must install and configure the following core technologies:

* Node.js: Required to run the Next.js (React) framework and Next.js API routes.  
* MongoDB: A local or cloud instance to natively store the dynamic, nested JSON objects output by the AI.  
* External APIs: Developer accounts must be set up to generate keys for Gemini 1.5 Pro/Flash, the Google Calendar API, and Pusher (for the managed WebSocket service).

2. ## **Environment Configuration (.env)** 

Since different developers handle different APIs (Gemini, Mongo, Google, Pusher), an updated .env.example file is maintained in the root repository to ensure everyone knows which local keys are required. To configure your local instance:

* Duplicate the .env.example file and rename it to .env.local.  
* Populate the file with the necessary credentials to run the stack safely without exposing secrets to the client:  
  * Database: MONGODB\_URI for the Mongoose ODM to standardize database interactions.  
  * AI Engine: Keys for the Gemini 1.5 Pro/Flash API.  
  * Authentication & Integrations: Client IDs and secrets for Auth.js (NextAuth) and the googleapis Node SDK.  
  * Real-Time Sync: App ID, Key, and Secret for the Pusher Node SDK.

3. ## **Local Feature Flagging**

SyncForge is designed for graceful scaling using Feature Flags and the Null Object Pattern. You can control the system behavior locally using the FeatureFlags.js configuration:

* Single-User MVP Mode: By default, or by setting ENABLE\_COLLAB='false', the ServiceManager.js injects the DummySyncAdapter. This satisfies the orchestrator's dependencies, allowing the single-user pipeline to operate flawlessly without requiring an actual WebSocket connection.  
* Bonus Collaborative Mode: By setting the environment variable ENABLE\_COLLAB='true', the system instantly upgrades. The Dependency Injection container will inject the PusherAdapter, enabling synchronous, multi-user calendar updates in milliseconds.

4. ## **Local Git Workflow & Execution**

To prevent complex merge conflicts and maintain high development velocity, follow strict directory isolation and synchronization protocols locally:

* Branching: Never code directly on the integration or main branches. Create an ephemeral development branch for your specific task (e.g., feature/ui-dashboard) off of integration.  
* Synchronization: Run git pull origin integration frequently on your local feature branch to stay updated with your teammates' merged code.  
* Isolation: Do not modify files in another developer's assigned directory locally. Request API or payload changes from the designated owner.

# Group Workflow

# Group Workflow & Execution Strategy

*SyncForge: Team Collaboration & Development Pipeline*

---

## **1\. Version Control & Git Strategy**

To ensure parallel development and prevent critical merge conflicts, the team will utilize a streamlined GitFlow methodology.

* **main (Production Branch)**: Strictly locked. This branch is only touched on the final day for the production build and presentation.  
* **integration (Staging Branch)**: The active heartbeat of the project. Connected directly to Vercel for live, continuous deployment. All finalized features merge here.  
* **feature/\[task-name\] (Development Branches)**: Ephemeral branches created by individual developers for specific tasks (e.g., feature/ai-parser, feature/ui-dashboard).

### **Merging Protocol:**

All code must be submitted via Pull Request (PR) to the integration branch. A PR can only be merged if it passes its designated unit tests and does not break the Vercel staging build.

---

## **2\. Task Distribution & Role Assignments**

The project architecture is physically separated into distinct directories to allow developers to work simultaneously without modifying the same files.

| Role | Domain Ownership | Assigned Directories | Primary Responsibilities |
| :---- | :---- | :---- | :---- |
| **Dev 1: The Brains** | AI & Orchestrator | /services/ai, /orchestrator | Prompt engineering the Gemini multimodal parser, setting up the Next.js API route facades, and validating the AI's JSON output via Zod. |
| **Dev 2: The Engine** | Math & Scheduling | /services/scheduler, /models | Building the pure JavaScript NUserBinPacking.js algorithm. Writing strict unit tests for all mathematical edge cases. |
| **Dev 3: The Plumber** | Integrations & Data | /services/integrations, /services/realtime, /database | Building the Google Calendar adapter, designing the MongoDB Workspace schema, and setting up the Pusher WebSocket logic. |
| **Dev 4: The Face** | Frontend & UX | /components, /app | Building the React UI, Tailwind styling, FullCalendar rendering, and managing the Zustand state to reflect real-time updates. |

*(Note: If the team consists of 3 members, combine the responsibilities of Dev 2 and Dev 3.)*

---

## **3\. The 3-Day Execution Pipeline**

To avoid development bottlenecks (e.g., the frontend waiting for the AI backend), the team will rely heavily on mock data during the initial phases.

### **Day 1: Scaffolding & Unit Testing**

* **Action**: Create feature branches off integration. Establish the exact JSON data contract between the AI output and the UI.  
* **Execution**:  
  * Dev 4 (Frontend) builds the UI using a hardcoded, dummy JSON array.  
  * Dev 2 (Engine) writes mathematical unit tests using dummy calendar gaps.  
  * Dev 1 & 3 scaffold their respective external adapters (Gemini, Mongo, Google API).  
* **Testing Focus**: **Unit Tests**. Ensure isolated functions work perfectly before connecting them.

### **Day 2: Integration & The Hookup**

* **Action**: Begin merging feature branches into integration via PRs.  
* **Execution**:  
  * Delete dummy data. Dev 1 connects the real Gemini output to Dev 2's Scheduler.  
  * Dev 3 connects the Scheduler to the database and Google Calendar API.  
  * Dev 4 hooks up the React frontend to the live Next.js API routes.  
* **Testing Focus**: **Integration Tests**. Verify the seams of the application (e.g., ensuring the database correctly saves the AI's parsed output).

### **Day 3: Feature Freeze & E2E Polish**

* **Action**: Feature freeze. No new scope or ideas are permitted. Focus shifts entirely to bug fixing, UI polish, and pitch preparation.  
* **Execution**: Run comprehensive tests on the live Vercel integration link simulating full user flows (e.g., creating a workspace, adding an image, getting a schedule, and verifying WebSocket broadcasts).  
* **Final Step**: Once the integration branch is stable and verified, open the final PR to merge into main for the hackathon submission.

---

## **4\. Conflict Avoidance Protocols**

1. **Directory Isolation**: Do not modify files in another developer's assigned directory. Request API or payload changes from the designated owner.  
2. **Continuous Synchronization**: Run git pull origin integration frequently on your local feature branch to stay synchronized with your teammates' merged code.  
3. **Environment Variables**: Maintain an updated .env.example file in the root repository. Since different developers handle different APIs (Gemini, Mongo, Google, Pusher), this ensures everyone knows which local keys are required.

# Testing and QA

# **Testing Strategy & Quality Assurance**

*SyncForge: Comprehensive Testing Framework (Multi-User Scaled)*

## **1\. Executive Summary**

This document outlines the rigorous testing strategy for the SyncForge hybrid pipeline. To ensure stability during the fast-paced development cycle, testing is implemented hierarchically from isolated unit tests to full system End-to-End (E2E) validations. Extreme boundary conditions, real-time concurrency conflicts, security abuse cases, and unpredictable LLM behaviors are heavily emphasized to guarantee application durability.

## **2\. Unit Testing (Modular Level)**

Unit tests isolate individual functions to ensure specialized backend services and validators operate flawlessly before orchestration.

### **2.1. The N-User Scheduler Engine**

* **Standard Case (Single):** Successfully maps an array of tasks into matching calendar gaps and splits "splittable" tasks when single gaps are insufficient.  
* **Standard Case (Team):** Receives 3 users' calendar arrays, successfully finds overlapping free-time windows, and schedules a "Group Meeting" task.  
* **Edge Case \- Zero-Gap Scenario:** User (or Team) has no free blocks. Engine must return a handled error or "schedule full" flag without entering an infinite loop.  
* **Edge Case \- Timezone Collisions:** Tasks generated in UTC must accurately align with integration "Busy" blocks returned in local timezones across distributed team members.  
* **Extreme Case \- The 24-Hour Task:** A single task demands 1,440 minutes, exceeding the user profile's max daily deep-work limit.

### **2.2. The Multimodal AI Service Adapter**

* **Standard Case:** Correctly parses a text/image prompt and returns the expected structured JSON array using mocked HTTP responses.  
* **Edge Case \- The Hallucination:** AI returns valid JSON but invents arbitrary fields instead of adhering to the required DTO structure.  
* **Edge Case \- Type Mismatch:** AI returns stringified integers (e.g., "120") instead of raw integers.  
* **Extreme Case \- API Timeout:** The external LLM API is down, triggering the FallbackAIDecorator recovery wrap.

### **2.3. Data Validation Layer (Zod)**

* **Standard Case:** Successfully passes a perfectly formatted task object.  
* **Edge Case \- Missing Fields:** Payload lacks required properties (e.g., missing task duration).  
* **Extreme Case \- Negative Time:** AI assigns a negative duration (e.g., \-30 mins), which must be rejected before reaching the scheduler.

## **3\. Integration Testing (Service Level)**

These tests verify correct communication between the application adapters and actual external dependencies.

### **3.1. Database & State Adapters**

* **Standard Case:** Successfully writes a generated task array to a specific Workspace.  
* **Edge Case \- Concurrent Writes (The Race Condition):** Simulating User A and User B attempting to modify the same Workspace document simultaneously to test database lock, atomic updates, and overwrite behavior.

### **3.2. Integration Adapter (e.g., Google Calendar)**

* **Standard Case:** Successfully fetches "Busy" blocks and pushes "Study Blocks" via the API.  
* **Edge Case \- Revoked Access:** User revokes permissions from their third-party account while maintaining an active SyncForge session.  
* **Extreme Case \- Rate Limiting:** Simulating a 429 Too Many Requests response to verify graceful backoff handling.

### **3.3. Real-Time Sync Service (Pusher)**

* **Standard Case:** PusherAdapter successfully emits a schedule\_updated event to the correct Workspace channel.  
* **Edge Case \- Dropped Connection:** Simulating a client temporarily losing internet; verifying Zustand state resyncs upon reconnection instead of showing stale data.

## **4\. End-to-End (E2E) Testing (System Level)**

Treats the application as a black box to mimic real user behavior from the frontend to third-party endpoints.

### **4.1. The Happy Path Pipeline (Collaborative)** 

User logs in \-\> Creates Workspace \-\> Invites Teammate \-\> Uploads multimodal prompt \-\> AI processes \-\> Scheduler maps to combined team calendars \-\> UI renders visual timeline \-\> Pusher updates Teammate's screen instantly \-\> Blocks sync to real-world calendars.

### **4.2. Interruption & Concurrency Flows**

* **The "Snooze" Action:** User flags a missed task. Backend mathematically recalculates the remaining schedule instantly without calling the LLM, and broadcasts the shift to the team.  
* **The "Clear Schedule" Action:** Deletion safely targets only SyncForge-generated blocks, leaving personal private calendar meetings untouched.  
* **Extreme Concurrency (Drag-and-Drop Collision):** User A drags Task X to Tuesday. User B drags Task X to Wednesday at the exact same millisecond. System must rely on server-side timestamp validation to accept the first request and gracefully reject/revert the second.

### **4.3. Security, Abuse & Durability**

* **Attack Vector \- Prompt Injection:** User inputs malicious instructions to drop database tables. System must safely contain the prompt.  
* **Attack Vector \- Payload Bloating:** User pastes a massive document to DDoS the system. Input must be truncated to prevent memory overflow and token charges.  
* **Attack Vector \- Workspace Spoofing:** User A attempts to manually manipulate the URL or API payload to view/edit User C's private Workspace. The Orchestrator must intercept and block unauthorized Environment IDs.

# Internal API

# **Internal API Specification**

*Technical Specification Document: SyncForge*

---

## **1\. Executive Summary**

This document defines the Internal API for SyncForge. The API is built entirely on Next.js API Routes, acting as the server-side Orchestrator that bridges the Frontend UI with the Backend Services. To ensure the application is easy to test in isolation and highly modular, all endpoints follow a strict Facade pattern. The frontend never interacts with the AI, database, or scheduling math directly; it only communicates via these standardized API contracts.

## 

## **2\. Design for Testability & Isolation**

To fulfill the requirement for easy insertion, removal, and isolated testing, the API routes are strictly decoupled from the business logic using the ServiceManager.js Dependency Injection container.

* **Isolated Testing (Unit):** API handlers do not instantiate their own database connections or AI clients. They receive them as injected arguments. During unit testing, developers can pass a MockDatabase or MockAIEngine into the API route to test HTTP responses without making actual network calls.  
* **Integration Testing:** By leveraging the established Feature Flags, integration tests can run the API with the DummySyncAdapter to safely verify the HTTP request-response cycle without triggering actual Pusher WebSocket broadcasts.  
* **Standardized Contract (Zod):** Every single incoming request body is strictly validated against a Zod schema before the Orchestrator executes any logic. If the payload is malformed, the API rejects it immediately, preventing corrupted data from reaching the Core Engine.

## 

## **3\. Standardized Response Wrapper**

To provide a clear, predictable interface for the Frontend (Developer 3), every API endpoint returns data using a unified envelope structure.

### **Success Response (HTTP 200/201):**

JSON

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "timestamp": "2026-05-05T09:58:47Z",
    "processing_ms": 450
  }
}
```

### **Error Response (HTTP 400/500):**

JSON

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Missing required field: estimated_minutes."
  }
}
```

## 

## **4\. Core RESTful Endpoints**

### **4.1. The Generation Pipeline (AI \+ Scheduler)** 

This is the heaviest endpoint. It takes multimodal user input, runs it through the Gemini 1.5 model, calculates the schedule, and writes to the Database and Google Calendar.

* **Endpoint:** POST /api/schedule/generate  
* **Description:** Ingests syllabus data, invokes the multimodal AI to generate JSON, and runs the N-User Bin Packing algorithm.  
* **Request Body (JSON):**  
* JSON

```json
{
  "workspace_id": "ws_8f92a",
  "inputs": [
    { "type": "text", "content": "Finish the biology essay and review chapters 4-6." },
    { "type": "image_base64", "content": "data:image/png;base64,iVBORw0KGgo..." }
  ],
  "user_preferences": {
    "deep_work_hours": ["09:00", "11:00"],
    "max_daily_load_minutes": 240
  }
}
```

*   
  **Success Response:** Returns the fully mapped schedule array.

### **4.2. The Instant Recalculation Engine** 

Triggered when a user clicks "Snooze" or drags a task. It bypasses the AI completely and only runs the JavaScript deterministic math.

* **Endpoint:** PATCH /api/schedule/recalculate  
* **Description:** Shifts remaining tasks based on an interruption.  
* **Request Body:**

JSON

````
    {
      "workspace_id": "ws_8f92a",
      "interrupted_task_id": "task_442",
      "action": "snooze",
      "delay_minutes": 30
    }
    ```
*   **Success Response:** Returns the newly shifted schedule array and triggers a Pusher broadcast.

**4.3. Workspace & Team Management**
Handles the creation of collaborative environments and permission mapping[cite: 2].

*   **Endpoint:** `POST /api/workspaces`
*   **Description:** Creates a new collaborative Environment document in MongoDB[cite: 2].
*   **Request Body:**
    
```json
    {
      "workspace_name": "Hackathon Capstone",
      "invited_user_emails": ["dev2@example.com", "dev3@example.com"]
    }
    ```

#### 5. Real-Time Sync Interfaces (WebSockets)
Because SyncForge utilizes a managed WebSocket service (Pusher) to bypass serverless limitations[cite: 2], the internal API includes event contracts. The Frontend does not `fetch()` these; it actively listens for them using the `pusher-js` client[cite: 2].

*   **Connection Protocol:** Clients subscribe to a secure, private channel named `private-workspace-{workspace_id}`.
*   **Event: `schedule_updated`**
    *   **Trigger:** Emitted by the backend Orchestrator whenever `POST /api/schedule/generate` or `PATCH /api/schedule/recalculate` succeeds.
    *   **Payload:**
        
```json
        {
          "event_id": "evt_991",
          "triggered_by": "user_id_123",
          "action_type": "recalculation",
          "new_schedule_state": [ ... ] 
        }
        ```
    *   **Frontend Action:** Zustand state management intercepts this payload and instan
````

# Data Models and Database Schema

# **Data Models and Database Schema**

*Technical Specification Document: SyncForge*

---

## **1\. Executive Summary**

This document outlines the data models and database schema for SyncForge. While MongoDB natively supports massive, nested JSON documents, we are enforcing **maximum normalization** for this architecture. By utilizing strictly separated collections and relational references (ObjectId), we ensure that real-time WebSocket updates to a single Task do not lock the entire Workspace document. This approach makes the database highly readable, scalable for team environments, and significantly easier to debug during the fast-paced hackathon.

---

## **2\. Schema Design Philosophy**

To satisfy the hybrid nature of the application, the schemas separate the user's long-term profile preferences from the transient AI metadata and the deterministic scheduling math.

* **Technology**: Mongoose (ODM for MongoDB).  
* **Normalization Strategy**: Users, Workspaces, and Tasks are independent collections. They are linked via Foreign Keys (ObjectId), preventing data duplication and ensuring that changing a user's name updates instantly across all shared environments.

---

## **3\. Core Database Models**

### **3.1. User Profile Schema (UserProfile.js)** 

This collection stores the user's identity, external OAuth tokens, and the personal preferences utilized by the AI during Phase 1 qualitative analysis.

JavaScript

```
import mongoose from 'mongoose';

const UserProfileSchema = new mongoose.Schema({
  // 1. Identity & Auth
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  auth_provider_id: { type: String, required: true }, // e.g., Google sub ID
  
  // 2. AI Scheduling Preferences
  preferences: {
    preferred_window: { type: String, enum: ['Morning', 'Afternoon', 'Night'], default: 'Morning' },
    deep_work_max_minutes: { type: Number, default: 240 },
    buffer_minutes: { type: Number, default: 15 } // Gap between heavy tasks
  },

  // 3. Integration Tokens (Encrypted)
  integrations: {
    google_calendar: {
      access_token: { type: String },
      refresh_token: { type: String },
      token_expiry: { type: Date }
    }
  }
}, { timestamps: true });

export default mongoose.models.UserProfile || mongoose.model('UserProfile', UserProfileSchema);
```

### **3.2. Workspace / Environment Schema (Workspace.js)** 

This collection acts as the relational "Environment" mapping, acting as the shared document space and tracking which users belong to it and their permission levels.

JavaScript

```
import mongoose from 'mongoose';

const WorkspaceSchema = new mongoose.Schema({
  // 1. Workspace Identity
  workspace_name: { type: String, required: true },
  description: { type: String },
  
  // 2. Relational Member Mapping (Normalized)
  members: [{
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'UserProfile', required: true },
    role: { type: String, enum: ['Owner', 'Editor', 'Viewer'], default: 'Editor' },
    joined_at: { type: Date, default: Date.now }
  }],

  // 3. Analytical Telemetry
  // Storing aggregate counters here prevents expensive array counting queries on load.
  analytics: {
    total_tasks_created: { type: Number, default: 0 },
    total_deep_work_hours: { type: Number, default: 0 }
  }
}, { timestamps: true });

// Indexing for fast retrieval of workspaces a user belongs to
WorkspaceSchema.index({ "members.user_id": 1 });

export default mongoose.models.Workspace || mongoose.model('Workspace', WorkspaceSchema);
```

### **3.3. Task Schema (Task.js)** 

This is the most critical collection. It strictly separates the qualitative, mathematically agnostic JSON array outputted by the AI from the exact timestamps calculated by the deterministic JS scheduling engine.

JavaScript

```
import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema({
  // 1. Relational Links
  workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'UserProfile', required: true }, //
  
  // 2. The "Brain" (AI Enriched Metadata)
  metadata: {
    task_name: { type: String, required: true }, //
    estimated_minutes: { type: Number, required: true }, //
    cognitive_load: { type: String, enum: ['Low', 'Medium', 'High'], required: true }, //[cite: 2]
    preferred_window: { type: String }, //[cite: 2]
    splittable: { type: Boolean, default: false } //[cite: 2]
  },

  // 3. The "Hands" (Deterministic Scheduler Output)
  status: { type: String, enum: ['Pending', 'Scheduled', 'Completed', 'Snoozed'], default: 'Pending' },
  
  // An array because "splittable" tasks might be broken into multiple blocks by the JS math
  schedule_blocks: [{
    start_time: { type: Date },
    end_time: { type: Date },
    calendar_event_id: { type: String } // Third-party reference ID for easy syncing
  }]
}, { timestamps: true });

// Indexing to quickly load a team's schedule timeline
TaskSchema.index({ workspace_id: 1, status: 1 });

export default mongoose.models.Task || mongoose.model('Task', TaskSchema);
```

---

## **4\. Debugging & Maintenance Advantages**

By structuring the schemas this way, we achieve the following operational benefits:

1. **State Isolation:** When the Real-Time Sync Service broadcasts a "Snooze" event\[cite: 2\], the backend only needs to update the schedule\_blocks array inside the Task document. It does not need to rewrite an entire bloated Workspace document.  
2. **Clear AI Boundaries:** If the AI hallucinates or outputs broken JSON\[cite: 2\], the validation failure happens strictly against the Task.metadata object. The scheduler's math logic (schedule\_blocks) remains completely protected and untouched.  
3. **Unlimited Scaling:** By separating integrations into its own object on the UserProfile schema, adding Notion or Slack support\[cite: 2\] later simply means appending a new token object, without disrupting the core scheduling logic.

