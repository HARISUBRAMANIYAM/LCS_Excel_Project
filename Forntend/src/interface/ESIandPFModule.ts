export type FileType = "pf" | "esi";

export interface RemittanceFormValues {
  remittanceMonth: Date;
  remittanceAmount: string;
  remittanceFile: File | null;
}

export interface FilterValues {
  uploadMonth: Date;
  selectedUserId: number | null;
  fileType: FileType;
}


export type UploadType = "pf" | "esi" | "both";

export interface FormValues {
  uploadType: UploadType;
  uploadMonth: string;
  folderName: string;
}