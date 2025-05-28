
import { AppData } from '../../types';

// No specific data stored in AppData state for docs viewer itself.
// It reads files or constants at runtime.
export const initialDocsViewerData = {
  // docsViewerData: {} // Example if it ever needed persistent state
};

export type DocsViewerActions = ReturnType<typeof createDocsViewerActions>;

export const createDocsViewerActions = (
  setAppData: React.Dispatch<React.SetStateAction<AppData>>,
  getAppData: () => AppData
) => {
  // Currently no actions that modify global AppData are needed for DocsViewer.
  // If, for example, we wanted to store the last viewed doc, an action could be added here.
  return {
    // Placeholder for future actions if any
    // recordLastViewedDoc: (docPath: string) => {
    //   setAppData(prev => ({...prev, lastViewedDocPath: docPath }))
    // }
  };
};
