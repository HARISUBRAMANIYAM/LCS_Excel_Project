// import { useRef, useState } from "react";
// import {
//   Accordion,
//   Button,
//   Col,
//   Container,
//   Dropdown,
//   DropdownButton,
//   Form,
//   FormControl,
//   FormLabel,
//   Row,
// } from "react-bootstrap";
// import { toast, ToastContainer } from "react-toastify";
// import { useAuth } from "../../context/AuthContext";
// import api from "../../services/api";
// import type { FileProcessResult } from "../../types";
// import { ESIINSTRCTIONS, PFINSTRCTIONS } from "./instruction";

// type UploadType = "pf" | "esi" | "both";

// const ExcelUpload = () => {
//   const [folderName, setFolderName] = useState("");
//   const [uploadMonth, setUploadMonth] = useState("");
//   const [processing, setProcessing] = useState(false);
//   const [, setResult] = useState<FileProcessResult | null>(null);
//   const [error, setError] = useState("");
//   const [files, setFiles] = useState<File[]>([]);
//   const [, setPfResult] = useState<any>(null);
//   const [, setEsiResult] = useState<any>(null);
//   const [, setShowPFModal] = useState(false);
//   const [, setShowESIModal] = useState(false);
//   const [showInstructions] = useState(true);
//   const [uploadType, setUploadType] = useState<UploadType>("pf");

//   const { token } = useAuth();
//   const fileInputRef = useRef<HTMLInputElement>(null);

//   const handleUploadTypeSelect = (key: string | null) => {
//     switch (key) {
//       case "1":
//         setUploadType("pf");
//         break;
//       case "2":
//         setUploadType("esi");
//         break;
//       case "3":
//         setUploadType("both");
//         break;
//       default:
//         break;
//     }
//   };

//   const resetForm = () => {
//     setUploadMonth("");
//     setFiles([]);
//     setFolderName("");
//     setUploadType("pf");
//     setError("");
//     setResult(null);
//     setPfResult(null);
//     setEsiResult(null);

//     if (fileInputRef.current) {
//       fileInputRef.current.value = "";
//     }

//     toast.info("Upload Form Reset successfully", { autoClose: 2000 });
//   };

//   const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const selectedFiles = event.target.files;

//     if (!selectedFiles || selectedFiles.length === 0) {
//       return;
//     }

//     const fileArray = Array.from(selectedFiles);
//     setFiles(fileArray);

//     const firstFilePath = fileArray[0].webkitRelativePath;
//     const extractedFolderName = firstFilePath.split("/")[0];
//     setFolderName(extractedFolderName);

//     toast.success(
//       `Successfully selected ${fileArray.length} files from folder: ${extractedFolderName}`
//     );
//   };

//   const validateForm = (): boolean => {
//     if (files.length === 0) {
//       const errorMsg = "Please select a folder containing PF/ESI files";
//       setError(errorMsg);
//       toast.error(errorMsg);
//       return false;
//     }

//     if (!uploadMonth.trim()) {
//       const errorMsg = "Upload month is required";
//       setError(errorMsg);
//       toast.error(errorMsg);
//       return false;
//     }

//     // Clear any previous errors
//     setError("");
//     return true;
//   };

//   // Format month for API
//   const formatMonth = (monthInput: string): string => {
//     const [year, month] = monthInput.split("-");
//     return `${month}-${year}`;
//   };

//   // Create form data for API submission
//   const createFormData = (): FormData => {
//     const formData = new FormData();

//     files.forEach((file) => {
//       formData.append("files", file);
//     });

//     formData.append("folder_name", folderName);
//     formData.append("upload_month", formatMonth(uploadMonth));

//     return formData;
//   };

//   // Get request headers
//   const getRequestHeaders = () => ({
//     "Content-Type": "multipart/form-data",
//     Authorization: `Bearer ${token}`,
//   });

//   // Process PF files
//   const processPFFiles = async (formData: FormData) => {
//     try {
//       const response = await api.post("/process_folder_pf_new", formData, {
//         headers: getRequestHeaders(),
//       });

//       setPfResult(response.data);

//       if (response.status === 200) {
//         toast.success("PF files processed successfully!", {
//           autoClose: 3000,
//           position: "top-right",
//         });
//         return true;
//       }
//       return false;
//     } catch (error) {
//       console.error("PF processing error:", error);
//       throw error;
//     }
//   };

//   // Process ESI files
//   const processESIFiles = async (formData: FormData) => {
//     try {
//       const response = await api.post("/process_folder_esi_new", formData, {
//         headers: getRequestHeaders(),
//       });

//       setEsiResult(response.data);

//       if (response.status === 200) {
//         toast.success("ESI files processed successfully!", {
//           autoClose: 3000,
//           position: "top-right",
//         });
//         return true;
//       }
//       return false;
//     } catch (error) {
//       console.error("ESI processing error:", error);
//       throw error;
//     }
//   };

//   // Extract error message from API response
//   const extractErrorMessage = (error: any): string => {
//     if (error.response?.data) {
//       const data = error.response.data;

//       if (typeof data === "string") {
//         return data;
//       }

//       if (Array.isArray(data)) {
//         return data
//           .map(
//             (err: { loc: any[]; msg: any }) =>
//               `Field '${err.loc.slice(1).join(".")}': ${err.msg}`
//           )
//           .join(", ");
//       }

//       if (data.detail) {
//         return typeof data.detail === "string"
//           ? data.detail
//           : JSON.stringify(data.detail);
//       }

//       return JSON.stringify(data);
//     }

//     if (error instanceof Error) {
//       return error.message;
//     }

//     return "An unexpected error occurred during file processing";
//   };

//   // Main upload processing function
//   const processFileUpload = async () => {
//     console.log("processing is Called....");
//     setProcessing(true);
//     setError("");
//     setResult(null);

//     toast.info("Processing files...", {
//       autoClose: 2000,
//       position: "top-right",
//     });

//     try {
//       const formData = createFormData();
//       let allSuccessful = true;

//       // Process based on upload type
//       if (uploadType === "pf" || uploadType === "both") {
//         const pfSuccess = await processPFFiles(formData);
//         allSuccessful = allSuccessful && pfSuccess;
//       }

//       if (uploadType === "esi" || uploadType === "both") {
//         const esiSuccess = await processESIFiles(formData);
//         allSuccessful = allSuccessful && esiSuccess;
//       }

//       // Reset form after successful processing
//       if (allSuccessful) {
//         setTimeout(() => {
//           resetForm();
//         }, 2000);
//       }
//     } catch (error: any) {
//       console.error("Upload processing error:", error);

//       const errorMessage = extractErrorMessage(error);
//       setError(errorMessage);

//       toast.error(errorMessage, {
//         autoClose: 5000,
//         position: "top-right",
//       });
//     } finally {
//       setProcessing(false);
//     }
//   };

//   // Handle form submission
//   const handleFormSubmission = (event: React.FormEvent) => {
//     event.preventDefault();

//     if (!validateForm()) {
//       return;
//     }
//     console.log("submission  is Called....");

//     // Handle instruction modals if needed
//     if (showInstructions) {
//       if (uploadType === "pf" || uploadType === "both") {
//         setShowPFModal(true);
//         processFileUpload();
//       }
//       if (uploadType === "esi" || uploadType === "both") {
//         setShowESIModal(true);
//         processFileUpload();
//       }
//     } else {
//       processFileUpload();
//     }
//   };
//   const getUploadTypeDisplay = (): string => {
//     switch (uploadType) {
//       case "both":
//         return "PF & ESI";
//       case "pf":
//         return "PF";
//       case "esi":
//         return "ESI";
//       default:
//         return "PF";
//     }
//   };
//   const InstructionAccordion = () => (
//     <Accordion defaultActiveKey="0" className="mt-4">
//       <Accordion.Item eventKey="0">
//         <Accordion.Header>PF Remittance Instructions</Accordion.Header>
//         <Accordion.Body>
//           <PFINSTRCTIONS show={true} />
//         </Accordion.Body>
//       </Accordion.Item>
//       <Accordion.Item eventKey="1">
//         <Accordion.Header>ESI Remittance Instructions</Accordion.Header>
//         <Accordion.Body>
//           <ESIINSTRCTIONS show={true} />
//         </Accordion.Body>
//       </Accordion.Item>
//     </Accordion>
//   );

//   return (
//     <div
//       className="upload-bg"
//       style={{
//         minHeight: "100vh",
//         width: "100%",
//         display: "flex",
//         flexDirection: "row",
//         alignItems: "center",
//         justifyContent: "center",
//         // background: "linear-gradient(135deg, #e0e7ff 0%, #f0fdfa 100%)",
//         position: "relative",
//         overflow: "hidden",
//       }}>
//       <ToastContainer
//         position="top-right"
//         autoClose={5000}
//         hideProgressBar={false}
//         newestOnTop={false}
//         closeOnClick
//         rtl={false}
//         pauseOnFocusLoss
//         draggable
//         pauseOnHover
//         theme="colored"
//       />
//       <div
//         style={{
//           position: "relative",
//           zIndex: 1,
//           width: "100%",
//           maxWidth: "480px",
//           margin: "0 auto",
//         }}>
//         <div >
//             {/* className="shadow-lg rounded-4 p-4 bg-white"
//           style={{
//             boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.18)",
//             borderRadius: "2rem",
//             background: "rgba(255,255,255,0.95)",
//           }} */}
//           <h3>Upload {getUploadTypeDisplay()} Remittance</h3>

//           <Container className="mb-5 px-3" title="Remittance Form">
//             <Form onSubmit={handleFormSubmission}>
//               {/* Upload Type Selection */}
//               <Row className="mb-3">
//                 <Col md={6}>
//                   <Form.Group className="mt-3 mb-3">
//                     <Form.Label className="mb-3">Select Upload Type</Form.Label>
//                     <DropdownButton
//                       title={`Selected: ${getUploadTypeDisplay()}`}
//                       onSelect={handleUploadTypeSelect}
//                       variant="outline-primary">
//                       <Dropdown.Item eventKey="1">PF Upload</Dropdown.Item>
//                       <Dropdown.Item eventKey="2">ESI Upload</Dropdown.Item>
//                       <Dropdown.Item eventKey="3">Both Upload</Dropdown.Item>
//                     </DropdownButton>
//                   </Form.Group>
//                 </Col>

//                 <Col md={6}>
//                   <Form.Group className="mt-3 mb-3">
//                     <FormLabel className="mb-3">Upload Month</FormLabel>
//                     <FormControl
//                       type="month"
//                       value={uploadMonth}
//                       onChange={(e) => setUploadMonth(e.target.value)}
//                       required
//                       placeholder="Select month"
//                     />
//                   </Form.Group>
//                 </Col>
//               </Row>
//               <Row className="mb-3">
//                 <Col md={12}>
//                   <Form.Group className="mt-3 mb-3">
//                     <FormLabel className="mb-3">
//                       Select Folder ({files.length} files selected)
//                     </FormLabel>
//                     <FormControl
//                       type="file"
//                       // @ts-ignore - webkitdirectory is not in standard TypeScript yet
//                       webkitdirectory="true"
//                       directory="true"
//                       onChange={handleFileSelection}
//                       ref={fileInputRef}
//                       required
//                     />
//                     {folderName && (
//                       <small className="text-muted mt-2 d-block">
//                         Selected folder: {folderName}
//                       </small>
//                     )}
//                   </Form.Group>
//                 </Col>
//               </Row>
//               {/* Error Display */}
//               {error && (
//                 <div className="alert alert-danger mt-3" role="alert">
//                   {error}
//                 </div>
//               )}

//               {/* Action Buttons */}
//               <div className="d-grid gap-2 mt-4">
//                 <Button
//                   type="submit"
//                   variant="primary"
//                   disabled={processing}
//                   size="lg">
//                   {processing ? (
//                     <>
//                       <span className="spinner-border spinner-border-sm me-2" />
//                       Processing...
//                     </>
//                   ) : (
//                     `Upload ${getUploadTypeDisplay()} Files`
//                   )}
//                 </Button>

//                 <Button
//                   type="button"
//                   variant="outline-secondary"
//                   onClick={resetForm}
//                   disabled={processing}>
//                   Cancel & Reset
//                 </Button>
//               </div>
//             </Form>
//             {showInstructions &&
//               //   <>
//               //     {uploadType === "pf" && (
//               //       <PFINSTRCTIONS show={showInstructions} />
//               //     )}
//               //     {uploadType === "esi" && (
//               //       <ESIINSTRCTIONS show={showInstructions} />
//               //     )}
//               //     {uploadType === "both" && (
//               //       <>
//               //         <PFINSTRCTIONS show={showInstructions} />
//               //         <ESIINSTRCTIONS show={showInstructions} />
//               //       </>
//               //     )}
//               //   </>
//               <InstructionAccordion />}
//           </Container>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ExcelUpload;

import { useFormik } from "formik";
import { Accordion, AccordionTab } from "primereact/accordion";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Dropdown } from "primereact/dropdown";
import { FileUpload } from "primereact/fileupload";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { ProgressSpinner } from "primereact/progressspinner";
import { Toast } from "primereact/toast";
import { useRef, useState } from "react";
import * as Yup from "yup";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import type { FileProcessResult } from "../../types";
import { ESIINSTRCTIONS, PFINSTRCTIONS } from "./instruction";

type UploadType = "pf" | "esi" | "both";

interface FormValues {
  uploadType: UploadType;
  uploadMonth: string;
  folderName: string;
}

const ExcelUpload = () => {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [pfResult, setPfResult] = useState<any>(null);
  const [esiResult, setEsiResult] = useState<any>(null);
  const [showInstructions] = useState(true);

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
  };

  const handleFileSelection = (event: any) => {
    const selectedFiles = event.files;

    if (!selectedFiles || selectedFiles.length === 0) {
      return;
    }

    const fileArray = Array.from(selectedFiles) as File[];
    setFiles(fileArray);

    // Extract folder name from first file path
    const firstFile = fileArray[0] as any;
    if (firstFile.webkitRelativePath) {
      const extractedFolderName = firstFile.webkitRelativePath.split("/")[0];
      formik.setFieldValue("folderName", extractedFolderName);

      showToast(
        "success",
        "Files Selected",
        `Successfully selected ${fileArray.length} files from folder: ${extractedFolderName}`
      );
    }
  };

  // Format month for API
  const formatMonth = (monthInput: string): string => {
    const [year, month] = monthInput.split("-");
    return `${month}-${year}`;
  };

  // Create form data for API submission
  const createFormData = (values: FormValues): FormData => {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append("files", file);
    });

    formData.append("folder_name", values.folderName);
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

  const InstructionAccordion = () => (
    <Accordion multiple activeIndex={[0]}>
      <AccordionTab header="PF Remittance Instructions">
        <PFINSTRCTIONS show={true} />
      </AccordionTab>
      <AccordionTab header="ESI Remittance Instructions">
        <ESIINSTRCTIONS show={true} />
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
                {formik.errors.uploadType && formik.touched.uploadType && (
                  <Message severity="error" text={formik.errors.uploadType} />
                )}
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
                {formik.errors.uploadMonth && formik.touched.uploadMonth && (
                  <Message severity="error" text={formik.errors.uploadMonth} />
                )}
              </div>
            </div>

            {/* File Upload */}
            <div className="form-group full-width">
              <label>Select Folder ({files.length} files selected)</label>
              <FileUpload
                ref={fileUploadRef}
                name="files"
                multiple
                accept=".xlsx,.xls,.csv"
                onSelect={handleFileSelection}
                chooseLabel="Choose Folder"
                uploadLabel="Upload"
                cancelLabel="Cancel"
                emptyTemplate={
                  <div className="file-upload-empty">
                    <i
                      className="pi pi-folder-open"
                      style={{ fontSize: "2rem" }}></i>
                    <p>Drag and drop folder here or click to select</p>
                  </div>
                }
              />
              {formik.values.folderName && (
                <small className="folder-info">
                  Selected folder: {formik.values.folderName}
                </small>
              )}
              {formik.errors.folderName && formik.touched.folderName && (
                <Message severity="error" text={formik.errors.folderName} />
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
