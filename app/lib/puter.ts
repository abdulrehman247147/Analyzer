import { create } from "zustand";

interface FSItem {
  id: string;
  uid: string;
  name: string;
  path: string;
  is_dir: boolean;
  parent_id: string;
  parent_uid: string;
  created: number;
  modified: number;
  accessed: number;
  size: number | null;
  writable: boolean;
}

interface PuterUser {
  uuid: string;
  username: string;
}

interface KVItem {
  key: string;
  value: string;
}

interface ChatFileContent {
  type: "file";
  puter_path: string;
}

interface ChatTextContent {
  type: "text";
  text: string;
}

type ChatMessageContent =
  | ChatFileContent
  | ChatTextContent;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string | ChatMessageContent[];
}

interface PuterChatOptions {
  model?: string;
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
  tools?: Array<{
    type: "function";
    function: {
      name: string;
      description: string;
      parameters: {
        type: string;
        properties: Record<string, unknown>;
      };
    };
  }>;
}

interface AIResponseContentItem {
  type?: string;
  text?: string;
}

interface AIResponse {
  index?: number;

  message: {
    role: string;
    content:
      | string
      | AIResponseContentItem[];

    refusal?: null | string;
    annotations?: unknown[];
  };

  logprobs?: null | unknown;
  finish_reason?: string;

  usage?: Array<{
    type: string;
    model: string;
    amount: number;
    cost: number;
  }>;

  via_ai_chat_service?: boolean;
}

declare global {
  interface Window {
    puter: {
      auth: {
        getUser: () => Promise<PuterUser>;
        isSignedIn: () => Promise<boolean>;
        signIn: () => Promise<void>;
        signOut: () => Promise<void>;
      };

      fs: {
        write: (
          path: string,
          data: string | File | Blob,
        ) => Promise<File | undefined>;

        read: (
          path: string,
        ) => Promise<Blob>;

        upload: (
          files: File[] | Blob[],
        ) => Promise<FSItem | FSItem[]>;

        delete: (
          path: string,
        ) => Promise<void>;

        readdir: (
          path: string,
        ) => Promise<FSItem[] | undefined>;
      };

      ai: {
        chat: (
          prompt: string | ChatMessage[],
          options?: PuterChatOptions,
        ) => Promise<AIResponse>;

        img2txt: (
          image: string | File | Blob,
          testMode?: boolean,
        ) => Promise<string>;
      };

      kv: {
        get: (
          key: string,
        ) => Promise<string | null>;

        set: (
          key: string,
          value: string,
        ) => Promise<boolean>;

        delete: (
          key: string,
        ) => Promise<boolean>;

        list: (
          pattern: string,
          returnValues?: boolean,
        ) => Promise<string[] | KVItem[]>;

        flush: () => Promise<boolean>;
      };
    };
  }
}

interface PuterStore {
  isLoading: boolean;
  error: string | null;
  puterReady: boolean;

  auth: {
    user: PuterUser | null;
    isAuthenticated: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    refreshUser: () => Promise<void>;
    checkAuthStatus: () => Promise<boolean>;
    getUser: () => PuterUser | null;
  };

  fs: {
    write: (
      path: string,
      data: string | File | Blob,
    ) => Promise<File | undefined>;

    read: (
      path: string,
    ) => Promise<Blob | undefined>;

    upload: (
      files: File[] | Blob[],
    ) => Promise<FSItem | FSItem[] | undefined>;

    delete: (
      path: string,
    ) => Promise<void>;

    readDir: (
      path: string,
    ) => Promise<FSItem[] | undefined>;
  };

  ai: {
    chat: (
      prompt: string | ChatMessage[],
      options?: PuterChatOptions,
    ) => Promise<AIResponse | undefined>;

    feedback: (
      path: string,
      message: string,
    ) => Promise<AIResponse>;

    img2txt: (
      image: string | File | Blob,
      testMode?: boolean,
    ) => Promise<string | undefined>;
  };

  kv: {
    get: (
      key: string,
    ) => Promise<string | null | undefined>;

    set: (
      key: string,
      value: string,
    ) => Promise<boolean | undefined>;

    delete: (
      key: string,
    ) => Promise<boolean | undefined>;

    list: (
      pattern: string,
      returnValues?: boolean,
    ) => Promise<string[] | KVItem[] | undefined>;

    flush: () => Promise<boolean | undefined>;
  };

  init: () => void;
  clearError: () => void;
}

const getPuter = (): typeof window.puter | null => {
  if (
    typeof window === "undefined" ||
    !window.puter
  ) {
    return null;
  }

  return window.puter;
};

const getUnknownErrorMessage = (
  error: unknown,
): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (
    error &&
    typeof error === "object"
  ) {
    const possibleError = error as {
      message?: string;
      error?: string;
      code?: string;
    };

    if (possibleError.message) {
      return possibleError.message;
    }

    if (possibleError.error) {
      return possibleError.error;
    }

    if (possibleError.code) {
      return possibleError.code;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return "An unknown Puter error occurred.";
    }
  }

  return "An unknown Puter error occurred.";
};

export const usePuterStore =
  create<PuterStore>((set, get) => {
    const updateAuthState = (
      user: PuterUser | null,
      isAuthenticated: boolean,
    ) => {
      set({
        auth: {
          user,
          isAuthenticated,
          signIn: get().auth.signIn,
          signOut: get().auth.signOut,
          refreshUser:
            get().auth.refreshUser,
          checkAuthStatus:
            get().auth.checkAuthStatus,
          getUser: () => user,
        },
      });
    };

    const setError = (
      message: string,
    ) => {
      console.error(
        "Puter store error:",
        message,
      );

      set({
        error: message,
        isLoading: false,
      });
    };

    const checkAuthStatus =
      async (): Promise<boolean> => {
        const puter = getPuter();

        if (!puter) {
          setError(
            "Puter.js is not available.",
          );

          return false;
        }

        set({
          isLoading: true,
          error: null,
        });

        try {
          const isSignedIn =
            await puter.auth.isSignedIn();

          if (!isSignedIn) {
            updateAuthState(null, false);

            set({
              isLoading: false,
            });

            return false;
          }

          const user =
            await puter.auth.getUser();

          updateAuthState(user, true);

          set({
            isLoading: false,
            error: null,
          });

          return true;
        } catch (error) {
          const message =
            getUnknownErrorMessage(error);

          setError(message);

          return false;
        }
      };

    const signIn =
      async (): Promise<void> => {
        const puter = getPuter();

        if (!puter) {
          setError(
            "Puter.js is not available.",
          );

          return;
        }

        set({
          isLoading: true,
          error: null,
        });

        try {
          await puter.auth.signIn();
          await checkAuthStatus();
        } catch (error) {
          setError(
            getUnknownErrorMessage(error),
          );
        }
      };

    const signOut =
      async (): Promise<void> => {
        const puter = getPuter();

        if (!puter) {
          setError(
            "Puter.js is not available.",
          );

          return;
        }

        set({
          isLoading: true,
          error: null,
        });

        try {
          await puter.auth.signOut();

          updateAuthState(null, false);

          set({
            isLoading: false,
            error: null,
          });
        } catch (error) {
          setError(
            getUnknownErrorMessage(error),
          );
        }
      };

    const refreshUser =
      async (): Promise<void> => {
        const puter = getPuter();

        if (!puter) {
          setError(
            "Puter.js is not available.",
          );

          return;
        }

        set({
          isLoading: true,
          error: null,
        });

        try {
          const user =
            await puter.auth.getUser();

          updateAuthState(user, true);

          set({
            isLoading: false,
            error: null,
          });
        } catch (error) {
          setError(
            getUnknownErrorMessage(error),
          );
        }
      };

    const init = (): void => {
      const existingPuter = getPuter();

      if (existingPuter) {
        set({
          puterReady: true,
        });

        void checkAuthStatus();

        return;
      }

      const interval =
        window.setInterval(() => {
          if (!getPuter()) {
            return;
          }

          window.clearInterval(interval);

          set({
            puterReady: true,
          });

          void checkAuthStatus();
        }, 100);

      window.setTimeout(() => {
        window.clearInterval(interval);

        if (!getPuter()) {
          setError(
            "Puter.js failed to load within 10 seconds.",
          );
        }
      }, 10000);
    };

    const write = async (
      path: string,
      data: string | File | Blob,
    ) => {
      const puter = getPuter();

      if (!puter) {
        throw new Error(
          "Puter.js is not available.",
        );
      }

      return puter.fs.write(path, data);
    };

    const readDir = async (
      path: string,
    ) => {
      const puter = getPuter();

      if (!puter) {
        throw new Error(
          "Puter.js is not available.",
        );
      }

      return puter.fs.readdir(path);
    };

    const readFile = async (
      path: string,
    ) => {
      const puter = getPuter();

      if (!puter) {
        throw new Error(
          "Puter.js is not available.",
        );
      }

      return puter.fs.read(path);
    };

    const upload = async (
      files: File[] | Blob[],
    ) => {
      const puter = getPuter();

      if (!puter) {
        throw new Error(
          "Puter.js is not available.",
        );
      }

      if (!files.length) {
        throw new Error(
          "No files were provided for upload.",
        );
      }

      return puter.fs.upload(files);
    };

    const deleteFile = async (
      path: string,
    ) => {
      const puter = getPuter();

      if (!puter) {
        throw new Error(
          "Puter.js is not available.",
        );
      }

      return puter.fs.delete(path);
    };

    const chat = async (
      prompt: string | ChatMessage[],
      options?: PuterChatOptions,
    ): Promise<AIResponse | undefined> => {
      const puter = getPuter();

      if (!puter) {
        throw new Error(
          "Puter.js is not available.",
        );
      }

      try {
        const response =
          await puter.ai.chat(
            prompt,
            options,
          );

        return response;
      } catch (error) {
        console.error(
          "Puter chat failed:",
          error,
        );

        throw new Error(
          getUnknownErrorMessage(error),
        );
      }
    };

const feedback = async (
  path: string,
  message: string,
): Promise<AIResponse> => {
  const puter = getPuter();

  if (!puter) {
    throw new Error(
      "Puter.js is not available.",
    );
  }

  if (!path.trim()) {
    throw new Error(
      "The uploaded resume path is missing.",
    );
  }

  if (!message.trim()) {
    throw new Error(
      "The resume analysis instructions are empty.",
    );
  }

  try {
    console.log(
      "Extracting resume text from:",
      path,
    );

    /*
     * Extract the text first because some chat models
     * do not reliably read attached PDF files.
     */
    const resumeText =
      await puter.ai.img2txt(path);

    console.log(
      "Extracted resume text:",
      resumeText,
    );

    if (
      !resumeText ||
      !resumeText.trim()
    ) {
      throw new Error(
        "No readable text could be extracted from the PDF. Try using a text-based PDF rather than a scanned image.",
      );
    }

    const completePrompt = `
You are analyzing a candidate's resume for a specific job.

IMPORTANT INSTRUCTIONS:
- The complete resume text is included below.
- Do not claim that the resume is missing.
- Evaluate the resume against the supplied job title and job description.
- Return only valid JSON.
- Do not use Markdown code fences.
- Follow the requested JSON structure exactly.
- Every score must be a number between 0 and 100.

RESUME TEXT:
--------------------
${resumeText}
--------------------

ANALYSIS INSTRUCTIONS:
--------------------
${message}
--------------------
`;

    console.log(
      "Sending extracted resume text to AI.",
    );

    const response =
      await puter.ai.chat(
        completePrompt,
        {
          model: "gpt-5-nano",
          stream: false,
        },
      );

    console.log(
      "Puter AI response:",
      response,
    );

    if (
      !response ||
      !response.message
    ) {
      throw new Error(
        "Puter AI returned an invalid response.",
      );
    }

    return response as AIResponse;
  } catch (error) {
    console.error(
      "Puter resume feedback failed:",
      error,
    );

    if (error instanceof Error) {
      throw error;
    }

    if (
      error &&
      typeof error === "object"
    ) {
      const puterError =
        error as {
          message?: string;
          error?: string;
          code?: string;
        };

      throw new Error(
        puterError.message ||
          puterError.error ||
          puterError.code ||
          JSON.stringify(error),
      );
    }

    throw new Error(
      typeof error === "string"
        ? error
        : "The resume could not be analyzed.",
    );
  }
};

    const img2txt = async (
      image: string | File | Blob,
      testMode?: boolean,
    ) => {
      const puter = getPuter();

      if (!puter) {
        throw new Error(
          "Puter.js is not available.",
        );
      }

      return puter.ai.img2txt(
        image,
        testMode,
      );
    };

    const getKV = async (
      key: string,
    ) => {
      const puter = getPuter();

      if (!puter) {
        throw new Error(
          "Puter.js is not available.",
        );
      }

      return puter.kv.get(key);
    };

    const setKV = async (
      key: string,
      value: string,
    ) => {
      const puter = getPuter();

      if (!puter) {
        throw new Error(
          "Puter.js is not available.",
        );
      }

      return puter.kv.set(
        key,
        value,
      );
    };

    const deleteKV = async (
      key: string,
    ) => {
      const puter = getPuter();

      if (!puter) {
        throw new Error(
          "Puter.js is not available.",
        );
      }

      return puter.kv.delete(key);
    };

    const listKV = async (
      pattern: string,
      returnValues = false,
    ) => {
      const puter = getPuter();

      if (!puter) {
        throw new Error(
          "Puter.js is not available.",
        );
      }

      return puter.kv.list(
        pattern,
        returnValues,
      );
    };

    const flushKV = async () => {
      const puter = getPuter();

      if (!puter) {
        throw new Error(
          "Puter.js is not available.",
        );
      }

      return puter.kv.flush();
    };

    return {
      isLoading: true,
      error: null,
      puterReady: false,

      auth: {
        user: null,
        isAuthenticated: false,
        signIn,
        signOut,
        refreshUser,
        checkAuthStatus,
        getUser: () =>
          get().auth.user,
      },

      fs: {
        write,
        read: readFile,
        readDir,
        upload,
        delete: deleteFile,
      },

      ai: {
        chat,
        feedback,
        img2txt,
      },

      kv: {
        get: getKV,
        set: setKV,
        delete: deleteKV,
        list: listKV,
        flush: flushKV,
      },

      init,

      clearError: () => {
        set({
          error: null,
        });
      },
    };
  });