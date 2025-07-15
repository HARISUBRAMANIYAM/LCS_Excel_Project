
import { useFormik } from "formik";
import { Accordion, AccordionTab } from "primereact/accordion";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Dropdown } from "primereact/dropdown";
import { FileUpload } from "primereact/fileupload";
import { InputText } from "primereact/inputtext";
import { ProgressSpinner } from "primereact/progressspinner";
import { Toast } from "primereact/toast";
import React, { useEffect, useRef, useState } from "react";
import * as Yup from "yup";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import type { FileProcessResult } from "../../types";
import { ESIINSTRCTIONS, PFINSTRCTIONS } from "./instruction";
import type { FormValues } from "../../interface/ESIandPFModule";



const ExcelUpload = () => {
  const [processing, setProcessing] = useState(false);
  const [_result, setResult] = useState<FileProcessResult | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [_pfResult, setPfResult] = useState<any>(null);
  const [_esiResult, setEsiResult] = useState<any>(null);
  const [showInstructions] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { token } = useAuth();
  const toast = useRef<Toast>(null);
  const fileUploadRef = useRef<FileUpload>(null);

  // Upload type options
  const uploadTypeOptions = [
    { label: "PF Upload", value: "pf" },
    { label: "ESI Upload", value: "esi" },
    { label: "Both Upload", value: "both" },
  ];

  // Validation schema
  const validationSchema = Yup.object({
    uploadType: Yup.string()
      .oneOf(["pf", "esi", "both"], "Please select a valid upload type")
      .required("Upload type is required"),
    uploadMonth: Yup.string()
      .matches(/^\d{4}-\d{2}$/, "Please select a valid month")
      .required("Upload month is required"),
    folderName: Yup.string()
      .min(1, "Please select a folder")
      .required("Folder selection is required"),
  });

  // Formik setup
  const formik = useFormik<FormValues>({
    initialValues: {
      uploadType: "pf",
      uploadMonth: "",
      folderName: "",
    },
    validationSchema,
    onSubmit: async (values: any) => {
      await processFileUpload(values);
    },
  });

  const showToast = (
    severity: "success" | "info" | "warn" | "error",
    summary: string,
    detail?: string
  ) => {
    toast.current?.show({ severity, summary, detail, life: 3000 });
  };

  const resetForm = () => {
    formik.resetForm();
    setFiles([]);
    setResult(null);
    setPfResult(null);
    setEsiResult(null);
    fileUploadRef.current?.clear();
    showToast("info", "Form Reset", "Upload form reset successfully");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;

    console.log("selectedFiles:", selectedFiles);
    if (!selectedFiles || selectedFiles.length === 0) {
      return;
    }

    const fileArray = Array.from(selectedFiles) as File[];
    setFiles(fileArray);
    console.log("fileArray", fileArray)

    // Extract folder name from first file path
    const firstFile = fileArray[0] as any;
    if (firstFile.webkitRelativePath) {
      const extractedFolderName = firstFile.webkitRelativePath.split("/")[0];
      console.log("Extracted Folder Name:", extractedFolderName);
      formik.setFieldValue("folderName", extractedFolderName);

      showToast(
        "success",
        "Files Selected",
        `Successfully selected ${fileArray.length} files from folder: ${extractedFolderName}`
      );
    } else {
      console.warn("webkitRelativePath not available on file");
    }
  };

  // Format month for API
  const formatMonth = (monthInput: string): string => {
    const [year, month] = monthInput.split("-");
    return `${year}-${month}-01`;
  };

  // Create form data for API submission
  const createFormData = (values: FormValues): FormData => {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append("files", file);
    });

    formData.append("folder_name", values.folderName);
    console.log("Vlaues.folderName:", values.folderName);
    formData.append("upload_month", formatMonth(values.uploadMonth));

    return formData;
  };

  // Get request headers
  const getRequestHeaders = () => ({
    "Content-Type": "multipart/form-data",
    Authorization: `Bearer ${token}`,
  });

  // Process PF files
  const processPFFiles = async (formData: FormData) => {
    try {
      const response = await api.post("pf/process_folder", formData, {
        headers: getRequestHeaders(),
      });

      setPfResult(response.data);

      if (response.status === 200) {
        showToast(
          "success",
          "PF Processing Complete",
          "PF files processed successfully!"
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error("PF processing error:", error);
      throw error;
    }
  };

  // Process ESI files
  const processESIFiles = async (formData: FormData) => {
    try {
      const response = await api.post("esi/process_folder", formData, {
        headers: getRequestHeaders(),
      });

      setEsiResult(response.data);

      if (response.status === 200) {
        showToast(
          "success",
          "ESI Processing Complete",
          "ESI files processed successfully!"
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error("ESI processing error:", error);
      throw error;
    }
  };

  // Extract error message from API response
  const extractErrorMessage = (error: any): string => {
    if (error.response?.data) {
      const data = error.response.data;

      if (typeof data === "string") {
        return data;
      }

      if (Array.isArray(data)) {
        return data
          .map(
            (err: { loc: any[]; msg: any }) =>
              `Field '${err.loc.slice(1).join(".")}': ${err.msg}`
          )
          .join(", ");
      }

      if (data.detail) {
        return typeof data.detail === "string"
          ? data.detail
          : JSON.stringify(data.detail);
      }

      return JSON.stringify(data);
    }

    if (error instanceof Error) {
      return error.message;
    }

    return "An unexpected error occurred during file processing";
  };

  // Main upload processing function
  const processFileUpload = async (values: FormValues) => {
    setProcessing(true);
    setResult(null);

    showToast("info", "Processing Files", "Processing files...");

    try {
      const formData = createFormData(values);
      let allSuccessful = true;

      // Process based on upload type
      if (values.uploadType === "pf" || values.uploadType === "both") {
        const pfSuccess = await processPFFiles(formData);
        allSuccessful = allSuccessful && pfSuccess;
      }

      if (values.uploadType === "esi" || values.uploadType === "both") {
        const esiSuccess = await processESIFiles(formData);
        allSuccessful = allSuccessful && esiSuccess;
      }

      // Reset form after successful processing
      if (allSuccessful) {
        setTimeout(() => {
          resetForm();
        }, 2000);
      }
    } catch (error: any) {
      console.error("Upload processing error:", error);
      const errorMessage = extractErrorMessage(error);
      showToast("error", "Processing Failed", errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const getUploadTypeDisplay = (): string => {
    switch (formik.values.uploadType) {
      case "both":
        return "PF & ESI";
      case "pf":
        return "PF";
      case "esi":
        return "ESI";
      default:
        return "PF";
    }
  };
  useEffect(() => {
    const errorFields = [];

    if (formik.errors.uploadType && formik.touched.uploadType) {
      errorFields.push(formik.errors.uploadType);
    }
    if (formik.errors.uploadMonth && formik.touched.uploadMonth) {
      errorFields.push(formik.errors.uploadMonth);
    }
    if (formik.errors.folderName && formik.touched.folderName) {
      errorFields.push(formik.errors.folderName);
    }

    // Show all errors in toast one by one
    errorFields.forEach((errMsg) => {
      showToast("error", "Validation Error", errMsg);
    });
  }, [formik.errors, formik.touched]);
  const InstructionAccordion = () => (
    <Accordion
      multiple
      activeIndex={[
        formik.values.uploadType === "pf" || formik.values.uploadType === "both" ? 0 : null,
        formik.values.uploadType === "esi" || formik.values.uploadType === "both" ? 1 : null,
      ].filter(index => index !== null)}
    >
      <AccordionTab header="PF Remittance Instructions">
        <PFINSTRCTIONS show={formik.values.uploadType === "pf" || formik.values.uploadType === "both"} />
      </AccordionTab>
      <AccordionTab header="ESI Remittance Instructions">
        <ESIINSTRCTIONS show={formik.values.uploadType === "esi" || formik.values.uploadType === "both"} />
      </AccordionTab>
    </Accordion>

  );

  return (
    <div className="upload-container h-50">
      <Toast ref={toast} />

      <div className="upload-content">
        <Card className="upload-card">
          <div className="card-header">
            <h2>Upload {getUploadTypeDisplay()} Remittance</h2>
          </div>

          <form onSubmit={formik.handleSubmit} className="upload-form">
            <div className="form-row">
              {/* Upload Type Selection */}
              <div className="form-group">
                <label htmlFor="uploadType">Upload Type</label>
                <Dropdown
                  id="uploadType"
                  name="uploadType"
                  value={formik.values.uploadType}
                  options={uploadTypeOptions}
                  onChange={(e) => formik.setFieldValue("uploadType", e.value)}
                  placeholder="Select upload type"
                  className={
                    formik.errors.uploadType && formik.touched.uploadType
                      ? "p-invalid"
                      : ""
                  }
                />
              </div>

              {/* Upload Month */}
              <div className="form-group">
                <label htmlFor="uploadMonth">Upload Month</label>
                <InputText
                  id="uploadMonth"
                  name="uploadMonth"
                  type="month"
                  value={formik.values.uploadMonth}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={
                    formik.errors.uploadMonth && formik.touched.uploadMonth
                      ? "p-invalid"
                      : ""
                  }
                />
              </div>
            </div>

            <div className="form-group full-width">
              <label data-file-count={`${files.length} files selected`}>
                Select Folder
              </label>

              <div className="file-upload-wrapper">
                <div className="file-upload-empty">
                  <i className="pi pi-folder-open"></i>
                  <p>Drag and drop folder here or click to select</p>
                </div>

                <input
                  type="file"
                  // @ts-ignore - webkitdirectory is not in standard TypeScript yet
                  webkitdirectory="true"
                  directory="true"
                  placeholder="Upload File"
                  onChange={handleFileSelection}
                  ref={fileInputRef}
                />
              </div>

              {formik.values.folderName && (
                <small className="folder-info">
                  Selected folder: {formik.values.folderName}
                </small>
              )}
            </div>
            {/* Action Buttons */}
            <div className="form-actions">
              <Button
                type="submit"
                label={
                  processing
                    ? "Processing..."
                    : `Upload ${getUploadTypeDisplay()} Files`
                }
                icon={
                  processing ? (
                    <ProgressSpinner
                      style={{ width: "1rem", height: "1rem" }}
                    />
                  ) : (
                    "pi pi-upload"
                  )
                }
                disabled={processing || !formik.isValid}
                className="submit-btn"
              />

              <Button
                type="button"
                label="Cancel & Reset"
                icon="pi pi-refresh"
                onClick={resetForm}
                disabled={processing}
                className="reset-btn"
                severity="secondary"
              />
            </div>
          </form>
        </Card>

        {/* Instructions Section */}
        {showInstructions && (
          <Card className="instructions-card">
            <InstructionAccordion />
          </Card>
        )}
      </div>
    </div>
  );
};

export default ExcelUpload;
