<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/006f2d2d-825d-46a9-81ee-296940c0b538

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`



# Project: Synthetic Data Generator - Phase 1
**Phase 1 Objective:** Establish the foundational collaborative workspace where a User and an AI Agent can seamlessly co-create and edit Entity-Relationship (ER) database schemas in real-time.

## 1. Overview
Before generating synthetic data, the system needs a defined database schema. Phase 1 focuses entirely on building a "Live Sync" schema designer. The unique value proposition is the shared state: the user can build the diagram manually using a GUI, or instruct the AI via chat to build/modify it for them. Both operate on the exact same underlying data structure.

## 2. User Journey & UI Layout
1. **Onboarding / Context Entry:** The user lands on the application, enters their details (`user_id`), and defines the project (`project_id`, name, description). This creates the **Context Packet**.
2. **Main Workspace:** The user is taken to the main interface, split into two main sections:
    * **Left Pane (Interactive Canvas):** A visual ER diagram builder. 
        * Users can manually add/remove tables.
        * Define column names and data types.
        * Establish Primary Key (PK) and Foreign Key (FK) relationships.
    * **Right Pane (AI Chat Panel):** A conversational interface.
        * Users can type natural language prompts (e.g., *"Create an e-commerce schema with users, orders, and products"* or *"Add a 'status' column to the orders table"*).

## 3. Core Architecture & "Live Sync"
To achieve the seamless interaction between the User UI and the AI Agent, the system will use a centralized database as the single source of truth.

* **Database:** SQLite (for Phase 1 simplicity).
* **State Management (`schema_json`):** The entire visual representation and structure of the ER diagram is stored as a JSON object inside the `schema_json` column of the database.
* **The Interaction Loop:**
    * **Manual Edit:** User updates the canvas -> App updates the `schema_json` in SQLite -> Canvas re-renders.
    * **AI Edit:** User sends a chat message -> AI Agent processes intent -> AI calls an `update_schema` tool/function to modify the `schema_json` in SQLite -> UI detects the change ("Live Sync") and the Canvas updates automatically.

## 4. Database Schema (Phase 1)
Based on the architecture, the core SQLite table required to manage the shared workspace is the **Projects Table**:

## 5. Out of Scope for Phase 1 (Deferred to Phase 2)
* Generating synthetic rows using LLMs.
* Seeding bulk data using SDV (Synthetic Data Vault) or Faker.
* Exporting data to external databases.

*** 
*Note: The primary technical challenge for Phase 1 will be establishing the real-time or near-real-time synchronization loop between the SQLite database updates (performed by the AI) and the frontend React/Vue canvas.*