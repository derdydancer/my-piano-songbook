
# Feature Organization and Development Guide

This document outlines the project structure for "My Utilities Hub" and provides a guide for adding new utilities (features).

## Table of Contents
1. [Overall Project Structure](#overall-project-structure)
2. [Feature Directory Structure](#feature-directory-structure)
3. [Common Components: Guidelines and Usage Documentation](#common-components-guidelines-and-usage-documentation)
    - [Definition of a Common Component](#definition-of-a-common-component)
    - [Documentation Strategy for Common Components](#documentation-strategy-for-common-components)
    - [Maintenance Guideline for Common Components](#maintenance-guideline-for-common-components)
4. [Adding a New Utility](#adding-a-new-utility)
    - [Example: Adding a "Super Counter" Utility](#example-adding-a-super-counter-utility)
5. [Loading Sample Data (for AI Studio/Development)](#loading-sample-data-for-ai-studiodevelopment)


## Overall Project Structure

The application is organized to separate concerns, making it easier to manage and scale. Key top-level directories include:

-   **`components/`**: Contains reusable React components.
    -   `components/common/`: Houses generic UI components (e.g., `Button.tsx`, `Input.tsx`, `CollapsibleSection.tsx`) that are not tied to any specific feature.
    -   `components/BottomNav.tsx`: The main navigation component.
    -   `Modal.tsx`, `LoadingSpinner.tsx`: More complex shared components.
-   **`contexts/`**: For React Context API providers.
    -   `AppDataContext.tsx`: Manages global application state by aggregating data and actions from individual feature modules. Handles data persistence, migration, and global actions (export/import, utility settings).
    -   `ThemeContext.tsx`: Manages application theme (light/dark).
-   **`features/`**: Core directory for distinct application utilities. Each subdirectory represents a utility (e.g., `weight-tracker/`, `gift-assistant/`). See [Feature Directory Structure](#feature-directory-structure) for details.
-   **`hooks/`**: Custom React Hooks (e.g., `useLocalStorage.ts`).
-   **`services/`**: Modules for external APIs (e.g., `geminiService.ts`).
-   **`types.ts`**: Global TypeScript type definitions.
-   **`constants.ts`**: Truly global application-wide constants (e.g., `UTILITY_IDS`, `DEFAULT_UTILITY_SETTINGS`). Feature-specific constants are located within their feature directory.
-   **`sampleData.ts`**: Aggregates sample data slices from individual feature modules to provide comprehensive sample data for development and testing (e.g., `AI_STUDIO_SAMPLE_DATA`).
-   **`utils/`**: General utility functions (e.g., `workoutHelper.ts`).
-   **`App.tsx`**, **`index.tsx`**, **`index.html`**, **`metadata.json`**, **`docs/`**: Standard project files.


## Feature Directory Structure

Each utility resides in its own subdirectory within `features/`. For example, `features/weight-tracker/`. A typical feature directory now includes:

-   **`FeatureNamePage.tsx`**: The main React component for the feature's UI (e.g., `WeightTrackerPage.tsx`).
-   **`utilityName.constants.ts`**: Constants that are specific to this utility (e.g., `disneyCollection.constants.ts` holds `DISNEY_ANIMATED_CLASSICS`).
-   **`utilityName.data.ts`**: Manages the data logic for this utility. It typically exports:
    *   `initialUtilityNameData`: An object representing the initial state slice for this utility (e.g., `{ weightEntries: [] }`).
    *   `createUtilityNameActions(setAppData, getAppData)`: A function that returns an object of action functions specific to this utility (e.g., `addWeightEntry`, `updateWeightEntry`). These actions are then integrated into the global `AppDataContext`.
    *   `UtilityNameActions` (type): The TypeScript type for the actions object.
-   **`utilityName.sample.ts`**: Contains the sample data specific to this utility, which is then aggregated by the root `sampleData.ts`.
-   **`components/`** (optional): Subdirectory for React components specific to this feature.
-   **`hooks/`** (optional): Custom React Hooks used exclusively by this feature.
-   **`utils/`** (optional): Utility functions relevant only to this feature.
-   **`types.ts`** (optional, prefer root `types.ts`): Feature-specific types. If types are broadly applicable or part of the core `AppData`, they belong in the root `types.ts`.

This modular structure ensures that each feature's core logic (constants, initial data, actions, sample data) is co-located, making features easier to understand, develop, and maintain independently. The `AppDataContext` acts as an orchestrator, bringing these pieces together.

## Common Components: Guidelines and Usage Documentation

This section outlines how to manage and document components in `components/common/` to ensure they remain truly reusable and to prevent accidental breaking changes.

### Definition of a Common Component

A React component should be placed in `components/common/` if it meets one or more of the following criteria:
1.  **Generic UI Element:** It's a fundamental UI primitive with no business logic tied to a specific application feature. Examples: `Button`, `Input`, `Select`, `TextArea`, `SwitchToggle`.
2.  **Widely Reused UI Pattern:** It implements a common UI pattern or layout structure that is, or is anticipated to be, used by at least two (preferably three or more) distinct features with minimal feature-specific props. Examples: `CollapsibleSection`, `AlertModal`, `ConfirmationModal`.
3.  **Stateless and Highly Configurable:** The component is primarily presentational, deriving its behavior and content from props, making it adaptable to various contexts.

If a component contains significant business logic specific to one feature, or if its props are heavily tailored to a single use case, it should reside within that feature's `components/` directory.

### Documentation Strategy for Common Components

To track the usage of common components and mitigate the risk of unintended side effects from modifications, the following documentation strategy must be employed:

-   **JSDoc `@remarks` Block:** Each component file in `components/common/` (and potentially complex root components like `Modal.tsx`) must include a JSDoc block at the top of its definition.
-   **Usage Listing:** This JSDoc block should contain an `@remarks` tag followed by a list indicating which features or significant parts of the application currently use this component and for what general purpose.

**Example for `Button.tsx`:**
```typescript
/**
 * A generic button component for user interactions, supporting different
 * visual styles (variants) and sizes. Can include icons.
 *
 * @remarks
 * Used by:
 * - Weight Tracker: Add Weight, Edit, Delete entry buttons; form actions.
 * - Disney Collection: Mark as owned/unowned buttons; filter toggles.
 * - Gift Assistant: New List, Add Gift, AI action buttons; modal actions; list item actions.
 * - Settings: Export/Import data, Load Sample Data, Theme toggle, Save Plate inventory, Utility toggles.
 * - Workout Tracker: Start workout, set completion (Pass/Fail/Skip), weight adjustment buttons, modal actions.
 * - Various Modals: Standard action buttons (OK, Cancel, Confirm).
 */
const Button: React.FC<ButtonProps> = ({
  // ...component implementation
}) => {
  // ...
};
```

### Maintenance Guideline for Common Components

Before making any potentially breaking changes to a component in `components/common/` (e.g., changing prop names, modifying default behavior, significant style alterations):
1.  **Consult `@remarks`:** Developers *must* review the JSDoc `@remarks` section of the component to identify all listed features and use cases.
2.  **Assess Impact:** Evaluate the potential impact of the planned changes on each of these areas.
3.  **Test Thoroughly:** The developer making the change is responsible for testing the modified component within the context of *all* listed features or coordinating with the respective feature "owners" if applicable.
4.  **Update Documentation:** If the component's usage changes (e.g., it's adopted by a new feature or removed from one), the `@remarks` section must be updated accordingly.

Adhering to these guidelines will help maintain the stability and reliability of shared UI elements across the application.

## Adding a New Utility

To add a new utility to the application, follow these steps:

### Example: Adding a "Super Counter" Utility

Let's say we want to add a simple "Super Counter" utility that just increments and decrements a number.

1.  **Create Feature Directory:**
    Create a new directory: `features/super-counter/`

2.  **Define Constants (`superCounter.constants.ts`):**
    (For this simple example, we might not have specific constants, but if we did, e.g., `DEFAULT_COUNTER_STEP = 1;`, they'd go here.)
    ```typescript
    // features/super-counter/superCounter.constants.ts
    // export const DEFAULT_START_VALUE = 0; // Example
    ```

3.  **Define Data Logic (`superCounter.data.ts`):**
    ```typescript
    // features/super-counter/superCounter.data.ts
    import { AppData } from '../../types'; // Assuming AppData is updated

    // Part of AppData relevant to this utility
    export const initialSuperCounterData = {
      superCounterValue: 0, // Default defined in AppData or here
    };

    // Define Actions Type
    export type SuperCounterActions = ReturnType<typeof createSuperCounterActions>;

    export const createSuperCounterActions = (
      setAppData: React.Dispatch<React.SetStateAction<AppData>>,
      getAppData: () => AppData // If needed to read current state
    ) => ({
      incrementSuperCounter: (amount: number = 1) => {
        setAppData(prev => ({
          ...prev,
          superCounterValue: (prev.superCounterValue || 0) + amount,
        }));
      },
      decrementSuperCounter: (amount: number = 1) => {
        setAppData(prev => ({
          ...prev,
          superCounterValue: (prev.superCounterValue || 0) - amount,
        }));
      },
      resetSuperCounter: () => {
        setAppData(prev => ({
          ...prev,
          superCounterValue: initialSuperCounterData.superCounterValue,
        }));
      },
      // Optional: A getter if direct access to this piece of state is preferred by components
      // getSuperCounterValue: (): number => {
      //   const appData = getAppData();
      //   return appData.superCounterValue || 0;
      // }
    });
    ```

4.  **Define Sample Data (`superCounter.sample.ts`):**
    ```typescript
    // features/super-counter/superCounter.sample.ts
    export const sampleSuperCounterValue = {
      superCounterValue: 42,
    };
    ```

5.  **Create Main Page Component (`SuperCounterPage.tsx`):**
    ```typescript
    // features/super-counter/SuperCounterPage.tsx
    import React from 'react';
    import Button from '../../components/common/Button';
    import { useAppData } from '../../contexts/AppDataContext';

    const SuperCounterPage: React.FC = () => {
      const { superCounterValue, incrementSuperCounter, decrementSuperCounter, resetSuperCounter } = useAppData();
      // Note: superCounterValue would now come from appData, managed by the actions

      return (
        <div className="p-4 space-y-4">
          <h1 className="text-2xl font-bold text-textPrimary">Super Counter</h1>
          <p className="text-lg text-textPrimary">Current Count: {superCounterValue || 0}</p>
          <div className="flex space-x-2">
            <Button onClick={() => incrementSuperCounter(1)}>Increment</Button>
            <Button onClick={() => decrementSuperCounter(1)} variant="secondary">Decrement</Button>
            <Button onClick={resetSuperCounter} variant="ghost">Reset</Button>
          </div>
        </div>
      );
    };
    export default SuperCounterPage;
    ```

6.  **Update Global Types and Constants:**
    *   **`types.ts`**:
        *   Add `'superCounter'` to `UtilityId`: `export type UtilityId = ... | 'superCounter';`
        *   Update `AppData` interface: `interface AppData { ...; superCounterValue: number; }`
        *   (The `SuperCounterActions` type is defined in `superCounter.data.ts` and will be merged in `AppDataContext.tsx`.)
    *   **`constants.ts`**:
        *   Add to `UTILITY_IDS`: `SUPER_COUNTER: 'superCounter' as UtilityId,`
        *   Add to `DEFAULT_UTILITY_SETTINGS`: `{ id: UTILITY_IDS.SUPER_COUNTER as UtilityId, name: "Super Counter", enabled: true, showInMoreMenu: false },`

7.  **Update Root `sampleData.ts`:**
    *   Import and include the sample data:
        ```typescript
        // sampleData.ts
        import { sampleSuperCounterValue } from './features/super-counter/superCounter.sample';
        // ...
        export const AI_STUDIO_SAMPLE_DATA: AppData = {
          // ... other sample data slices
          ...sampleSuperCounterValue,
          // ...
        };
        ```

8.  **Update `AppDataContext.tsx`:**
    *   Import `initialSuperCounterData`, `createSuperCounterActions`, and `SuperCounterActions` from `features/super-counter/superCounter.data.ts`.
    *   Add `...initialSuperCounterData` to the spread that forms `initialAppData`.
    *   Add `SuperCounterActions` to the `AppDataContextType` union.
    *   Instantiate actions: `const superCounterActions = createSuperCounterActions(setAppData, getAppData);`
    *   Spread `...superCounterActions` into the `contextValue`.
    *   Ensure the migration `useEffect` in `AppDataContext.tsx` correctly initializes `superCounterValue` if it's undefined in existing user data (e.g., `if (tempAppData.superCounterValue === undefined) { tempAppData.superCounterValue = initialSuperCounterData.superCounterValue; dataChanged = true; }`).

9.  **Configure Routing in `App.tsx`:**
    *   Import `SuperCounterPage`.
    *   Add Route: `<Route path="/super-counter" element={<ProtectedRoute utilityId={UTILITY_IDS.SUPER_COUNTER as UtilityId} element={<SuperCounterPage />} />} />`
    *   Update `getDefaultRoute` if necessary.

10. **Add to Navigation (`BottomNav.tsx`):**
    *   Create an icon (e.g., `PlusMinusIcon`) in `components/common/Icons.tsx`.
    *   Import it and add a `NavItemDef` to `allNavItems`:
        ```typescript
        { to: '/super-counter', utilityId: UTILITY_IDS.SUPER_COUNTER as UtilityId, icon: <PlusMinusIcon className="w-6 h-6" />, label: 'Counter' },
        ```

This structured approach ensures new features are well-integrated and maintain the overall organization of the project.

## Loading Sample Data (for AI Studio/Development)

To facilitate testing and development, especially in environments like AI Studio, the application can be loaded with a predefined set of sample data. This data is now modular, with each feature contributing its relevant sample portion, all aggregated in the root `sampleData.ts` into the `AI_STUDIO_SAMPLE_DATA` object.

**How to enable sample data:**
1.  Open your browser's developer console.
2.  Execute: `localStorage.setItem('loadSampleDataInAIStudio', 'true');`
3.  Refresh the application.

If this is the first time the application is loaded or if existing `localStorage` data is malformed, and the `loadSampleDataInAIStudio` flag is true, the application will initialize with `AI_STUDIO_SAMPLE_DATA`. Otherwise, it loads existing user data or default initial data.

To clear sample data loading preference: `localStorage.removeItem('loadSampleDataInAIStudio');`
To clear app data: `localStorage.removeItem('myUtilitiesHubData');`
