import { Card } from "react-bootstrap";

interface InstructionsProps {
    show: boolean;
}

export const PFINSTRCTIONS: React.FC<InstructionsProps> = ({ show }) => {
    return show ? (
        <Card title="PF Remittance Requirements" className="mt-4">
            <p><strong><center>PF Remittance Requirements</center></strong></p>
            <ol>
                <li>Excel files (.xlsx, .xls) containing PF data</li>
                <li>
                    Required columns:
                    <ul>
                        <li><strong>UAN No</strong> (12 digit Universal Account Number)</li>
                        <li><strong>Employee Name</strong></li>
                        <li><strong>Gross Wages</strong> (Total Salary or Gross Salary)</li>
                        <li><strong>PF Gross</strong> (EPF Gross or PF Gross)</li>
                        <li><strong>LOP Days</strong> (Loss of Pay days)</li>
                    </ul>
                </li>
                <li>All Excel files should be in the specified folder</li>
                <li>Folder should contain only relevant PF Remittance</li>
            </ol>
        </Card>
    ) : null;
};

export const ESIINSTRCTIONS: React.FC<InstructionsProps> = ({ show }) => {
    return show ? (
        <Card title="ESI Remittance Requirements" className="mt-4">
            <p><strong><center>ESI Remittance Requirements</center></strong></p>
            <ol>
                <li>Select the upload month for the ESI data.</li>
                <li>Enter the full path to the folder containing Excel files with employee data.</li>
                <li>
                    The Excel files should have the following columns:
                    <ul>
                        <li><strong>ESI No (or ESI N0)</strong></li>
                        <li><strong>Employee Name</strong></li>
                        <li><strong>ESI Gross</strong></li>
                        <li><strong>Worked Days (or Worked days)</strong></li>
                    </ul>
                </li>
                <li>Click "Process Files" to start processing all Excel files in the folder.</li>
                <li>The system will generate ESI reports in both Excel and text formats.</li>
            </ol>
        </Card>
    ) : null;
};