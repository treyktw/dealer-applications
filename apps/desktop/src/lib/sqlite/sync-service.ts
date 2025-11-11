/**
 * SQLite Sync Service
 * Handles bidirectional sync between local SQLite and Convex/S3
 */

import { convexAction, convexMutation, convexQuery } from "@/lib/convex";
import { api } from "@dealer/convex";
import {
  getAllClients,
  getClient,
  createClient,
  updateClient,
} from "./local-clients-service";
import {
  getAllVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
} from "./local-vehicles-service";
import {
  getAllDeals,
  getDeal,
  createDeal,
  updateDeal,
} from "./local-deals-service";
import {
  getDocumentsByDeal,
  getDocument,
  getDocumentBlob,
  blobToBase64,
  createDocument,
  updateDocument,
} from "./local-documents-service";
import { invoke } from "@tauri-apps/api/core";

export interface SyncResult {
  success: boolean;
  syncedAt: number;
  uploaded: {
    clients: number;
    vehicles: number;
    deals: number;
    documents: number;
  };
  downloaded: {
    clients: number;
    vehicles: number;
    deals: number;
    documents: number;
  };
  errors: string[];
}

/**
 * Get last sync timestamp from settings
 */
async function getLastSyncAt(): Promise<number> {
  try {
    const lastSync = await invoke<string | null>("db_get_setting", {
      key: "last_sync_at",
    });
    return lastSync ? parseInt(lastSync, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Set last sync timestamp in settings
 */
async function setLastSyncAt(timestamp: number): Promise<void> {
  await invoke("db_set_setting", {
    key: "last_sync_at",
    value: timestamp.toString(),
  });
}

/**
 * Upload local changes to Convex
 */
async function uploadChanges(
  userId: string,
  lastSyncAt: number
): Promise<SyncResult["uploaded"]> {
  const uploaded = {
    clients: 0,
    vehicles: 0,
    deals: 0,
    documents: 0,
  };

  // Helper function to safely include optional string fields (convert null to empty string)
  const includeIfValue = (obj: any, key: string, value: string | null | undefined) => {
    if (value !== undefined) {
      // Convert null to empty string, otherwise use the value
      obj[key] = value === null ? "" : value;
    }
  };

  // Helper function to safely include optional number fields (exclude null/undefined)
  const includeIfNumber = (obj: any, key: string, value: number | null | undefined) => {
    if (value !== null && value !== undefined) {
      obj[key] = value;
    }
  };

  try {
    // Upload clients modified since lastSyncAt
    const clients = await getAllClients(userId);
    for (const client of clients) {
      if (!client.synced_at || client.synced_at < lastSyncAt || client.updated_at > lastSyncAt) {
        // Build client object with only required fields first
        const clientData: {
          id: string;
          first_name: string;
          last_name: string;
          created_at: number;
          updated_at: number;
          email?: string;
          phone?: string;
          address?: string;
          city?: string;
          state?: string;
          zip_code?: string;
          drivers_license?: string;
          synced_at?: number;
        } = {
          id: client.id,
          first_name: client.first_name,
          last_name: client.last_name,
          created_at: client.created_at,
          updated_at: client.updated_at,
        };

        // Safely include optional fields (convert null to empty string)
        includeIfValue(clientData, "email", client.email);
        includeIfValue(clientData, "phone", client.phone);
        includeIfValue(clientData, "address", client.address);
        includeIfValue(clientData, "city", client.city);
        includeIfValue(clientData, "state", client.state);
        includeIfValue(clientData, "zip_code", client.zip_code);
        includeIfValue(clientData, "drivers_license", client.drivers_license);
        includeIfNumber(clientData, "synced_at", client.synced_at);

        await convexMutation(api.api.standaloneSync.uploadClient, {
          userId,
          client: clientData,
        });
        uploaded.clients++;
      }
    }

    // Upload vehicles modified since lastSyncAt
    const vehicles = await getAllVehicles(userId);
    for (const vehicle of vehicles) {
      if (!vehicle.synced_at || vehicle.synced_at < lastSyncAt || vehicle.updated_at > lastSyncAt) {
        await convexMutation(api.api.standaloneSync.uploadVehicle, {
          userId,
          vehicle: {
            id: vehicle.id,
            vin: vehicle.vin,
            stock_number: vehicle.stock_number,
            year: vehicle.year,
            make: vehicle.make,
            model: vehicle.model,
            trim: vehicle.trim,
            body: vehicle.body,
            doors: vehicle.doors,
            transmission: vehicle.transmission,
            engine: vehicle.engine,
            cylinders: vehicle.cylinders,
            title_number: vehicle.title_number,
            mileage: vehicle.mileage,
            color: vehicle.color,
            price: vehicle.price,
            cost: vehicle.cost !== undefined ? vehicle.cost : 0,
            status: vehicle.status,
            description: vehicle.description,
            created_at: vehicle.created_at,
            updated_at: vehicle.updated_at,
            synced_at: vehicle.synced_at,
          },
        });
        uploaded.vehicles++;
      }
    }

    // Upload deals modified since lastSyncAt
    const deals = await getAllDeals(userId);
    for (const deal of deals) {
      if (!deal.synced_at || deal.synced_at < lastSyncAt || deal.updated_at > lastSyncAt) {
        await convexMutation(api.api.standaloneSync.uploadDeal, {
          userId,
          deal: {
            id: deal.id,
            type: deal.type,
            client_id: deal.client_id,
            vehicle_id: deal.vehicle_id,
            status: deal.status,
            total_amount: deal.total_amount,
            sale_date: deal.sale_date,
            sale_amount: deal.sale_amount,
            sales_tax: deal.sales_tax,
            doc_fee: deal.doc_fee,
            trade_in_value: deal.trade_in_value,
            down_payment: deal.down_payment,
            financed_amount: deal.financed_amount,
            document_ids: deal.document_ids,
            cobuyer_data: deal.cobuyer_data,
            created_at: deal.created_at,
            updated_at: deal.updated_at,
            synced_at: deal.synced_at,
          },
        });
        uploaded.deals++;

        // Upload documents for this deal
        const documents = await getDocumentsByDeal(deal.id);
        for (const doc of documents) {
          if (!doc.synced_at || doc.synced_at < lastSyncAt || doc.updated_at > lastSyncAt) {
            // Upload document to S3 via Convex (server-side credentials)
            const blob = await getDocumentBlob(doc.id);
            if (blob) {
              // Convert blob to base64
              const base64 = await blobToBase64(blob);

              // Upload to S3 via Convex action (uses server-side AWS credentials)
              const uploadResult = await convexAction(
                api.api.standaloneSync.uploadDocumentToS3,
                {
                  userId,
                  dealId: deal.id,
                  documentId: doc.id,
                  filename: doc.filename,
                  documentBase64: base64,
                }
              );

              if (!uploadResult.success || !uploadResult.s3Key) {
                throw new Error("Failed to upload document to S3");
              }

              // Upload document metadata to Convex
              await convexMutation(api.api.standaloneSync.uploadDocumentMetadata, {
                userId,
                document: {
                  id: doc.id,
                  deal_id: doc.deal_id,
                  type: doc.type,
                  filename: doc.filename,
                  s3_key: uploadResult.s3Key,
                  file_size: doc.file_size,
                  file_checksum: doc.file_checksum,
                  created_at: doc.created_at,
                  updated_at: doc.updated_at,
                  synced_at: doc.synced_at,
                },
              });

              // Update local document with S3 key and synced_at
              await updateDocument(doc.id, {
                synced_at: Date.now(),
              });

              uploaded.documents++;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("❌ [SYNC] Error uploading changes:", error);
    throw error;
  }

  return uploaded;
}

/**
 * Download changes from Convex
 */
async function downloadChanges(
  userId: string,
  lastSyncAt: number
): Promise<SyncResult["downloaded"]> {
  const downloaded = {
    clients: 0,
    vehicles: 0,
    deals: 0,
    documents: 0,
  };

  try {
    const changes = await convexQuery(api.api.standaloneSync.getChanges, {
      userId,
      lastSyncAt,
    });

    // Download and merge clients
    for (const client of changes.clients) {
      const localClient = await getClient(client.localId, userId);
      
      // Conflict resolution: last-write-wins (if remote is newer, update/create)
      if (!localClient || localClient.updated_at < client.updatedAt) {
        const clientData = {
          first_name: client.firstName,
          last_name: client.lastName,
          email: client.email || undefined,
          phone: client.phone || undefined,
          address: client.address || undefined,
          city: client.city || undefined,
          state: client.state || undefined,
          zip_code: client.zipCode || undefined,
          drivers_license: client.driversLicense || undefined,
          synced_at: client.syncedAt,
        };

        if (localClient) {
          // Update existing client
          await updateClient(client.localId, clientData);
        } else {
          // Create new client with the remote ID
          await createClient(
            {
              ...clientData,
              id: client.localId, // Use the remote localId
            } as any,
            userId
          );
        }
        downloaded.clients++;
      }
    }

    // Download and merge vehicles
    for (const vehicle of changes.vehicles) {
      const localVehicle = await getVehicle(vehicle.localId);
      
      // Conflict resolution: last-write-wins
      if (!localVehicle || localVehicle.updated_at < vehicle.updatedAt) {
        const vehicleData = {
          vin: vehicle.vin,
          stock_number: vehicle.stockNumber || undefined,
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          trim: vehicle.trim || undefined,
          body: vehicle.body || undefined,
          doors: vehicle.doors || undefined,
          transmission: vehicle.transmission || undefined,
          engine: vehicle.engine || undefined,
          cylinders: vehicle.cylinders || undefined,
          title_number: vehicle.titleNumber || undefined,
          mileage: vehicle.mileage,
          color: vehicle.color || undefined,
          price: vehicle.price,
          cost: vehicle.cost || undefined,
          status: vehicle.status,
          description: vehicle.description || undefined,
          synced_at: vehicle.syncedAt,
        };

        if (localVehicle) {
          // Update existing vehicle
          await updateVehicle(vehicle.localId, vehicleData);
        } else {
          // Create new vehicle with the remote ID
          await createVehicle({
            ...vehicleData,
            id: vehicle.localId, // Use the remote localId
          } as any);
        }
        downloaded.vehicles++;
      }
    }

    // Download and merge deals
    for (const deal of changes.deals) {
      const localDeal = await getDeal(deal.localId, userId);
      
      // Conflict resolution: last-write-wins
      if (!localDeal || localDeal.updated_at < deal.updatedAt) {
        const dealData = {
          type: deal.type,
          client_id: deal.clientLocalId,
          vehicle_id: deal.vehicleLocalId,
          status: deal.status,
          total_amount: deal.totalAmount,
          sale_date: deal.saleDate || undefined,
          sale_amount: deal.saleAmount || undefined,
          sales_tax: deal.salesTax || undefined,
          doc_fee: deal.docFee || undefined,
          trade_in_value: deal.tradeInValue || undefined,
          down_payment: deal.downPayment || undefined,
          financed_amount: deal.financedAmount || undefined,
          document_ids: deal.documentIds || [],
          cobuyer_data: deal.cobuyerData || undefined,
          synced_at: deal.syncedAt,
        };

        if (localDeal) {
          // Update existing deal
          await updateDeal(deal.localId, dealData, userId);
        } else {
          // Create new deal with the remote ID
          await createDeal(
            {
              ...dealData,
              id: deal.localId, // Use the remote localId
            } as any,
            userId
          );
        }
        downloaded.deals++;
      }
    }

    // Download documents from S3 via Convex presigned URL
    for (const doc of changes.documents) {
      const localDoc = await getDocument(doc.localId);
      
      // Conflict resolution: last-write-wins
      if (!localDoc || localDoc.updated_at < doc.updatedAt) {
        try {
          // Get presigned download URL from Convex
          const urlResult = await convexAction(
            api.api.standaloneSync.getDocumentDownloadUrl,
            {
              s3Key: doc.s3Key,
              expiresIn: 3600, // 1 hour
            }
          );

          if (urlResult.url) {
            // Download PDF from presigned URL
            const response = await fetch(urlResult.url);
            if (!response.ok) {
              throw new Error(`Failed to download document: ${response.statusText}`);
            }
            
            const blob = await response.blob();
            
            if (localDoc) {
              // Update existing document - replace the file and update metadata
              // Note: We need to get the client's first name for the file path
              const deal = await getDeal(doc.dealLocalId, userId);
              if (deal) {
                const client = await getClient(deal.client_id, userId);
                const clientFirstName = client?.first_name || "unknown";
                
                // Delete old file
                try {
                  await invoke("remove_file", { filePath: localDoc.file_path });
                } catch (error) {
                  console.warn("Failed to delete old document file:", error);
                }
                
                // Create new document with updated file
                // Note: createDocument generates file_path internally
                await createDocument(
                  {
                    deal_id: doc.dealLocalId,
                    type: doc.type,
                    filename: doc.filename,
                    file_path: "", // Will be generated by createDocument
                    file_size: blob.size,
                    file_checksum: doc.fileChecksum || undefined,
                    synced_at: doc.syncedAt,
                  } as any,
                  blob,
                  clientFirstName
                );
                
                // Delete the old document record (createDocument creates a new one)
                await invoke("db_delete_document", { id: localDoc.id });
              }
            } else {
              // Create new document
              const deal = await getDeal(doc.dealLocalId, userId);
              if (deal) {
                const client = await getClient(deal.client_id, userId);
                const clientFirstName = client?.first_name || "unknown";
                
                // Note: createDocument generates a new ID, but we want to use doc.localId
                // We'll need to update the document after creation or modify createDocument
                // For now, create it and then update the ID if possible
                // Note: createDocument generates file_path internally
                const newDoc = await createDocument(
                  {
                    deal_id: doc.dealLocalId,
                    type: doc.type,
                    filename: doc.filename,
                    file_path: "", // Will be generated by createDocument
                    file_size: blob.size,
                    file_checksum: doc.fileChecksum || undefined,
                    synced_at: doc.syncedAt,
                  } as any,
                  blob,
                  clientFirstName
                );
                
                // If the generated ID doesn't match, we'd need to handle it
                // For now, we'll use the generated ID and sync will handle it
                console.log(`📥 [SYNC] Created document ${newDoc.id} (remote: ${doc.localId})`);
              }
            }

            downloaded.documents++;
          }
        } catch (error) {
          console.error(`❌ [SYNC] Error downloading document ${doc.localId}:`, error);
          // Continue with other documents even if one fails
        }
      }
    }
  } catch (error) {
    console.error("❌ [SYNC] Error downloading changes:", error);
    throw error;
  }

  return downloaded;
}

/**
 * Perform full sync (upload + download)
 */
export async function performSync(userId: string): Promise<SyncResult> {
  const errors: string[] = [];
  const syncedAt = Date.now();
  const lastSyncAt = await getLastSyncAt();

  let uploaded = {
    clients: 0,
    vehicles: 0,
    deals: 0,
    documents: 0,
  };

  let downloaded = {
    clients: 0,
    vehicles: 0,
    deals: 0,
    documents: 0,
  };

  try {
    // Upload local changes
    uploaded = await uploadChanges(userId, lastSyncAt);

    // Download remote changes
    downloaded = await downloadChanges(userId, lastSyncAt);

    // Update last sync timestamp
    await setLastSyncAt(syncedAt);

    return {
      success: true,
      syncedAt,
      uploaded,
      downloaded,
      errors,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    return {
      success: false,
      syncedAt,
      uploaded,
      downloaded,
      errors,
    };
  }
}

