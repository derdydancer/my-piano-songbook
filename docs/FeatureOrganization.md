
# Feature Organization and Development Guide

This document outlines the project structure for "My Utilities Hub" and provides a guide for adding new utilities (features).

## Table of Contents
1. [Overall Project Structure](#overall-project-structure)
2. [Feature Directory Structure](#feature-directory-structure)
3. [Adding a New Utility](#adding-a-new-utility)
    - [Example: Adding a "Super Counter" Utility](#example-adding-a-super-counter-utility)

## Overall Project Structure

The application is organized to separate concerns, making it easier to manage and scale. Key top-level directories include:

-   **`components/`**: Contains reusable React components.
    -   `components/common/`: Houses generic UI components (e.g., `Button.tsx`, `Input.tsx`, `Modal.tsx`, `CollapsibleSection.tsx`) that are not tied to any specific feature and can be used across the application.
    -   `components/BottomNav.tsx`: The main navigation component.
    -   Other direct children here might be more complex, shared components that aren't simple "common" elements.
-   **`contexts/`**: For React Context API providers (e.g., `AppDataContext.tsx`, `ThemeContext.tsx`) that manage global or widely shared state.
-   **`features/`**: This is the core directory for distinct application utilities. Each subdirectory within `features/` represents a specific utility (e.g., `weight-tracker/`, `gift-assistant/`).
-   **`hooks/`**: Contains custom React Hooks that encapsulate reusable logic (e.g., `useLocalStorage.ts`, `useGeminiApiKey.ts`).
-   **`services/`**: For modules that interact with external APIs or services (e.g., `geminiService.ts`).
-   **`types.ts`**: Global TypeScript type definitions and interfaces used throughout the application.
-   **`constants.ts`**: Global application-wide constants, such_as default settings, API model names, and utility IDs.
-   **`App.tsx`**: The main application component, responsible for routing and global layout.
-   **`index.tsx`**: The entry point for the React application.
-   **`index.html`**: The main HTML file.
-   **`metadata.json`**: Application metadata.
-   **`docs/`**: Contains documentation files like this one.
-   **`utils/`**: General utility functions that are not React hooks and can be used across different parts of the application (e.g., `workoutHelper.ts`).

## Feature Directory Structure

Each utility resides in its own subdirectory within `features/`. For example, `features/weight-tracker/`. A typical feature directory might include:

-   **`FeatureNamePage.tsx`**: The main React component that serves as the entry point for the feature's UI (e.g., `WeightTrackerPage.tsx`).
-   **`components/`** (optional): A subdirectory for React components that are *specific* to this feature. For instance, `features/weight-tracker/WeightFormModal.tsx` is a modal used only by the Weight Tracker.
-   **`hooks/`** (optional): Custom React Hooks used exclusively by this feature.
-   **`utils/`** (optional): Utility functions relevant only to this feature.
-   **`types.ts`** (optional): TypeScript type definitions specific to this feature. If types are broadly applicable, they should go into the root `types.ts`.
-   **`constants.ts`** (optional): Constants used only by this feature. Global constants remain in the root `constants.ts`.

## Adding a New Utility

To add a new utility to the application, follow these steps:

### Example: Adding a "Super Counter" Utility

Let's say we want to add a simple "Super Counter" utility.

1.  **Create Feature Directory:**
    Create a new directory: `features/super-counter/`

2.  **Create Main Page Component:**
    Add the main React component for the utility: `features/super-counter/SuperCounterPage.tsx`.

    ```typescript
    // features/super-counter/SuperCounterPage.tsx
    import React, { useState } from 'react';
    import Button from '../../components/common/Button'; // Example import
    import { useAppData } from '../../contexts/AppDataContext'; // Example import

    const SuperCounterPage: React.FC = () => {
      // const { superCounterValue, incrementSuperCounter } = useAppData(); // Assuming these are added to AppDataContext
      const [localCount, setLocalCount] = useState(0); // Or manage in AppData

      return (
        <div className="p-4 space-y-4">
          <h1 className="text-2xl font-bold text-textPrimary">Super Counter</h1>
          <p className="text-lg text-textPrimary">Current Count: {localCount}</p>
          <div className="flex space-x-2">
            <Button onClick={() => setLocalCount(c => c + 1)}>Increment</Button>
            <Button onClick={() => setLocalCount(c => c - 1)} variant="secondary">Decrement</Button>
          </div>
        </div>
      );
    };

    export default SuperCounterPage;
    ```

3.  **Define Types and Constants:**
    *   **Utility ID:** In `constants.ts`, add a new ID to the `UTILITY_IDS` object:
        ```typescript
        export const UTILITY_IDS: Record<string, UtilityId> = {
          // ... existing IDs
          SUPER_COUNTER: 'superCounter',
        };
        ```
    *   **Default Settings:** In `constants.ts`, add default settings for the new utility to `DEFAULT_UTILITY_SETTINGS`:
        ```typescript
        export const DEFAULT_UTILITY_SETTINGS: UtilitySetting[] = [
          // ... existing settings
          { id: UTILITY_IDS.SUPER_COUNTER as UtilityId, name: "Super Counter", enabled: true, showInMoreMenu: false },
        ];
        ```
    *   **Data Types (if needed):** If the Super Counter needs to store persistent data (e.g., its current value), update `types.ts`:
        *   Add any new specific interfaces (e.g., `SuperCounterData`).
        *   Update the `AppData` interface to include state for the new utility:
            ```typescript
            export interface AppData {
              // ... existing data
              superCounterValue?: number; // Example
            }
            ```

4.  **Update `AppDataContext.tsx` (if managing state globally):**
    *   If your new utility requires global state management (recommended for consistency):
        *   Modify `AppDataContextType` in `contexts/AppDataContext.tsx` to include functions and state for the new utility.
            ```typescript
            interface AppDataContextType {
              // ... existing context type
              superCounterValue: number;
              setSuperCounterValue: (value: number) => void;
            }
            ```
        *   Update `initialAppData` in `contexts/AppDataContext.tsx` with default values for the new utility's state.
            ```typescript
            const initialAppData: AppData = {
              // ... existing initial data
              superCounterValue: 0,
            };
            ```
        *   Implement the necessary functions (e.g., `setSuperCounterValue`) and provide them in the context value.
        *   Handle data migration/initialization for existing users if `superCounterValue` might be undefined in their stored `appData`.

5.  **Configure Routing in `App.tsx`:**
    *   Import the new page component:
        ```typescript
        import SuperCounterPage from './features/super-counter/SuperCounterPage';
        ```
    *   Add a new `<Route>` within the `<Routes>` component, using `ProtectedRoute` to respect the utility's enabled status:
        ```typescript
        <Route path="/super-counter" element={<ProtectedRoute utilityId={UTILITY_IDS.SUPER_COUNTER as UtilityId} element={<SuperCounterPage />} />} />
        ```
    *   If the "Super Counter" should be a primary navigation item (not in the "More" menu by default), update the `getDefaultRoute` function in `App.tsx` to potentially navigate to `/super-counter` based on its settings.

6.  **Add to Navigation (`BottomNav.tsx`):**
    *   If the utility needs a dedicated icon in the bottom navigation:
        *   Add a new SVG icon component to `components/common/Icons.tsx` (e.g., `PlusMinusIcon`).
        *   In `components/BottomNav.tsx`, import the new icon.
        *   Add a new `NavItemDef` object to the `allNavItems` array:
            ```typescript
            // Assuming PlusMinusIcon is created and imported
            { to: '/super-counter', utilityId: 'superCounter', icon: <PlusMinusIcon className="w-6 h-6" />, label: 'Counter' },
            ```
        The `BottomNav` component will automatically handle showing it in the main bar or "More" menu based on `utilitySettings`.

7.  **Enable in Settings:**
    *   The new utility will automatically appear in the "Settings" page due to its inclusion in `DEFAULT_UTILITY_SETTINGS`. Users can then toggle its `enabled` status and `showInMoreMenu` preference.

By following these steps, new utilities can be integrated into the application in a structured and maintainable way. Remember to keep feature-specific code within its designated feature directory and leverage shared components and contexts where appropriate.
