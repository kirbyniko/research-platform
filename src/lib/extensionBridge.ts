/**
 * Bridge to communicate with the ICE Deaths Chrome Extension
 * Use this from your Next.js app to send document data to the extension
 */

// Your extension ID - get it from chrome://extensions (enable Developer Mode to see IDs)
// This will be a long string like: "abcdefghijklmnopqrstuvwxyz123456"
const EXTENSION_ID = process.env.NEXT_PUBLIC_EXTENSION_ID || '';

interface DocumentData {
  name?: string;
  dateOfDeath?: string;
  age?: number | string;
  country?: string;
  facility?: string;
  location?: string;
  causeOfDeath?: string;
  summary?: string;
  incidentType?: string;
  quotes?: Array<{
    text: string;
    category?: string;
  }>;
  sourceUrl?: string;
  sourceTitle?: string;
  sourceType?: string;
  date?: string;
  author?: string;
  title?: string;
  url?: string;
}

/**
 * Check if the extension is installed
 */
export async function isExtensionInstalled(): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.log('Extension detection: No chrome.runtime API');
    return false;
  }
  
  if (!EXTENSION_ID) {
    console.log('Extension detection: No extension ID configured');
    return false;
  }
  
  console.log('Extension detection: Trying extension ID:', EXTENSION_ID);
  
  try {
    // Try to send a test message
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        EXTENSION_ID,
        { type: 'GET_STATE' },
        (response) => {
          // Check if we got a valid response (even if empty, means extension is there)
          const hasExtension = !chrome.runtime.lastError && response !== undefined;
          console.log('Extension detection:', hasExtension, 'Error:', chrome.runtime.lastError?.message, 'Response:', response);
          resolve(hasExtension);
        }
      );
      // Timeout after 1 second
      setTimeout(() => {
        console.log('Extension detection: Timeout');
        resolve(false);
      }, 1000);
    });
  } catch (error) {
    console.error('Extension detection error:', error);
    return false;
  }
}

/**
 * Load document data into the extension
 * This will populate the extension's sidepanel with the document data
 */
export async function loadDocumentIntoExtension(documentData: DocumentData): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    return {
      success: false,
      error: 'Chrome extension API not available'
    };
  }

  try {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        EXTENSION_ID,
        {
          type: 'LOAD_DOCUMENT_DATA',
          documentData
        },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({
              success: false,
              error: chrome.runtime.lastError.message
            });
          } else {
            resolve(response || { success: false, error: 'No response from extension' });
          }
        }
      );
      
      // Timeout after 2 seconds
      setTimeout(() => {
        resolve({
          success: false,
          error: 'Extension did not respond in time'
        });
      }, 2000);
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Open the extension sidepanel
 * Note: This only works if called from a user interaction (click handler)
 */
export async function openExtensionSidepanel(): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.sidePanel) {
    try {
      // @ts-expect-error - sidePanel.open() can be called without arguments in newer Chrome versions
      await chrome.sidePanel.open();
    } catch (error) {
      console.error('Failed to open sidepanel:', error);
    }
  }
}
