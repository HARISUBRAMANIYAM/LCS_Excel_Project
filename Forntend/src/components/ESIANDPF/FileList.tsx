import { useFormik } from "formik";
import { Badge } from "primereact/badge";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Divider } from "primereact/divider";
import { Dropdown } from "primereact/dropdown";
import { FileUpload } from "primereact/fileupload";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { ProgressSpinner } from "primereact/progressspinner";
import { Toast } from "primereact/toast";
import { Toolbar } from "primereact/toolbar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Col, Row } from "react-bootstrap";
import * as Yup from "yup";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import type { RemittanceFile } from "../../types";
import type { FilterValues, RemittanceFormValues } from "../../interface/ESIandPFModule";


const RemittanceFilesList: React.FC = () => {
  // Auth and core state
  const { token, user } = useAuth();
  const [files, setFiles] = useState<RemittanceFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<RemittanceFile[]>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [users, setUsers] = useState<{ id: number; name: string }[]>([]);

  // Modal state
  const [showRemittanceModal, setShowRemittanceModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<RemittanceFile | null>(null);

  // Refs
  const toast = useRef<Toast>(null);
  const fileUploadRef = useRef<FileUpload>(null);

  // Current date setup
  const currentDate = new Date();
  const currentYearMonth = currentDate.toISOString().slice(0, 7);

  // Filter form validation
  const filterValidationSchema = Yup.object({
    uploadMonth: Yup.date().required("Upload month is required"),
    selectedUserId: Yup.number().nullable(),
    fileType: Yup.string()
      .oneOf(["pf", "esi"])
      .required("File type is required"),
  });

  // Filter form setup
  const filterFormik = useFormik<FilterValues>({
    initialValues: {
      uploadMonth: currentDate,
      selectedUserId: null,
      fileType: "pf",
    },
    validationSchema: filterValidationSchema,
    onSubmit: (values) => {
      fetchFiles(values);
    },
  });

  // Remittance upload validation
  const remittanceValidationSchema = Yup.object({
    remittanceMonth: Yup.date().required("Remittance month is required"),
    remittanceAmount: Yup.string()
      .matches(/^\d*\.?\d*$/, "Please enter a valid amount")
      .required("Amount is required"),
    remittanceFile: Yup.mixed()
      .required("Please select a PDF file")
      .test("fileType", "Only PDF files are allowed", (value) => {
        if (!value) return false;
        const file = value as File;
        return file.type === "application/pdf";
      })
      .test("fileSize", "File size should be less than 1MB", (value) => {
        if (!value) return false;
        const file = value as File;
        return file.size <= 1000000;
      }),
  });

  // Remittance form setup
  const remittanceFormik = useFormik<RemittanceFormValues>({
    initialValues: {
      remittanceMonth: currentDate,
      remittanceAmount: "",
      remittanceFile: null,
    },
    validationSchema: remittanceValidationSchema,
    onSubmit: async (values) => {
      await handleUploadRemittance(values);
    },
  });

  // Utility functions
  const showToast = (
    severity: "success" | "info" | "warn" | "error",
    summary: string,
    detail?: string
  ) => {
    toast.current?.show({ severity, summary, detail, life: 3000 });
  };

  const formatDateForBackend = (date: Date): string => {
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear().toString();
    return `${year}-${month}-01`;
  };

  const getMonthNameFromMMYYYY = (mmYYYY: string): string => {
    if (!mmYYYY) return "N/A";
    const [month, year] = mmYYYY.split("-").map(Number);
    const date = new Date(year, month - 1);
    return date.toLocaleString("default", { month: "long" }) + " " + year;
  };

  // Data fetching
  const fetchUsers = useCallback(async () => {
    try {
      showToast("info", "Loading Users", "Loading user list...");
      const response = await api.get("auth/users");
      setUsers(response.data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load users";
      showToast("error", "Error", errorMessage);
      setError(errorMessage);
    }
  }, []);

  const fetchFiles = useCallback(
    async (filters?: FilterValues) => {
      const currentFilters = filters || filterFormik.values;

      try {
        setLoading(true);
        setError("");
        showToast(
          "info",
          "Loading Files",
          `Loading ${currentFilters.fileType.toUpperCase()} files...`
        );

        const params: Record<string, string> = {
          upload_month: formatDateForBackend(currentFilters.uploadMonth),
        };

        if (user?.role === "admin" && currentFilters.selectedUserId !== null) {
          params.user_id = currentFilters.selectedUserId.toString();
        }

        const endpoint =
          currentFilters.fileType === "esi"
            ? "esi/processed_files"
            : "pf/processed_files";
        const response = await api.get(endpoint, {
          params,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const filesWithType = response.data.map((file: RemittanceFile) => ({
          ...file,
          type: currentFilters.fileType,
        }));

        setFiles(filesWithType);
        showToast(
          "success",
          "Success",
          `${currentFilters.fileType.toUpperCase()} files loaded successfully`
        );
        setSelectedFiles([]);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load files";
        setError(errorMessage);
        showToast("error", "Error", errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [token, user?.role, filterFormik.values]
  );

  // File operations
  const handleDownload = async (
    file: RemittanceFile,
    fileType: "xlsx" | "txt" = "xlsx"
  ) => {
    try {
      setDownloading(file.id.toString());
      setError("");

      const endpoint =
        file.type === "esi"
          ? `esi/processed_files/${file.id}/download?file_type=${fileType}`
          : `pf/processed_files/${file.id}/download?file_type=${fileType}`;

      const response = await api.get(endpoint, { responseType: "blob" });

      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${file.type}_report_${file.id}_${formatDateForBackend(
        filterFormik.values.uploadMonth
      )}.${fileType}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      showToast("success", "Downloaded", `File downloaded successfully`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Download error";
      setError(errorMessage);
      showToast("error", "Download Failed", errorMessage);
    } finally {
      setDownloading(null);
    }
  };

  const handleBatchDownload = async () => {
    if (selectedFiles.length === 0) {
      showToast(
        "warn",
        "No Selection",
        "Please select at least one file to download"
      );
      return;
    }

    try {
      showToast(
        "info",
        "Preparing Download",
        `Preparing ${selectedFiles.length} files for download...`
      );
      const fileIdsParam = selectedFiles.map((f) => f.id).join(",");

      const endpoint =
        filterFormik.values.fileType === "esi"
          ? `esi/processed_files/batch_download?file_ids=${fileIdsParam}`
          : `pf/processed_files/batch_download?file_ids=${fileIdsParam}`;

      const response = await api.get(endpoint, { responseType: "blob" });

      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${filterFormik.values.fileType
        }_files_bundle_${formatDateForBackend(
          filterFormik.values.uploadMonth
        )}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      a.remove();

      showToast(
        "success",
        "Download Complete",
        `Downloaded ${selectedFiles.length} files successfully`
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Batch download failed";
      showToast("error", "Download Failed", errorMessage);
      setError(errorMessage);
    }
  };

  const handleRemittanceDownload = async (file: RemittanceFile) => {
    try {
      setDownloading(`remittance-${file.id}`);
      showToast("info", "Downloading", "Downloading remittance challan...");

      const endpoint =
        file.type === "esi"
          ? `esi/processed_files/${file.id}/remittance_challan`
          : `pf/processed_files/${file.id}/remittance_challan`;

      const response = await api.get(endpoint, { responseType: "blob" });

      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `remittance_challan_${file.id}_${formatDateForBackend(
        filterFormik.values.uploadMonth
      )}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      showToast(
        "success",
        "Downloaded",
        "Remittance challan downloaded successfully"
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Remittance download error";
      setError(errorMessage);
      showToast("error", "Download Failed", errorMessage);
    } finally {
      setDownloading(null);
    }
  };

  const handleUploadRemittance = async (values: RemittanceFormValues) => {
    if (!selectedFile) return;

    try {
      showToast("info", "Uploading", "Uploading remittance file...");

      const formData = new FormData();
      const formattedDate = values.remittanceMonth.toISOString().split("T")[0];

      formData.append("remittance_date", formattedDate);
      formData.append("remittance_amount", values.remittanceAmount);
      formData.append("remittance_file", values.remittanceFile!);

      const endpoint =
        selectedFile.type === "esi"
          ? `esi/processed_files/${selectedFile.id}/submit_remittance`
          : `pf/processed_files/${selectedFile.id}/submit_remittance`;

      await api.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      showToast("success", "Success", "Remittance uploaded successfully");
      fetchFiles();
      setShowRemittanceModal(false);
      remittanceFormik.resetForm();
      setSelectedFile(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Remittance upload failed";
      showToast("error", "Upload Failed", errorMessage);
      setError(errorMessage);
    }
  };

  const showRemittanceDialog = (file: RemittanceFile) => {
    setSelectedFile(file);
    setShowRemittanceModal(true);
    remittanceFormik.resetForm();
  };

  // Effects
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    if (user?.role === "admin") {
      fetchUsers();
    }
  }, [user, fetchUsers]);

  // Template functions
  const statusBodyTemplate = (file: RemittanceFile) => {
    const severity = file.status === "success" ? "success" : "danger";
    return <Badge value={file.status.toUpperCase()} severity={severity} />;
  };

  const remittanceBodyTemplate = (file: RemittanceFile) => {
    if (file.status !== "success")
      return <span className="text-muted">N/A</span>;

    if (file.remittance_submitted) {
      return (
        <div className="remittance-info">
          <Badge
            value={`${file.remittance_date?.split("T")[0]
              } - ₹${file.remittance_amount?.toFixed(2)}`}
            severity="success"
          />
          <Button
            label="View Challan"
            icon="pi pi-download"
            size="small"
            text
            onClick={() => handleRemittanceDownload(file)}
            loading={downloading === `remittance-${file.id}`}
          />
        </div>
      );
    }

    return (
      <Button
        label="Upload Challan"
        icon="pi pi-upload"
        size="small"
        className="logout-button"
        onClick={() => showRemittanceDialog(file)}
      />
    );
  };

  const actionsBodyTemplate = (file: RemittanceFile) => {
    if (file.status !== "success") {
      return <Message severity="error" text={file.message} />;
    }

    return (
      <div className="action-buttons">
        <Row style={{flexWrap:"nowrap"}}>
          <Col>
            <Button
              label="Excel"
              icon="pi pi-file-excel"
              className="logout-button"
              size="small"
              outlined
              onClick={() => handleDownload(file, "xlsx")}
              loading={downloading === file.id.toString()}
            />

          </Col>
          <Col>
            <Button
              label="Text"
              icon="pi pi-file"
              size="small"
              className="logout-button"
              outlined
              onClick={() => handleDownload(file, "txt")}
              loading={downloading === file.id.toString()}
            />
          </Col>
        </Row>

      </div>
    );
  };

  const submittedByBodyTemplate = (file: RemittanceFile) => {
    if (user?.role !== "admin" || filterFormik.values.selectedUserId)
      return null;

    const userName =
      users.find((u) => u.id === file.user_id)?.name || "Unknown User";
    return (
      <div className="submitted-by">
        <i className="pi pi-user" />
        <span>{userName}</span>
      </div>
    );
  };

  // Toolbar content
  const leftToolbarTemplate = () => (
    <div className="toolbar-left">
      <div className="header-title-group">
        <h2 className="section-title">
          Processed {filterFormik.values.fileType.toUpperCase()} Remittance
        </h2>
        <p className="subtitle">View and manage uploaded remittance reports</p>
      </div>

      <div className="file-type-buttons">
        {["pf", "esi"].map((type) => (
          <Button
            key={type}
            label={type.toUpperCase()}
            size="small"
            outlined={filterFormik.values.fileType !== type}
            onClick={() => filterFormik.setFieldValue("fileType", type)}
            className={
              filterFormik.values.fileType === type
                ? "selected-btn"
                : "unselected-btn"
            }
          />
        ))}
      </div>
    </div>
  );

  const rightToolbarTemplate = () => (
    <div className="toolbar-right">
      <Row>
        <Col md={3}>
          <div className="filter-group">
            <label htmlFor="month-selector">Select Month:</label>
            <Calendar
              id="month-selector"
              value={filterFormik.values.uploadMonth}
              onChange={(e) =>
                filterFormik.setFieldValue("uploadMonth", e.value)
              }
              view="month"
              dateFormat="mm/yy"
              showIcon
            />
          </div>
        </Col>
        <Col md={3}>
          {user?.role === "admin" && (
            <div className="filter-group">
              <label htmlFor="user-selector">Select User:</label>
              <Dropdown
                id="user-selector"
                value={filterFormik.values.selectedUserId}
                options={[
                  { label: "All Users", value: null },
                  ...users.map((u) => ({ label: u.name, value: u.id })),
                ]}
                onChange={(e) =>
                  filterFormik.setFieldValue("selectedUserId", e.value)
                }
                placeholder="Select User"
              />
            </div>
          )}
        </Col>
        <Col md={3}>
          <Button
            label="Refresh"
            icon="pi pi-refresh"
            onClick={() => fetchFiles()}
            loading={loading}
            className="logout-button mt-4"
            style={{padding: "0.85rem 0.75rem"}}
          />
        </Col>
      </Row>
    </div>
  );

  const tableHeader = (
    <div className="table-header">
      <Row>
      <Col md={10}>
      <span className="p-input-icon-right">
        <InputText
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search files..."
        />
        <i className="pi pi-search" style={{marginLeft:"-33px"}}/>
      </span>

      </Col> 
       <Col md={2}>
          {selectedFiles.length > 0 && (
            <Button
              label={`Download (${selectedFiles.length})`}
              icon="pi pi-download"
              onClick={handleBatchDownload}
              className="logout-button"
            />
          )}
        </Col> 
      </Row>
            
    </div>
  );

  if (loading) {
    return (
      <div className="loading-container">
        <ProgressSpinner />
        <p>Loading files...</p>
      </div>
    );
  }

  return (
    <div className="remittance-files-container">
      <Toast ref={toast} />

      <Card className="files-card">


        <Toolbar
          left={leftToolbarTemplate}
          right={rightToolbarTemplate}
          className="files-toolbar"
        />

        <Divider />

        {files.length === 0 ? (
          <Message
            severity="info"
            text={`No ${filterFormik.values.fileType.toUpperCase()} files found for ${formatDateForBackend(
              filterFormik.values.uploadMonth
            )}`}
          />
        ) : (
          <DataTable
            value={files}
            header={tableHeader}
            paginator
            rows={10}
            rowsPerPageOptions={[5, 10, 25, 50]}
            selection={selectedFiles}
            onSelectionChange={(e) => setSelectedFiles(e.value)}
            dataKey="id"
            globalFilter={globalFilter}
            emptyMessage="No files found."
            responsiveLayout="scroll"
            className="files-table"
            selectionMode="multiple"
            stripedRows>
            <Column selectionMode="multiple" headerStyle={{ width: "3em" }} />
            <Column field="filename" header="Filename" sortable />
            <Column
              field="status"
              header="Status"
              body={statusBodyTemplate}
              sortable
            />
            <Column
              header="Month"
              body={(file) => getMonthNameFromMMYYYY(file.remittance_month)}
              sortable
            />
            <Column
              field="created_at"
              header="Processed Date"
              body={(file) => new Date(file.created_at).toLocaleDateString()}
              sortable
            />
            <Column header="Remittance" body={remittanceBodyTemplate} style={{minWidth:"100px"}} />
            {user?.role === "admin" && !filterFormik.values.selectedUserId && (
              <Column header="Submitted By" body={submittedByBodyTemplate} style={{minWidth:"200px"}}/>
            )}
            <Column header="Actions" body={actionsBodyTemplate} style={{width:"200px"}} />
          </DataTable>
        )}
      </Card>

      {/* Remittance Upload Modal */}
      <Dialog
        visible={showRemittanceModal}
        onHide={() => setShowRemittanceModal(false)}
        header="Upload Remittance Challan"
        style={{ width: "40vw" }}
        modal>
        <form
          onSubmit={remittanceFormik.handleSubmit}
          className="remittance-form">
          <div className="form-group">
            <label htmlFor="remittance-month">Remittance Month</label>
            <Calendar
              id="remittance-month"
              value={remittanceFormik.values.remittanceMonth}
              onChange={(e) =>
                remittanceFormik.setFieldValue("remittanceMonth", e.value)
              }
              view="month"
              dateFormat="mm/yy"
              showIcon
              className={
                remittanceFormik.errors.remittanceMonth &&
                  remittanceFormik.touched.remittanceMonth
                  ? "p-invalid"
                  : ""
              }
            />
            {remittanceFormik.errors.remittanceMonth &&
              remittanceFormik.touched.remittanceMonth && (
                <Message
                  severity="error"
                  text={
                    remittanceFormik.errors.remittanceMonth
                      ? String(remittanceFormik.errors.remittanceMonth)
                      : ""
                  }
                />
              )}
          </div>

          <div className="form-group">
            <label htmlFor="remittance-amount">Amount</label>
            <InputText
              id="remittance-amount"
              name="remittanceAmount"
              value={remittanceFormik.values.remittanceAmount}
              onChange={remittanceFormik.handleChange}
              onBlur={remittanceFormik.handleBlur}
              keyfilter="money"
              placeholder="Enter amount"
              className={
                remittanceFormik.errors.remittanceAmount &&
                  remittanceFormik.touched.remittanceAmount
                  ? "p-invalid"
                  : ""
              }
            />
            {remittanceFormik.errors.remittanceAmount &&
              remittanceFormik.touched.remittanceAmount && (
                <Message
                  severity="error"
                  text={remittanceFormik.errors.remittanceAmount}
                />
              )}
          </div>

          <div className="form-group">
            <label htmlFor="remittance-file">Challan File (PDF)</label>
            <FileUpload
              ref={fileUploadRef}
              mode="basic"
              name="remittance_file"
              accept="application/pdf"
              maxFileSize={1000000}
              chooseLabel="Choose PDF"
              onSelect={(e) =>
                remittanceFormik.setFieldValue("remittanceFile", e.files[0])
              }
              className={
                remittanceFormik.errors.remittanceFile &&
                  remittanceFormik.touched.remittanceFile
                  ? "p-invalid"
                  : ""
              }
            />
            {remittanceFormik.errors.remittanceFile &&
              remittanceFormik.touched.remittanceFile && (
                <Message
                  severity="error"
                  text={remittanceFormik.errors.remittanceFile}
                />
              )}
          </div>

          <div className="form-actions">
            <Button
              type="submit"
              label="Submit"
              icon="pi pi-check"
              disabled={
                !remittanceFormik.isValid || remittanceFormik.isSubmitting
              }
              loading={remittanceFormik.isSubmitting}
            />
            <Button
              type="button"
              label="Cancel"
              icon="pi pi-times"
              outlined
              onClick={() => setShowRemittanceModal(false)}
            />
          </div>
        </form>
      </Dialog>
    </div>
  );
};

export default RemittanceFilesList;
