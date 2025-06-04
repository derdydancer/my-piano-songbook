
# Feature Organization and Development Guide

This document outlines the project structure for "My Piano Songbook" and provides a guide for adding new utilities (features), though the app is now focused.

## Table of Contents
1. [Overall Project Structure](#overall-project-structure)
2. [Feature Directory Structure](#feature-directory-structure)
3. [Common Components: Guidelines and Usage Documentation](#common-components-guidelines-and-usage-documentation)
    - [Definition of a Common Component](#definition-of-a-common-component)
    - [Documentation Strategy for Common Components](#documentation-strategy-for-common-components)
    - [Maintenance Guideline for Common Components](#maintenance-guideline-for-common-components)
4. [Adding a New Utility (Conceptual)](#adding-a-new-utility-conceptual)
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
-   **`features/`**: Core directory for distinct application utilities. Now primarily `piano-helper/` and `songbook/`.
    -   `features/settings/`: Contains the settings page component.
-   **`hooks/`**: Custom React Hooks (e.g., `useLocalStorage.ts`).
-   **`services/`**: Modules for external APIs (e.g., `geminiService.ts`).
-   **`types.ts`**: Global TypeScript type definitions, now focused on Piano/Songbook and core app types.
-   **`constants.ts`**: Truly global application-wide constants (e.g., `UTILITY_IDS`, `DEFAULT_UTILITY_SETTINGS`), now focused on Piano/Songbook and Settings. Feature-specific constants are located within their feature directory.
-   **`sampleData.ts`**: Aggregates sample data slices from individual feature modules to provide comprehensive sample data for development and testing (e.g., `AI_STUDIO_SAMPLE_DATA`), now focused on Piano/Songbook.
-   **`utils/`**: General utility functions (e.g., `pianoHelper.utils.ts` is now inside `features/piano-helper/`).
-   **`App.tsx`**, **`index.tsx`**, **`index.html`**, **`metadata.json`**: Standard project files.
-   **`docs/`**: Contains Markdown documentation files for the project.
    -   `docs/changes/`: Subdirectory for changelog or specific update analysis documents.


## Feature Directory Structure

Each utility resides in its own subdirectory within `features/`. For example, `features/piano-helper/`. A typical feature directory now includes:

-   **`FeatureNamePage.tsx`**: The main React component for the feature's UI (e.g., `PianoHelperPage.tsx`).
-   **`utilityName.constants.ts`**: Constants that are specific to this utility (e.g., `pianoHelper.constants.ts`).
-   **`utilityName.data.ts`**: Manages the data logic for this utility. It typically exports:
    *   `initialUtilityNameData`: An object representing the initial state slice for this utility (e.g., `{ savedPianoSongs: [] }`).
    *   `createUtilityNameActions(setAppData, getAppData)`: A function that returns an object of action functions specific to this utility (e.g., `addSavedPianoSong`). These actions are then integrated into the global `AppDataContext`.
    *   `UtilityNameActions` (type): The TypeScript type for the actions object.
-   **`utilityName.sample.ts`**: Contains the sample data specific to this utility, which is then aggregated by the root `sampleData.ts`. For Piano Helper/Songbook, this includes `sampleSavedPianoSongs`.
-   **`components/`** (optional): Subdirectory for React components specific to this feature (e.g., `features/piano-helper/components/PianoChordVisualizer.tsx`).
-   **`utils/`** (optional but common): Utility functions relevant only to this feature (e.g., `features/piano-helper/pianoHelper.utils.ts`).
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

**Example for `Button.tsx` (Updated for focused app):**
```typescript
/**
 * A generic button component for user interactions, supporting different
 * visual styles (variants) and sizes. Can include icons.
 *
 * @remarks
 * Used by:
 * - Piano Chord Helper: Generate Chords, Upload Image, Take Photo buttons, Save to Songbook.
 * - Songbook: Delete song button, view mode toggles, navigation buttons.
 * - Settings: Export/Import data, Load Sample Data, Theme toggle, Utility toggles.
 * - Various Modals: Standard action buttons (OK, Cancel, Confirm).
 * - BottomNav: More menu button (internally styled).
 * - CollapsibleSection: Toggle button (internally styled).
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

## Adding a New Utility (Conceptual)

While the app is now focused, if a new, related utility were to be added, the general process would be:

1.  **Create Feature Directory:** `features/new-utility/`
2.  **Define Constants (`newUtility.constants.ts`):** Store utility-specific constants.
3.  **Define Data Logic (`newUtility.data.ts`):** Create `initialNewUtilityData`, `createNewUtilityActions`, and `NewUtilityActions` type.
4.  **Define Sample Data (`newUtility.sample.ts`):** Provide sample data for this utility.
5.  **Create Main Page Component (`NewUtilityPage.tsx`):** Implement the UI.
6.  **Update Global Types (`types.ts`) and Constants (`constants.ts`):** Add new `UtilityId`, update `AppData`, and `DEFAULT_UTILITY_SETTINGS`.
7.  **Update Root `sampleData.ts`:** Aggregate the new sample data.
8.  **Update `AppDataContext.tsx`:** Integrate new initial data, actions, and migration logic.
9.  **Configure Routing in `App.tsx`**.
10. **Add to Navigation (`BottomNav.tsx`)**.

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
