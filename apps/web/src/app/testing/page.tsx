// src/app/test-upload/page.tsx

"use client";

import { PdfViewer } from "../../components/dashboard/pdf-view";
import S3ImageUpload, { VehicleImage } from "../../components/dashboard/s3-image-uploader";

export default function TestUploadPage() {
  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Test Image Upload</h1>
      <div className="bg-card shadow-sm p-6 rounded-lg">
        <S3ImageUpload
          vehicleId={"test-vehicle-id"}
          onImagesChange={(images: VehicleImage[]) => {
            console.log("Images changed:", images);
          }}
        />

        <PdfViewer url={"https://dor.georgia.gov/document/document/mv-1-dor-motor-vehicle-titletag-application-revised-10-30-2018/download"} />
      </div>
    </div>
  );
}
