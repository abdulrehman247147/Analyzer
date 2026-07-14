export interface PdfToImageResult {
  file: File | null;
  url: string;
  error?: string;
}

export const convertPdfToImage = async (
  pdfFile: File,
): Promise<PdfToImageResult> => {
  let previewUrl = "";

  try {
    if (typeof window === "undefined") {
      throw new Error(
        "PDF conversion can only run in the browser.",
      );
    }

    if (!pdfFile) {
      throw new Error("No PDF file was selected.");
    }

    const isPdf =
      pdfFile.type === "application/pdf" ||
      pdfFile.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      throw new Error(
        "Please select a valid PDF file.",
      );
    }

    /*
     * Dynamic imports prevent PDF.js from loading during
     * React Router server-side rendering.
     *
     * Importing from "pdfjs-dist" also provides the correct
     * TypeScript declarations.
     */
    const pdfjs = await import("pdfjs-dist");

    const workerModule = await import(
      "pdfjs-dist/build/pdf.worker.min.mjs?url"
    );

    pdfjs.GlobalWorkerOptions.workerSrc =
      workerModule.default;

    const arrayBuffer =
      await pdfFile.arrayBuffer();

    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(arrayBuffer),
    });

    const pdfDocument =
      await loadingTask.promise;

    if (pdfDocument.numPages < 1) {
      await loadingTask.destroy();

      throw new Error(
        "The PDF does not contain any pages.",
      );
    }

    const firstPage =
      await pdfDocument.getPage(1);

    const viewport =
      firstPage.getViewport({
        scale: 2,
      });

    const canvas =
      document.createElement("canvas");

    const canvasContext =
      canvas.getContext("2d");

    if (!canvasContext) {
      await loadingTask.destroy();

      throw new Error(
        "Could not create the image canvas.",
      );
    }

    canvas.width =
      Math.ceil(viewport.width);

    canvas.height =
      Math.ceil(viewport.height);

    await firstPage.render({
      canvas,
      canvasContext,
      viewport,
    }).promise;

    const imageBlob =
      await new Promise<Blob>(
        (resolve, reject) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(
                  new Error(
                    "Could not generate the resume preview.",
                  ),
                );

                return;
              }

              resolve(blob);
            },
            "image/png",
            1,
          );
        },
      );

    const originalName =
      pdfFile.name.replace(/\.pdf$/i, "");

    const imageFile = new File(
      [imageBlob],
      `${originalName}-preview.png`,
      {
        type: "image/png",
        lastModified: Date.now(),
      },
    );

    previewUrl =
      URL.createObjectURL(imageBlob);

    /*
     * destroy() belongs to the loading task in current
     * PDF.js versions.
     */
    await loadingTask.destroy();

    return {
      file: imageFile,
      url: previewUrl,
    };
  } catch (error) {
    console.error(
      "PDF-to-image conversion failed:",
      error,
    );

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    return {
      file: null,
      url: "",
      error:
        error instanceof Error
          ? error.message
          : "Failed to convert the PDF into an image.",
    };
  }
};