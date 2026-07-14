import {
  useCallback,
  useState,
} from "react";

import {
  type FileRejection,
  useDropzone,
} from "react-dropzone";

import { formatSize } from "../lib/utils";

interface FileUploaderProps {
  onFileSelect?: (file: File | null) => void;
  disabled?: boolean;
}

const FileUploader = ({
  onFileSelect,
  disabled = false,
}: FileUploaderProps) => {
  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [error, setError] = useState("");

  const maxFileSize = 20 * 1024 * 1024;

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFile = acceptedFiles[0] ?? null;

      setError("");
      setSelectedFile(newFile);
      onFileSelect?.(newFile);
    },
    [onFileSelect],
  );

  const onDropRejected = useCallback(
    (rejections: FileRejection[]) => {
      const rejection = rejections[0];

      const message =
        rejection?.errors[0]?.code ===
        "file-too-large"
          ? `The PDF must be smaller than ${formatSize(
              maxFileSize,
            )}.`
          : "Please upload a valid PDF file.";

      setSelectedFile(null);
      setError(message);
      onFileSelect?.(null);
    },
    [maxFileSize, onFileSelect],
  );

  const {
    getRootProps,
    getInputProps,
    isDragActive,
  } = useDropzone({
    onDrop,
    onDropRejected,
    multiple: false,
    disabled,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxSize: maxFileSize,
  });

  const removeFile = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setSelectedFile(null);
    setError("");
    onFileSelect?.(null);
  };

  return (
    <div className="w-full">
      <div
        {...getRootProps({
          className: [
            "gradient-border",
            disabled
              ? "cursor-not-allowed opacity-60"
              : "cursor-pointer",
            isDragActive
              ? "ring-2 ring-blue-400"
              : "",
          ]
            .filter(Boolean)
            .join(" "),
        })}
      >
        <input
          {...getInputProps({
            id: "uploader",
          })}
        />

        <div className="space-y-4">
          {selectedFile ? (
            <div className="uploader-selected-file">
              <img
                src="/images/pdf.png"
                alt="PDF"
                className="size-10"
              />

              <div className="flex min-w-0 flex-1 items-center space-x-3">
                <div className="min-w-0">
                  <p className="max-w-xs truncate text-sm font-medium text-gray-700">
                    {selectedFile.name}
                  </p>

                  <p className="text-sm text-gray-500">
                    {formatSize(selectedFile.size)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="cursor-pointer p-2"
                onClick={removeFile}
                aria-label="Remove selected PDF"
              >
                <img
                  src="/icons/cross.svg"
                  alt=""
                  className="h-4 w-4"
                />
              </button>
            </div>
          ) : (
            <div>
              <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center">
                <img
                  src="/icons/info.svg"
                  alt=""
                  className="size-20"
                />
              </div>

              <p className="text-lg text-gray-500">
                <span className="font-semibold">
                  {isDragActive
                    ? "Drop the PDF here"
                    : "Click to upload"}
                </span>

                {!isDragActive && " or drag and drop"}
              </p>

              <p className="text-lg text-gray-500">
                PDF only, maximum{" "}
                {formatSize(maxFileSize)}
              </p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-2 text-sm font-medium text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default FileUploader;