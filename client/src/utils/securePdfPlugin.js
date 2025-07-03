import { 
  toolbarPlugin,
  MoreIcon,
} from '@react-pdf-viewer/toolbar';

// Custom secure toolbar plugin that removes sensitive actions
export const createSecureToolbarPlugin = () => {
  const toolbarPluginInstance = toolbarPlugin({
    // Transform toolbar items to remove download, print, and other sensitive actions
    transform: (slot) => ({
      ...slot,
      // Remove download button
      Download: () => <></>,
      // Remove print button  
      Print: () => <></>,
      // Remove open file button
      Open: () => <></>,
      // Remove more actions menu that might contain download/print
      MoreActions: () => <></>,
    }),
  });

  return {
    ...toolbarPluginInstance,
    // Override any additional methods if needed
  };
};

// Enhanced default layout plugin with security features
export const createSecureDefaultLayoutPlugin = () => {
  const { defaultLayoutPlugin } = require('@react-pdf-viewer/default-layout');
  
  return defaultLayoutPlugin({
    sidebarTabs: (defaultTabs) => [
      // Only keep thumbnail tab to prevent file access through attachments
      defaultTabs[0], // thumbnail tab
    ],
    // Override toolbar to use secure version
    toolbarPlugin: createSecureToolbarPlugin(),
  });
};
